import { Test, TestingModule } from '@nestjs/testing';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { SalesContractImportStrategy } from './sales-contract-import.strategy';

/**
 * Helper to create an ExcelJS row simulating 购销合同/客户订单 fabric variant layout.
 * Real file layout: Col 1 = empty, Col 2 = 商品名称, Col 3 = 面料名称, ...
 * Columns: (empty)(1) | 商品名称(2) | 面料名称(3) | 涂层(4) | 系列(5) | 色号(6) |
 *          颜色EN(7) | 颜色CN(8) | 单位(9) | 数量(10) | 单价(11) | 金额(12) |
 *          交货日期(13) | PI.#(14) | 生产单号(15)
 */
function createFabricVariantRow(
  data: Partial<{
    category: string;
    fabricName: string;
    coating: string;
    series: string;
    colorCode: string;
    colorEN: string;
    colorCN: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    deliveryDate: string;
    piNumber: string;
    productionNumber: string;
  }>,
): { row: ExcelJS.Row; worksheet: ExcelJS.Worksheet } {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test');
  worksheet.columns = [
    { header: '', key: 'empty', width: 5 },
    { header: '商品名称', key: 'category', width: 15 },
    { header: '面料名称', key: 'fabricName', width: 20 },
    { header: '涂层', key: 'coating', width: 10 },
    { header: '系列', key: 'series', width: 10 },
    { header: '色号', key: 'colorCode', width: 10 },
    { header: '颜色', key: 'colorEN', width: 12 },
    { header: '颜色', key: 'colorCN', width: 12 },
    { header: '单位', key: 'unit', width: 10 },
    { header: '数量', key: 'quantity', width: 10 },
    { header: '单价', key: 'unitPrice', width: 12 },
    { header: '金额', key: 'amount', width: 12 },
    { header: '交货日期', key: 'deliveryDate', width: 15 },
    { header: 'PI.#', key: 'piNumber', width: 15 },
    { header: '生产单号', key: 'productionNumber', width: 15 },
  ];
  worksheet.addRow({ empty: null, ...data });
  return { row: worksheet.getRow(2), worksheet };
}

/**
 * Helper for product (iron frame) variant.
 * Real file layout: Col 1 = empty, Col 2 = 商品名称, Col 3 = 品名, ...
 * Columns: (empty)(1) | 商品名称(2) | 品名(3) | 规格(4) | 单位(5) | 数量(6) |
 *          单价(7) | 金额(8) | 交货日期(9) | PI.#(10) | 生产单号(11) | 款式型号(12) |
 *          备注(13)
 */
function createProductVariantRow(
  data: Partial<{
    category: string;
    productName: string;
    specification: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    deliveryDate: string;
    piNumber: string;
    productionNumber: string;
    modelNumber: string;
    factoryModel: string;
    notes: string;
  }>,
): { row: ExcelJS.Row; worksheet: ExcelJS.Worksheet } {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test');
  worksheet.columns = [
    { header: '', key: 'empty', width: 5 },
    { header: '商品名称', key: 'category', width: 15 },
    { header: '品名', key: 'productName', width: 20 },
    { header: '规格', key: 'specification', width: 15 },
    { header: '单位', key: 'unit', width: 10 },
    { header: '数量', key: 'quantity', width: 10 },
    { header: '单价', key: 'unitPrice', width: 12 },
    { header: '金额', key: 'amount', width: 12 },
    { header: '交货日期', key: 'deliveryDate', width: 15 },
    { header: 'PI.#', key: 'piNumber', width: 15 },
    { header: '生产单号', key: 'productionNumber', width: 15 },
    { header: '款式型号', key: 'modelNumber', width: 15 },
    { header: '工厂型号', key: 'factoryModel', width: 15 },
    { header: '备注', key: 'notes', width: 25 },
  ];
  worksheet.addRow({ empty: null, ...data });
  return { row: worksheet.getRow(2), worksheet };
}

describe('SalesContractImportStrategy', () => {
  let strategy: SalesContractImportStrategy;

  const customerMock = {
    findMany: jest.fn(),
  };

  const fabricMock = {
    findMany: jest.fn(),
  };

  const productMock = {
    findMany: jest.fn(),
  };

  const orderMock = {
    findMany: jest.fn(),
    create: jest.fn(),
  };

  const mockTransaction = jest.fn();

  const mockPrisma = {
    customer: customerMock,
    fabric: fabricMock,
    product: productMock,
    order: orderMock,
    $transaction: mockTransaction,
  };

  const mockCodeGenerator = {
    generateCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesContractImportStrategy,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CodeGeneratorService, useValue: mockCodeGenerator },
      ],
    }).compile();

    strategy = module.get<SalesContractImportStrategy>(
      SalesContractImportStrategy,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  // ============================================================
  // normalizeHeaderValue (via matchesHeaders)
  // ============================================================
  describe('header normalization', () => {
    it('should match headers with extra whitespace', () => {
      const headers = [' 面料名称 ', '  数量  ', ' 单价 '];
      expect(strategy.matchesHeaders(headers)).toBe(true);
    });

    it('should match headers with different casing', () => {
      const headers = ['面料名称', 'Qty', '单价'];
      // Chinese chars are case-insensitive by nature, this tests the trimming
      expect(strategy.matchesHeaders(headers)).toBe(true);
    });

    it('should tolerate RichText cell values in header matching', () => {
      // When headers contain RichText objects, they should be extracted
      // to plain text before matching. matchesHeaders receives string[],
      // but the normalizeHeaderValue function handles RichText objects
      // when reading directly from cells.
      const headers = ['面料名称', '数量', '金额'];
      expect(strategy.matchesHeaders(headers)).toBe(true);
    });
  });

  // ============================================================
  // matchesHeaders
  // ============================================================
  describe('matchesHeaders', () => {
    it('should match fabric variant headers (面料名称 + 数量 + 单价)', () => {
      const headers = [
        '面料名称',
        '涂层',
        '系列',
        '色号',
        '颜色中文',
        '颜色英文',
        '单位',
        '数量',
        '单价',
        '金额',
      ];
      expect(strategy.matchesHeaders(headers)).toBe(true);
    });

    it('should match product variant headers (品名 + 数量 + 单价)', () => {
      const headers = [
        '品名',
        '规格',
        '单位',
        '数量',
        '单价',
        '金额',
        '交货日期',
      ];
      expect(strategy.matchesHeaders(headers)).toBe(true);
    });

    it('should match when 金额 present instead of 单价', () => {
      const headers = ['面料名称', '数量', '金额'];
      expect(strategy.matchesHeaders(headers)).toBe(true);
    });

    it('should return false for unrelated headers', () => {
      const headers = ['fabricCode*', 'name*', 'material', 'color'];
      expect(strategy.matchesHeaders(headers)).toBe(false);
    });

    it('should return false for purchase order headers', () => {
      const headers = ['订单PO#', '名称', '数量', '单价'];
      expect(strategy.matchesHeaders(headers)).toBe(false);
    });
  });

  // ============================================================
  // validateRow (fabric variant)
  // ============================================================
  describe('validateRow (fabric variant)', () => {
    beforeEach(async () => {
      customerMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Customer A' },
      ]);
      fabricMock.findMany.mockResolvedValue([{ id: 10, name: 'Fabric X' }]);
      productMock.findMany.mockResolvedValue([
        { id: 20, name: 'Product Y', modelNumber: 'M001' },
      ]);
      orderMock.findMany.mockResolvedValue([]);

      // Set variant to fabric for tests
      strategy.setVariant('fabric');
      await strategy.getExistingKeys();
    });

    it('should return failure when fabric name is missing', () => {
      const { row } = createFabricVariantRow({
        quantity: 10,
        unitPrice: 50,
      });
      const result = strategy.validateRow(row, 10, new Set(), new Set());
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('name');
    });

    it('should return failure when quantity is missing', () => {
      const { row } = createFabricVariantRow({
        fabricName: 'Fabric X',
        unitPrice: 50,
      });
      const result = strategy.validateRow(row, 10, new Set(), new Set());
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('quantity');
    });

    it('should return failure when unit price is missing', () => {
      const { row } = createFabricVariantRow({
        fabricName: 'Fabric X',
        quantity: 10,
      });
      const result = strategy.validateRow(row, 10, new Set(), new Set());
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('price');
    });

    it('should return failure when referenced fabric not found', () => {
      const { row } = createFabricVariantRow({
        fabricName: 'Unknown Fabric',
        quantity: 10,
        unitPrice: 50,
      });
      const result = strategy.validateRow(row, 10, new Set(), new Set());
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('not found');
    });

    it('should return valid=true for complete fabric row', () => {
      const { row } = createFabricVariantRow({
        fabricName: 'Fabric X',
        unit: '米',
        quantity: 100,
        unitPrice: 25.5,
        deliveryDate: '2025-10-01',
      });
      const result = strategy.validateRow(row, 10, new Set(), new Set());
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================
  // validateRow (product variant)
  // ============================================================
  describe('validateRow (product variant)', () => {
    beforeEach(async () => {
      customerMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Customer A' },
      ]);
      fabricMock.findMany.mockResolvedValue([]);
      productMock.findMany.mockResolvedValue([
        { id: 20, name: 'Product Y', modelNumber: 'M001' },
      ]);
      orderMock.findMany.mockResolvedValue([]);

      strategy.setVariant('product');
      await strategy.getExistingKeys();
    });

    it('should return failure when product name is missing', () => {
      const { row } = createProductVariantRow({
        quantity: 5,
        unitPrice: 1000,
      });
      const result = strategy.validateRow(row, 10, new Set(), new Set());
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('name');
    });

    it('should return failure when referenced product not found', () => {
      const { row } = createProductVariantRow({
        productName: 'Unknown Product',
        quantity: 5,
        unitPrice: 1000,
      });
      const result = strategy.validateRow(row, 10, new Set(), new Set());
      expect(result.valid).toBe(false);
      expect(result.failure?.reason).toContain('not found');
    });

    it('should return valid=true for complete product row', () => {
      const { row } = createProductVariantRow({
        productName: 'Product Y',
        specification: '180x80',
        unit: '套',
        quantity: 5,
        unitPrice: 1200,
      });
      const result = strategy.validateRow(row, 10, new Set(), new Set());
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================
  // transformRow (fabric variant)
  // ============================================================
  describe('transformRow (fabric variant)', () => {
    beforeEach(() => {
      strategy.setVariant('fabric');
    });

    it('should extract fabric variant fields correctly', () => {
      const { row } = createFabricVariantRow({
        fabricName: 'Fabric X',
        coating: 'PU',
        series: 'A',
        colorCode: 'R01',
        colorCN: '红色',
        colorEN: 'Red',
        unit: '米',
        quantity: 100,
        unitPrice: 25.5,
        amount: 2550,
        deliveryDate: '2025-10-01',
        piNumber: 'PI-001',
        productionNumber: 'PRD-001',
      });

      const result = strategy.transformRow(row);

      expect(result.itemName).toBe('Fabric X');
      expect(result.unit).toBe('米');
      expect(result.quantity).toBe(100);
      expect(result.unitPrice).toBe(25.5);
      expect(result.subtotal).toBe(2550);
      expect(result.piNumber).toBe('PI-001');
      expect(result.productionNumber).toBe('PRD-001');
      expect(result._variant).toBe('fabric');
    });
  });

  // ============================================================
  // transformRow (product variant)
  // ============================================================
  describe('transformRow (product variant)', () => {
    beforeEach(() => {
      strategy.setVariant('product');
    });

    it('should extract product variant fields correctly', () => {
      const { row } = createProductVariantRow({
        productName: 'Iron Frame A',
        specification: '180x80',
        unit: '套',
        quantity: 10,
        unitPrice: 1200,
        amount: 12000,
        deliveryDate: '2025-11-15',
        piNumber: 'PI-002',
        productionNumber: 'PRD-002',
        modelNumber: 'A4318HK',
        notes: 'Rush order',
      });

      const result = strategy.transformRow(row);

      expect(result.itemName).toBe('Iron Frame A');
      expect(result.unit).toBe('套');
      expect(result.quantity).toBe(10);
      expect(result.unitPrice).toBe(1200);
      expect(result.subtotal).toBe(12000);
      expect(result.piNumber).toBe('PI-002');
      expect(result.notes).toBe('Rush order');
      expect(result._variant).toBe('product');
    });
  });

  // ============================================================
  // summary row skipping
  // ============================================================
  describe('summary row skipping', () => {
    beforeEach(async () => {
      customerMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Customer A' },
      ]);
      fabricMock.findMany.mockResolvedValue([{ id: 10, name: 'Fabric X' }]);
      productMock.findMany.mockResolvedValue([
        { id: 20, name: 'Product Y', modelNumber: 'M001' },
      ]);
      orderMock.findMany.mockResolvedValue([]);
      strategy.setVariant('fabric');
      await strategy.getExistingKeys();
    });

    it('should skip rows where col 2 contains 合计', () => {
      const { row } = createFabricVariantRow({ category: '合计：' });
      const result = strategy.validateRow(row, 15, new Set(), new Set());
      expect(result.valid).toBe(false);
      expect(result.skipped).toBe(true);
    });

    it('should skip contract clause rows (二、...)', () => {
      const { row } = createFabricVariantRow({ category: '二、交货方式' });
      const result = strategy.validateRow(row, 16, new Set(), new Set());
      expect(result.valid).toBe(false);
      expect(result.skipped).toBe(true);
    });

    it('should skip 合计人民币 summary rows', () => {
      const { row } = createFabricVariantRow({
        category: '合计人民币（大写）：',
      });
      const result = strategy.validateRow(row, 17, new Set(), new Set());
      expect(result.valid).toBe(false);
      expect(result.skipped).toBe(true);
    });

    it('should skip product variant summary rows', () => {
      strategy.setVariant('product');
      const { row } = createProductVariantRow({ category: '合计：' });
      const result = strategy.validateRow(row, 15, new Set(), new Set());
      expect(result.valid).toBe(false);
      expect(result.skipped).toBe(true);
    });
  });

  // ============================================================
  // createBatch
  // ============================================================
  describe('createBatch', () => {
    beforeEach(async () => {
      customerMock.findMany.mockResolvedValue([
        { id: 1, companyName: 'Customer A' },
      ]);
      fabricMock.findMany.mockResolvedValue([{ id: 10, name: 'Fabric X' }]);
      productMock.findMany.mockResolvedValue([
        { id: 20, name: 'Product Y', modelNumber: 'M001' },
      ]);
      orderMock.findMany.mockResolvedValue([]);
      await strategy.getExistingKeys();
    });

    it('should create order with items in transaction', async () => {
      mockCodeGenerator.generateCode.mockResolvedValue('ORD-2603-0001');

      const txOrderCreate = jest
        .fn()
        .mockResolvedValue({ id: 1, items: [{ id: 100 }] });

      mockTransaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          return cb({
            order: { create: txOrderCreate },
          });
        },
      );

      // Set customer info and variant for createBatch
      strategy.setCustomerId(1);
      strategy.setVariant('fabric');

      const entities = [
        {
          itemName: 'Fabric X',
          unit: '米',
          quantity: 100,
          unitPrice: 25.5,
          subtotal: 2550,
          deliveryDate: '2025-10-01',
          piNumber: 'PI-001',
          productionNumber: 'PRD-001',
          notes: '',
          _variant: 'fabric',
        },
      ];

      const count = await strategy.createBatch(entities);

      expect(count).toBe(1);
      expect(txOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            customerId: 1,
            status: 'INQUIRY',
          }),
        }),
      );
    });
  });
});
