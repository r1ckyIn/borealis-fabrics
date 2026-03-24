import { Test, TestingModule } from '@nestjs/testing';
import { CodeGeneratorService, CodePrefix } from './code-generator.service';
import { RedisService } from './redis.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CodeGeneratorService', () => {
  let service: CodeGeneratorService;
  let mockRedisService: {
    incr: jest.Mock;
    set: jest.Mock;
  };
  let mockPrismaService: {
    fabric: { findFirst: jest.Mock };
    order: { findFirst: jest.Mock };
    quote: { findFirst: jest.Mock };
    product: { findFirst: jest.Mock };
    productBundle: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  // Get expected YYMM
  const getExpectedYearMonth = (): string => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}${month}`;
  };

  beforeEach(async () => {
    mockRedisService = {
      incr: jest.fn(),
      set: jest.fn(),
    };

    mockPrismaService = {
      fabric: { findFirst: jest.fn() },
      order: { findFirst: jest.fn() },
      quote: { findFirst: jest.fn() },
      product: { findFirst: jest.fn() },
      productBundle: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };

    // Mock $transaction to execute the callback with the mockPrismaService
    mockPrismaService.$transaction.mockImplementation(
      <T>(callback: (tx: typeof mockPrismaService) => Promise<T>) => {
        return callback(mockPrismaService);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodeGeneratorService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CodeGeneratorService>(CodeGeneratorService);
  });

  describe('generateCode', () => {
    const yearMonth = getExpectedYearMonth();

    it('should generate quote code using Redis when available', async () => {
      mockRedisService.incr.mockResolvedValue(1);

      const code = await service.generateCode(CodePrefix.QUOTE);

      expect(code).toBe(`QT-${yearMonth}-0001`);
      expect(mockRedisService.incr).toHaveBeenCalledWith(
        `code:QT:${yearMonth}`,
      );
    });

    it('should generate order code using Redis when available', async () => {
      mockRedisService.incr.mockResolvedValue(42);

      const code = await service.generateCode(CodePrefix.ORDER);

      expect(code).toBe(`ORD-${yearMonth}-0042`);
      expect(mockRedisService.incr).toHaveBeenCalledWith(
        `code:ORD:${yearMonth}`,
      );
    });

    it('should generate fabric code using Redis when available', async () => {
      mockRedisService.incr.mockResolvedValue(999);

      const code = await service.generateCode(CodePrefix.FABRIC);

      expect(code).toBe(`BF-${yearMonth}-0999`);
      expect(mockRedisService.incr).toHaveBeenCalledWith(
        `code:BF:${yearMonth}`,
      );
    });

    it('should fallback to DB when Redis returns null', async () => {
      mockRedisService.incr.mockResolvedValue(null);
      mockPrismaService.quote.findFirst.mockResolvedValue({
        quoteCode: `QT-${yearMonth}-0005`,
      });

      const code = await service.generateCode(CodePrefix.QUOTE);

      expect(code).toBe(`QT-${yearMonth}-0006`);
      expect(mockPrismaService.quote.findFirst).toHaveBeenCalled();
    });

    it('should return sequence 1 when no existing codes in DB', async () => {
      mockRedisService.incr.mockResolvedValue(null);
      mockPrismaService.quote.findFirst.mockResolvedValue(null);

      const code = await service.generateCode(CodePrefix.QUOTE);

      expect(code).toBe(`QT-${yearMonth}-0001`);
    });

    it('should handle order code fallback to DB', async () => {
      mockRedisService.incr.mockResolvedValue(null);
      mockPrismaService.order.findFirst.mockResolvedValue({
        orderCode: `ORD-${yearMonth}-0010`,
      });

      const code = await service.generateCode(CodePrefix.ORDER);

      expect(code).toBe(`ORD-${yearMonth}-0011`);
    });

    it('should handle fabric code fallback to DB', async () => {
      mockRedisService.incr.mockResolvedValue(null);
      mockPrismaService.fabric.findFirst.mockResolvedValue({
        fabricCode: `BF-${yearMonth}-0100`,
      });

      const code = await service.generateCode(CodePrefix.FABRIC);

      expect(code).toBe(`BF-${yearMonth}-0101`);
    });

    it('should pad sequence numbers to 4 digits', async () => {
      mockRedisService.incr.mockResolvedValue(1);
      const code = await service.generateCode(CodePrefix.QUOTE);
      expect(code).toMatch(/^QT-\d{4}-0001$/);

      mockRedisService.incr.mockResolvedValue(99);
      const code2 = await service.generateCode(CodePrefix.QUOTE);
      expect(code2).toMatch(/^QT-\d{4}-0099$/);

      mockRedisService.incr.mockResolvedValue(9999);
      const code3 = await service.generateCode(CodePrefix.QUOTE);
      expect(code3).toMatch(/^QT-\d{4}-9999$/);
    });

    it('should handle sequence numbers exceeding 4 digits', async () => {
      mockRedisService.incr.mockResolvedValue(12345);

      const code = await service.generateCode(CodePrefix.QUOTE);

      // padStart(4, '0') won't truncate, just won't pad
      expect(code).toBe(`QT-${yearMonth}-12345`);
    });

    it('should generate iron frame code (TJ prefix) using Redis', async () => {
      mockRedisService.incr.mockResolvedValue(1);

      const code = await service.generateCode(CodePrefix.IRON_FRAME);

      expect(code).toBe(`TJ-${yearMonth}-0001`);
      expect(mockRedisService.incr).toHaveBeenCalledWith(
        `code:TJ:${yearMonth}`,
      );
    });

    it('should generate motor code (DJ prefix) using Redis', async () => {
      mockRedisService.incr.mockResolvedValue(3);

      const code = await service.generateCode(CodePrefix.MOTOR);

      expect(code).toBe(`DJ-${yearMonth}-0003`);
      expect(mockRedisService.incr).toHaveBeenCalledWith(
        `code:DJ:${yearMonth}`,
      );
    });

    it('should generate mattress code (CD prefix) using Redis', async () => {
      mockRedisService.incr.mockResolvedValue(7);

      const code = await service.generateCode(CodePrefix.MATTRESS);

      expect(code).toBe(`CD-${yearMonth}-0007`);
      expect(mockRedisService.incr).toHaveBeenCalledWith(
        `code:CD:${yearMonth}`,
      );
    });

    it('should generate accessory code (PJ prefix) using Redis', async () => {
      mockRedisService.incr.mockResolvedValue(15);

      const code = await service.generateCode(CodePrefix.ACCESSORY);

      expect(code).toBe(`PJ-${yearMonth}-0015`);
      expect(mockRedisService.incr).toHaveBeenCalledWith(
        `code:PJ:${yearMonth}`,
      );
    });

    it('should generate bundle code (BD prefix) using Redis', async () => {
      mockRedisService.incr.mockResolvedValue(2);

      const code = await service.generateCode(CodePrefix.BUNDLE);

      expect(code).toBe(`BD-${yearMonth}-0002`);
      expect(mockRedisService.incr).toHaveBeenCalledWith(
        `code:BD:${yearMonth}`,
      );
    });

    it('should fallback to DB for product prefixes when Redis returns null', async () => {
      mockRedisService.incr.mockResolvedValue(null);
      mockPrismaService.product.findFirst.mockResolvedValue({
        productCode: `TJ-${yearMonth}-0010`,
      });

      const code = await service.generateCode(CodePrefix.IRON_FRAME);

      expect(code).toBe(`TJ-${yearMonth}-0011`);
      expect(mockPrismaService.product.findFirst).toHaveBeenCalled();
    });

    it('should fallback to DB for bundle prefix when Redis returns null', async () => {
      mockRedisService.incr.mockResolvedValue(null);
      mockPrismaService.productBundle.findFirst.mockResolvedValue({
        bundleCode: `BD-${yearMonth}-0005`,
      });

      const code = await service.generateCode(CodePrefix.BUNDLE);

      expect(code).toBe(`BD-${yearMonth}-0006`);
      expect(mockPrismaService.productBundle.findFirst).toHaveBeenCalled();
    });
  });

  describe('syncFromDatabase', () => {
    const yearMonth = getExpectedYearMonth();

    it('should sync quote counter from database', async () => {
      mockPrismaService.quote.findFirst.mockResolvedValue({
        quoteCode: `QT-${yearMonth}-0050`,
      });
      mockRedisService.set.mockResolvedValue(true);

      await service.syncFromDatabase(CodePrefix.QUOTE);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `code:QT:${yearMonth}`,
        50,
      );
    });

    it('should sync order counter from database', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        orderCode: `ORD-${yearMonth}-0025`,
      });
      mockRedisService.set.mockResolvedValue(true);

      await service.syncFromDatabase(CodePrefix.ORDER);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `code:ORD:${yearMonth}`,
        25,
      );
    });

    it('should not sync when no existing codes', async () => {
      mockPrismaService.quote.findFirst.mockResolvedValue(null);

      await service.syncFromDatabase(CodePrefix.QUOTE);

      expect(mockRedisService.set).not.toHaveBeenCalled();
    });

    it('should handle malformed codes gracefully', async () => {
      mockPrismaService.quote.findFirst.mockResolvedValue({
        quoteCode: 'INVALID-CODE',
      });

      await service.syncFromDatabase(CodePrefix.QUOTE);

      // Should not sync because parsing failed (returns 0)
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });
  });
});
