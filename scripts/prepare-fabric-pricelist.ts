/**
 * Fabric Price List Preparation Script
 *
 * Converts 面料价格明细2025.8.15.xlsx (27 sheets, ~200-300 fabrics)
 * into the template format expected by FabricImportStrategy.
 *
 * Input:  Multi-sheet workbook with supplier-grouped fabric data, RichText headers
 * Output: Single-sheet template-format xlsx at scripts/output/fabrics-prepared.xlsx
 *
 * Usage: cd scripts && npx ts-node prepare-fabric-pricelist.ts
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================
// Configuration
// ============================================================

const INPUT_FILE = path.resolve(
  '/Users/qinyuan/Desktop/铂润测试资料/面料价格明细2025.8.15.xlsx',
);

const OUTPUT_DIR = path.resolve(__dirname, 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'fabrics-prepared.xlsx');

/**
 * Supplier abbreviation to full company name mapping.
 * Sheet names in the workbook are short codes; the import system
 * needs full supplier names for lookup.
 *
 * NOTE: Some sheets are non-supplier data (exhibitions, samples, categories).
 * These are marked with null and will be skipped.
 */
const SUPPLIER_MAP: Record<string, string | null> = {
  BY: '博源纺织',
  HF: '恒丰纺织',
  ML: '美联纺织',
  KM: '科明纺织',
  XH: '新恒纺织',
  YD: '裕达顺实业',
  YN: '宜宇纺织',
  YQ: '永强纺织',
  AMR: 'AMR纺织',
  XBY: '新博源纺织',
  DAVIS: 'Davis纺织',
  OTE: '奥坦斯纺织',
  瑞茂: '瑞茂纺织',
  海宏: '海宏纺织',
  // Non-supplier sheets (exhibitions, samples, misc) — skip these
  '2025上海展面料': null,
  '奥坦斯2.23寄样': null,
  '奥坦斯 新面料报价': null,
  新面料: null,
  分类: null,
  '新面料 (2)': null,
  上海展面料: null,
  上海展新面料: null,
  新面料2: null,
  '5.9面料报价': null,
  '2024.11.27': null,
  Davis订单量: null,
  Sheet2: null,
};

// ============================================================
// Helpers
// ============================================================

/**
 * Extract plain text from a cell value, handling RichText, formula, and primitive types.
 * Reimplements getCellValue pattern from backend/src/import/utils/excel.utils.ts
 * since scripts don't share backend imports.
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
    // Formula
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
 * Parse weight and width from combined field like "260G/142CM".
 * Returns { weight, width } with nulls for unparseable values.
 */
function parseWeightWidth(combined: string): {
  weight: number | null;
  width: number | null;
} {
  if (!combined) return { weight: null, width: null };

  let weight: number | null = null;
  let width: number | null = null;

  // Try to split on "/" first
  const parts = combined.split('/');

  for (const part of parts) {
    const trimmed = part.trim().toUpperCase();

    // Match weight: digits followed by G (e.g., "260G")
    const weightMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*G/);
    if (weightMatch) {
      weight = parseFloat(weightMatch[1]);
      continue;
    }

    // Match width: digits followed by CM (e.g., "142CM")
    const widthMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*CM/);
    if (widthMatch) {
      width = parseFloat(widthMatch[1]);
      continue;
    }
  }

  return { weight, width };
}

// ============================================================
// Main
// ============================================================

interface FabricRow {
  fabricCode: string;
  name: string;
  material: string;
  composition: string;
  color: string;
  weight: number | null;
  width: number | null;
  defaultPrice: number | null;
  description: string;
}

async function main(): Promise<void> {
  console.log('=== Fabric Price List Preparation ===');
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
  console.log();

  const allRows: FabricRow[] = [];
  const unmappedSheets: string[] = [];
  const skippedSheets: string[] = [];
  let totalSkippedRows = 0;

  for (const worksheet of workbook.worksheets) {
    const sheetName = worksheet.name;

    // Check if this sheet should be skipped (non-supplier data)
    if (sheetName in SUPPLIER_MAP && SUPPLIER_MAP[sheetName] === null) {
      skippedSheets.push(sheetName);
      continue;
    }

    // Check if sheet name is unmapped
    if (!(sheetName in SUPPLIER_MAP)) {
      unmappedSheets.push(sheetName);
      // Still try to process it using sheetName as supplier abbreviation
    }

    const supplierAbbrev = sheetName;
    let rowIndex = 0;

    worksheet.eachRow((row, rowNumber) => {
      // Skip header row
      if (rowNumber === 1) return;

      // Extract cell values
      const category = getCellText(row.getCell(1)); // 分类
      const name = getCellText(row.getCell(2)); // 面料名称
      const weightWidthRaw = getCellText(row.getCell(3)); // 克重/门幅
      const color = getCellText(row.getCell(4)); // 颜色
      const composition = getCellText(row.getCell(5)); // 成份
      // Col 6: 起订量 (MOQ) — not needed for template
      // Col 7: 采购价 (purchase price) — not used as defaultPrice
      const salePriceStr = getCellText(row.getCell(8)); // 卖价 = defaultPrice

      // Skip rows with empty name (likely empty/subtotal rows)
      if (!name) {
        totalSkippedRows++;
        return;
      }

      rowIndex++;

      // Generate fabricCode: supplier abbreviation + padded row index
      const fabricCode = `${supplierAbbrev}-${String(rowIndex).padStart(3, '0')}`;

      // Parse weight/width from combined field
      const { weight, width } = parseWeightWidth(weightWidthRaw);

      // Parse sale price
      const salePrice = salePriceStr ? parseFloat(salePriceStr) : null;
      const defaultPrice =
        salePrice !== null && !isNaN(salePrice) ? salePrice : null;

      // Build description from category + any notes
      const notesRaw = getCellText(row.getCell(9)); // 备注
      const descParts: string[] = [];
      if (category) descParts.push(category);
      if (notesRaw) descParts.push(notesRaw);
      const description = descParts.join('; ');

      allRows.push({
        fabricCode,
        name,
        material: '', // Source file doesn't have JSON array format
        composition,
        color,
        weight,
        width,
        defaultPrice,
        description,
      });
    });

    if (rowIndex > 0) {
      console.log(
        `  Sheet "${sheetName}": ${rowIndex} fabrics extracted`,
      );
    }
  }

  console.log();

  // Create output workbook with template columns
  const outWorkbook = new ExcelJS.Workbook();
  outWorkbook.creator = 'Borealis Fabrics - Data Prep';
  outWorkbook.created = new Date();

  const outSheet = outWorkbook.addWorksheet('Fabrics');
  outSheet.columns = [
    { header: 'fabricCode*', key: 'fabricCode', width: 20 },
    { header: 'name*', key: 'name', width: 25 },
    { header: 'material', key: 'material', width: 30 },
    { header: 'composition', key: 'composition', width: 25 },
    { header: 'color', key: 'color', width: 15 },
    { header: 'weight', key: 'weight', width: 12 },
    { header: 'width', key: 'width', width: 12 },
    { header: 'defaultPrice', key: 'defaultPrice', width: 15 },
    { header: 'description', key: 'description', width: 40 },
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
  for (const row of allRows) {
    outSheet.addRow({
      fabricCode: row.fabricCode,
      name: row.name,
      material: row.material || undefined,
      composition: row.composition || undefined,
      color: row.color || undefined,
      weight: row.weight ?? undefined,
      width: row.width ?? undefined,
      defaultPrice: row.defaultPrice ?? undefined,
      description: row.description || undefined,
    });
  }

  await outWorkbook.xlsx.writeFile(OUTPUT_FILE);

  // Summary
  console.log('=== Summary ===');
  console.log(`Total fabrics written: ${allRows.length}`);
  console.log(`Rows skipped (empty name): ${totalSkippedRows}`);
  console.log(`Sheets skipped (non-supplier): ${skippedSheets.length}`);
  if (skippedSheets.length > 0) {
    console.log(`  Skipped: ${skippedSheets.join(', ')}`);
  }
  if (unmappedSheets.length > 0) {
    console.log(
      `\nWARNING: Unmapped supplier abbreviations (processed with abbreviation as placeholder):`,
    );
    for (const s of unmappedSheets) {
      console.log(`  - "${s}" → using "${s}" as supplier identifier`);
    }
    console.log(
      'Please review and update SUPPLIER_MAP in the script if needed.',
    );
  }
  console.log(`\nOutput file: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
