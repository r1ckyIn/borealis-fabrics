import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ImportResultDto, ImportFailureDto } from './dto';

/**
 * Fabric template column definitions
 */
const FABRIC_COLUMNS = [
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
const SUPPLIER_COLUMNS = [
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
const VALID_SUPPLIER_STATUS = ['active', 'suspended', 'eliminated'];

/**
 * Valid supplier settle types
 */
const VALID_SETTLE_TYPES = ['prepay', 'credit'];

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate fabric import template Excel file
   */
  async generateFabricTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Borealis Fabrics';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Fabrics');
    worksheet.columns = FABRIC_COLUMNS;

    // Style header row
    this.styleHeaderRow(worksheet);

    // Add example data
    worksheet.addRow({
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

    // Add instructions worksheet
    this.addInstructionsSheet(workbook, 'fabric');

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Generate supplier import template Excel file
   */
  async generateSupplierTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Borealis Fabrics';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Suppliers');
    worksheet.columns = SUPPLIER_COLUMNS;

    // Style header row
    this.styleHeaderRow(worksheet);

    // Add example data
    worksheet.addRow({
      companyName: 'Example Supplier Co.',
      contactName: 'John Doe',
      phone: '13800138000',
      email: 'contact@example.com',
      address: '123 Example Street',
      status: 'active',
      settleType: 'credit',
      creditDays: 30,
    });

    // Add instructions worksheet
    this.addInstructionsSheet(workbook, 'supplier');

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Import fabrics from Excel file
   */
  async importFabrics(file: Express.Multer.File): Promise<ImportResultDto> {
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

    const failures: ImportFailureDto[] = [];
    const fabricsToCreate: Array<{
      fabricCode: string;
      name: string;
      material?: Prisma.InputJsonValue;
      composition?: string;
      color?: string;
      weight?: number;
      width?: number;
      defaultPrice?: number;
      description?: string;
    }> = [];

    // Get existing fabric codes
    const existingFabrics = await this.prisma.fabric.findMany({
      where: { isActive: true },
      select: { fabricCode: true },
    });
    const existingCodes = new Set(existingFabrics.map((f) => f.fabricCode));

    // Process each row (skip header)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const fabricCode = this.getCellValue(row, 1);
      const name = this.getCellValue(row, 2);

      // Validate required fields
      if (!fabricCode) {
        failures.push({
          rowNumber,
          identifier: fabricCode || `Row ${rowNumber}`,
          reason: 'Missing required field: fabricCode',
        });
        return;
      }

      if (!name) {
        failures.push({
          rowNumber,
          identifier: fabricCode,
          reason: 'Missing required field: name',
        });
        return;
      }

      // Check for duplicate in current import batch
      if (fabricsToCreate.some((f) => f.fabricCode === fabricCode)) {
        failures.push({
          rowNumber,
          identifier: fabricCode,
          reason: 'Duplicate fabricCode in import file',
        });
        return;
      }

      // Check if fabric already exists
      if (existingCodes.has(fabricCode)) {
        failures.push({
          rowNumber,
          identifier: fabricCode,
          reason: 'Fabric with this fabricCode already exists',
        });
        return;
      }

      // Parse material JSON
      let material: Prisma.InputJsonValue | undefined;
      const materialStr = this.getCellValue(row, 3);
      if (materialStr) {
        try {
          material = JSON.parse(materialStr) as Prisma.InputJsonValue;
        } catch {
          failures.push({
            rowNumber,
            identifier: fabricCode,
            reason: 'Invalid JSON format for material field',
          });
          return;
        }
      }

      // Parse numeric fields
      const weight = this.parseNumber(row, 6);
      const width = this.parseNumber(row, 7);
      const defaultPrice = this.parseNumber(row, 8);

      fabricsToCreate.push({
        fabricCode,
        name,
        material,
        composition: this.getCellValue(row, 4) || undefined,
        color: this.getCellValue(row, 5) || undefined,
        weight: weight ?? undefined,
        width: width ?? undefined,
        defaultPrice: defaultPrice ?? undefined,
        description: this.getCellValue(row, 9) || undefined,
      });
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
   * Import suppliers from Excel file
   */
  async importSuppliers(file: Express.Multer.File): Promise<ImportResultDto> {
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

    const failures: ImportFailureDto[] = [];
    const suppliersToCreate: Array<{
      companyName: string;
      contactName?: string;
      phone?: string;
      email?: string;
      address?: string;
      status?: string;
      settleType?: string;
      creditDays?: number;
    }> = [];

    // Get existing supplier names
    const existingSuppliers = await this.prisma.supplier.findMany({
      where: { isActive: true },
      select: { companyName: true },
    });
    const existingNames = new Set(existingSuppliers.map((s) => s.companyName));

    // Process each row (skip header)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const companyName = this.getCellValue(row, 1);

      // Validate required fields
      if (!companyName) {
        failures.push({
          rowNumber,
          identifier: companyName || `Row ${rowNumber}`,
          reason: 'Missing required field: companyName',
        });
        return;
      }

      // Check for duplicate in current import batch
      if (suppliersToCreate.some((s) => s.companyName === companyName)) {
        failures.push({
          rowNumber,
          identifier: companyName,
          reason: 'Duplicate companyName in import file',
        });
        return;
      }

      // Check if supplier already exists
      if (existingNames.has(companyName)) {
        failures.push({
          rowNumber,
          identifier: companyName,
          reason: 'Supplier with this companyName already exists',
        });
        return;
      }

      // Validate status enum
      const status = this.getCellValue(row, 6) || 'active';
      if (!VALID_SUPPLIER_STATUS.includes(status)) {
        failures.push({
          rowNumber,
          identifier: companyName,
          reason: `Invalid status. Must be one of: ${VALID_SUPPLIER_STATUS.join(', ')}`,
        });
        return;
      }

      // Validate settleType enum
      const settleType = this.getCellValue(row, 7) || 'prepay';
      if (!VALID_SETTLE_TYPES.includes(settleType)) {
        failures.push({
          rowNumber,
          identifier: companyName,
          reason: `Invalid settleType. Must be one of: ${VALID_SETTLE_TYPES.join(', ')}`,
        });
        return;
      }

      // Validate creditDays
      const creditDays = this.parseNumber(row, 8);
      if (settleType === 'credit') {
        if (creditDays === null || creditDays < 0 || creditDays > 365) {
          failures.push({
            rowNumber,
            identifier: companyName,
            reason:
              'creditDays is required for credit settleType and must be between 0 and 365',
          });
          return;
        }
      }

      // Validate email format if provided
      const email = this.getCellValue(row, 4);
      if (email && !this.isValidEmail(email)) {
        failures.push({
          rowNumber,
          identifier: companyName,
          reason: 'Invalid email format',
        });
        return;
      }

      suppliersToCreate.push({
        companyName,
        contactName: this.getCellValue(row, 2) || undefined,
        phone: this.getCellValue(row, 3) || undefined,
        email: email || undefined,
        address: this.getCellValue(row, 5) || undefined,
        status,
        settleType,
        creditDays: creditDays ?? undefined,
      });
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
   * Get cell value as string
   */
  private getCellValue(row: ExcelJS.Row, colNumber: number): string {
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
