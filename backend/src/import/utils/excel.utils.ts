import * as ExcelJS from 'exceljs';

/**
 * Extract cell value as a trimmed string.
 * Handles null, undefined, primitives, Date, rich text, hyperlinks,
 * error cells, and formula results.
 */
export function getCellValue(row: ExcelJS.Row, colNumber: number): string {
  const cell = row.getCell(colNumber);
  if (!cell || cell.value === null || cell.value === undefined) {
    return '';
  }

  const value = cell.value;

  // Handle primitive types directly
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle object types
  if (typeof value === 'object') {
    // Handle rich text
    if ('richText' in value) {
      return value.richText.map((rt) => rt.text).join('');
    }
    // Handle hyperlink
    if ('hyperlink' in value) {
      return value.text || '';
    }
    // Handle error (check before formula to avoid processing error strings)
    if ('error' in value) {
      return '';
    }
    // Handle formula
    if ('result' in value) {
      const formulaResult = (value as ExcelJS.CellFormulaValue).result;
      if (formulaResult === null || formulaResult === undefined) {
        return '';
      }
      if (typeof formulaResult === 'string') {
        return formulaResult.trim();
      }
      if (
        typeof formulaResult === 'number' ||
        typeof formulaResult === 'boolean'
      ) {
        return formulaResult.toString();
      }
      if (formulaResult instanceof Date) {
        return formulaResult.toISOString();
      }
      return '';
    }
  }

  // Fallback: should not reach here with proper typing
  return '';
}

/**
 * Parse a numeric value from a cell.
 * Returns null if the cell is empty or the value is not a valid number.
 */
export function parseNumber(
  row: ExcelJS.Row,
  colNumber: number,
): number | null {
  const strValue = getCellValue(row, colNumber);
  if (!strValue) return null;

  const num = parseFloat(strValue);
  return isNaN(num) ? null : num;
}

/**
 * Validate email format using a simple regex.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Normalize a cell value for header matching.
 * - Extract plain text from RichText objects
 * - Trim whitespace
 * - Lowercase for case-insensitive matching
 */
export function normalizeHeaderValue(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'richText' in value) {
    return (value.richText as Array<{ text: string }>)
      .map((rt) => rt.text)
      .join('')
      .trim()
      .toLowerCase();
  }
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString().trim().toLowerCase();
  }
  // Fallback for Date and other object types
  return '';
}
