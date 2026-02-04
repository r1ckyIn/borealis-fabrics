import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ImportResultDto, ImportFailureDto } from './dto';

/**
 * Maximum number of rows allowed for import (excluding header)
 */
const MAX_IMPORT_ROWS = 1000;

/**
 * Maximum length for cell values (to prevent memory issues)
 */
const MAX_CELL_LENGTH = 1000;

/**
 * Numeric field validation ranges
 */
const NUMERIC_RANGES = {
  weight: { min: 0, max: 10000 },
  width: { min: 0, max: 10000 },
  defaultPrice: { min: 0, max: 1000000 },
  creditDays: { min: 0, max: 365 },
} as const;

/**
 * Template column definition type
 */
interface ColumnDefinition {
  header: string;
  key: string;
  width: number;
}

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
 * Valid supplier status values
 */
const VALID_SUPPLIER_STATUS = ['active', 'suspended', 'eliminated'] as const;
type SupplierStatus = (typeof VALID_SUPPLIER_STATUS)[number];

/**
 * Valid supplier settle types
 */
const VALID_SETTLE_TYPES = ['prepay', 'credit'] as const;
type SettleType = (typeof VALID_SETTLE_TYPES)[number];

/**
 * Row validation result
 */
interface RowValidationResult<T> {
  success: boolean;
  data?: T;
  failure?: ImportFailureDto;
}

/**
 * Fabric data type for creation
 */
interface FabricCreateData {
  fabricCode: string;
  name: string;
  material?: Prisma.InputJsonValue;
  composition?: string;
  color?: string;
  weight?: number;
  width?: number;
  defaultPrice?: number;
  description?: string;
}

/**
 * Supplier data type for creation
 */
interface SupplierCreateData {
  companyName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: SupplierStatus;
  settleType: SettleType;
  creditDays?: number;
}

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate fabric import template Excel file
   */
  async generateFabricTemplate(): Promise<Buffer> {
    return this.generateTemplate('Fabrics', FABRIC_COLUMNS, 'fabric', {
      fabricCode: 'FB-2401-0001',
      name: 'Example Fabric',
      material: '["Cotton","Polyester"]',
      composition: '60% Cotton, 40% Polyester',
      color: 'White',
      weight: 180,
      width: 150,
      defaultPrice: 25.5,
      description: 'Sample fabric description',
    });
  }

  /**
   * Generate supplier import template Excel file
   */
  async generateSupplierTemplate(): Promise<Buffer> {
    return this.generateTemplate('Suppliers', SUPPLIER_COLUMNS, 'supplier', {
      companyName: 'Example Supplier Co.',
      contactName: 'John Doe',
      phone: '13800138000',
      email: 'contact@example.com',
      address: '123 Example Street',
      status: 'active',
      settleType: 'credit',
      creditDays: 30,
    });
  }

  /**
   * Generate import template Excel file (common logic)
   */
  private async generateTemplate(
    sheetName: string,
    columns: ColumnDefinition[],
    instructionType: 'fabric' | 'supplier',
    exampleData: Record<string, unknown>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Borealis Fabrics';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.columns = columns;

    this.styleHeaderRow(worksheet);
    worksheet.addRow(exampleData);
    this.addInstructionsSheet(workbook, instructionType);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Import fabrics from Excel file
   */
  async importFabrics(file: Express.Multer.File): Promise<ImportResultDto> {
    const worksheet = await this.loadAndValidateWorksheet(file);

    const failures: ImportFailureDto[] = [];
    const fabricsToCreate: FabricCreateData[] = [];

    // Get existing fabric codes
    const existingFabrics = await this.prisma.fabric.findMany({
      where: { isActive: true },
      select: { fabricCode: true },
    });
    const existingCodes = new Set(existingFabrics.map((f) => f.fabricCode));

    // Process each row (skip header)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const result = this.validateFabricRow(
        row,
        rowNumber,
        existingCodes,
        fabricsToCreate,
      );

      if (result.success && result.data) {
        fabricsToCreate.push(result.data);
      } else if (result.failure) {
        failures.push(result.failure);
      }
    });

    // Bulk insert using transaction
    if (fabricsToCreate.length > 0) {
      await this.prisma.$transaction(
        fabricsToCreate.map((fabric) =>
          this.prisma.fabric.create({ data: fabric }),
        ),
      );
    }

    return {
      successCount: fabricsToCreate.length,
      failureCount: failures.length,
      failures,
    };
  }

  /**
   * Validate a single fabric row
   */
  private validateFabricRow(
    row: ExcelJS.Row,
    rowNumber: number,
    existingCodes: Set<string>,
    currentBatch: FabricCreateData[],
  ): RowValidationResult<FabricCreateData> {
    const fabricCode = this.getCellValue(row, 1);
    const name = this.getCellValue(row, 2);

    // Validate required fields
    if (!fabricCode) {
      return this.validationFailure(
        rowNumber,
        fabricCode || `Row ${rowNumber}`,
        'Missing required field: fabricCode',
      );
    }

    if (!name) {
      return this.validationFailure(
        rowNumber,
        fabricCode,
        'Missing required field: name',
      );
    }

    // Check for duplicate in current import batch
    if (currentBatch.some((f) => f.fabricCode === fabricCode)) {
      return this.validationFailure(
        rowNumber,
        fabricCode,
        'Duplicate fabricCode in import file',
      );
    }

    // Check if fabric already exists
    if (existingCodes.has(fabricCode)) {
      return this.validationFailure(
        rowNumber,
        fabricCode,
        'Fabric with this fabricCode already exists',
      );
    }

    // Parse material JSON
    let material: Prisma.InputJsonValue | undefined;
    const materialStr = this.getCellValue(row, 3);
    if (materialStr) {
      try {
        material = JSON.parse(materialStr) as Prisma.InputJsonValue;
      } catch {
        return this.validationFailure(
          rowNumber,
          fabricCode,
          'Invalid JSON format for material field',
        );
      }
    }

    // Parse and validate numeric fields
    const weight = this.parseNumber(row, 6);
    const width = this.parseNumber(row, 7);
    const defaultPrice = this.parseNumber(row, 8);

    const weightError = this.validateNumericRange(weight, 'weight');
    if (weightError) {
      return this.validationFailure(rowNumber, fabricCode, weightError);
    }

    const widthError = this.validateNumericRange(width, 'width');
    if (widthError) {
      return this.validationFailure(rowNumber, fabricCode, widthError);
    }

    const priceError = this.validateNumericRange(defaultPrice, 'defaultPrice');
    if (priceError) {
      return this.validationFailure(rowNumber, fabricCode, priceError);
    }

    return {
      success: true,
      data: {
        fabricCode,
        name,
        material,
        composition: this.getCellValue(row, 4) || undefined,
        color: this.getCellValue(row, 5) || undefined,
        weight: weight ?? undefined,
        width: width ?? undefined,
        defaultPrice: defaultPrice ?? undefined,
        description: this.getCellValue(row, 9) || undefined,
      },
    };
  }

  /**
   * Import suppliers from Excel file
   */
  async importSuppliers(file: Express.Multer.File): Promise<ImportResultDto> {
    const worksheet = await this.loadAndValidateWorksheet(file);

    const failures: ImportFailureDto[] = [];
    const suppliersToCreate: SupplierCreateData[] = [];

    // Get existing supplier names
    const existingSuppliers = await this.prisma.supplier.findMany({
      where: { isActive: true },
      select: { companyName: true },
    });
    const existingNames = new Set(existingSuppliers.map((s) => s.companyName));

    // Process each row (skip header)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const result = this.validateSupplierRow(
        row,
        rowNumber,
        existingNames,
        suppliersToCreate,
      );

      if (result.success && result.data) {
        suppliersToCreate.push(result.data);
      } else if (result.failure) {
        failures.push(result.failure);
      }
    });

    // Bulk insert using transaction
    if (suppliersToCreate.length > 0) {
      await this.prisma.$transaction(
        suppliersToCreate.map((supplier) =>
          this.prisma.supplier.create({ data: supplier }),
        ),
      );
    }

    return {
      successCount: suppliersToCreate.length,
      failureCount: failures.length,
      failures,
    };
  }

  /**
   * Validate a single supplier row
   */
  private validateSupplierRow(
    row: ExcelJS.Row,
    rowNumber: number,
    existingNames: Set<string>,
    currentBatch: SupplierCreateData[],
  ): RowValidationResult<SupplierCreateData> {
    const companyName = this.getCellValue(row, 1);

    // Validate required fields
    if (!companyName) {
      return this.validationFailure(
        rowNumber,
        companyName || `Row ${rowNumber}`,
        'Missing required field: companyName',
      );
    }

    // Check for duplicate in current import batch
    if (currentBatch.some((s) => s.companyName === companyName)) {
      return this.validationFailure(
        rowNumber,
        companyName,
        'Duplicate companyName in import file',
      );
    }

    // Check if supplier already exists
    if (existingNames.has(companyName)) {
      return this.validationFailure(
        rowNumber,
        companyName,
        'Supplier with this companyName already exists',
      );
    }

    // Validate status enum
    const statusStr = this.getCellValue(row, 6) || 'active';
    if (!this.isValidSupplierStatus(statusStr)) {
      return this.validationFailure(
        rowNumber,
        companyName,
        `Invalid status. Must be one of: ${VALID_SUPPLIER_STATUS.join(', ')}`,
      );
    }
    const status = statusStr;

    // Validate settleType enum
    const settleTypeStr = this.getCellValue(row, 7) || 'prepay';
    if (!this.isValidSettleType(settleTypeStr)) {
      return this.validationFailure(
        rowNumber,
        companyName,
        `Invalid settleType. Must be one of: ${VALID_SETTLE_TYPES.join(', ')}`,
      );
    }
    const settleType = settleTypeStr;

    // Validate creditDays
    const creditDays = this.parseNumber(row, 8);
    if (settleType === 'credit') {
      if (creditDays === null || creditDays < 0 || creditDays > 365) {
        return this.validationFailure(
          rowNumber,
          companyName,
          'creditDays is required for credit settleType and must be between 0 and 365',
        );
      }
    }

    // Reject creditDays when settleType is prepay
    if (settleType === 'prepay' && creditDays !== null) {
      return this.validationFailure(
        rowNumber,
        companyName,
        'creditDays must not be set when settleType is prepay',
      );
    }

    // Validate email format if provided
    const email = this.getCellValue(row, 4);
    if (email && !this.isValidEmail(email)) {
      return this.validationFailure(
        rowNumber,
        companyName,
        'Invalid email format',
      );
    }

    return {
      success: true,
      data: {
        companyName,
        contactName: this.getCellValue(row, 2) || undefined,
        phone: this.getCellValue(row, 3) || undefined,
        email: email || undefined,
        address: this.getCellValue(row, 5) || undefined,
        status,
        settleType,
        creditDays: creditDays ?? undefined,
      },
    };
  }

  // ============================================================
  // Common Helper Methods (DRY principle)
  // ============================================================

  /**
   * Load Excel file and validate worksheet
   */
  private async loadAndValidateWorksheet(
    file: Express.Multer.File,
  ): Promise<ExcelJS.Worksheet> {
    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.load(file.buffer as any);
    } catch {
      throw new BadRequestException('Invalid Excel file format');
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      throw new BadRequestException('Excel file is empty or has no data rows');
    }

    // Check maximum row limit (rowCount includes header)
    const dataRowCount = worksheet.rowCount - 1;
    if (dataRowCount > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `Excel file has too many rows (${dataRowCount}). Maximum allowed is ${MAX_IMPORT_ROWS}.`,
      );
    }

    return worksheet;
  }

  /**
   * Create a validation failure result
   */
  private validationFailure(
    rowNumber: number,
    identifier: string,
    reason: string,
  ): RowValidationResult<never> {
    return {
      success: false,
      failure: { rowNumber, identifier, reason },
    };
  }

  /**
   * Validate numeric value against defined range
   */
  private validateNumericRange(
    value: number | null,
    field: keyof typeof NUMERIC_RANGES,
  ): string | null {
    if (value === null) return null;

    const range = NUMERIC_RANGES[field];
    if (value < range.min || value > range.max) {
      return `${field} must be between ${range.min} and ${range.max}`;
    }
    return null;
  }

  /**
   * Type guard for supplier status
   */
  private isValidSupplierStatus(value: string): value is SupplierStatus {
    return (VALID_SUPPLIER_STATUS as readonly string[]).includes(value);
  }

  /**
   * Type guard for settle type
   */
  private isValidSettleType(value: string): value is SettleType {
    return (VALID_SETTLE_TYPES as readonly string[]).includes(value);
  }

  /**
   * Style the header row of a worksheet
   */
  private styleHeaderRow(worksheet: ExcelJS.Worksheet): void {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;
  }

  /**
   * Add instructions worksheet to workbook
   */
  private addInstructionsSheet(
    workbook: ExcelJS.Workbook,
    type: 'fabric' | 'supplier',
  ): void {
    const instructions = workbook.addWorksheet('Instructions');
    instructions.columns = [
      { header: 'Field', key: 'field', width: 20 },
      { header: 'Required', key: 'required', width: 10 },
      { header: 'Description', key: 'description', width: 60 },
    ];

    this.styleHeaderRow(instructions);

    if (type === 'fabric') {
      instructions.addRows([
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
          description: 'Weight in g/m²',
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
      ]);
    } else {
      instructions.addRows([
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
          description:
            'Status: active, suspended, or eliminated (default: active)',
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
      ]);
    }
  }

  /**
   * Get cell value as string.
   * Truncates values longer than MAX_CELL_LENGTH to prevent memory issues.
   */
  private getCellValue(row: ExcelJS.Row, colNumber: number): string {
    const cell = row.getCell(colNumber);
    if (!cell || cell.value === null || cell.value === undefined) {
      return '';
    }

    const value = cell.value;
    let result = '';

    // Handle primitive types directly
    if (typeof value === 'string') {
      result = value.trim();
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result = value.toString();
    } else if (value instanceof Date) {
      result = value.toISOString();
    } else if (typeof value === 'object') {
      // Handle object types
      // Handle rich text
      if ('richText' in value) {
        result = value.richText.map((rt) => rt.text).join('');
      }
      // Handle hyperlink
      else if ('hyperlink' in value) {
        result = value.text || '';
      }
      // Handle error (check before formula to avoid processing error strings)
      else if ('error' in value) {
        result = '';
      }
      // Handle formula
      else if ('result' in value) {
        const formulaResult = (value as ExcelJS.CellFormulaValue).result;
        if (formulaResult === null || formulaResult === undefined) {
          result = '';
        } else if (typeof formulaResult === 'string') {
          result = formulaResult.trim();
        } else if (
          typeof formulaResult === 'number' ||
          typeof formulaResult === 'boolean'
        ) {
          result = formulaResult.toString();
        } else if (formulaResult instanceof Date) {
          result = formulaResult.toISOString();
        } else {
          result = '';
        }
      }
    }

    // Truncate to maximum length to prevent memory issues
    return result.length > MAX_CELL_LENGTH
      ? result.substring(0, MAX_CELL_LENGTH)
      : result;
  }

  /**
   * Parse numeric value from cell
   */
  private parseNumber(row: ExcelJS.Row, colNumber: number): number | null {
    const strValue = this.getCellValue(row, colNumber);
    if (!strValue) return null;

    const num = parseFloat(strValue);
    return isNaN(num) ? null : num;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
