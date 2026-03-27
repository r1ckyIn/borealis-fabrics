import { Test, TestingModule } from '@nestjs/testing';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { PurchaseOrderImportStrategy } from './purchase-order-import.strategy';

/**
 * Helper to create an ExcelJS row simulating 采购单 (purchase order) layout.
 * Row 4 = headers, row 5+ = data.
 * Columns: 订单PO#(1) | 名称(2) | 规格型号(3) | 单位(4) | 数量(5) | 单价(6) | 交货日期(7) | 备注(8)
 */
function createPORow(
  data: Partial<{
    poNumber: string;
    name: string;
    specification: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    deliveryDate: string;
    notes: string;
  }>,
): { row: ExcelJS.Row; worksheet: ExcelJS.Worksheet } {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test');
  worksheet.columns = [
    { header: '订单PO#', key: 'poNumber', width: 15 },
    { header: '名称', key: 'name', width: 25 },
    { header: '规格型号', key: 'specification', width: 25 },
    { header: '单位', key: 'unit', width: 10 },
    { header: '数量', key: 'quantity', width: 10 },
    { header: '单价', key: 'unitPrice', width: 12 },
    { header: '交货日期', key: 'deliveryDate', width: 15 },
    { header: '备注', key: 'notes', width: 25 },
  ];
  worksheet.addRow(data);
  return { row: worksheet.getRow(2), worksheet };
}

describe('PurchaseOrderImportStrategy', () => {
  let strategy: PurchaseOrderImportStrategy;

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

  const customerMock = {
    findMany: jest.fn(),
    create: jest.fn(),
  };

  const orderMock = {
    create: jest.fn(),
  };

  const mockTransaction = jest.fn();

  const mockPrisma = {
    product: productMock,
    productSupplier: productSupplierMock,
    supplier: supplierMock,
    customer: customerMock,
    order: orderMock,
    $transaction: mockTransaction,
  };

  const mockCodeGenerator = {
    generateCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrderImportStrategy,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CodeGeneratorService, useValue: mockCodeGenerator },
      ],
    }).compile();

    strategy = module.get<PurchaseOrderImportStrategy>(
      PurchaseOrderImportStrategy,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  // ============================================================
  // matchesHeaders
  // ============================================================
  describe('matchesHeaders', () => {
    it('should match headers containing 订单 or PO# and 名称 and 数量', () => {
      const headers = [
        '订单PO#',
        '名称',
        '规格型号',
        '单位',
        '数量',
        '单价',
        '交货日期',
        '备注',
      ];
      expect(strategy.matchesHeaders(headers)).toBe(true);
    });

    it('should match headers with PO# keyword', () => {
      const headers = ['PO#', '名称', '数量', '单价'];
      expect(strategy.matchesHeaders(headers)).toBe(true);
    });

    it('should return false for unrelated headers', () => {
      const headers = ['fabricCode*', 'name*', 'material', 'color'];
      expect(strategy.matchesHeaders(headers)).toBe(false);
    });

    it('should return false for sales contract headers', () => {
      const headers = ['面料名称', '涂层', '系列', '数量', '单价'];
      expect(strategy.matchesHeaders(headers)).toBe(false);
    });
  });

  // ============================================================
  // getRowKey
  // ============================================================
  describe('getRowKey', () => {
    it('should return composite key specification::name', () => {
      const { row } = createPORow({
        poNumber: 'PO-001',
        name: '铁架 A 型',
        specification: 'A4318HK',
      });
      expect(strategy.getRowKey(row)).toBe('A4318HK::铁架 A 型');
    });

    it('should handle missing specification', () => {
      const { row } = createPORow({
        name: '电机 B 型',
      });
      expect(strategy.getRowKey(row)).toBe('::电机 B 型');
    });
  });

  // ============================================================
  // validateRow
  // ============================================================
  describe('validateRow', () => {
    beforeEach(async () => {
      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: '海宁优途' },
      ]);
      customerMock.findMany.mockResolvedValue([
        { id: 10, companyName: '铂润面料' },
      ]);
      await strategy.getExistingKeys();
    });

    it('should return failure when name is empty', () => {
      const { row } = createPORow({
        poNumber: 'PO-001',
        quantity: 10,
        unitPrice: 100,
      });
      const result = strategy.validateRow(row, 5, new Set(), new Set());
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('name');
    });

    it('should return failure when quantity is not a number', () => {
      const { row } = createPORow({
        poNumber: 'PO-001',
        name: '铁架',
      });
      const result = strategy.validateRow(row, 5, new Set(), new Set());
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('quantity');
    });

    it('should return valid=true for complete row', () => {
      const { row } = createPORow({
        poNumber: 'PO-001',
        name: '铁架 A 型',
        specification: 'A4318HK',
        unit: '套',
        quantity: 10,
        unitPrice: 250,
        deliveryDate: '2025-09-01',
        notes: 'Urgent',
      });
      const result = strategy.validateRow(row, 5, new Set(), new Set());
      expect(result.valid).toBe(true);
    });

    it('should skip row when duplicate in batch', () => {
      const { row } = createPORow({
        name: '铁架 A 型',
        specification: 'A4318HK',
        quantity: 5,
        unitPrice: 100,
      });
      const batchKeys = new Set(['A4318HK::铁架 A 型']);
      const result = strategy.validateRow(row, 5, batchKeys, new Set());
      expect(result.valid).toBe(false);
      expect(result.skipped).toBe(true);
    });

    it('should skip row when duplicate in existing keys', () => {
      const { row } = createPORow({
        name: '铁架 A 型',
        specification: 'A4318HK',
        quantity: 5,
        unitPrice: 100,
      });
      const existingKeys = new Set(['A4318HK::铁架 A 型']);
      const result = strategy.validateRow(row, 5, new Set(), existingKeys);
      expect(result.valid).toBe(false);
      expect(result.skipped).toBe(true);
    });
  });

  // ============================================================
  // transformRow
  // ============================================================
  describe('transformRow', () => {
    it('should extract all fields correctly', () => {
      const { row } = createPORow({
        poNumber: 'PO-001',
        name: '铁架 A 型',
        specification: 'A4318HK',
        unit: '套',
        quantity: 10,
        unitPrice: 250.5,
        deliveryDate: '2025-09-01',
        notes: 'Urgent delivery',
      });

      const result = strategy.transformRow(row);

      expect(result.poNumber).toBe('PO-001');
      expect(result.name).toBe('铁架 A 型');
      expect(result.specification).toBe('A4318HK');
      expect(result.unit).toBe('套');
      expect(result.quantity).toBe(10);
      expect(result.unitPrice).toBe(250.5);
      expect(result.deliveryDate).toBe('2025-09-01');
      expect(result.notes).toBe('Urgent delivery');
    });

    it('should infer IRON_FRAME subCategory for items with 铁架 in name', () => {
      const { row } = createPORow({
        name: '铁架 A4318HK',
        quantity: 5,
        unitPrice: 200,
      });
      const result = strategy.transformRow(row);
      expect(result._subCategory).toBe('IRON_FRAME');
    });

    it('should infer MOTOR subCategory for items with 电机 in name', () => {
      const { row } = createPORow({
        name: '电机 550W',
        quantity: 10,
        unitPrice: 300,
      });
      const result = strategy.transformRow(row);
      expect(result._subCategory).toBe('MOTOR');
    });

    it('should infer MATTRESS subCategory for items with 床垫 in name', () => {
      const { row } = createPORow({
        name: '床垫 标准型',
        quantity: 20,
        unitPrice: 150,
      });
      const result = strategy.transformRow(row);
      expect(result._subCategory).toBe('MATTRESS');
    });

    it('should default to ACCESSORY subCategory for unknown items', () => {
      const { row } = createPORow({
        name: '螺丝 M6',
        quantity: 100,
        unitPrice: 0.5,
      });
      const result = strategy.transformRow(row);
      expect(result._subCategory).toBe('ACCESSORY');
    });
  });

  // ============================================================
  // getExistingKeys
  // ============================================================
  describe('getExistingKeys', () => {
    it('should load supplier map and return existing product keys', async () => {
      productMock.findMany.mockResolvedValue([
        { modelNumber: 'A001', name: 'Frame A' },
      ]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: '海宁优途' },
      ]);
      customerMock.findMany.mockResolvedValue([
        { id: 10, companyName: '铂润面料' },
      ]);

      const keys = await strategy.getExistingKeys();

      expect(keys.has('A001::Frame A')).toBe(true);
    });

    it('should create self-customer if not found', async () => {
      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: '海宁优途' },
      ]);
      customerMock.findMany.mockResolvedValue([]);
      customerMock.create.mockResolvedValue({
        id: 99,
        companyName: '铂润面料',
      });

      await strategy.getExistingKeys();

      expect(customerMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            companyName: '铂润面料',
          }),
        }),
      );
    });
  });

  // ============================================================
  // createBatch
  // ============================================================
  describe('createBatch', () => {
    beforeEach(async () => {
      productMock.findMany.mockResolvedValue([]);
      supplierMock.findMany.mockResolvedValue([
        { id: 1, companyName: '海宁优途' },
      ]);
      customerMock.findMany.mockResolvedValue([
        { id: 10, companyName: '铂润面料' },
      ]);
      await strategy.getExistingKeys();
    });

    it('should create products, supplier pricing, and order in transaction', async () => {
      mockCodeGenerator.generateCode
        .mockResolvedValueOnce('TJ-2603-0001') // product code
        .mockResolvedValueOnce('ORD-2603-0001'); // order code

      const txProductCreate = jest.fn().mockResolvedValue({ id: 42 });
      const txProductSupplierCreate = jest.fn().mockResolvedValue({});
      const txOrderCreate = jest.fn().mockResolvedValue({ id: 1 });

      mockTransaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          return cb({
            product: { create: txProductCreate },
            productSupplier: { create: txProductSupplierCreate },
            order: { create: txOrderCreate },
          });
        },
      );

      const entities = [
        {
          poNumber: 'PO-001',
          name: '铁架 A 型',
          specification: 'A4318HK',
          unit: '套',
          quantity: 10,
          unitPrice: 250,
          deliveryDate: '2025-09-01',
          notes: '',
          _subCategory: 'IRON_FRAME',
        },
      ];

      const count = await strategy.createBatch(entities);

      expect(count).toBe(1);
      expect(txProductCreate).toHaveBeenCalled();
      expect(txProductSupplierCreate).toHaveBeenCalled();
      expect(txOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            customerId: 10,
            status: 'INQUIRY',
          }),
        }),
      );
    });
  });
});
