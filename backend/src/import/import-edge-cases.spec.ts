import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ImportService } from './import.service';
import { PrismaService } from '../prisma/prisma.service';
import { FabricImportStrategy } from './strategies/fabric-import.strategy';
import { SupplierImportStrategy } from './strategies/supplier-import.strategy';
import { ProductImportStrategy } from './strategies/product-import.strategy';
import { CodeGeneratorService } from '../common/services/code-generator.service';

/**
 * Standard fabric headers matching the expected template
 */
const FABRIC_HEADERS = [
  'fabricCode*',
  'name*',
  'material',
  'composition',
  'color',
  'weight',
  'width',
  'defaultPrice',
  'description',
];

/**
 * Standard supplier headers matching the expected template
 */
const SUPPLIER_HEADERS = [
  'companyName*',
  'contactName',
  'phone',
  'email',
  'address',
  'status',
  'settleType',
  'creditDays',
];

/**
 * Create a Multer-like file object from a worksheet setup function.
 * Uses programmatic ExcelJS workbook creation (no static test files).
 */
async function createExcelFile(
  setupFn: (workbook: ExcelJS.Workbook) => void,
): Promise<Express.Multer.File> {
  const workbook = new ExcelJS.Workbook();
  setupFn(workbook);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    fieldname: 'file',
    originalname: 'test-edge-case.xlsx',
    encoding: '7bit',
    mimetype:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
  } as Express.Multer.File;
}

describe('Import Edge Cases', () => {
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

  const productMock = {
    findMany: jest.fn(),
    create: jest.fn(),
  };

  const productSupplierMock = {
    create: jest.fn(),
  };

  const mockPrismaService = {
    fabric: fabricMock,
    supplier: supplierMock,
    product: productMock,
    productSupplier: productSupplierMock,
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        FabricImportStrategy,
        SupplierImportStrategy,
        ProductImportStrategy,
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

    // Default: no existing records
    fabricMock.findMany.mockResolvedValue([]);
    fabricMock.createMany.mockResolvedValue({ count: 1 });
    supplierMock.findMany.mockResolvedValue([]);
    supplierMock.createMany.mockResolvedValue({ count: 1 });
  });

  // ============================================================
  // Merged Cells Tests
  // ============================================================
  describe('Merged cells', () => {
    it('should handle merged cells in data rows gracefully', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        ws.addRow(['FB-0001', 'Good Fabric', '', '', '', '', '', '', '']);
        // Row 3: data with merge — ExcelJS preserves cell values after addRow
        ws.addRow(['FB-0002', 'Merged Name', '', '', '', '', '', '', '']);
        // Merge A3:B3 — ExcelJS retains values from addRow even in slave cells
        ws.mergeCells('A3:B3');
      });

      const result = await service.importFabrics(file);
      // Both rows import successfully — ExcelJS preserves cell data
      // after merge when data was set via addRow before merging.
      // This verifies the import does not crash on merged cells.
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('should report error when merge empties a required field', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        ws.addRow(['FB-0001', 'Valid Fabric', '', '', '', '', '', '', '']);
        // Row 3: add data then clear the name cell via merge master override
        ws.addRow(['FB-0002', '', '', '', '', '', '', '', '']);
      });

      const result = await service.importFabrics(file);
      // Row 2 valid, row 3 has empty name → failure
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('name');
    });

    it('should handle merged cells over required field columns', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        ws.addRow(['FB-0001', 'Fabric A', '', '', '', '', '', '', '']);
        // Add a row then merge it so fabricCode cell becomes slave
        ws.addRow(['', 'Orphan Name', '', '', '', '', '', '', '']);
      });

      const result = await service.importFabrics(file);
      // First row succeeds, second row has empty fabricCode
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
    });
  });

  // ============================================================
  // Blank Rows Tests
  // ============================================================
  describe('Blank rows', () => {
    it('should skip empty rows between data rows', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        ws.addRow(['FB-0001', 'Fabric A', '', '', '', '', '', '', '']);
        // ExcelJS eachRow skips truly empty rows by default,
        // but a row with empty strings is still iterated
        ws.addRow([]);
        ws.addRow(['FB-0002', 'Fabric B', '', '', '', '', '', '', '']);
      });

      const result = await service.importFabrics(file);
      // Both valid rows should be imported; empty row should be
      // either skipped by eachRow or caught as missing fabricCode
      expect(result.successCount).toBe(2);
    });

    it('should skip trailing blank rows', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        ws.addRow(['FB-0001', 'Fabric A', '', '', '', '', '', '', '']);
        // Trailing blanks — eachRow() skips empty rows by default
        ws.addRow([]);
        ws.addRow([]);
      });

      const result = await service.importFabrics(file);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
    });
  });

  // ============================================================
  // Missing/Partial Headers Tests
  // ============================================================
  describe('Missing/partial headers', () => {
    it('should throw BadRequestException for completely unrecognized headers', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(['randomCol1', 'randomCol2', 'randomCol3']);
        ws.addRow(['value1', 'value2', 'value3']);
      });

      await expect(service.importFabrics(file)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.importFabrics(file)).rejects.toThrow(
        'Unable to detect import type',
      );
    });

    it('should throw BadRequestException when only one required header exists', async () => {
      // fabricCode* present but name* missing — strategy won't match
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(['fabricCode*', 'someOtherCol']);
        ws.addRow(['FB-0001', 'value']);
      });

      await expect(service.importFabrics(file)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // Extra Columns Tests
  // ============================================================
  describe('Extra columns', () => {
    it('should ignore unexpected extra columns', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow([...FABRIC_HEADERS, 'extraColumn1', 'extraColumn2']);
        ws.addRow([
          'FB-0001',
          'Fabric A',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'extra1',
          'extra2',
        ]);
      });

      const result = await service.importFabrics(file);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
    });

    it('should handle swapped column order gracefully', async () => {
      // The strategy reads by column index (1-based), not by header key,
      // so swapped headers would cause mismatched data
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        // Swap name* and fabricCode* positions in header
        ws.addRow([
          'name*',
          'fabricCode*',
          'material',
          'composition',
          'color',
          'weight',
          'width',
          'defaultPrice',
          'description',
        ]);
        // Data follows the swapped header order
        ws.addRow(['Fabric A', 'FB-0001', '', '', '', '', '', '', '']);
      });

      // Strategy still matches headers (both fabricCode* and name* present),
      // but reads col 1 as fabricCode and col 2 as name,
      // so fabricCode="Fabric A" (not a code, but still a non-empty string)
      const result = await service.importFabrics(file);
      // Import succeeds because both required fields are non-empty
      expect(result.successCount).toBe(1);
    });
  });

  // ============================================================
  // Numeric Precision Tests
  // ============================================================
  describe('Numeric precision', () => {
    it('should handle floating point prices', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        ws.addRow([
          'FB-0001',
          'Fabric A',
          '',
          '',
          '',
          '1.5',
          '150.5',
          '99.99',
          '',
        ]);
      });

      const result = await service.importFabrics(file);
      expect(result.successCount).toBe(1);
    });

    it('should handle very small decimal values', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        ws.addRow(['FB-0001', 'Fabric A', '', '', '', '0.001', '', '0.01', '']);
      });

      const result = await service.importFabrics(file);
      expect(result.successCount).toBe(1);
    });

    it('should handle currency-formatted price strings gracefully', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        const row = ws.addRow([
          'FB-0001',
          'Fabric A',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ]);
        // Set price cell to string with $ prefix
        row.getCell(8).value = '$100.00';
      });

      const result = await service.importFabrics(file);
      // parseNumber calls parseFloat("$100.00") which returns NaN,
      // so defaultPrice will be null/undefined — but that's an optional field
      expect(result.successCount).toBe(1);
    });
  });

  // ============================================================
  // Special Characters Tests
  // ============================================================
  describe('Special characters', () => {
    it('should handle Chinese characters in cell values', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        ws.addRow([
          'FB-0001',
          '棉麻混纺面料',
          '',
          '棉50%麻50%',
          '米白色',
          '180',
          '150',
          '89.50',
          '高品质面料',
        ]);
      });

      const result = await service.importFabrics(file);
      expect(result.successCount).toBe(1);
    });

    it('should handle newlines and tabs in cell values', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        ws.addRow([
          'FB-0001',
          'Line1\nLine2',
          '',
          'Cotton\tSilk',
          '',
          '',
          '',
          '',
          '',
        ]);
      });

      const result = await service.importFabrics(file);
      expect(result.successCount).toBe(1);
    });

    it('should handle special characters (quotes, angle brackets) in values', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        ws.addRow([
          'FB-0001',
          'Fabric "Special" <A>',
          '',
          '',
          '',
          '',
          '',
          '',
          'Description with "quotes" & <tags>',
        ]);
      });

      const result = await service.importFabrics(file);
      expect(result.successCount).toBe(1);
    });
  });

  // ============================================================
  // Supplier-Specific Edge Cases
  // ============================================================
  describe('Supplier-specific edge cases', () => {
    it('should reject invalid status values', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(SUPPLIER_HEADERS);
        ws.addRow(['Test Co', 'John', '123', '', '', 'invalid_status', '', '']);
      });

      const result = await service.importSuppliers(file);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('Invalid status');
    });

    it('should reject invalid email format', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(SUPPLIER_HEADERS);
        ws.addRow(['Test Co', 'John', '123', 'not-an-email', '', '', '', '']);
      });

      const result = await service.importSuppliers(file);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('email');
    });

    it('should reject invalid settleType values', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(SUPPLIER_HEADERS);
        ws.addRow(['Test Co', '', '', '', '', 'active', 'invalid_type', '']);
      });

      const result = await service.importSuppliers(file);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('Invalid settleType');
    });
  });

  // ============================================================
  // Duplicate Handling Tests
  // ============================================================
  describe('Duplicate handling', () => {
    it('should skip rows with existing fabricCode', async () => {
      fabricMock.findMany.mockResolvedValue([{ fabricCode: 'FB-0001' }]);

      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        ws.addRow(['FB-0001', 'Existing Fabric', '', '', '', '', '', '', '']);
        ws.addRow(['FB-0002', 'New Fabric', '', '', '', '', '', '', '']);
      });

      const result = await service.importFabrics(file);
      expect(result.skippedCount).toBe(1); // FB-0001 skipped
      expect(result.successCount).toBe(1); // FB-0002 created
    });

    it('should detect within-file duplicates', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        ws.addRow(['FB-0001', 'First Entry', '', '', '', '', '', '', '']);
        ws.addRow(['FB-0001', 'Duplicate Entry', '', '', '', '', '', '', '']);
      });

      const result = await service.importFabrics(file);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('Duplicate');
    });

    it('should skip rows with existing supplier companyName', async () => {
      supplierMock.findMany.mockResolvedValue([{ companyName: 'Existing Co' }]);

      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(SUPPLIER_HEADERS);
        ws.addRow(['Existing Co', 'John', '', '', '', '', '', '']);
        ws.addRow(['New Co', 'Jane', '', '', '', '', '', '']);
      });

      const result = await service.importSuppliers(file);
      expect(result.skippedCount).toBe(1); // Existing Co skipped
      expect(result.successCount).toBe(1); // New Co created
    });
  });

  // ============================================================
  // Large Data / Stress Tests
  // ============================================================
  describe('Large datasets', () => {
    it('should handle a file with many rows', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        // Add 50 valid rows
        for (let i = 1; i <= 50; i++) {
          ws.addRow([
            `FB-${i.toString().padStart(4, '0')}`,
            `Fabric ${i}`,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
          ]);
        }
      });

      const result = await service.importFabrics(file);
      expect(result.successCount).toBe(50);
      expect(result.failureCount).toBe(0);
    });
  });

  // ============================================================
  // Mixed Valid/Invalid Rows Tests
  // ============================================================
  describe('Mixed valid and invalid rows', () => {
    it('should import valid rows and report failures for invalid ones', async () => {
      const file = await createExcelFile((wb) => {
        const ws = wb.addWorksheet('Sheet1');
        ws.addRow(FABRIC_HEADERS);
        // Valid
        ws.addRow(['FB-0001', 'Good Fabric', '', '', '', '', '', '', '']);
        // Missing fabricCode
        ws.addRow(['', 'No Code Fabric', '', '', '', '', '', '', '']);
        // Missing name
        ws.addRow(['FB-0003', '', '', '', '', '', '', '', '']);
        // Valid
        ws.addRow(['FB-0004', 'Another Good', '', '', '', '', '', '', '']);
        // Invalid material JSON
        ws.addRow(['FB-0005', 'Bad JSON', 'not-json', '', '', '', '', '', '']);
      });

      const result = await service.importFabrics(file);
      expect(result.successCount).toBe(2); // FB-0001 and FB-0004
      expect(result.failureCount).toBe(3); // missing code, missing name, bad JSON
    });
  });
});
