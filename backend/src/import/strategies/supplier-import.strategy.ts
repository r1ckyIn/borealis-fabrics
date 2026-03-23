import { Injectable } from '@nestjs/common';
import type * as ExcelJS from 'exceljs';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ImportStrategy,
  ColumnDefinition,
  InstructionRow,
  RowValidationResult,
} from './import-strategy.interface';
import { getCellValue, parseNumber, isValidEmail } from '../utils/excel.utils';

/**
 * Supplier template column definitions
 */
const SUPPLIER_COLUMNS: ColumnDefinition[] = [
  { header: 'companyName*', key: 'companyName', width: 30 },
  { header: 'contactName', key: 'contactName', width: 20 },
  { header: 'phone', key: 'phone', width: 20 },
  { header: 'email', key: 'email', width: 25 },
  { header: 'address', key: 'address', width: 40 },
  { header: 'status', key: 'status', width: 15 },
  { header: 'settleType', key: 'settleType', width: 15 },
  { header: 'creditDays', key: 'creditDays', width: 12 },
];

/**
 * Supplier-specific instructions for the template
 */
const SUPPLIER_INSTRUCTIONS: InstructionRow[] = [
  {
    field: 'companyName',
    required: 'Yes',
    description: 'Unique supplier company name',
  },
  {
    field: 'contactName',
    required: 'No',
    description: 'Contact person name',
  },
  {
    field: 'phone',
    required: 'No',
    description: 'Phone number',
  },
  {
    field: 'email',
    required: 'No',
    description: 'Email address',
  },
  {
    field: 'address',
    required: 'No',
    description: 'Company address',
  },
  {
    field: 'status',
    required: 'No',
    description: 'Status: active, suspended, or eliminated (default: active)',
  },
  {
    field: 'settleType',
    required: 'No',
    description: 'Settlement type: prepay or credit (default: prepay)',
  },
  {
    field: 'creditDays',
    required: 'Conditional',
    description: 'Credit days (0-365). Required if settleType is credit',
  },
];

/**
 * Valid supplier status values
 */
const VALID_SUPPLIER_STATUS = ['active', 'suspended', 'eliminated'];

/**
 * Valid supplier settle types
 */
const VALID_SETTLE_TYPES = ['prepay', 'credit'];

@Injectable()
export class SupplierImportStrategy implements ImportStrategy {
  constructor(private readonly prisma: PrismaService) {}

  getColumns(): ColumnDefinition[] {
    return SUPPLIER_COLUMNS;
  }

  getInstructions(): InstructionRow[] {
    return SUPPLIER_INSTRUCTIONS;
  }

  /**
   * Match when headers contain companyName* column
   */
  matchesHeaders(headers: string[]): boolean {
    const lower = headers.map((h) => h.toLowerCase());
    return lower.includes('companyname*');
  }

  /**
   * Fetch all existing supplier company names for duplicate detection
   */
  async getExistingKeys(): Promise<Set<string>> {
    const existing = await this.prisma.supplier.findMany({
      select: { companyName: true },
    });
    return new Set(existing.map((s) => s.companyName));
  }

  /**
   * Validate a single row of supplier data.
   * Checks required fields, batch duplicates, DB duplicates,
   * status/settleType enums, creditDays constraints, and email format.
   */
  validateRow(
    row: ExcelJS.Row,
    rowNumber: number,
    batchKeys: Set<string>,
    existingKeys: Set<string>,
  ): RowValidationResult {
    const companyName = getCellValue(row, 1);

    // Validate required fields
    if (!companyName) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier: companyName || `Row ${rowNumber}`,
          reason: 'Missing required field: companyName',
        },
      };
    }

    // Check for duplicate in current import batch
    if (batchKeys.has(companyName)) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier: companyName,
          reason: 'Duplicate companyName in import file',
        },
      };
    }

    // Check if supplier already exists in DB (skip, not failure)
    if (existingKeys.has(companyName)) {
      return { valid: false, skipped: true };
    }

    // Validate status enum
    const status = getCellValue(row, 6) || 'active';
    if (!VALID_SUPPLIER_STATUS.includes(status)) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier: companyName,
          reason: `Invalid status. Must be one of: ${VALID_SUPPLIER_STATUS.join(', ')}`,
        },
      };
    }

    // Validate settleType enum
    const settleType = getCellValue(row, 7) || 'prepay';
    if (!VALID_SETTLE_TYPES.includes(settleType)) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier: companyName,
          reason: `Invalid settleType. Must be one of: ${VALID_SETTLE_TYPES.join(', ')}`,
        },
      };
    }

    // Validate creditDays
    const creditDays = parseNumber(row, 8);
    if (settleType === 'credit') {
      if (creditDays === null || creditDays < 0 || creditDays > 365) {
        return {
          valid: false,
          failure: {
            rowNumber,
            identifier: companyName,
            reason:
              'creditDays is required for credit settleType and must be between 0 and 365',
          },
        };
      }
    }

    // Reject creditDays when settleType is prepay (consistent with DTO validation)
    if (settleType === 'prepay' && creditDays !== null) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier: companyName,
          reason: 'creditDays must not be set when settleType is prepay',
        },
      };
    }

    // Validate email format if provided
    const email = getCellValue(row, 4);
    if (email && !isValidEmail(email)) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier: companyName,
          reason: 'Invalid email format',
        },
      };
    }

    return { valid: true };
  }

  /**
   * Transform a validated row into a Prisma-compatible create input
   */
  transformRow(row: ExcelJS.Row): Record<string, unknown> {
    const status = getCellValue(row, 6) || 'active';
    const settleType = getCellValue(row, 7) || 'prepay';
    const creditDays = parseNumber(row, 8);
    const email = getCellValue(row, 4);

    return {
      companyName: getCellValue(row, 1),
      contactName: getCellValue(row, 2) || undefined,
      phone: getCellValue(row, 3) || undefined,
      email: email || undefined,
      address: getCellValue(row, 5) || undefined,
      status,
      settleType,
      creditDays: creditDays ?? undefined,
    };
  }

  /**
   * Bulk-create supplier entities using a transaction
   */
  async createBatch(entities: Record<string, unknown>[]): Promise<number> {
    await this.prisma.$transaction(
      entities.map((supplier) =>
        this.prisma.supplier.create({
          data: supplier as Prisma.SupplierCreateInput,
        }),
      ),
    );
    return entities.length;
  }
}
