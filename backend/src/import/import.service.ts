import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ImportResultDto, ImportFailureDto } from './dto';
import type { ImportStrategy } from './strategies/import-strategy.interface';
import { FabricImportStrategy } from './strategies/fabric-import.strategy';
import { SupplierImportStrategy } from './strategies/supplier-import.strategy';
import { getCellValue } from './utils/excel.utils';

@Injectable()
export class ImportService {
  constructor(
    private readonly fabricStrategy: FabricImportStrategy,
    private readonly supplierStrategy: SupplierImportStrategy,
  ) {}

  /**
   * Generate fabric import template Excel file
   */
  async generateFabricTemplate(): Promise<Buffer> {
    return this.generateTemplate(this.fabricStrategy, 'Fabrics', {
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
    return this.generateTemplate(this.supplierStrategy, 'Suppliers', {
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
   * Import fabrics from Excel file.
   * Delegates to the generic importData which auto-detects strategy from headers.
   */
  async importFabrics(file: Express.Multer.File): Promise<ImportResultDto> {
    return this.importData(file);
  }

  /**
   * Import suppliers from Excel file.
   * Delegates to the generic importData which auto-detects strategy from headers.
   */
  async importSuppliers(file: Express.Multer.File): Promise<ImportResultDto> {
    return this.importData(file);
  }

  /**
   * Generic import: load workbook, detect strategy from headers,
   * validate/transform/create via strategy methods.
   */
  private async importData(
    file: Express.Multer.File,
  ): Promise<ImportResultDto> {
    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.load(file.buffer as unknown as ArrayBuffer);
    } catch {
      throw new BadRequestException('Invalid Excel file format');
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      throw new BadRequestException('Excel file is empty or has no data rows');
    }

    const strategy = this.detectStrategy(worksheet);
    const existingKeys = await strategy.getExistingKeys();
    const batchKeys = new Set<string>();
    const failures: ImportFailureDto[] = [];
    let skippedCount = 0;
    const entitiesToCreate: Record<string, unknown>[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const result = strategy.validateRow(
        row,
        rowNumber,
        batchKeys,
        existingKeys,
      );

      if (result.skipped) {
        skippedCount++;
        return;
      }

      if (!result.valid) {
        if (result.failure) {
          failures.push(result.failure);
        }
        return;
      }

      // Add key to batch for within-file duplicate detection
      const key = getCellValue(row, 1);
      batchKeys.add(key);

      entitiesToCreate.push(strategy.transformRow(row));
    });

    if (entitiesToCreate.length > 0) {
      await strategy.createBatch(entitiesToCreate);
    }

    return {
      successCount: entitiesToCreate.length,
      skippedCount,
      failureCount: failures.length,
      failures,
    };
  }

  /**
   * Detect the appropriate import strategy from worksheet headers.
   * Reads column headers from row 1 and matches against registered strategies.
   */
  private detectStrategy(worksheet: ExcelJS.Worksheet): ImportStrategy {
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];

    headerRow.eachCell((cell) => {
      const val = cell.value;
      if (typeof val === 'string') {
        headers.push(val);
      } else if (val !== null && val !== undefined) {
        headers.push(typeof val === 'number' ? val.toString() : '');
      }
    });

    if (this.fabricStrategy.matchesHeaders(headers)) {
      return this.fabricStrategy;
    }
    if (this.supplierStrategy.matchesHeaders(headers)) {
      return this.supplierStrategy;
    }

    throw new BadRequestException(
      'Unable to detect import type from column headers',
    );
  }

  /**
   * Generate a template workbook from a strategy definition.
   */
  private async generateTemplate(
    strategy: ImportStrategy,
    sheetName: string,
    exampleData: Record<string, unknown>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Borealis Fabrics';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.columns = strategy.getColumns();

    this.styleHeaderRow(worksheet);
    worksheet.addRow(exampleData);

    // Add instructions sheet
    const instructions = workbook.addWorksheet('Instructions');
    instructions.columns = [
      { header: 'Field', key: 'field', width: 20 },
      { header: 'Required', key: 'required', width: 10 },
      { header: 'Description', key: 'description', width: 60 },
    ];
    this.styleHeaderRow(instructions);
    instructions.addRows(strategy.getInstructions());

    return Buffer.from(await workbook.xlsx.writeBuffer());
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
}
