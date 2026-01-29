import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, SupplierStatus, SettleType } from './dto';

describe('SupplierService', () => {
  let service: SupplierService;
  let prisma: PrismaService;

  const mockPrismaService = {
    supplier: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    orderItem: {
      count: jest.fn(),
    },
    supplierPayment: {
      count: jest.fn(),
    },
    fabricSupplier: {
      count: jest.fn(),
    },
    paymentRecord: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SupplierService>(SupplierService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have prisma service injected', () => {
    expect(prisma).toBeDefined();
  });

  // ============================================================
  // 2.1.3 Create Supplier Tests
  // ============================================================
  describe('create', () => {
    const createDto: CreateSupplierDto = {
      companyName: 'ABC Textiles',
      contactName: 'John Doe',
      phone: '13800138000',
      wechat: 'wechat_id_123',
      email: 'contact@abc-textiles.com',
      address: '123 Fabric Street, Textile City',
      status: SupplierStatus.ACTIVE,
      billReceiveType: 'invoice',
      settleType: SettleType.PREPAY,
      creditDays: 30,
      notes: 'Premium supplier',
    };

    const mockSupplier = {
      id: 1,
      companyName: 'ABC Textiles',
      contactName: 'John Doe',
      phone: '13800138000',
      wechat: 'wechat_id_123',
      email: 'contact@abc-textiles.com',
      address: '123 Fabric Street, Textile City',
      status: 'active',
      billReceiveType: 'invoice',
      settleType: 'prepay',
      creditDays: 30,
      notes: 'Premium supplier',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a supplier with complete data', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue(null);
      mockPrismaService.supplier.create.mockResolvedValue(mockSupplier);

      const result = await service.create(createDto);

      expect(mockPrismaService.supplier.findFirst).toHaveBeenCalledWith({
        where: { companyName: createDto.companyName },
      });
      expect(mockPrismaService.supplier.create).toHaveBeenCalledWith({
        data: createDto,
      });
      expect(result).toEqual(mockSupplier);
    });

    it('should create a supplier with minimal data (only companyName)', async () => {
      const minimalDto: CreateSupplierDto = {
        companyName: 'Minimal Supplier',
      };

      const minimalSupplier = {
        id: 2,
        companyName: 'Minimal Supplier',
        contactName: null,
        phone: null,
        wechat: null,
        email: null,
        address: null,
        status: 'active',
        billReceiveType: null,
        settleType: 'prepay',
        creditDays: null,
        notes: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.supplier.findFirst.mockResolvedValue(null);
      mockPrismaService.supplier.create.mockResolvedValue(minimalSupplier);

      const result = await service.create(minimalDto);

      expect(result).toEqual(minimalSupplier);
    });

    it('should throw ConflictException when companyName already exists', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue(mockSupplier);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Supplier with company name "ABC Textiles" already exists',
      );
      expect(mockPrismaService.supplier.create).not.toHaveBeenCalled();
    });
  });
});
