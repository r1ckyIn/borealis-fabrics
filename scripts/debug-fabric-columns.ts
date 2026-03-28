import * as ExcelJS from 'exceljs';
import * as path from 'path';

const INPUT_FILE = path.resolve('/Users/qinyuan/Desktop/铂润测试资料/面料价格明细2025.8.15.xlsx');

function getCellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  if (typeof value === 'object') {
    if ('richText' in value) {
      return (value as ExcelJS.CellRichTextValue).richText.map(rt => rt.text).join('').trim();
    }
    if ('result' in value) {
      const result = (value as ExcelJS.CellFormulaValue).result;
      if (result === null || result === undefined) return '';
      if (typeof result === 'string') return result.trim();
      if (typeof result === 'number') return result.toString();
      return '';
    }
  }
  return '';
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(INPUT_FILE);
  
  // Show first 5 rows of specific sheets to understand column layout
  const sheetsToCheck = ['DAVIS', 'BY', 'HF', 'ML'];
  
  for (const sheetName of sheetsToCheck) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) {
      console.log(`\n=== Sheet "${sheetName}" NOT FOUND ===`);
      continue;
    }
    
    console.log(`\n=== Sheet "${sheetName}" (${ws.rowCount} rows, ${ws.columnCount} cols) ===`);
    
    ws.eachRow((row, rowNumber) => {
      if (rowNumber > 5) return; // Only first 5 rows
      
      const cells: string[] = [];
      for (let c = 1; c <= Math.min(ws.columnCount, 12); c++) {
        const text = getCellText(row.getCell(c));
        cells.push(`[${c}]${text || '(empty)'}`);
      }
      console.log(`  Row ${rowNumber}: ${cells.join(' | ')}`);
    });
  }
}

main().catch(err => { console.error(err); process.exit(1); });
