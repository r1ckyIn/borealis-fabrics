import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ImportService } from './import.service';
import { PrismaService } from '../prisma/prisma.service';
import { FabricImportStrategy } from './strategies/fabric-import.strategy';
import { SupplierImportStrategy } from './strategies/supplier-import.strategy';
import { ProductImportStrategy } from './strategies/product-import.strategy';
import { PurchaseOrderImportStrategy } from './strategies/purchase-order-import.strategy';
import { SalesContractImportStrategy } from './strategies/sales-contract-import.strategy';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { loadTestWorkbook } from '../../test/helpers/mock-builders';

// ============================================================
// Shared Excel file helpers (used across multiple describe blocks)
// ============================================================
const createFabricExcelFile = async (
  rows: Array<Record<string, unknown>>,
): Promise<Express.Multer.File> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Fabrics');

  worksheet.columns = [
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

  rows.forEach((row) => worksheet.addRow(row));

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    fieldname: 'file',
    originalname: 'test.xlsx',
    encoding: '7bit',
    mimetype:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
  } as Express.Multer.File;
};

const createSupplierExcelFile = async (
  rows: Array<Record<string, unknown>>,
): Promise<Express.Multer.File> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Suppliers');

  worksheet.columns = [
    { header: 'companyName*', key: 'companyName', width: 30 },
    { header: 'contactName', key: 'contactName', width: 20 },
    { header: 'phone', key: 'phone', width: 20 },
    { header: 'email', key: 'email', width: 25 },
    { header: 'address', key: 'address', width: 40 },
    { header: 'status', key: 'status', width: 15 },
    { header: 'settleType', key: 'settleType', width: 15 },
    { header: 'creditDays', key: 'creditDays', width: 12 },
  ];

  rows.forEach((row) => worksheet.addRow(row));

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    fieldname: 'file',
    originalname: 'test.xlsx',
    encoding: '7bit',
    mimetype:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
  } as Express.Multer.File;
};

const createProductExcelFile = async (
  rows: Array<Record<string, unknown>>,
): Promise<Express.Multer.File> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');

  worksheet.columns = [
    { header: 'subCategory*', key: 'subCategory', width: 18 },
    { header: 'modelNumber*', key: 'modelNumber', width: 22 },
    { header: 'name*', key: 'name', width: 25 },
    { header: 'specification', key: 'specification', width: 30 },
    { header: 'defaultPrice', key: 'defaultPrice', width: 15 },
    { header: 'supplierName*', key: 'supplierName', width: 30 },
    { header: 'purchasePrice*', key: 'purchasePrice', width: 18 },
    { header: 'notes', key: 'notes', width: 35 },
  ];

  rows.forEach((row) => worksheet.addRow(row));

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    fieldname: 'file',
    originalname: 'test.xlsx',
    encoding: '7bit',
    mimetype:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
  } as Express.Multer.File;
};

describe('ImportService', () => {
  let service: ImportService;
  let module: TestingModule;

  const fabricMock = {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  };

  const supplierMock = {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  };

  const productMock = {
    findMany: jest.fn(),
    create: jest.fn(),
  };

  const productSupplierMock = {
    create: jest.fn(),
  };

  const customerMock = {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
  };

  const orderMock = {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
  };

  const orderItemMock = {
    create: jest.fn(),
  };

  const mockPrismaService = {
    fabric: fabricMock,
    supplier: supplierMock,
    product: productMock,
    productSupplier: productSupplierMock,
    customer: customerMock,
    order: orderMock,
    orderItem: orderItemMock,
    $transaction: jest.fn(),
  };
  // Set up $transaction to execute the callback with mockPrismaService
  mockPrismaService.$transaction.mockImplementation(
    (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
      fn(mockPrismaService as unknown as Record<string, unknown>),
  );

  const mockCodeGeneratorService = {
    generateCode: jest.fn().mockResolvedValue('TJ-2603-0001'),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ImportService,
        FabricImportStrategy,
        SupplierImportStrategy,
        ProductImportStrategy,
        PurchaseOrderImportStrategy,
        SalesContractImportStrategy,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CodeGeneratorService,
          useValue: mockCodeGeneratorService,
        },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================
  // Generate Fabric Template Tests
  // ============================================================
  describe('generateFabricTemplate', () => {
    it('should return a valid Excel buffer', async () => {
      const buffer = await service.generateFabricTemplate();

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should have correct sheet structure', async () => {
      const buffer = await service.generateFabricTemplate();
      const workbook = await loadTestWorkbook(buffer);

      expect(workbook.worksheets.length).toBe(2);
      expect(workbook.worksheets[0].name).toBe('Fabrics');
      expect(workbook.worksheets[1].name).toBe('Instructions');
    });

    it('should have correct column headers', async () => {
      const buffer = await service.generateFabricTemplate();
      const workbook = await loadTestWorkbook(buffer);

      const worksheet = workbook.getWorksheet('Fabrics');
      const headerRow = worksheet!.getRow(1);

      expect(headerRow.getCell(1).value).toBe('fabricCode*');
      expect(headerRow.getCell(2).value).toBe('name*');
      expect(headerRow.getCell(3).value).toBe('material');
      expect(headerRow.getCell(4).value).toBe('composition');
      expect(headerRow.getCell(5).value).toBe('color');
      expect(headerRow.getCell(6).value).toBe('weight');
      expect(headerRow.getCell(7).value).toBe('width');
      expect(headerRow.getCell(8).value).toBe('defaultPrice');
      expect(headerRow.getCell(9).value).toBe('description');
    });

    it('should have example data row', async () => {
      const buffer = await service.generateFabricTemplate();
      const workbook = await loadTestWorkbook(buffer);

      const worksheet = workbook.getWorksheet('Fabrics');
      const dataRow = worksheet!.getRow(2);

      expect(dataRow.getCell(1).value).toBe('FB-2401-0001');
      expect(dataRow.getCell(2).value).toBe('Example Fabric');
    });
  });

  // ============================================================
  // Generate Supplier Template Tests
  // ============================================================
  describe('generateSupplierTemplate', () => {
    it('should return a valid Excel buffer', async () => {
      const buffer = await service.generateSupplierTemplate();

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should have correct sheet structure', async () => {
      const buffer = await service.generateSupplierTemplate();
      const workbook = await loadTestWorkbook(buffer);

      expect(workbook.worksheets.length).toBe(2);
      expect(workbook.worksheets[0].name).toBe('Suppliers');
      expect(workbook.worksheets[1].name).toBe('Instructions');
    });

    it('should have correct column headers', async () => {
      const buffer = await service.generateSupplierTemplate();
      const workbook = await loadTestWorkbook(buffer);

      const worksheet = workbook.getWorksheet('Suppliers');
      const headerRow = worksheet!.getRow(1);

      expect(headerRow.getCell(1).value).toBe('companyName*');
      expect(headerRow.getCell(2).value).toBe('contactName');
      expect(headerRow.getCell(3).value).toBe('phone');
      expect(headerRow.getCell(4).value).toBe('email');
      expect(headerRow.getCell(5).value).toBe('address');
      expect(headerRow.getCell(6).value).toBe('status');
      expect(headerRow.getCell(7).value).toBe('settleType');
      expect(headerRow.getCell(8).value).toBe('creditDays');
    });

    it('should have example data row', async () => {
      const buffer = await service.generateSupplierTemplate();
      const workbook = await loadTestWorkbook(buffer);

      const worksheet = workbook.getWorksheet('Suppliers');
      const dataRow = worksheet!.getRow(2);

      expect(dataRow.getCell(1).value).toBe('Example Supplier Co.');
      expect(dataRow.getCell(6).value).toBe('active');
      expect(dataRow.getCell(7).value).toBe('credit');
      expect(dataRow.getCell(8).value).toBe(30);
    });
  });

  // ============================================================
  // Generate Product Template Tests
  // ============================================================
  describe('generateProductTemplate', () => {
    it('should return a valid Excel buffer', async () => {
      const buffer = await service.generateProductTemplate();

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should have correct sheet structure (Products + Instructions)', async () => {
      const buffer = await service.generateProductTemplate();
      const workbook = await loadTestWorkbook(buffer);

      expect(workbook.worksheets.length).toBe(2);
      expect(workbook.worksheets[0].name).toBe('Products');
      expect(workbook.worksheets[1].name).toBe('Instructions');
    });

    it('should have correct column headers', async () => {
      const buffer = await service.generateProductTemplate();
      const workbook = await loadTestWorkbook(buffer);

      const worksheet = workbook.getWorksheet('Products');
      const headerRow = worksheet!.getRow(1);

      expect(headerRow.getCell(1).value).toBe('subCategory*');
      expect(headerRow.getCell(2).value).toBe('modelNumber*');
      expect(headerRow.getCell(3).value).toBe('name*');
      expect(headerRow.getCell(4).value).toBe('specification');
      expect(headerRow.getCell(5).value).toBe('defaultPrice');
      expect(headerRow.getCell(6).value).toBe('supplierName*');
      expect(headerRow.getCell(7).value).toBe('purchasePrice*');
      expect(headerRow.getCell(8).value).toBe('notes');
    });

    it('should have example data row with IRON_FRAME and A4318HK-0--5', async () => {
      const buffer = await service.generateProductTemplate();
      const workbook = await loadTestWorkbook(buffer);

      const worksheet = workbook.getWorksheet('Products');
      const dataRow = worksheet!.getRow(2);

      expect(dataRow.getCell(1).value).toBe('IRON_FRAME');
      expect(dataRow.getCell(2).value).toBe('A4318HK-0--5');
      expect(dataRow.getCell(3).value).toBe('Single seat frame');
      expect(dataRow.getCell(4).value).toBe('180x80cm');
      expect(dataRow.getCell(5).value).toBe(1200);
      expect(dataRow.getCell(6).value).toBe('Example Supplier Co.');
      expect(dataRow.getCell(7).value).toBe(800);
      expect(dataRow.getCell(8).value).toBe('Standard model');
    });
  });

  // ============================================================
  // Import Fabrics Tests
  // ============================================================
  describe('importFabrics', () => {
    it('should successfully import new fabrics', async () => {
      const file = await createFabricExcelFile([
        {
          fabricCode: 'FB-TEST-001',
          name: 'Test Fabric',
          color: 'Blue',
          weight: 200,
        },
      ]);

      fabricMock.findMany.mockResolvedValue([]);
      fabricMock.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importFabrics(file);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(result.failures).toHaveLength(0);
      expect(fabricMock.createMany).toHaveBeenCalled();
    });

    it('should skip fabric with existing fabricCode', async () => {
      const file = await createFabricExcelFile([
        { fabricCode: 'FB-EXISTING', name: 'Existing Fabric' },
      ]);

      fabricMock.findMany.mockResolvedValue([{ fabricCode: 'FB-EXISTING' }]);

      const result = await service.importFabrics(file);

      expect(result.successCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(result.failures).toHaveLength(0);
    });

    it('should fail when fabricCode is missing', async () => {
      const file = await createFabricExcelFile([
        { fabricCode: '', name: 'Missing Code Fabric' },
      ]);

      fabricMock.findMany.mockResolvedValue([]);

      const result = await service.importFabrics(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('fabricCode');
    });

    it('should fail when name is missing', async () => {
      const file = await createFabricExcelFile([
        { fabricCode: 'FB-001', name: '' },
      ]);

      fabricMock.findMany.mockResolvedValue([]);

      const result = await service.importFabrics(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('name');
    });

    it('should fail on duplicate fabricCode in same file', async () => {
      const file = await createFabricExcelFile([
        { fabricCode: 'FB-DUP', name: 'First' },
        { fabricCode: 'FB-DUP', name: 'Second' },
      ]);

      fabricMock.findMany.mockResolvedValue([]);
      fabricMock.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importFabrics(file);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('Duplicate');
    });

    it('should fail on invalid material JSON', async () => {
      const file = await createFabricExcelFile([
        { fabricCode: 'FB-001', name: 'Test', material: 'invalid json' },
      ]);

      fabricMock.findMany.mockResolvedValue([]);

      const result = await service.importFabrics(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('Invalid JSON');
    });

    it('should throw BadRequestException for invalid Excel file', async () => {
      const invalidFile = {
        buffer: Buffer.from('not an excel file'),
        fieldname: 'file',
        originalname: 'invalid.xlsx',
        encoding: '7bit',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 100,
      } as Express.Multer.File;

      await expect(service.importFabrics(invalidFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for empty Excel file', async () => {
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Empty');
      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

      const emptyFile = {
        buffer,
        fieldname: 'file',
        originalname: 'empty.xlsx',
        encoding: '7bit',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: buffer.length,
      } as Express.Multer.File;

      await expect(service.importFabrics(emptyFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle multiple fabrics with partial success', async () => {
      const file = await createFabricExcelFile([
        { fabricCode: 'FB-001', name: 'Valid 1' },
        { fabricCode: '', name: 'Invalid' },
        { fabricCode: 'FB-002', name: 'Valid 2' },
      ]);

      fabricMock.findMany.mockResolvedValue([]);
      fabricMock.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importFabrics(file);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
    });
  });

  // ============================================================
  // Import Suppliers Tests
  // ============================================================
  describe('importSuppliers', () => {
    it('should successfully import new suppliers', async () => {
      const file = await createSupplierExcelFile([
        {
          companyName: 'Test Supplier',
          contactName: 'John',
          status: 'active',
          settleType: 'prepay',
        },
      ]);

      supplierMock.findMany.mockResolvedValue([]);
      supplierMock.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
    });

    it('should skip supplier with existing companyName', async () => {
      const file = await createSupplierExcelFile([
        { companyName: 'Existing Supplier' },
      ]);

      supplierMock.findMany.mockResolvedValue([
        { companyName: 'Existing Supplier' },
      ]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(result.failures).toHaveLength(0);
    });

    it('should fail when companyName is missing', async () => {
      const file = await createSupplierExcelFile([{ companyName: '' }]);

      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('companyName');
    });

    it('should fail on invalid status enum', async () => {
      const file = await createSupplierExcelFile([
        { companyName: 'Test', status: 'invalid_status' },
      ]);

      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('Invalid status');
    });

    it('should fail on invalid settleType enum', async () => {
      const file = await createSupplierExcelFile([
        { companyName: 'Test', settleType: 'invalid_type' },
      ]);

      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('Invalid settleType');
    });

    it('should fail when creditDays missing for credit settleType', async () => {
      const file = await createSupplierExcelFile([
        { companyName: 'Test', settleType: 'credit' },
      ]);

      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('creditDays');
    });

    it('should fail when creditDays exceeds 365 for credit settleType', async () => {
      const file = await createSupplierExcelFile([
        { companyName: 'Test', settleType: 'credit', creditDays: 400 },
      ]);

      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('creditDays');
    });

    it('should accept creditDays 0 for credit settleType', async () => {
      const file = await createSupplierExcelFile([
        { companyName: 'Test', settleType: 'credit', creditDays: 0 },
      ]);

      supplierMock.findMany.mockResolvedValue([]);
      supplierMock.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
    });

    it('should fail when creditDays is provided for prepay settleType', async () => {
      const file = await createSupplierExcelFile([
        { companyName: 'Test', settleType: 'prepay', creditDays: 30 },
      ]);

      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain(
        'creditDays must not be set when settleType is prepay',
      );
    });

    it('should fail on invalid email format', async () => {
      const file = await createSupplierExcelFile([
        { companyName: 'Test', email: 'invalid-email' },
      ]);

      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('email');
    });

    it('should fail on duplicate companyName in same file', async () => {
      const file = await createSupplierExcelFile([
        { companyName: 'Duplicate Co' },
        { companyName: 'Duplicate Co' },
      ]);

      supplierMock.findMany.mockResolvedValue([]);
      supplierMock.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('Duplicate');
    });

    it('should use default values for status and settleType', async () => {
      const file = await createSupplierExcelFile([
        { companyName: 'Test Supplier' },
      ]);

      supplierMock.findMany.mockResolvedValue([]);
      supplierMock.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(1);
      // The defaults are applied in the strategy
    });

    it('should handle multiple suppliers with partial success', async () => {
      const file = await createSupplierExcelFile([
        { companyName: 'Valid 1' },
        { companyName: '' },
        { companyName: 'Valid 2' },
      ]);

      supplierMock.findMany.mockResolvedValue([]);
      supplierMock.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
    });
  });

  // ============================================================
  // Import Products Tests
  // ============================================================
  describe('importProducts', () => {
    it('should successfully import new products', async () => {
      const file = await createProductExcelFile([
        {
          subCategory: 'IRON_FRAME',
          modelNumber: 'TEST-001',
          name: 'Test Product',
          specification: '180x80cm',
          defaultPrice: 1200,
          supplierName: 'Test Supplier',
          purchasePrice: 800,
          notes: 'Test note',
        },
      ]);

      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Test Supplier', isActive: true },
      ]);
      productMock.create.mockResolvedValue({
        id: 1,
        productCode: 'TJ-2603-0001',
      });
      productSupplierMock.create.mockResolvedValue({ id: 1 });

      const result = await service.importProducts(file);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(result.failures).toHaveLength(0);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should report per-row failure with row number and reason', async () => {
      const file = await createProductExcelFile([
        {
          subCategory: 'IRON_FRAME',
          modelNumber: '',
          name: 'Missing Model',
          supplierName: 'Test Supplier',
          purchasePrice: 800,
        },
      ]);

      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Test Supplier', isActive: true },
      ]);

      const result = await service.importProducts(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].rowNumber).toBe(2);
      expect(result.failures[0].reason).toContain('modelNumber');
    });

    it('should detect product strategy from product headers', async () => {
      const file = await createProductExcelFile([
        {
          subCategory: 'IRON_FRAME',
          modelNumber: 'DETECT-001',
          name: 'Strategy Detection Test',
          supplierName: 'Test Supplier',
          purchasePrice: 500,
        },
      ]);

      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Test Supplier', isActive: true },
      ]);
      productMock.create.mockResolvedValue({
        id: 1,
        productCode: 'TJ-2603-0001',
      });
      productSupplierMock.create.mockResolvedValue({ id: 1 });

      await service.importProducts(file);

      // Product strategy was detected: product.findMany called for existing keys
      expect(productMock.findMany).toHaveBeenCalled();
    });

    it('should fail when supplier not found in system', async () => {
      const file = await createProductExcelFile([
        {
          subCategory: 'IRON_FRAME',
          modelNumber: 'TEST-001',
          name: 'Test Product',
          supplierName: 'Non-existent Supplier',
          purchasePrice: 800,
        },
      ]);

      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Other Supplier', isActive: true },
      ]);

      const result = await service.importProducts(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('not found');
    });

    it('should fail on invalid subCategory enum', async () => {
      const file = await createProductExcelFile([
        {
          subCategory: 'INVALID_TYPE',
          modelNumber: 'TEST-001',
          name: 'Test Product',
          supplierName: 'Test Supplier',
          purchasePrice: 800,
        },
      ]);

      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Test Supplier', isActive: true },
      ]);

      const result = await service.importProducts(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('Invalid subCategory');
    });

    it('should fail on duplicate modelNumber+name in same file', async () => {
      const file = await createProductExcelFile([
        {
          subCategory: 'IRON_FRAME',
          modelNumber: 'DUP-001',
          name: 'Same Name',
          supplierName: 'Test Supplier',
          purchasePrice: 800,
        },
        {
          subCategory: 'IRON_FRAME',
          modelNumber: 'DUP-001',
          name: 'Same Name',
          supplierName: 'Test Supplier',
          purchasePrice: 900,
        },
      ]);

      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Test Supplier', isActive: true },
      ]);
      productMock.create.mockResolvedValue({
        id: 1,
        productCode: 'TJ-2603-0001',
      });
      productSupplierMock.create.mockResolvedValue({ id: 1 });

      const result = await service.importProducts(file);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('Duplicate');
    });
  });

  // ============================================================
  // Dry-run Mode Tests (DATA-09 — all import types)
  // ============================================================
  describe('dry-run mode', () => {
    it('should not call createBatch when dryRun is true for fabrics', async () => {
      const file = await createFabricExcelFile([
        { fabricCode: 'FB-001', name: 'Test Fabric' },
      ]);
      fabricMock.findMany.mockResolvedValue([]);

      const result = await service.importFabrics(file, true);

      expect(result.successCount).toBe(1);
      expect(fabricMock.createMany).not.toHaveBeenCalled();
    });

    it('should not call createBatch when dryRun is true for suppliers', async () => {
      const file = await createSupplierExcelFile([
        { companyName: 'Test Supplier Co' },
      ]);
      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file, true);

      expect(result.successCount).toBe(1);
      expect(supplierMock.createMany).not.toHaveBeenCalled();
    });

    it('should not call createBatch when dryRun is true for products', async () => {
      const file = await createProductExcelFile([
        {
          subCategory: 'IRON_FRAME',
          modelNumber: 'DRY-001',
          name: 'Dry Run Product',
          supplierName: 'Test Supplier',
          purchasePrice: 100,
        },
      ]);
      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Test Supplier', isActive: true },
      ]);

      const result = await service.importProducts(file, true);

      expect(result.successCount).toBe(1);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should still report validation failures in dry-run mode', async () => {
      const file = await createFabricExcelFile([
        { fabricCode: '', name: 'Test Fabric' },
      ]);
      fabricMock.findMany.mockResolvedValue([]);

      const result = await service.importFabrics(file, true);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('fabricCode');
    });

    it('should return same result structure in dry-run mode', async () => {
      const file = await createFabricExcelFile([
        { fabricCode: 'FB-001', name: 'Valid' },
        { fabricCode: '', name: 'Invalid' },
      ]);
      fabricMock.findMany.mockResolvedValue([]);

      const result = await service.importFabrics(file, true);

      expect(result).toHaveProperty('successCount');
      expect(result).toHaveProperty('failureCount');
      expect(result).toHaveProperty('skippedCount');
      expect(result).toHaveProperty('failures');
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
    });

    it('should report correct counts for products in dry-run mode', async () => {
      const file = await createProductExcelFile([
        {
          subCategory: 'IRON_FRAME',
          modelNumber: 'DRY-001',
          name: 'Valid Product',
          supplierName: 'Test Supplier',
          purchasePrice: 100,
        },
        {
          subCategory: 'IRON_FRAME',
          modelNumber: '',
          name: 'Invalid Product',
          supplierName: 'Test Supplier',
          purchasePrice: 100,
        },
      ]);
      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Test Supplier', isActive: true },
      ]);

      const result = await service.importProducts(file, true);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Strategy Detection Tests
  // ============================================================
  describe('detectStrategy (via importData)', () => {
    it('should detect fabric strategy from fabric headers', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');
      worksheet.columns = [
        { header: 'fabricCode*', key: 'fabricCode', width: 20 },
        { header: 'name*', key: 'name', width: 25 },
      ];
      worksheet.addRow({ fabricCode: 'FB-001', name: 'Test' });

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const file = {
        buffer,
        fieldname: 'file',
        originalname: 'test.xlsx',
        encoding: '7bit',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: buffer.length,
      } as Express.Multer.File;

      fabricMock.findMany.mockResolvedValue([]);
      fabricMock.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importFabrics(file);

      // Fabric strategy was detected — it uses fabric.findMany for existing keys
      expect(fabricMock.findMany).toHaveBeenCalled();
      expect(result.successCount).toBe(1);
    });

    it('should detect supplier strategy from supplier headers', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');
      worksheet.columns = [
        { header: 'companyName*', key: 'companyName', width: 30 },
        { header: 'contactName', key: 'contactName', width: 20 },
      ];
      worksheet.addRow({ companyName: 'Test Co' });

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const file = {
        buffer,
        fieldname: 'file',
        originalname: 'test.xlsx',
        encoding: '7bit',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: buffer.length,
      } as Express.Multer.File;

      supplierMock.findMany.mockResolvedValue([]);
      supplierMock.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importSuppliers(file);

      // Supplier strategy was detected — it uses supplier.findMany for existing keys
      expect(supplierMock.findMany).toHaveBeenCalled();
      expect(result.successCount).toBe(1);
    });

    it('should detect product strategy from product headers', async () => {
      // Use full 8-column layout — strategy reads columns by fixed index
      const file = await createProductExcelFile([
        {
          subCategory: 'IRON_FRAME',
          modelNumber: 'DETECT-001',
          name: 'Test Product',
          supplierName: 'Detect Supplier',
          purchasePrice: 100,
        },
      ]);

      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Detect Supplier', isActive: true },
      ]);
      productMock.create.mockResolvedValue({
        id: 1,
        productCode: 'TJ-2603-0001',
      });
      productSupplierMock.create.mockResolvedValue({ id: 1 });

      const result = await service.importProducts(file);

      // Product strategy was detected: product.findMany called for existing keys
      expect(productMock.findMany).toHaveBeenCalled();
      expect(result.successCount).toBe(1);
    });

    it('should detect fabric strategy from RichText-formatted headers', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');

      // Simulate RichText headers (as found in real business Excel files)
      worksheet.getRow(1).getCell(1).value = {
        richText: [{ font: { bold: true, size: 14 }, text: 'fabricCode*' }],
      };
      worksheet.getRow(1).getCell(2).value = {
        richText: [{ font: { bold: true, size: 14 }, text: 'name*' }],
      };
      worksheet.getRow(1).getCell(3).value = {
        richText: [{ text: 'material' }],
      };
      worksheet.getRow(1).getCell(4).value = {
        richText: [{ text: 'composition' }],
      };
      worksheet.getRow(1).getCell(5).value = {
        richText: [{ text: 'color' }],
      };
      worksheet.getRow(1).getCell(6).value = {
        richText: [{ text: 'weight' }],
      };
      worksheet.getRow(1).getCell(7).value = {
        richText: [{ text: 'width' }],
      };
      worksheet.getRow(1).getCell(8).value = {
        richText: [{ text: 'defaultPrice' }],
      };
      worksheet.getRow(1).getCell(9).value = {
        richText: [{ text: 'description' }],
      };

      // Add a data row
      const row2 = worksheet.getRow(2);
      row2.getCell(1).value = 'FB-RT-001';
      row2.getCell(2).value = 'RichText Fabric';

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const file = {
        buffer,
        fieldname: 'file',
        originalname: 'richtext.xlsx',
        encoding: '7bit',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: buffer.length,
      } as Express.Multer.File;

      fabricMock.findMany.mockResolvedValue([]);
      fabricMock.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importFabrics(file);

      // Fabric strategy was detected via RichText headers
      expect(fabricMock.findMany).toHaveBeenCalled();
      expect(result.successCount).toBe(1);
    });

    it('should throw BadRequestException for unrecognized headers', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');
      worksheet.columns = [
        { header: 'unknownField', key: 'unknownField', width: 20 },
        { header: 'anotherField', key: 'anotherField', width: 25 },
      ];
      worksheet.addRow({ unknownField: 'val', anotherField: 'val2' });

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const file = {
        buffer,
        fieldname: 'file',
        originalname: 'test.xlsx',
        encoding: '7bit',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: buffer.length,
      } as Express.Multer.File;

      await expect(service.importFabrics(file)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.importFabrics(file)).rejects.toThrow(
        'Unable to detect import type from column headers',
      );
    });
  });

  // ============================================================
  // Strategy getRowKey Tests
  // ============================================================
  describe('getRowKey', () => {
    it('FabricImportStrategy.getRowKey returns fabricCode (column 1)', () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Test');
      worksheet.columns = [
        { header: 'fabricCode*', key: 'fabricCode', width: 20 },
        { header: 'name*', key: 'name', width: 25 },
      ];
      worksheet.addRow({ fabricCode: 'FB-KEY-001', name: 'Test Fabric' });

      const row = worksheet.getRow(2);
      const fabricStrategy =
        module.get<FabricImportStrategy>(FabricImportStrategy);
      expect(fabricStrategy.getRowKey(row)).toBe('FB-KEY-001');
    });

    it('SupplierImportStrategy.getRowKey returns companyName (column 1)', () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Test');
      worksheet.columns = [
        { header: 'companyName*', key: 'companyName', width: 30 },
        { header: 'contactName', key: 'contactName', width: 20 },
      ];
      worksheet.addRow({
        companyName: 'Test Supplier Co',
        contactName: 'John',
      });

      const row = worksheet.getRow(2);
      const supplierStrategy = module.get<SupplierImportStrategy>(
        SupplierImportStrategy,
      );
      expect(supplierStrategy.getRowKey(row)).toBe('Test Supplier Co');
    });
  });
});
