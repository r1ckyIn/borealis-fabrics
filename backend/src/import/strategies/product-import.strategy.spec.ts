import { Test, TestingModule } from '@nestjs/testing';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { ProductImportStrategy } from './product-import.strategy';

/**
 * Helper to create an ExcelJS row with product import columns.
 * Column order: subCategory(1), modelNumber(2), name(3), specification(4),
 * defaultPrice(5), supplierName(6), purchasePrice(7), notes(8)
 */
function createProductRow(
  data: Partial<{
    subCategory: string;
    modelNumber: string;
    name: string;
    specification: string;
    defaultPrice: number;
    supplierName: string;
    purchasePrice: number;
    notes: string;
  }>,
): { row: ExcelJS.Row; worksheet: ExcelJS.Worksheet } {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test');
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
  worksheet.addRow(data);
  return { row: worksheet.getRow(2), worksheet };
}

describe('ProductImportStrategy', () => {
  let strategy: ProductImportStrategy;

  const productMock = {
    findMany: jest.fn(),
    create: jest.fn(),
  };

  const productSupplierMock = {
    create: jest.fn(),
  };

  const supplierMock = {
    findMany: jest.fn(),
  };

  const mockTransaction = jest.fn();

  const mockPrisma = {
    product: productMock,
    productSupplier: productSupplierMock,
    supplier: supplierMock,
    $transaction: mockTransaction,
  };

  const mockCodeGenerator = {
    generateCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductImportStrategy,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CodeGeneratorService, useValue: mockCodeGenerator },
      ],
    }).compile();

    strategy = module.get<ProductImportStrategy>(ProductImportStrategy);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  // ============================================================
  // getColumns
  // ============================================================
  describe('getColumns', () => {
    it('should return 8 columns matching template spec', () => {
      const columns = strategy.getColumns();
      expect(columns).toHaveLength(8);
      expect(columns.map((c) => c.header)).toEqual([
        'subCategory*',
        'modelNumber*',
        'name*',
        'specification',
        'defaultPrice',
        'supplierName*',
        'purchasePrice*',
        'notes',
      ]);
    });
  });

  // ============================================================
  // getInstructions
  // ============================================================
  describe('getInstructions', () => {
    it('should return instruction rows for all 8 fields', () => {
      const instructions = strategy.getInstructions();
      expect(instructions).toHaveLength(8);
      const fields = instructions.map((i) => i.field);
      expect(fields).toContain('subCategory');
      expect(fields).toContain('modelNumber');
      expect(fields).toContain('name');
      expect(fields).toContain('supplierName');
      expect(fields).toContain('purchasePrice');
    });

    it('should mark required fields correctly', () => {
      const instructions = strategy.getInstructions();
      const requiredFields = instructions
        .filter((i) => i.required === 'Yes')
        .map((i) => i.field);
      expect(requiredFields).toEqual(
        expect.arrayContaining([
          'subCategory',
          'modelNumber',
          'name',
          'supplierName',
          'purchasePrice',
        ]),
      );
    });
  });

  // ============================================================
  // matchesHeaders
  // ============================================================
  describe('matchesHeaders', () => {
    it('should match product headers', () => {
      const headers = [
        'subCategory*',
        'modelNumber*',
        'name*',
        'specification',
        'defaultPrice',
        'supplierName*',
        'purchasePrice*',
        'notes',
      ];
      expect(strategy.matchesHeaders(headers)).toBe(true);
    });

    it('should not match fabric headers', () => {
      const headers = ['fabricCode*', 'name*', 'material', 'color'];
      expect(strategy.matchesHeaders(headers)).toBe(false);
    });

    it('should match case-insensitive headers', () => {
      const headers = [
        'SubCategory*',
        'ModelNumber*',
        'Name*',
        'supplierName*',
        'purchasePrice*',
      ];
      expect(strategy.matchesHeaders(headers)).toBe(true);
    });
  });

  // ============================================================
  // getRowKey
  // ============================================================
  describe('getRowKey', () => {
    it('should return composite key modelNumber::name', () => {
      const { row } = createProductRow({
        subCategory: 'IRON_FRAME',
        modelNumber: 'A4318HK',
        name: 'Single Seat',
      });
      expect(strategy.getRowKey(row)).toBe('A4318HK::Single Seat');
    });
  });

  // ============================================================
  // getExistingKeys
  // ============================================================
  describe('getExistingKeys', () => {
    it('should return Set of modelNumber::name composite keys from DB', async () => {
      productMock.findMany.mockResolvedValue([
        { modelNumber: 'A001', name: 'Frame A' },
        { modelNumber: 'B002', name: 'Motor B' },
        { modelNumber: null, name: 'No Model' },
      ]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Supplier A' },
      ]);

      const keys = await strategy.getExistingKeys();

      expect(keys.has('A001::Frame A')).toBe(true);
      expect(keys.has('B002::Motor B')).toBe(true);
      // Products without modelNumber are filtered out
      expect(keys.size).toBe(2);
    });
  });

  // ============================================================
  // validateRow
  // ============================================================
  describe('validateRow', () => {
    // Pre-load supplier map before validation tests
    beforeEach(async () => {
      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Valid Supplier' },
      ]);
      await strategy.getExistingKeys();
    });

    it('should return failure when subCategory is missing', () => {
      const { row } = createProductRow({
        modelNumber: 'M001',
        name: 'Test',
        supplierName: 'Valid Supplier',
        purchasePrice: 100,
      });
      const result = strategy.validateRow(
        row,
        2,
        new Set(),
        new Set(),
      );
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('subCategory');
    });

    it('should return failure when modelNumber is missing', () => {
      const { row } = createProductRow({
        subCategory: 'IRON_FRAME',
        name: 'Test',
        supplierName: 'Valid Supplier',
        purchasePrice: 100,
      });
      const result = strategy.validateRow(
        row,
        2,
        new Set(),
        new Set(),
      );
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('modelNumber');
    });

    it('should return failure when name is missing', () => {
      const { row } = createProductRow({
        subCategory: 'IRON_FRAME',
        modelNumber: 'M001',
        supplierName: 'Valid Supplier',
        purchasePrice: 100,
      });
      const result = strategy.validateRow(
        row,
        2,
        new Set(),
        new Set(),
      );
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('name');
    });

    it('should return failure when supplierName is missing', () => {
      const { row } = createProductRow({
        subCategory: 'IRON_FRAME',
        modelNumber: 'M001',
        name: 'Test',
        purchasePrice: 100,
      });
      const result = strategy.validateRow(
        row,
        2,
        new Set(),
        new Set(),
      );
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('supplierName');
    });

    it('should return failure when purchasePrice is missing', () => {
      const { row } = createProductRow({
        subCategory: 'IRON_FRAME',
        modelNumber: 'M001',
        name: 'Test',
        supplierName: 'Valid Supplier',
      });
      const result = strategy.validateRow(
        row,
        2,
        new Set(),
        new Set(),
      );
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('purchasePrice');
    });

    it('should return failure when subCategory is invalid', () => {
      const { row } = createProductRow({
        subCategory: 'INVALID_TYPE',
        modelNumber: 'M001',
        name: 'Test',
        supplierName: 'Valid Supplier',
        purchasePrice: 100,
      });
      const result = strategy.validateRow(
        row,
        2,
        new Set(),
        new Set(),
      );
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('subCategory');
    });

    it('should return failure (not skip) when duplicate exists in DB', () => {
      const { row } = createProductRow({
        subCategory: 'IRON_FRAME',
        modelNumber: 'EXISTING',
        name: 'Existing Product',
        supplierName: 'Valid Supplier',
        purchasePrice: 100,
      });
      const existingKeys = new Set(['EXISTING::Existing Product']);
      const result = strategy.validateRow(
        row,
        2,
        new Set(),
        existingKeys,
      );
      expect(result.valid).toBe(false);
      // Critical: must be failure, NOT skipped
      expect(result.failure).toBeDefined();
      expect(result.skipped).toBeFalsy();
      expect(result.failure?.reason).toContain('Duplicate');
    });

    it('should return failure when duplicate exists in batch', () => {
      const { row } = createProductRow({
        subCategory: 'IRON_FRAME',
        modelNumber: 'M001',
        name: 'Batch Dup',
        supplierName: 'Valid Supplier',
        purchasePrice: 100,
      });
      const batchKeys = new Set(['M001::Batch Dup']);
      const result = strategy.validateRow(
        row,
        2,
        batchKeys,
        new Set(),
      );
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('Duplicate');
    });

    it('should return failure when supplier name not found in supplier map', () => {
      const { row } = createProductRow({
        subCategory: 'IRON_FRAME',
        modelNumber: 'M001',
        name: 'Test',
        supplierName: 'Unknown Supplier',
        purchasePrice: 100,
      });
      const result = strategy.validateRow(
        row,
        2,
        new Set(),
        new Set(),
      );
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('Unknown Supplier');
      expect(result.failure?.reason).toContain('not found');
    });

    it('should return valid:true for complete valid row', () => {
      const { row } = createProductRow({
        subCategory: 'IRON_FRAME',
        modelNumber: 'M001',
        name: 'Valid Product',
        specification: 'Spec A',
        defaultPrice: 200,
        supplierName: 'Valid Supplier',
        purchasePrice: 150,
        notes: 'Some notes',
      });
      const result = strategy.validateRow(
        row,
        2,
        new Set(),
        new Set(),
      );
      expect(result.valid).toBe(true);
    });

    it('should match subCategory case-insensitive', () => {
      const { row } = createProductRow({
        subCategory: 'iron_frame',
        modelNumber: 'M001',
        name: 'Test',
        supplierName: 'Valid Supplier',
        purchasePrice: 100,
      });
      const result = strategy.validateRow(
        row,
        2,
        new Set(),
        new Set(),
      );
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================
  // transformRow
  // ============================================================
  describe('transformRow', () => {
    it('should return correct object with category derived from subCategory', () => {
      const { row } = createProductRow({
        subCategory: 'MOTOR',
        modelNumber: 'DJ-001',
        name: 'Electric Motor',
        specification: '220V',
        defaultPrice: 500,
        supplierName: 'Motor Corp',
        purchasePrice: 350,
        notes: 'Import grade',
      });

      const result = strategy.transformRow(row);

      expect(result.name).toBe('Electric Motor');
      expect(result.category).toBe('IRON_FRAME_MOTOR');
      expect(result.subCategory).toBe('MOTOR');
      expect(result.modelNumber).toBe('DJ-001');
      expect(result.specification).toBe('220V');
      expect(result.defaultPrice).toBe(500);
      expect(result._supplierName).toBe('Motor Corp');
      expect(result._purchasePrice).toBe(350);
      expect(result.notes).toBe('Import grade');
    });

    it('should handle case-insensitive subCategory input', () => {
      const { row } = createProductRow({
        subCategory: 'mattress',
        modelNumber: 'CD-001',
        name: 'Foam Mattress',
        supplierName: 'Supplier',
        purchasePrice: 200,
      });

      const result = strategy.transformRow(row);

      expect(result.subCategory).toBe('MATTRESS');
      expect(result.category).toBe('IRON_FRAME_MOTOR');
    });
  });

  // ============================================================
  // createBatch
  // ============================================================
  describe('createBatch', () => {
    beforeEach(async () => {
      // Pre-load supplier map
      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 10, companyName: 'Supplier A' },
      ]);
      await strategy.getExistingKeys();
    });

    it('should create Product + ProductSupplier in transaction and return count', async () => {
      mockCodeGenerator.generateCode.mockResolvedValue('TJ-2603-0001');

      const mockProduct = { id: 42, productCode: 'TJ-2603-0001' };
      mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          product: {
            create: jest.fn().mockResolvedValue(mockProduct),
          },
          productSupplier: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return cb(tx);
      });

      const entities = [
        {
          name: 'Frame A',
          category: 'IRON_FRAME_MOTOR',
          subCategory: 'IRON_FRAME',
          modelNumber: 'A001',
          specification: 'Standard',
          defaultPrice: 300,
          notes: undefined,
          _supplierName: 'Supplier A',
          _purchasePrice: 250,
        },
      ];

      const count = await strategy.createBatch(entities);

      expect(count).toBe(1);
      expect(mockCodeGenerator.generateCode).toHaveBeenCalled();
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should skip ProductSupplier when supplier not found (defensive)', async () => {
      mockCodeGenerator.generateCode.mockResolvedValue('PJ-2603-0001');

      const txProductCreate = jest.fn().mockResolvedValue({ id: 1 });
      const txProductSupplierCreate = jest.fn();

      mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          product: { create: txProductCreate },
          productSupplier: { create: txProductSupplierCreate },
        });
      });

      const entities = [
        {
          name: 'Accessory',
          category: 'IRON_FRAME_MOTOR',
          subCategory: 'ACCESSORY',
          modelNumber: 'PJ-X',
          _supplierName: 'Non-Existent Supplier',
          _purchasePrice: 50,
        },
      ];

      const count = await strategy.createBatch(entities);

      expect(count).toBe(1);
      expect(txProductCreate).toHaveBeenCalled();
      // ProductSupplier should NOT be created because supplier not in map
      expect(txProductSupplierCreate).not.toHaveBeenCalled();
    });
  });
});
