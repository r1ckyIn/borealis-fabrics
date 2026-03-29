import * as ExcelJS from 'exceljs';
import * as path from 'path';

const INPUT_FILE = path.resolve('/Users/qinyuan/Desktop/铂润测试资料/面料价格明细2025.8.15.xlsx');

function getCellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') {
    if ('richText' in value) return (value as ExcelJS.CellRichTextValue).richText.map(rt => rt.text).join('').trim();
    if ('result' in value) {
      const r = (value as ExcelJS.CellFormulaValue).result;
      return r !== null && r !== undefined ? String(r).trim() : '';
    }
  }
  return '';
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(INPUT_FILE);
  const ws = wb.getWorksheet('DAVIS')!;
  
  // Show all columns for rows that have empty Col 9 (selling price)
  console.log('DAVIS rows with empty selling price (Col 9):');
  console.log('');
  let idx = 0;
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    idx++;
    const name = getCellText(row.getCell(1));
    const col9 = getCellText(row.getCell(9));
    if (!name) return;
    
    if (!col9) {
      const allCols: string[] = [];
      for (let c = 1; c <= 14; c++) {
        const v = getCellText(row.getCell(c));
        allCols.push(`[${c}]${v || '(empty)'}`);
      }
      console.log(`  Row ${rowNumber} (idx ${idx}, code DAVIS-${String(idx).padStart(3,'0')}): ${name}`);
      console.log(`    ${allCols.join(' | ')}`);
    }
  });
  
  // Also show header for reference
  console.log('\nHeader:');
  const hdr = ws.getRow(1);
  const hCols: string[] = [];
  for (let c = 1; c <= 14; c++) {
    hCols.push(`[${c}]${getCellText(hdr.getCell(c)).replace(/\n/g, ' ') || '(empty)'}`);
  }
  console.log(`  ${hCols.join(' | ')}`);
}
main().catch(e => { console.error(e); process.exit(1); });
