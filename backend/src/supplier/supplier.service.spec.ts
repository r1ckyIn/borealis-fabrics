import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSupplierDto,
  QuerySupplierDto,
  UpdateSupplierDto,
  SupplierStatus,
  SettleType,
} from './dto';

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

  // ============================================================
  // 2.1.4 Get Supplier by ID Tests
  // ============================================================
  describe('findOne', () => {
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

    it('should return a supplier when found', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);

      const result = await service.findOne(1);

      expect(mockPrismaService.supplier.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockSupplier);
    });

    it('should throw NotFoundException when supplier not found', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Supplier with ID 999 not found',
      );
    });
  });

  // ============================================================
  // 2.1.5 List Suppliers Tests
  // ============================================================
  describe('findAll', () => {
    const mockSuppliers = [
      {
        id: 1,
        companyName: 'ABC Textiles',
        contactName: 'John Doe',
        phone: '13800138000',
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
      },
      {
        id: 2,
        companyName: 'XYZ Fabrics',
        contactName: 'Jane Smith',
        phone: '13900139000',
        wechat: null,
        email: null,
        address: null,
        status: 'active',
        billReceiveType: null,
        settleType: 'credit',
        creditDays: 30,
        notes: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return paginated suppliers with default isActive=true', async () => {
      const query: QuerySupplierDto = {};
      mockPrismaService.supplier.findMany.mockResolvedValue(mockSuppliers);
      mockPrismaService.supplier.count.mockResolvedValue(2);

      const result = await service.findAll(query);

      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.items).toEqual(mockSuppliers);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by companyName (fuzzy search)', async () => {
      const query: QuerySupplierDto = { companyName: 'ABC' };
      mockPrismaService.supplier.findMany.mockResolvedValue([mockSuppliers[0]]);
      mockPrismaService.supplier.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          companyName: { contains: 'ABC' },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.items).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const query: QuerySupplierDto = { status: SupplierStatus.ACTIVE };
      mockPrismaService.supplier.findMany.mockResolvedValue(mockSuppliers);
      mockPrismaService.supplier.count.mockResolvedValue(2);

      const result = await service.findAll(query);

      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          status: 'active',
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.items).toHaveLength(2);
    });

    it('should filter by settleType', async () => {
      const query: QuerySupplierDto = { settleType: SettleType.CREDIT };
      mockPrismaService.supplier.findMany.mockResolvedValue([mockSuppliers[1]]);
      mockPrismaService.supplier.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          settleType: 'credit',
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.items).toHaveLength(1);
    });

    it('should filter soft-deleted records with isActive=false', async () => {
      const deletedSupplier = { ...mockSuppliers[0], isActive: false };
      const query: QuerySupplierDto = { isActive: false };
      mockPrismaService.supplier.findMany.mockResolvedValue([deletedSupplier]);
      mockPrismaService.supplier.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith({
        where: { isActive: false },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.items[0].isActive).toBe(false);
    });

    it('should support custom pagination and sorting', async () => {
      const query: QuerySupplierDto = {
        page: 2,
        pageSize: 10,
        sortBy: 'companyName',
        sortOrder: 'asc',
      };
      mockPrismaService.supplier.findMany.mockResolvedValue([]);
      mockPrismaService.supplier.count.mockResolvedValue(15);

      const result = await service.findAll(query);

      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 10,
        take: 10,
        orderBy: { companyName: 'asc' },
      });
      expect(result.pagination).toEqual({
        page: 2,
        pageSize: 10,
        total: 15,
        totalPages: 2,
      });
    });

    it('should return empty results when no matches', async () => {
      const query: QuerySupplierDto = { companyName: 'NonExistent' };
      mockPrismaService.supplier.findMany.mockResolvedValue([]);
      mockPrismaService.supplier.count.mockResolvedValue(0);

      const result = await service.findAll(query);

      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  // ============================================================
  // 2.1.6 Update Supplier Tests
  // ============================================================
  describe('update', () => {
    const existingSupplier = {
      id: 1,
      companyName: 'ABC Textiles',
      contactName: 'John Doe',
      phone: '13800138000',
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

    it('should update a supplier with partial data', async () => {
      const updateDto: UpdateSupplierDto = { contactName: 'Jane Doe' };
      const updatedSupplier = { ...existingSupplier, contactName: 'Jane Doe' };

      mockPrismaService.supplier.findUnique.mockResolvedValue(existingSupplier);
      mockPrismaService.supplier.update.mockResolvedValue(updatedSupplier);

      const result = await service.update(1, updateDto);

      expect(mockPrismaService.supplier.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.supplier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
      expect(result.contactName).toBe('Jane Doe');
    });

    it('should update a supplier with all fields', async () => {
      const updateDto: UpdateSupplierDto = {
        companyName: 'ABC Textiles Updated',
        contactName: 'Jane Doe',
        phone: '13900139000',
        wechat: 'new_wechat',
        email: 'new@email.com',
        address: 'New Address',
        status: SupplierStatus.SUSPENDED,
        billReceiveType: 'new_type',
        settleType: SettleType.CREDIT,
        creditDays: 60,
        notes: 'Updated notes',
      };
      const updatedSupplier = { ...existingSupplier, ...updateDto };

      mockPrismaService.supplier.findUnique.mockResolvedValue(existingSupplier);
      mockPrismaService.supplier.findFirst.mockResolvedValue(null);
      mockPrismaService.supplier.update.mockResolvedValue(updatedSupplier);

      const result = await service.update(1, updateDto);

      expect(result.companyName).toBe('ABC Textiles Updated');
    });

    it('should throw NotFoundException when supplier not found', async () => {
      const updateDto: UpdateSupplierDto = { contactName: 'Jane Doe' };
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.supplier.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when companyName conflicts', async () => {
      const updateDto: UpdateSupplierDto = { companyName: 'XYZ Fabrics' };
      const conflictingSupplier = {
        ...existingSupplier,
        id: 2,
        companyName: 'XYZ Fabrics',
      };

      mockPrismaService.supplier.findUnique.mockResolvedValue(existingSupplier);
      mockPrismaService.supplier.findFirst.mockResolvedValue(
        conflictingSupplier,
      );

      await expect(service.update(1, updateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, updateDto)).rejects.toThrow(
        'Supplier with company name "XYZ Fabrics" already exists',
      );
      expect(mockPrismaService.supplier.update).not.toHaveBeenCalled();
    });

    it('should allow updating companyName to its original value', async () => {
      const updateDto: UpdateSupplierDto = {
        companyName: 'ABC Textiles',
        contactName: 'Updated Contact',
      };
      const updatedSupplier = {
        ...existingSupplier,
        contactName: 'Updated Contact',
      };

      mockPrismaService.supplier.findUnique.mockResolvedValue(existingSupplier);
      // findFirst returns the same supplier (self), not a conflict
      mockPrismaService.supplier.findFirst.mockResolvedValue(existingSupplier);
      mockPrismaService.supplier.update.mockResolvedValue(updatedSupplier);

      const result = await service.update(1, updateDto);

      expect(result.contactName).toBe('Updated Contact');
    });
  });
});
