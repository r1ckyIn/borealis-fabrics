import { Injectable } from '@nestjs/common';
import type * as ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ImportStrategy,
  ColumnDefinition,
  InstructionRow,
  RowValidationResult,
} from './import-strategy.interface';
import { getCellValue, parseNumber } from '../utils/excel.utils';

/**
 * Fabric template column definitions
 */
const FABRIC_COLUMNS: ColumnDefinition[] = [
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

/**
 * Fabric-specific instructions for the template
 */
const FABRIC_INSTRUCTIONS: InstructionRow[] = [
  {
    field: 'fabricCode',
    required: 'Yes',
    description: 'Unique fabric code (e.g., FB-2401-0001)',
  },
  {
    field: 'name',
    required: 'Yes',
    description: 'Fabric name',
  },
  {
    field: 'material',
    required: 'No',
    description: 'JSON array of materials (e.g., ["Cotton","Polyester"])',
  },
  {
    field: 'composition',
    required: 'No',
    description: 'Material composition (e.g., 60% Cotton, 40% Polyester)',
  },
  {
    field: 'color',
    required: 'No',
    description: 'Fabric color',
  },
  {
    field: 'weight',
    required: 'No',
    description: 'Weight in g/m\u00B2',
  },
  {
    field: 'width',
    required: 'No',
    description: 'Width in cm',
  },
  {
    field: 'defaultPrice',
    required: 'No',
    description: 'Default sale price',
  },
  {
    field: 'description',
    required: 'No',
    description: 'Fabric description',
  },
];

@Injectable()
export class FabricImportStrategy implements ImportStrategy {
  constructor(private readonly prisma: PrismaService) {}

  getColumns(): ColumnDefinition[] {
    return FABRIC_COLUMNS;
  }

  getInstructions(): InstructionRow[] {
    return FABRIC_INSTRUCTIONS;
  }

  /**
   * Match when headers contain both fabricCode* and name* columns
   */
  matchesHeaders(headers: string[]): boolean {
    const lower = headers.map((h) => h.toLowerCase());
    return lower.includes('fabriccode*') && lower.includes('name*');
  }

  /**
   * Fetch all existing fabric codes for duplicate detection
   */
  async getExistingKeys(): Promise<Set<string>> {
    const existing = await this.prisma.fabric.findMany({
      select: { fabricCode: true },
    });
    return new Set(existing.map((f) => f.fabricCode));
  }

  /**
   * Validate a single row of fabric data.
   * Checks required fields, batch duplicates, DB duplicates, and material JSON.
   */
  validateRow(
    row: ExcelJS.Row,
    rowNumber: number,
    batchKeys: Set<string>,
    existingKeys: Set<string>,
  ): RowValidationResult {
    const fabricCode = getCellValue(row, 1);
    const name = getCellValue(row, 2);

    // Validate required fields
    if (!fabricCode) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier: fabricCode || `Row ${rowNumber}`,
          reason: 'Missing required field: fabricCode',
        },
      };
    }

    if (!name) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier: fabricCode,
          reason: 'Missing required field: name',
        },
      };
    }

    // Check for duplicate in current import batch
    if (batchKeys.has(fabricCode)) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier: fabricCode,
          reason: 'Duplicate fabricCode in import file',
        },
      };
    }

    // Check if fabric already exists in DB (skip, not failure)
    if (existingKeys.has(fabricCode)) {
      return { valid: false, skipped: true };
    }

    // Parse material JSON to check validity
    const materialStr = getCellValue(row, 3);
    if (materialStr) {
      try {
        JSON.parse(materialStr);
      } catch {
        return {
          valid: false,
          failure: {
            rowNumber,
            identifier: fabricCode,
            reason: 'Invalid JSON format for material field',
          },
        };
      }
    }

    return { valid: true };
  }

  /**
   * Transform a validated row into a Prisma-compatible create input
   */
  transformRow(row: ExcelJS.Row): Record<string, unknown> {
    const materialStr = getCellValue(row, 3);
    let material: Prisma.InputJsonValue | undefined;
    if (materialStr) {
      material = JSON.parse(materialStr) as Prisma.InputJsonValue;
    }

    return {
      fabricCode: getCellValue(row, 1),
      name: getCellValue(row, 2),
      material,
      composition: getCellValue(row, 4) || undefined,
      color: getCellValue(row, 5) || undefined,
      weight: parseNumber(row, 6) ?? undefined,
      width: parseNumber(row, 7) ?? undefined,
      defaultPrice: parseNumber(row, 8) ?? undefined,
      description: getCellValue(row, 9) || undefined,
    };
  }

  /**
   * Bulk-create fabric entities using a transaction
   */
  async createBatch(entities: Record<string, unknown>[]): Promise<number> {
    await this.prisma.$transaction(
      entities.map((fabric) =>
        this.prisma.fabric.create({
          data: fabric as Prisma.FabricCreateInput,
        }),
      ),
    );
    return entities.length;
  }
}
