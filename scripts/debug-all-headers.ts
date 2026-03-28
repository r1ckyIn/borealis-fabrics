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
      return r ? String(r).trim() : '';
    }
  }
  return '';
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(INPUT_FILE);

  const SKIP: Record<string, boolean> = {
    '2025上海展面料': true, '奥坦斯2.23寄样': true, '奥坦斯 新面料报价': true,
    '新面料': true, '分类': true, '新面料 (2)': true, '上海展面料': true,
    '上海展新面料': true, '新面料2': true, '5.9面料报价': true,
    '2024.11.27': true, 'Davis订单量': true, 'Sheet2': true,
  };

  for (const ws of wb.worksheets) {
    if (SKIP[ws.name]) continue;

    const header = ws.getRow(1);
    const cols: string[] = [];
    for (let c = 1; c <= Math.min(ws.columnCount, 15); c++) {
      const t = getCellText(header.getCell(c));
      if (t) cols.push(`[${c}]${t}`);
    }
    const col1 = getCellText(header.getCell(1));
    const layout = col1.includes('面料名称') ? 'DAVIS-style' : 'STANDARD';
    console.log(`${ws.name} (${ws.rowCount} rows, ${layout}): ${cols.join(' | ')}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
