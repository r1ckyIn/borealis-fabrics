import type * as ExcelJS from 'exceljs';
import type { ImportFailureDto } from '../dto';

/**
 * Column definition for template generation
 */
export interface ColumnDefinition {
  header: string;
  key: string;
  width: number;
}

/**
 * Instruction row for the template instructions sheet
 */
export interface InstructionRow {
  field: string;
  required: string;
  description: string;
}

/**
 * Result of validating a single row
 */
export interface RowValidationResult {
  valid: boolean;
  failure?: ImportFailureDto;
  skipped?: boolean;
}

/**
 * Strategy interface for import operations.
 * Each entity type (fabric, supplier) implements this contract
 * to define its own column layout, validation, transformation, and persistence.
 */
export interface ImportStrategy {
  /** Column definitions for template generation */
  getColumns(): ColumnDefinition[];

  /** Instruction rows for the template instructions sheet */
  getInstructions(): InstructionRow[];

  /** Check if this strategy matches the given Excel headers */
  matchesHeaders(headers: string[]): boolean;

  /** Fetch existing entity keys for duplicate detection */
  getExistingKeys(): Promise<Set<string>>;

  /**
   * Validate a single row.
   * @param row - The Excel row
   * @param rowNumber - 1-based row number (including header)
   * @param batchKeys - Keys already seen in the current import batch
   * @param existingKeys - Keys that already exist in the database
   */
  validateRow(
    row: ExcelJS.Row,
    rowNumber: number,
    batchKeys: Set<string>,
    existingKeys: Set<string>,
  ): RowValidationResult;

  /** Transform a validated row into a plain object for database insertion */
  transformRow(row: ExcelJS.Row): Record<string, unknown>;

  /** Bulk-create entities in the database, return number created */
  createBatch(entities: Record<string, unknown>[]): Promise<number>;
}
