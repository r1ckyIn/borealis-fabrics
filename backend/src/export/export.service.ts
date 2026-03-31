import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import {
  EntityFieldConfig,
  ENTITY_FIELD_CONFIG,
  ENTITY_MODEL_MAP,
} from './constants/field-config';

/**
 * Service for exporting entity data to Excel files.
 * Supports configurable field selection per entity type.
 */
@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get available field configuration for an entity type.
   * Used by frontend to display a field selection checkbox list.
   */
  getFieldConfig(entityType: string): EntityFieldConfig[] {
    const config = ENTITY_FIELD_CONFIG[entityType];
    if (!config) {
      throw new BadRequestException(
        `Unknown entity type: ${entityType}. Supported types: ${Object.keys(ENTITY_FIELD_CONFIG).join(', ')}`,
      );
    }
    return config;
  }

  /**
   * Export entity records to an Excel buffer with selected fields.
   * Returns a Buffer containing the .xlsx file content.
   */
  async export(entityType: string, fieldNames: string[]): Promise<Buffer> {
    const config = this.getFieldConfig(entityType);
    const configMap = new Map(config.map((c) => [c.field, c]));

    // Validate all requested fields exist in config
    const invalidFields = fieldNames.filter((f) => !configMap.has(f));
    if (invalidFields.length > 0) {
      throw new BadRequestException(
        `Invalid fields for ${entityType}: ${invalidFields.join(', ')}`,
      );
    }

    // Fetch records from database
    const modelName = ENTITY_MODEL_MAP[entityType];
    const delegate = (this.prisma as unknown as Record<string, unknown>)[
      modelName
    ] as { findMany: (args: unknown) => Promise<Record<string, unknown>[]> };
    const deletedAtFilter = this.getDeletedAtFilter(entityType);
    const where =
      deletedAtFilter !== undefined ? { deletedAt: deletedAtFilter } : {};
    const records = await delegate.findMany({ where });

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(entityType);

    // Set columns from selected fields
    const selectedConfigs = fieldNames.map((f) => configMap.get(f)!);
    worksheet.columns = selectedConfigs.map((c) => ({
      header: c.label,
      key: c.field,
      width: 20,
    }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    // Add data rows with formatting
    for (const record of records) {
      const rowData: Record<string, unknown> = {};
      for (const fieldConfig of selectedConfigs) {
        rowData[fieldConfig.field] = this.formatValue(
          record[fieldConfig.field],
          fieldConfig.type,
        );
      }
      worksheet.addRow(rowData);
    }

    // Write to buffer (cast needed for Node 22 strict typing compatibility)
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer) as Buffer;
  }

  /**
   * Format a cell value based on field type.
   */
  private formatValue(
    value: unknown,
    type: EntityFieldConfig['type'],
  ): string | number | boolean {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case 'date': {
        if (value instanceof Date) {
          return this.formatDate(value);
        }
        if (typeof value === 'string') {
          const parsed = new Date(value);
          return isNaN(parsed.getTime()) ? value : this.formatDate(parsed);
        }
        return typeof value === 'object'
          ? JSON.stringify(value)
          : `${value as string | number | boolean}`;
      }
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'json':
        return typeof value === 'object'
          ? JSON.stringify(value)
          : `${value as string | number | boolean}`;
      case 'number': {
        const num = Number(value);
        return isNaN(num) ? `${value as string | number | boolean}` : num;
      }
      default:
        return typeof value === 'string'
          ? value
          : `${value as number | boolean}`;
    }
  }

  /**
   * Format a Date object as YYYY-MM-DD HH:mm string.
   */
  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  }

  /**
   * Get the deletedAt filter for entity types that support soft delete.
   * Order and Quote do not have deletedAt field.
   */
  private getDeletedAtFilter(entityType: string): null | undefined {
    const entitiesWithSoftDelete = [
      'supplier',
      'customer',
      'fabric',
      'product',
    ];
    return entitiesWithSoftDelete.includes(entityType) ? null : undefined;
  }
}
