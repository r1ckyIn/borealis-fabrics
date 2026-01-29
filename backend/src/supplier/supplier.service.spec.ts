/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSupplierDto,
  QuerySupplierDto,
  QuerySupplierFabricsDto,
  UpdateSupplierDto,
  SupplierStatus,
  SettleType,
  SupplierSortField,
  SupplierFabricSortField,
} from './dto';

describe('SupplierService', () => {
  let service: SupplierService;
  let prisma: PrismaService;

  // Define mock methods separately to avoid circular reference issues
  const supplierMock = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const orderItemMock = { count: jest.fn() };
  const supplierPaymentMock = { count: jest.fn() };
  const fabricSupplierMock = {
    count: jest.fn(),
    findMany: jest.fn(),
  };
  const paymentRecordMock = { count: jest.fn() };

  // Build the mock service with proper transaction support
  const mockPrismaService = {
    supplier: supplierMock,
    orderItem: orderItemMock,
    supplierPayment: supplierPaymentMock,
    fabricSupplier: fabricSupplierMock,
    paymentRecord: paymentRecordMock,
    // Transaction mock - callback receives the same mock with proper typing

    $transaction: jest.fn().mockImplementation((callback: CallableFunction) =>
      callback({
        supplier: supplierMock,
        orderItem: orderItemMock,
        supplierPayment: supplierPaymentMock,
        fabricSupplier: fabricSupplierMock,
        paymentRecord: paymentRecordMock,
      }),
    ),
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

    it('should create a supplier successfully', async () => {
      supplierMock.findFirst.mockResolvedValue(null);
      supplierMock.create.mockResolvedValue(mockSupplier);

      const result = await service.create(createDto);

      expect(supplierMock.findFirst).toHaveBeenCalledWith({
        where: { companyName: createDto.companyName },
      });
      expect(supplierMock.create).toHaveBeenCalledWith({
        data: createDto,
      });
      expect(result).toEqual(mockSupplier);
    });

    it('should throw ConflictException if companyName already exists', async () => {
      supplierMock.findFirst.mockResolvedValue(mockSupplier);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        `Supplier with company name "${createDto.companyName}" already exists`,
      );
    });

    it('should create supplier with minimal required fields', async () => {
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

      supplierMock.findFirst.mockResolvedValue(null);
      supplierMock.create.mockResolvedValue(minimalSupplier);

      const result = await service.create(minimalDto);

      expect(result.companyName).toBe('Minimal Supplier');
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

    it('should return a supplier by ID', async () => {
      supplierMock.findFirst.mockResolvedValue(mockSupplier);

      const result = await service.findOne(1);

      expect(supplierMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(result).toEqual(mockSupplier);
    });

    it('should throw NotFoundException if supplier not found', async () => {
      supplierMock.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Supplier with ID 999 not found',
      );
    });

    it('should not return soft-deleted supplier', async () => {
      supplierMock.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
      expect(supplierMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
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
        status: 'active',
        settleType: 'prepay',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        companyName: 'XYZ Fabrics',
        status: 'active',
        settleType: 'credit',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return paginated suppliers with default query', async () => {
      const query: QuerySupplierDto = {};
      supplierMock.findMany.mockResolvedValue(mockSuppliers);
      supplierMock.count.mockResolvedValue(2);

      const result = await service.findAll(query);

      expect(result.items).toEqual(mockSuppliers);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });

    it('should filter by companyName', async () => {
      const query: QuerySupplierDto = { companyName: 'ABC' };
      supplierMock.findMany.mockResolvedValue([mockSuppliers[0]]);
      supplierMock.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(supplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyName: { contains: 'ABC' },
          }),
        }),
      );
      expect(result.items).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const query: QuerySupplierDto = { status: SupplierStatus.ACTIVE };
      supplierMock.findMany.mockResolvedValue(mockSuppliers);
      supplierMock.count.mockResolvedValue(2);

      await service.findAll(query);

      expect(supplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: SupplierStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should filter by settleType', async () => {
      const query: QuerySupplierDto = { settleType: SettleType.CREDIT };
      supplierMock.findMany.mockResolvedValue([mockSuppliers[1]]);
      supplierMock.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(supplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            settleType: SettleType.CREDIT,
          }),
        }),
      );
    });

    it('should paginate correctly', async () => {
      const query: QuerySupplierDto = { page: 2, pageSize: 10 };
      supplierMock.findMany.mockResolvedValue([]);
      supplierMock.count.mockResolvedValue(25);

      const result = await service.findAll(query);

      expect(supplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should sort by specified field and order', async () => {
      const query: QuerySupplierDto = {
        sortBy: SupplierSortField.companyName,
        sortOrder: 'asc',
      };
      supplierMock.findMany.mockResolvedValue(mockSuppliers);
      supplierMock.count.mockResolvedValue(2);

      await service.findAll(query);

      expect(supplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { companyName: 'asc' },
        }),
      );
    });

    it('should include soft-deleted suppliers when isActive is false', async () => {
      const query: QuerySupplierDto = { isActive: false };
      supplierMock.findMany.mockResolvedValue([]);
      supplierMock.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(supplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: false,
          }),
        }),
      );
    });

    it('should default to isActive=true', async () => {
      const query: QuerySupplierDto = {};
      supplierMock.findMany.mockResolvedValue(mockSuppliers);
      supplierMock.count.mockResolvedValue(2);

      await service.findAll(query);

      expect(supplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
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
      status: 'active',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update a supplier successfully', async () => {
      const updateDto: UpdateSupplierDto = { contactName: 'Jane Doe' };
      const updatedSupplier = { ...existingSupplier, contactName: 'Jane Doe' };

      // First findFirst for existence check (with isActive: true)
      supplierMock.findFirst.mockResolvedValueOnce(existingSupplier);
      supplierMock.update.mockResolvedValue(updatedSupplier);

      const result = await service.update(1, updateDto);

      expect(supplierMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(supplierMock.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
      expect(result.contactName).toBe('Jane Doe');
    });

    it('should throw NotFoundException if supplier not found', async () => {
      supplierMock.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.update(999, { contactName: 'Jane' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if supplier is soft deleted', async () => {
      supplierMock.findFirst.mockResolvedValueOnce(null);

      await expect(service.update(1, { contactName: 'Jane' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should check companyName uniqueness when updating companyName', async () => {
      const updateDto: UpdateSupplierDto = { companyName: 'New Name' };
      const conflictSupplier = { id: 2, companyName: 'New Name' };

      // First findFirst for existence check, second for conflict check
      supplierMock.findFirst
        .mockResolvedValueOnce(existingSupplier)
        .mockResolvedValueOnce(conflictSupplier);

      await expect(service.update(1, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating companyName to its original value', async () => {
      const updateDto: UpdateSupplierDto = { companyName: 'ABC Textiles' };

      // First findFirst for existence check, second for conflict check (returns self)
      supplierMock.findFirst
        .mockResolvedValueOnce(existingSupplier)
        .mockResolvedValueOnce(existingSupplier);
      supplierMock.update.mockResolvedValue(existingSupplier);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(existingSupplier);
    });

    it('should allow updating companyName to a new unique value', async () => {
      const updateDto: UpdateSupplierDto = { companyName: 'New Unique Name' };
      const updatedSupplier = {
        ...existingSupplier,
        companyName: 'New Unique Name',
      };

      // First findFirst for existence check, second for conflict check (no conflict)
      supplierMock.findFirst
        .mockResolvedValueOnce(existingSupplier)
        .mockResolvedValueOnce(null);
      supplierMock.update.mockResolvedValue(updatedSupplier);

      const result = await service.update(1, updateDto);

      expect(result.companyName).toBe('New Unique Name');
    });
  });

  // ============================================================
  // 2.1.7 Delete Supplier Tests
  // ============================================================
  describe('remove', () => {
    const existingSupplier = {
      id: 1,
      companyName: 'ABC Textiles',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should throw NotFoundException if supplier not found', async () => {
      supplierMock.findUnique.mockResolvedValue(null);

      await expect(service.remove(999, false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should physically delete supplier with no relations', async () => {
      supplierMock.findUnique.mockResolvedValue(existingSupplier);
      fabricSupplierMock.count.mockResolvedValue(0);
      orderItemMock.count.mockResolvedValue(0);
      supplierPaymentMock.count.mockResolvedValue(0);
      paymentRecordMock.count.mockResolvedValue(0);
      supplierMock.delete.mockResolvedValue(existingSupplier);

      await service.remove(1, false);

      expect(supplierMock.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw ConflictException when relations exist and force=false', async () => {
      supplierMock.findUnique.mockResolvedValue(existingSupplier);
      fabricSupplierMock.count.mockResolvedValue(2);
      orderItemMock.count.mockResolvedValue(0);
      supplierPaymentMock.count.mockResolvedValue(0);
      paymentRecordMock.count.mockResolvedValue(0);

      await expect(service.remove(1, false)).rejects.toThrow(ConflictException);
      await expect(service.remove(1, false)).rejects.toThrow(
        /Cannot delete supplier.*Related data exists.*2 fabric supplier records/,
      );
    });

    it('should soft delete when relations exist and force=true', async () => {
      supplierMock.findUnique.mockResolvedValue(existingSupplier);
      fabricSupplierMock.count.mockResolvedValue(1);
      orderItemMock.count.mockResolvedValue(0);
      supplierPaymentMock.count.mockResolvedValue(0);
      paymentRecordMock.count.mockResolvedValue(0);
      supplierMock.update.mockResolvedValue({
        ...existingSupplier,
        isActive: false,
      });

      await service.remove(1, true);

      expect(supplierMock.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
      expect(supplierMock.delete).not.toHaveBeenCalled();
    });

    it('should list all relation types in conflict message', async () => {
      supplierMock.findUnique.mockResolvedValue(existingSupplier);
      fabricSupplierMock.count.mockResolvedValue(1);
      orderItemMock.count.mockResolvedValue(2);
      supplierPaymentMock.count.mockResolvedValue(3);
      paymentRecordMock.count.mockResolvedValue(4);

      await expect(service.remove(1, false)).rejects.toThrow(
        /1 fabric supplier records.*2 order items.*3 supplier payments.*4 payment records/,
      );
    });
  });

  // ============================================================
  // DTO Validation Boundary Tests
  // ============================================================
  describe('DTO validation boundaries', () => {
    describe('companyName', () => {
      it('should accept companyName at max length (200 chars)', async () => {
        const maxLengthName = 'A'.repeat(200);
        const createDto: CreateSupplierDto = { companyName: maxLengthName };
        const mockSupplier = {
          id: 1,
          companyName: maxLengthName,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        supplierMock.findFirst.mockResolvedValue(null);
        supplierMock.create.mockResolvedValue(mockSupplier);

        const result = await service.create(createDto);
        expect(result.companyName).toBe(maxLengthName);
      });
    });

    describe('notes', () => {
      it('should accept notes at max length (2000 chars)', async () => {
        const maxLengthNotes = 'N'.repeat(2000);
        const createDto: CreateSupplierDto = {
          companyName: 'Test',
          notes: maxLengthNotes,
        };
        const mockSupplier = {
          id: 1,
          companyName: 'Test',
          notes: maxLengthNotes,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        supplierMock.findFirst.mockResolvedValue(null);
        supplierMock.create.mockResolvedValue(mockSupplier);

        const result = await service.create(createDto);
        expect(result.notes).toBe(maxLengthNotes);
      });
    });

    describe('creditDays', () => {
      it('should accept creditDays at minimum (0)', async () => {
        const createDto: CreateSupplierDto = {
          companyName: 'Test',
          creditDays: 0,
        };
        const mockSupplier = {
          id: 1,
          companyName: 'Test',
          creditDays: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        supplierMock.findFirst.mockResolvedValue(null);
        supplierMock.create.mockResolvedValue(mockSupplier);

        const result = await service.create(createDto);
        expect(result.creditDays).toBe(0);
      });
    });

    describe('sortBy validation', () => {
      it('should accept valid sortBy enum values', async () => {
        const validSortFields = [
          SupplierSortField.createdAt,
          SupplierSortField.updatedAt,
          SupplierSortField.companyName,
          SupplierSortField.status,
          SupplierSortField.settleType,
        ];

        for (const sortBy of validSortFields) {
          supplierMock.findMany.mockResolvedValue([]);
          supplierMock.count.mockResolvedValue(0);

          await service.findAll({ sortBy });

          expect(supplierMock.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              orderBy: { [sortBy]: 'desc' },
            }),
          );
        }
      });
    });
  });

  // ============================================================
  // 2.1.7 Find Supplier Fabrics Tests
  // ============================================================
  describe('findSupplierFabrics', () => {
    const mockSupplier = {
      id: 1,
      companyName: 'ABC Textiles',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock Prisma Decimal values - Number() converts them directly
    const mockDecimal = (value: number) => ({
      toNumber: () => value,
      toString: () => value.toString(),
      valueOf: () => value,
      [Symbol.toPrimitive]: () => value,
    });

    const mockFabricSuppliers = [
      {
        id: 1,
        supplierId: 1,
        fabricId: 1,
        purchasePrice: mockDecimal(25.5),
        minOrderQty: mockDecimal(100),
        leadTimeDays: 7,
        createdAt: new Date(),
        fabric: {
          id: 1,
          fabricCode: 'FB-2401-0001',
          name: 'Cotton Twill',
          color: 'Navy Blue',
          weight: mockDecimal(280.5),
          width: mockDecimal(150.0),
          defaultPrice: mockDecimal(45.5),
        },
      },
      {
        id: 2,
        supplierId: 1,
        fabricId: 2,
        purchasePrice: mockDecimal(30.0),
        minOrderQty: null,
        leadTimeDays: 14,
        createdAt: new Date(),
        fabric: {
          id: 2,
          fabricCode: 'FB-2401-0002',
          name: 'Silk Blend',
          color: 'Red',
          weight: null,
          width: null,
          defaultPrice: null,
        },
      },
    ];

    beforeEach(() => {
      // Reset mocks
      supplierMock.findFirst.mockReset();
      fabricSupplierMock.findMany.mockReset();
      fabricSupplierMock.count.mockReset();
    });

    it('should return paginated fabrics for a supplier', async () => {
      const query: QuerySupplierFabricsDto = {};
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findMany.mockResolvedValue(mockFabricSuppliers);
      fabricSupplierMock.count.mockResolvedValue(2);

      const result = await service.findSupplierFabrics(1, query);

      expect(supplierMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });

    it('should throw NotFoundException if supplier not found', async () => {
      supplierMock.findFirst.mockResolvedValue(null);

      await expect(service.findSupplierFabrics(999, {})).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findSupplierFabrics(999, {})).rejects.toThrow(
        'Supplier with ID 999 not found',
      );
    });

    it('should throw NotFoundException for soft-deleted supplier', async () => {
      supplierMock.findFirst.mockResolvedValue(null);

      await expect(service.findSupplierFabrics(1, {})).rejects.toThrow(
        NotFoundException,
      );
      expect(supplierMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
    });

    it('should filter by fabricCode (fuzzy search)', async () => {
      const query: QuerySupplierFabricsDto = { fabricCode: 'FB-24' };
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findMany.mockResolvedValue([mockFabricSuppliers[0]]);
      fabricSupplierMock.count.mockResolvedValue(1);

      await service.findSupplierFabrics(1, query);

      expect(fabricSupplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fabric: expect.objectContaining({
              fabricCode: { contains: 'FB-24' },
            }),
          }),
        }),
      );
    });

    it('should filter by fabricName (fuzzy search)', async () => {
      const query: QuerySupplierFabricsDto = { fabricName: 'Cotton' };
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findMany.mockResolvedValue([mockFabricSuppliers[0]]);
      fabricSupplierMock.count.mockResolvedValue(1);

      await service.findSupplierFabrics(1, query);

      expect(fabricSupplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fabric: expect.objectContaining({
              name: { contains: 'Cotton' },
            }),
          }),
        }),
      );
    });

    it('should filter by color (exact match)', async () => {
      const query: QuerySupplierFabricsDto = { color: 'Navy Blue' };
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findMany.mockResolvedValue([mockFabricSuppliers[0]]);
      fabricSupplierMock.count.mockResolvedValue(1);

      await service.findSupplierFabrics(1, query);

      expect(fabricSupplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fabric: expect.objectContaining({
              color: 'Navy Blue',
            }),
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      const query: QuerySupplierFabricsDto = { page: 2, pageSize: 10 };
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findMany.mockResolvedValue([]);
      fabricSupplierMock.count.mockResolvedValue(25);

      const result = await service.findSupplierFabrics(1, query);

      expect(fabricSupplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should sort by purchasePrice', async () => {
      const query: QuerySupplierFabricsDto = {
        sortBy: SupplierFabricSortField.purchasePrice,
        sortOrder: 'asc',
      };
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findMany.mockResolvedValue(mockFabricSuppliers);
      fabricSupplierMock.count.mockResolvedValue(2);

      await service.findSupplierFabrics(1, query);

      expect(fabricSupplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { purchasePrice: 'asc' },
        }),
      );
    });

    it('should sort by fabricCode (nested fabric field)', async () => {
      const query: QuerySupplierFabricsDto = {
        sortBy: SupplierFabricSortField.fabricCode,
        sortOrder: 'desc',
      };
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findMany.mockResolvedValue(mockFabricSuppliers);
      fabricSupplierMock.count.mockResolvedValue(2);

      await service.findSupplierFabrics(1, query);

      expect(fabricSupplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { fabric: { fabricCode: 'desc' } },
        }),
      );
    });

    it('should sort by fabricName (nested fabric field)', async () => {
      const query: QuerySupplierFabricsDto = {
        sortBy: SupplierFabricSortField.fabricName,
        sortOrder: 'asc',
      };
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findMany.mockResolvedValue(mockFabricSuppliers);
      fabricSupplierMock.count.mockResolvedValue(2);

      await service.findSupplierFabrics(1, query);

      expect(fabricSupplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { fabric: { name: 'asc' } },
        }),
      );
    });

    it('should return empty list when supplier has no fabrics', async () => {
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findMany.mockResolvedValue([]);
      fabricSupplierMock.count.mockResolvedValue(0);

      const result = await service.findSupplierFabrics(1, {});

      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should transform Decimal values to numbers in response', async () => {
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findMany.mockResolvedValue([mockFabricSuppliers[0]]);
      fabricSupplierMock.count.mockResolvedValue(1);

      const result = await service.findSupplierFabrics(1, {});

      const item = result.items[0];
      expect(typeof item.supplierRelation.purchasePrice).toBe('number');
      expect(item.supplierRelation.purchasePrice).toBe(25.5);
      expect(item.fabric.weight).toBe(280.5);
      expect(item.fabric.width).toBe(150.0);
      expect(item.fabric.defaultPrice).toBe(45.5);
    });

    it('should handle null values in fabric fields', async () => {
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findMany.mockResolvedValue([mockFabricSuppliers[1]]);
      fabricSupplierMock.count.mockResolvedValue(1);

      const result = await service.findSupplierFabrics(1, {});

      const item = result.items[0];
      expect(item.fabric.weight).toBeNull();
      expect(item.fabric.width).toBeNull();
      expect(item.fabric.defaultPrice).toBeNull();
      expect(item.supplierRelation.minOrderQty).toBeNull();
    });

    it('should include fabric relationship in query', async () => {
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findMany.mockResolvedValue(mockFabricSuppliers);
      fabricSupplierMock.count.mockResolvedValue(2);

      await service.findSupplierFabrics(1, {});

      expect(fabricSupplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            fabric: {
              select: {
                id: true,
                fabricCode: true,
                name: true,
                color: true,
                weight: true,
                width: true,
                defaultPrice: true,
              },
            },
          },
        }),
      );
    });
  });
});
