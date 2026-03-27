import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ImportResultDto, ImportFailureDto } from './dto';
import type { ImportStrategy } from './strategies/import-strategy.interface';
import { FabricImportStrategy } from './strategies/fabric-import.strategy';
import { SupplierImportStrategy } from './strategies/supplier-import.strategy';
import { ProductImportStrategy } from './strategies/product-import.strategy';
import { PurchaseOrderImportStrategy } from './strategies/purchase-order-import.strategy';
import { SalesContractImportStrategy } from './strategies/sales-contract-import.strategy';
import { getCellValue } from './utils/excel.utils';

@Injectable()
export class ImportService {
  constructor(
    private readonly fabricStrategy: FabricImportStrategy,
    private readonly supplierStrategy: SupplierImportStrategy,
    private readonly productStrategy: ProductImportStrategy,
    private readonly purchaseOrderStrategy: PurchaseOrderImportStrategy,
    private readonly salesContractStrategy: SalesContractImportStrategy,
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
   * Generate product import template Excel file
   */
  async generateProductTemplate(): Promise<Buffer> {
    return this.generateTemplate(this.productStrategy, 'Products', {
      subCategory: 'IRON_FRAME',
      modelNumber: 'A4318HK-0--5',
      name: 'Single seat frame',
      specification: '180x80cm',
      defaultPrice: 1200,
      supplierName: 'Example Supplier Co.',
      purchasePrice: 800,
      notes: 'Standard model',
    });
  }

  /**
   * Import fabrics from Excel file.
   * Delegates to the generic importData which auto-detects strategy from headers.
   */
  async importFabrics(
    file: Express.Multer.File,
    dryRun = false,
  ): Promise<ImportResultDto> {
    return this.importData(file, dryRun);
  }

  /**
   * Import suppliers from Excel file.
   * Delegates to the generic importData which auto-detects strategy from headers.
   */
  async importSuppliers(
    file: Express.Multer.File,
    dryRun = false,
  ): Promise<ImportResultDto> {
    return this.importData(file, dryRun);
  }

  /**
   * Import products from Excel file.
   * Delegates to the generic importData which auto-detects strategy from headers.
   */
  async importProducts(
    file: Express.Multer.File,
    dryRun = false,
  ): Promise<ImportResultDto> {
    return this.importData(file, dryRun);
  }

  /**
   * Import purchase orders from Excel (采购单 format).
   * Non-standard layout: metadata rows 1-3, headers row 4, data row 5+.
   * Creates products + supplier pricing + Order + OrderItems from PO line items.
   */
  async importPurchaseOrders(
    file: Express.Multer.File,
    dryRun = false,
  ): Promise<ImportResultDto> {
    return this.importNonStandardData(
      file,
      this.purchaseOrderStrategy,
      4,
      dryRun,
    );
  }

  /**
   * Import sales contracts from Excel (购销合同/客户订单 format).
   * Non-standard layout: metadata rows 1-8, headers ~row 9, data row 10+.
   * Creates orders with items referencing existing fabrics/products.
   * Handles BOTH 购销合同 and 客户订单 files (same layout template).
   */
  async importSalesContracts(
    file: Express.Multer.File,
    dryRun = false,
  ): Promise<ImportResultDto> {
    return this.importNonStandardData(
      file,
      this.salesContractStrategy,
      9,
      dryRun,
    );
  }

  /**
   * Generic import: load workbook, detect strategy from headers,
   * validate/transform/create via strategy methods.
   * When dryRun=true, full validation runs but createBatch is skipped.
   */
  private async importData(
    file: Express.Multer.File,
    dryRun = false,
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
      const key = strategy.getRowKey(row);
      batchKeys.add(key);

      entitiesToCreate.push(strategy.transformRow(row));
    });

    if (entitiesToCreate.length > 0 && !dryRun) {
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
   * Import from non-standard Excel files with metadata rows before the data table.
   * Skips all rows before headerRowNumber (metadata), then processes data rows.
   *
   * For SalesContractImportStrategy, also detects the column variant (fabric vs product)
   * from the header row and extracts customer info from metadata.
   *
   * @param file - Uploaded Excel file
   * @param strategy - The import strategy to use
   * @param headerRowNumber - 1-based row number where column headers are located
   * @param dryRun - If true, validate without writing to database
   */
  private async importNonStandardData(
    file: Express.Multer.File,
    strategy: ImportStrategy,
    headerRowNumber: number,
    dryRun = false,
  ): Promise<ImportResultDto> {
    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.load(file.buffer as unknown as ArrayBuffer);
    } catch {
      throw new BadRequestException('Invalid Excel file format');
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < headerRowNumber + 1) {
      throw new BadRequestException('Excel file has insufficient rows');
    }

    // If this is a SalesContractImportStrategy, detect variant and extract metadata
    if (strategy === this.salesContractStrategy) {
      this.configureSalesContractStrategy(worksheet, headerRowNumber);
    }

    const existingKeys = await strategy.getExistingKeys();

    // Resolve pending customer name to ID after entity maps are loaded
    if (strategy === this.salesContractStrategy) {
      const pendingName = (
        this.salesContractStrategy as unknown as {
          _pendingCustomerName: string;
        }
      )._pendingCustomerName;
      if (pendingName) {
        const customerMap = this.salesContractStrategy.getCustomerMap();
        const customerId = customerMap.get(pendingName);
        if (customerId) {
          this.salesContractStrategy.setCustomerId(customerId);
        } else {
          throw new BadRequestException(
            `Customer '${pendingName}' not found in system. Import the customer first.`,
          );
        }
      }
    }

    const batchKeys = new Set<string>();
    const failures: ImportFailureDto[] = [];
    let skippedCount = 0;
    const entitiesToCreate: Record<string, unknown>[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return; // Skip metadata + header

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

      const key = strategy.getRowKey(row);
      batchKeys.add(key);
      entitiesToCreate.push(strategy.transformRow(row));
    });

    if (entitiesToCreate.length > 0 && !dryRun) {
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
   * Configure the SalesContractImportStrategy before processing.
   * Detects column variant (fabric vs product) from header row,
   * and extracts customer name from metadata rows.
   */
  private configureSalesContractStrategy(
    worksheet: ExcelJS.Worksheet,
    headerRowNumber: number,
  ): void {
    // Detect variant from header row
    const headerRow = worksheet.getRow(headerRowNumber);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers.push(getCellValue(headerRow, colNumber));
    });
    const joined = headers.join(' ');

    if (joined.includes('面料名称')) {
      this.salesContractStrategy.setVariant('fabric');
    } else {
      this.salesContractStrategy.setVariant('product');
    }

    // Extract customer name from metadata rows (typically rows 2-5)
    // Look for patterns like "买方:" or "客户:" or just company names
    let customerName = '';
    for (let r = 1; r <= Math.min(headerRowNumber - 1, 8); r++) {
      const row = worksheet.getRow(r);
      for (let c = 1; c <= 10; c++) {
        const val = getCellValue(row, c);
        if (
          val.includes('买方') ||
          val.includes('需方') ||
          val.includes('客户')
        ) {
          // Extract name after the label (alternation, not character class)
          const match = val.match(/(?:买方|需方|客户)[：:]\s*(.+)/);
          if (match) {
            customerName = match[1].trim();
          }
        }
      }
    }

    // Try to resolve customer from pre-loaded map (need getExistingKeys first)
    // Since getExistingKeys() hasn't been called yet, we'll set a default customerId
    // The actual resolution happens after getExistingKeys() is called
    if (customerName) {
      // Store for post-getExistingKeys resolution
      (
        this.salesContractStrategy as unknown as {
          _pendingCustomerName: string;
        }
      )._pendingCustomerName = customerName;
    }
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
        if (typeof val === 'object' && 'richText' in val) {
          // Extract plain text from RichText cells (common in real business files)
          headers.push(
            val.richText.map((rt: { text: string }) => rt.text).join(''),
          );
        } else if (typeof val === 'number') {
          headers.push(val.toString());
        } else {
          headers.push('');
        }
      }
    });

    if (this.fabricStrategy.matchesHeaders(headers)) {
      return this.fabricStrategy;
    }
    if (this.supplierStrategy.matchesHeaders(headers)) {
      return this.supplierStrategy;
    }
    if (this.productStrategy.matchesHeaders(headers)) {
      return this.productStrategy;
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
