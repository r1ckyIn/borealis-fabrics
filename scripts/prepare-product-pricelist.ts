/**
 * Product Price List Preparation Script
 *
 * Converts 铁架电机价格2025.xlsx (8 sheets, ~250+ rows)
 * into the template format expected by ProductImportStrategy.
 *
 * Input:  Multi-sheet workbook with multi-row headers, formulas, merged cells
 * Output: Single-sheet template-format xlsx at scripts/output/products-prepared.xlsx
 *
 * Usage: cd scripts && npx ts-node prepare-product-pricelist.ts
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================
// Configuration
// ============================================================

const INPUT_FILE = path.resolve(
  '/Users/qinyuan/Desktop/铂润测试资料/铁架电机价格2025.xlsx',
);

const OUTPUT_DIR = path.resolve(__dirname, 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'products-prepared.xlsx');

/**
 * Supplier abbreviation to full company name mapping.
 * Used for per-supplier sheets and the supplier column in the main sheet.
 */
const SUPPLIER_MAP: Record<string, string> = {
  Cenro: 'Cenro机械',
  丽华: '丽华机械',
  ASH: 'ASH家具',
  LFH: 'LFH家具',
  JZD: 'JZD家具',
};

/**
 * Keywords used to determine subCategory from product name/context.
 */
const SUBCATEGORY_KEYWORDS: Array<{
  keywords: string[];
  subCategory: string;
}> = [
  { keywords: ['电机', '电动', '零重力'], subCategory: 'MOTOR' },
  { keywords: ['床垫', '海绵垫', '弹簧垫'], subCategory: 'MATTRESS' },
  {
    keywords: ['手控器', '电源', '配件', '遥控', '充电'],
    subCategory: 'ACCESSORY',
  },
  // Default: anything with 铁架, 架, 位, 简易架, etc. is IRON_FRAME
];

/** Composite key separator for dedup */
const KEY_SEP = '::';

// ============================================================
// Helpers
// ============================================================

/**
 * Extract plain text from a cell value, handling RichText, formula, and primitive types.
 * Reimplements getCellValue pattern from backend/src/import/utils/excel.utils.ts.
 */
function getCellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (typeof value === 'object') {
    // RichText
    if ('richText' in value) {
      return (value as ExcelJS.CellRichTextValue).richText
        .map((rt) => rt.text)
        .join('')
        .trim();
    }
    // Hyperlink
    if ('hyperlink' in value) {
      return (value as ExcelJS.CellHyperlinkValue).text || '';
    }
    // Formula — use pre-computed result
    if ('result' in value) {
      const result = (value as ExcelJS.CellFormulaValue).result;
      if (result === null || result === undefined) return '';
      if (typeof result === 'string') return result.trim();
      if (typeof result === 'number' || typeof result === 'boolean')
        return result.toString();
      if (result instanceof Date) return result.toISOString();
      return '';
    }
  }

  return '';
}

/**
 * Parse a numeric value from a cell. Returns null for empty/non-numeric values.
 */
function parseCellNumber(cell: ExcelJS.Cell): number | null {
  const str = getCellText(cell);
  if (!str) return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Determine subCategory from product name and sheet context.
 * Falls back to IRON_FRAME for generic products.
 */
function inferSubCategory(
  productName: string,
  sheetContext: string,
): string {
  const combined = (productName + ' ' + sheetContext).toLowerCase();

  for (const rule of SUBCATEGORY_KEYWORDS) {
    if (rule.keywords.some((kw) => combined.includes(kw))) {
      return rule.subCategory;
    }
  }

  // Default to IRON_FRAME for mechanical products
  return 'IRON_FRAME';
}

/**
 * Resolve supplier name from raw value using SUPPLIER_MAP.
 * If not found, returns the raw value as-is and logs a warning.
 */
function resolveSupplier(raw: string, warnings: Set<string>): string {
  if (!raw) return '';
  if (SUPPLIER_MAP[raw]) return SUPPLIER_MAP[raw];

  // Check case-insensitive
  const key = Object.keys(SUPPLIER_MAP).find(
    (k) => k.toLowerCase() === raw.toLowerCase(),
  );
  if (key) return SUPPLIER_MAP[key];

  // Unmapped — use as-is but warn
  warnings.add(raw);
  return raw;
}

// ============================================================
// Sheet Parsers
// ============================================================

interface ProductRow {
  subCategory: string;
  modelNumber: string;
  name: string;
  specification: string;
  defaultPrice: number | null;
  supplierName: string;
  purchasePrice: number | null;
  notes: string;
}

/**
 * Parse the main sheet (铁架电机2023.7.31).
 * Multi-row header (rows 1-4), data from row 5.
 * Columns: 1=型号, 2=产品名称, 3=规格尺寸, 7=2024.10采购价, 8=销售价, 16=供应商, 17=备注
 */
function parseMainSheet(
  ws: ExcelJS.Worksheet,
  warnings: Set<string>,
): { rows: ProductRow[]; skipped: number } {
  const rows: ProductRow[] = [];
  let skipped = 0;

  for (let r = 5; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    const modelNumber = getCellText(row.getCell(1));
    const name = getCellText(row.getCell(2));
    const specification = getCellText(row.getCell(3));

    // Skip rows where modelNumber is empty (subtotal/summary rows)
    if (!modelNumber) {
      skipped++;
      continue;
    }

    // Use 2024.10采购价 (col 7) as purchasePrice — the most recent
    const purchasePrice = parseCellNumber(row.getCell(7));

    // Use 老组装销售价 (col 8) as defaultPrice
    const defaultPrice = parseCellNumber(row.getCell(8));

    const supplierRaw = getCellText(row.getCell(16));
    const supplierName = resolveSupplier(supplierRaw, warnings);
    const notes = getCellText(row.getCell(17));

    const subCategory = inferSubCategory(name, '铁架');

    rows.push({
      subCategory,
      modelNumber,
      name,
      specification,
      defaultPrice,
      supplierName: supplierName || 'Unknown',
      purchasePrice,
      notes,
    });
  }

  return { rows, skipped };
}

/**
 * Parse the mattress sheet (床垫).
 * Simple layout: row 1 = headers, data from row 2.
 * Columns: 1=品名, 2=规格(CM), 3=采购价, 4=卖价
 */
function parseMattressSheet(
  ws: ExcelJS.Worksheet,
): { rows: ProductRow[]; skipped: number } {
  const rows: ProductRow[] = [];
  let skipped = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    const name = getCellText(row.getCell(1));
    if (!name) {
      skipped++;
      continue;
    }

    const specification = getCellText(row.getCell(2));
    const purchasePrice = parseCellNumber(row.getCell(3));
    const defaultPrice = parseCellNumber(row.getCell(4));

    // Generate a modelNumber for mattresses (they don't have model numbers)
    const modelNumber = `MAT-${String(r - 1).padStart(3, '0')}`;

    rows.push({
      subCategory: 'MATTRESS',
      modelNumber,
      name,
      specification,
      defaultPrice,
      supplierName: 'Unknown',
      purchasePrice,
      notes: '',
    });
  }

  return { rows, skipped };
}

/**
 * Parse motor/electric mechanism sheets (电动零重力, 电动带摇带转).
 * Layout varies: may have header "Price List" row, then column headers, then data.
 * Key columns: 1=产品型号, 2=产品描述, 3=产品名称, 4=采购价, 6=销售价, 8=供应商
 */
function parseMotorSheet(
  ws: ExcelJS.Worksheet,
  sheetName: string,
  warnings: Set<string>,
): { rows: ProductRow[]; skipped: number } {
  const rows: ProductRow[] = [];
  let skipped = 0;

  // Find data start row: skip "Price List" and header rows
  let dataStart = 1;
  for (let r = 1; r <= Math.min(5, ws.rowCount); r++) {
    const firstCell = getCellText(ws.getRow(r).getCell(1));
    if (
      firstCell.includes('Price List') ||
      firstCell === '产品型号' ||
      firstCell === '型号'
    ) {
      dataStart = r + 1;
    }
  }

  for (let r = dataStart; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    const modelNumber = getCellText(row.getCell(1));
    const description = getCellText(row.getCell(2));
    const name = getCellText(row.getCell(3));

    // Skip rows with no model number AND no name (blank/subtotal rows)
    if (!modelNumber && !name) {
      skipped++;
      continue;
    }

    const purchasePrice = parseCellNumber(row.getCell(4));
    const defaultPrice = parseCellNumber(row.getCell(6));
    const supplierRaw = getCellText(row.getCell(8));
    const supplierName = resolveSupplier(supplierRaw, warnings);
    const notes = getCellText(row.getCell(9));

    // Use name if available, fall back to description
    const productName = name || description;

    const subCategory = inferSubCategory(
      productName,
      sheetName,
    );

    rows.push({
      subCategory,
      modelNumber: modelNumber || `${sheetName.substring(0, 3)}-${String(r).padStart(3, '0')}`,
      name: productName,
      specification: '',
      defaultPrice,
      supplierName: supplierName || 'Unknown',
      purchasePrice,
      notes,
    });
  }

  return { rows, skipped };
}

/**
 * Parse per-supplier sheets (ASH/LFH/JZD铁架电机价格).
 * Layout: rows 1-2 = title, rows 3-4 = headers, data from row 5.
 * Columns: 1=型号, 2=产品名称, 3=规格尺寸, 4=采购价(old), 5=采购价(new), 6=销售价(old), 7=销售价(new), 8=供应商
 */
function parseSupplierSheet(
  ws: ExcelJS.Worksheet,
  sheetName: string,
  warnings: Set<string>,
): { rows: ProductRow[]; skipped: number } {
  const rows: ProductRow[] = [];
  let skipped = 0;

  // Extract supplier prefix from sheet name (e.g., "ASH铁架电机价格" -> "ASH")
  const supplierPrefix =
    sheetName.replace(/铁架电机价格.*$/, '') || sheetName;

  for (let r = 5; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    const modelNumber = getCellText(row.getCell(1));
    const name = getCellText(row.getCell(2));
    const specification = getCellText(row.getCell(3));

    if (!modelNumber) {
      skipped++;
      continue;
    }

    // Use column 5 (新组装价/latest purchase price) as purchasePrice
    const purchasePrice = parseCellNumber(row.getCell(5));
    // Use column 7 (新组装销售价) as defaultPrice; fall back to col 6
    let defaultPrice = parseCellNumber(row.getCell(7));
    if (defaultPrice === null) {
      defaultPrice = parseCellNumber(row.getCell(6));
    }

    const supplierRaw = getCellText(row.getCell(8));
    const supplierName = resolveSupplier(
      supplierRaw || supplierPrefix,
      warnings,
    );
    const notes = getCellText(row.getCell(9));

    const subCategory = inferSubCategory(name, '铁架');

    rows.push({
      subCategory,
      modelNumber,
      name,
      specification,
      defaultPrice,
      supplierName: supplierName || supplierPrefix,
      purchasePrice,
      notes: notes || `Source: ${sheetName}`,
    });
  }

  return { rows, skipped };
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  console.log('=== Product Price List Preparation ===');
  console.log(`Input:  ${INPUT_FILE}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log();

  // Ensure input file exists
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`ERROR: Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read input workbook
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(INPUT_FILE);

  console.log(`Workbook loaded: ${workbook.worksheets.length} sheets`);
  console.log(`Sheets: ${workbook.worksheets.map((s) => s.name).join(', ')}`);
  console.log();

  const allRows: ProductRow[] = [];
  const supplierWarnings = new Set<string>();
  const sheetStats: Array<{ sheet: string; rows: number; skipped: number }> =
    [];

  for (const ws of workbook.worksheets) {
    const name = ws.name;

    // Skip empty sheets
    if (name === 'Sheet2' || ws.rowCount <= 1) {
      console.log(`  Skipping "${name}" (empty/utility sheet)`);
      continue;
    }

    let result: { rows: ProductRow[]; skipped: number };

    if (name === '铁架电机2023.7.31') {
      result = parseMainSheet(ws, supplierWarnings);
    } else if (name === '床垫') {
      result = parseMattressSheet(ws);
    } else if (name === '电动零重力' || name === '电动带摇带转') {
      result = parseMotorSheet(ws, name, supplierWarnings);
    } else if (name.includes('铁架电机价格')) {
      // Per-supplier sheets: ASH/LFH/JZD
      result = parseSupplierSheet(ws, name, supplierWarnings);
    } else {
      console.log(`  Skipping "${name}" (unknown sheet type)`);
      continue;
    }

    allRows.push(...result.rows);
    sheetStats.push({
      sheet: name,
      rows: result.rows.length,
      skipped: result.skipped,
    });
    console.log(
      `  Sheet "${name}": ${result.rows.length} products, ${result.skipped} skipped`,
    );
  }

  console.log();

  // Dedup by modelNumber + name: keep one row per unique combination,
  // but allow same product from different suppliers (different supplier = different row)
  const seen = new Map<string, ProductRow>();
  const dedupRows: ProductRow[] = [];
  let dupCount = 0;

  for (const row of allRows) {
    const key = `${row.modelNumber}${KEY_SEP}${row.name}${KEY_SEP}${row.supplierName}`;
    if (seen.has(key)) {
      dupCount++;
      continue;
    }
    seen.set(key, row);
    dedupRows.push(row);
  }

  // Create output workbook with ProductImportStrategy template columns
  const outWorkbook = new ExcelJS.Workbook();
  outWorkbook.creator = 'Borealis Fabrics - Data Prep';
  outWorkbook.created = new Date();

  const outSheet = outWorkbook.addWorksheet('Products');
  outSheet.columns = [
    { header: 'subCategory*', key: 'subCategory', width: 18 },
    { header: 'modelNumber*', key: 'modelNumber', width: 22 },
    { header: 'name*', key: 'name', width: 25 },
    { header: 'specification', key: 'specification', width: 30 },
    { header: 'defaultPrice', key: 'defaultPrice', width: 15 },
    { header: 'supplierName*', key: 'supplierName', width: 30 },
    { header: 'purchasePrice*', key: 'purchasePrice', width: 18 },
    { header: 'notes', key: 'notes', width: 35 },
  ];

  // Style header row
  const headerRow = outSheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Write data rows
  for (const row of dedupRows) {
    outSheet.addRow({
      subCategory: row.subCategory,
      modelNumber: row.modelNumber,
      name: row.name,
      specification: row.specification || undefined,
      defaultPrice: row.defaultPrice ?? undefined,
      supplierName: row.supplierName,
      purchasePrice: row.purchasePrice ?? undefined,
      notes: row.notes || undefined,
    });
  }

  await outWorkbook.xlsx.writeFile(OUTPUT_FILE);

  // Summary
  console.log('=== Summary ===');
  console.log(`Total rows parsed: ${allRows.length}`);
  console.log(`Duplicates removed: ${dupCount}`);
  console.log(`Output rows written: ${dedupRows.length}`);
  console.log();

  console.log('Per-sheet breakdown:');
  for (const stat of sheetStats) {
    console.log(
      `  ${stat.sheet}: ${stat.rows} products, ${stat.skipped} rows skipped`,
    );
  }

  if (supplierWarnings.size > 0) {
    console.log(
      '\nWARNING: Unmapped supplier names (used as-is):',
    );
    for (const s of supplierWarnings) {
      console.log(`  - "${s}"`);
    }
    console.log(
      'Please review and update SUPPLIER_MAP in the script if needed.',
    );
  }

  // Category breakdown
  const catCounts: Record<string, number> = {};
  for (const row of dedupRows) {
    catCounts[row.subCategory] = (catCounts[row.subCategory] || 0) + 1;
  }
  console.log('\nCategory breakdown:');
  for (const [cat, count] of Object.entries(catCounts)) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log(`\nOutput file: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
