import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ImportService } from './import.service';
import { PrismaService } from '../prisma/prisma.service';
import { FabricImportStrategy } from './strategies/fabric-import.strategy';
import { SupplierImportStrategy } from './strategies/supplier-import.strategy';
import { loadTestWorkbook } from '../../test/helpers/mock-builders';

describe('ImportService', () => {
  let service: ImportService;

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

  const mockPrismaService = {
    fabric: fabricMock,
    supplier: supplierMock,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        FabricImportStrategy,
        SupplierImportStrategy,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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
  // Import Fabrics Tests
  // ============================================================
  describe('importFabrics', () => {
    const createMockExcelFile = async (
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

    it('should successfully import new fabrics', async () => {
      const file = await createMockExcelFile([
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
      const file = await createMockExcelFile([
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
      const file = await createMockExcelFile([
        { fabricCode: '', name: 'Missing Code Fabric' },
      ]);

      fabricMock.findMany.mockResolvedValue([]);

      const result = await service.importFabrics(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('fabricCode');
    });

    it('should fail when name is missing', async () => {
      const file = await createMockExcelFile([
        { fabricCode: 'FB-001', name: '' },
      ]);

      fabricMock.findMany.mockResolvedValue([]);

      const result = await service.importFabrics(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('name');
    });

    it('should fail on duplicate fabricCode in same file', async () => {
      const file = await createMockExcelFile([
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
      const file = await createMockExcelFile([
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
      const file = await createMockExcelFile([
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
    const createMockExcelFile = async (
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

    it('should successfully import new suppliers', async () => {
      const file = await createMockExcelFile([
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
      const file = await createMockExcelFile([
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
      const file = await createMockExcelFile([{ companyName: '' }]);

      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('companyName');
    });

    it('should fail on invalid status enum', async () => {
      const file = await createMockExcelFile([
        { companyName: 'Test', status: 'invalid_status' },
      ]);

      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('Invalid status');
    });

    it('should fail on invalid settleType enum', async () => {
      const file = await createMockExcelFile([
        { companyName: 'Test', settleType: 'invalid_type' },
      ]);

      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('Invalid settleType');
    });

    it('should fail when creditDays missing for credit settleType', async () => {
      const file = await createMockExcelFile([
        { companyName: 'Test', settleType: 'credit' },
      ]);

      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('creditDays');
    });

    it('should fail when creditDays exceeds 365 for credit settleType', async () => {
      const file = await createMockExcelFile([
        { companyName: 'Test', settleType: 'credit', creditDays: 400 },
      ]);

      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('creditDays');
    });

    it('should accept creditDays 0 for credit settleType', async () => {
      const file = await createMockExcelFile([
        { companyName: 'Test', settleType: 'credit', creditDays: 0 },
      ]);

      supplierMock.findMany.mockResolvedValue([]);
      supplierMock.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
    });

    it('should fail when creditDays is provided for prepay settleType', async () => {
      const file = await createMockExcelFile([
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
      const file = await createMockExcelFile([
        { companyName: 'Test', email: 'invalid-email' },
      ]);

      supplierMock.findMany.mockResolvedValue([]);

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('email');
    });

    it('should fail on duplicate companyName in same file', async () => {
      const file = await createMockExcelFile([
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
      const file = await createMockExcelFile([
        { companyName: 'Test Supplier' },
      ]);

      supplierMock.findMany.mockResolvedValue([]);
      supplierMock.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importSuppliers(file);

      expect(result.successCount).toBe(1);
      // The defaults are applied in the strategy
    });

    it('should handle multiple suppliers with partial success', async () => {
      const file = await createMockExcelFile([
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
});
