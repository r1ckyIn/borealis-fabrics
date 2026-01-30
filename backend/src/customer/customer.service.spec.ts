/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomerService } from './customer.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCustomerDto,
  CreateCustomerPricingDto,
  QueryCustomerDto,
  UpdateCustomerDto,
  UpdateCustomerPricingDto,
  CreditType,
  CustomerSortField,
} from './dto';

describe('CustomerService', () => {
  let service: CustomerService;
  let prisma: PrismaService;

  // Define mock methods separately to avoid circular reference issues
  const customerMock = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const customerPricingMock = {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const fabricMock = { findFirst: jest.fn() };
  const orderMock = { count: jest.fn() };
  const quoteMock = { count: jest.fn() };

  // Build the mock service with proper transaction support
  const mockPrismaService = {
    customer: customerMock,
    customerPricing: customerPricingMock,
    fabric: fabricMock,
    order: orderMock,
    quote: quoteMock,
    // Transaction mock - callback receives the same mock with proper typing

    $transaction: jest.fn().mockImplementation((callback: CallableFunction) =>
      callback({
        customer: customerMock,
        customerPricing: customerPricingMock,
        fabric: fabricMock,
        order: orderMock,
        quote: quoteMock,
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
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
  // 2.2.3 Create Customer Tests
  // ============================================================
  describe('create', () => {
    const createDto: CreateCustomerDto = {
      companyName: 'XYZ Furniture Co.',
      contactName: 'Li Ming',
      phone: '13800138000',
      wechat: 'wechat_xyz',
      email: 'contact@xyz-furniture.com',
      addresses: [
        {
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          detailAddress: '科技园路123号A栋501室',
          contactName: '张三',
          contactPhone: '13800138000',
          label: '工厂地址',
          isDefault: true,
        },
      ],
      creditType: CreditType.PREPAY,
      creditDays: 30,
      notes: 'VIP customer',
    };

    const mockCustomer = {
      id: 1,
      companyName: 'XYZ Furniture Co.',
      contactName: 'Li Ming',
      phone: '13800138000',
      wechat: 'wechat_xyz',
      email: 'contact@xyz-furniture.com',
      addresses: [
        {
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          detailAddress: '科技园路123号A栋501室',
          contactName: '张三',
          contactPhone: '13800138000',
          label: '工厂地址',
          isDefault: true,
        },
      ],
      creditType: 'prepay',
      creditDays: 30,
      notes: 'VIP customer',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a customer with complete data', async () => {
      customerMock.create.mockResolvedValue(mockCustomer);

      const result = await service.create(createDto);

      expect(customerMock.create).toHaveBeenCalledWith({
        data: createDto,
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should create a customer with minimal data (only companyName)', async () => {
      const minimalDto: CreateCustomerDto = {
        companyName: 'Minimal Customer',
      };

      const minimalCustomer = {
        id: 2,
        companyName: 'Minimal Customer',
        contactName: null,
        phone: null,
        wechat: null,
        email: null,
        addresses: null,
        creditType: 'prepay',
        creditDays: null,
        notes: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      customerMock.create.mockResolvedValue(minimalCustomer);

      const result = await service.create(minimalDto);

      expect(result).toEqual(minimalCustomer);
    });

    // Note: Customer companyName is NOT unique, so no duplicate check needed
    it('should allow creating customers with same companyName', async () => {
      customerMock.create.mockResolvedValue(mockCustomer);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCustomer);
      // No findFirst call for duplicate check
      expect(customerMock.findFirst).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 2.2.4 Get Customer by ID Tests
  // ============================================================
  describe('findOne', () => {
    const mockCustomer = {
      id: 1,
      companyName: 'XYZ Furniture Co.',
      contactName: 'Li Ming',
      phone: '13800138000',
      wechat: 'wechat_xyz',
      email: 'contact@xyz-furniture.com',
      addresses: [
        {
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          detailAddress: '科技园路123号A栋501室',
          contactName: '张三',
          contactPhone: '13800138000',
          label: '工厂地址',
          isDefault: true,
        },
      ],
      creditType: 'prepay',
      creditDays: 30,
      notes: 'VIP customer',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return a customer when found', async () => {
      customerMock.findFirst.mockResolvedValue(mockCustomer);

      const result = await service.findOne(1);

      expect(customerMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException when customer not found', async () => {
      customerMock.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Customer with ID 999 not found',
      );
    });

    it('should throw NotFoundException for soft-deleted customer', async () => {
      customerMock.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // 2.2.5 List Customers Tests
  // ============================================================
  describe('findAll', () => {
    const mockCustomers = [
      {
        id: 1,
        companyName: 'XYZ Furniture Co.',
        contactName: 'Li Ming',
        phone: '13800138000',
        wechat: null,
        email: null,
        addresses: null,
        creditType: 'prepay',
        creditDays: null,
        notes: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        companyName: 'ABC Home Decor',
        contactName: 'Wang Wei',
        phone: '13900139000',
        wechat: null,
        email: null,
        addresses: null,
        creditType: 'credit',
        creditDays: 30,
        notes: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return paginated customers with default isActive=true', async () => {
      const query: QueryCustomerDto = {};
      customerMock.findMany.mockResolvedValue(mockCustomers);
      customerMock.count.mockResolvedValue(2);

      const result = await service.findAll(query);

      expect(customerMock.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.items).toEqual(mockCustomers);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by companyName (fuzzy search)', async () => {
      const query: QueryCustomerDto = { companyName: 'XYZ' };
      customerMock.findMany.mockResolvedValue([mockCustomers[0]]);
      customerMock.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(customerMock.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          companyName: { contains: 'XYZ' },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.items).toHaveLength(1);
    });

    it('should filter by creditType', async () => {
      const query: QueryCustomerDto = { creditType: CreditType.CREDIT };
      customerMock.findMany.mockResolvedValue([mockCustomers[1]]);
      customerMock.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(customerMock.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          creditType: 'credit',
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.items).toHaveLength(1);
    });

    it('should filter soft-deleted records with isActive=false', async () => {
      const deletedCustomer = { ...mockCustomers[0], isActive: false };
      const query: QueryCustomerDto = { isActive: false };
      customerMock.findMany.mockResolvedValue([deletedCustomer]);
      customerMock.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(customerMock.findMany).toHaveBeenCalledWith({
        where: { isActive: false },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.items[0].isActive).toBe(false);
    });

    it('should support custom pagination and sorting', async () => {
      const query: QueryCustomerDto = {
        page: 2,
        pageSize: 10,
        sortBy: CustomerSortField.companyName,
        sortOrder: 'asc',
      };
      customerMock.findMany.mockResolvedValue([]);
      customerMock.count.mockResolvedValue(15);

      const result = await service.findAll(query);

      expect(customerMock.findMany).toHaveBeenCalledWith({
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
      const query: QueryCustomerDto = { companyName: 'NonExistent' };
      customerMock.findMany.mockResolvedValue([]);
      customerMock.count.mockResolvedValue(0);

      const result = await service.findAll(query);

      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  // ============================================================
  // 2.2.6 Update Customer Tests
  // ============================================================
  describe('update', () => {
    const existingCustomer = {
      id: 1,
      companyName: 'XYZ Furniture Co.',
      contactName: 'Li Ming',
      phone: '13800138000',
      wechat: null,
      email: null,
      addresses: null,
      creditType: 'prepay',
      creditDays: null,
      notes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update a customer with partial data', async () => {
      const updateDto: UpdateCustomerDto = { contactName: 'Wang Wei' };
      const updatedCustomer = { ...existingCustomer, contactName: 'Wang Wei' };

      customerMock.update.mockResolvedValue(updatedCustomer);

      const result = await service.update(1, updateDto);

      // New implementation uses compound where clause directly in update
      expect(customerMock.update).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
        data: { ...updateDto, addresses: undefined },
      });
      expect(result.contactName).toBe('Wang Wei');
    });

    it('should update a customer with all fields', async () => {
      const updateDto: UpdateCustomerDto = {
        companyName: 'XYZ Furniture Updated',
        contactName: 'Wang Wei',
        phone: '13900139000',
        wechat: 'new_wechat',
        email: 'new@email.com',
        addresses: [
          {
            province: '上海市',
            city: '上海市',
            district: '浦东新区',
            detailAddress: '张江高科技园区',
            contactName: '李四',
            contactPhone: '13900139000',
            label: '新仓库',
            isDefault: true,
          },
        ],
        creditType: CreditType.CREDIT,
        creditDays: 60,
        notes: 'Updated notes',
      };
      const updatedCustomer = { ...existingCustomer, ...updateDto };

      customerMock.update.mockResolvedValue(updatedCustomer);

      const result = await service.update(1, updateDto);

      expect(result.companyName).toBe('XYZ Furniture Updated');
    });

    it('should throw NotFoundException when customer not found', async () => {
      const updateDto: UpdateCustomerDto = { contactName: 'Wang Wei' };
      // New implementation catches P2025 error from Prisma update
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );
      customerMock.update.mockRejectedValueOnce(prismaError);

      await expect(service.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when customer is soft deleted', async () => {
      const updateDto: UpdateCustomerDto = { contactName: 'Wang Wei' };
      // New implementation catches P2025 error (isActive=false fails the where clause)
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );
      customerMock.update.mockRejectedValueOnce(prismaError);

      await expect(service.update(1, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    // Note: Customer companyName is NOT unique, so no conflict check needed
    it('should allow updating companyName without conflict check', async () => {
      const updateDto: UpdateCustomerDto = { companyName: 'ABC Home Decor' };
      const updatedCustomer = {
        ...existingCustomer,
        companyName: 'ABC Home Decor',
      };

      customerMock.update.mockResolvedValue(updatedCustomer);

      const result = await service.update(1, updateDto);

      expect(result.companyName).toBe('ABC Home Decor');
    });

    it('should rethrow non-P2025 errors', async () => {
      const updateDto: UpdateCustomerDto = { contactName: 'Wang Wei' };
      const genericError = new Error('Database connection failed');
      customerMock.update.mockRejectedValueOnce(genericError);

      await expect(service.update(1, updateDto)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  // ============================================================
  // 2.2.7 Delete Customer Tests
  // ============================================================
  describe('remove', () => {
    const existingCustomer = {
      id: 1,
      companyName: 'XYZ Furniture Co.',
      contactName: 'Li Ming',
      phone: '13800138000',
      wechat: null,
      email: null,
      addresses: null,
      creditType: 'prepay',
      creditDays: null,
      notes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should physically delete a customer with no relations', async () => {
      customerMock.findUnique.mockResolvedValue(existingCustomer);
      customerPricingMock.count.mockResolvedValue(0);
      orderMock.count.mockResolvedValue(0);
      quoteMock.count.mockResolvedValue(0);
      customerMock.delete.mockResolvedValue(existingCustomer);

      await service.remove(1, false);

      expect(customerMock.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      customerMock.findUnique.mockResolvedValue(null);

      await expect(service.remove(999, false)).rejects.toThrow(
        NotFoundException,
      );
      expect(customerMock.delete).not.toHaveBeenCalled();
      expect(customerMock.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when customer has relations and force=false', async () => {
      customerMock.findUnique.mockResolvedValue(existingCustomer);
      customerPricingMock.count.mockResolvedValue(3);
      orderMock.count.mockResolvedValue(5);
      quoteMock.count.mockResolvedValue(2);

      await expect(service.remove(1, false)).rejects.toThrow(ConflictException);
      expect(customerMock.delete).not.toHaveBeenCalled();
      expect(customerMock.update).not.toHaveBeenCalled();
    });

    it('should soft delete a customer with relations when force=true', async () => {
      const softDeletedCustomer = { ...existingCustomer, isActive: false };
      customerMock.findUnique.mockResolvedValue(existingCustomer);
      customerPricingMock.count.mockResolvedValue(3);
      orderMock.count.mockResolvedValue(5);
      quoteMock.count.mockResolvedValue(2);
      customerMock.update.mockResolvedValue(softDeletedCustomer);

      await service.remove(1, true);

      expect(customerMock.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
      expect(customerMock.delete).not.toHaveBeenCalled();
    });

    it('should physically delete even with force=true when no relations exist', async () => {
      customerMock.findUnique.mockResolvedValue(existingCustomer);
      customerPricingMock.count.mockResolvedValue(0);
      orderMock.count.mockResolvedValue(0);
      quoteMock.count.mockResolvedValue(0);
      customerMock.delete.mockResolvedValue(existingCustomer);

      await service.remove(1, true);

      expect(customerMock.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  // ============================================================
  // 2.2.7 Get Customer Pricing List Tests
  // ============================================================
  describe('findPricing', () => {
    const mockCustomer = {
      id: 1,
      companyName: 'XYZ Furniture Co.',
      contactName: 'Li Ming',
      phone: '13800138000',
      wechat: null,
      email: null,
      addresses: null,
      creditType: 'prepay',
      creditDays: null,
      notes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPricingList = [
      {
        id: 1,
        customerId: 1,
        fabricId: 10,
        specialPrice: 89.99,
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-15'),
        fabric: {
          id: 10,
          fabricCode: 'BF-2501-0001',
          name: 'Premium Cotton',
          defaultPrice: 99.99,
        },
      },
      {
        id: 2,
        customerId: 1,
        fabricId: 20,
        specialPrice: 149.99,
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-10'),
        fabric: {
          id: 20,
          fabricCode: 'BF-2501-0002',
          name: 'Silk Blend',
          defaultPrice: 179.99,
        },
      },
    ];

    it('should return customer pricing list with fabric details', async () => {
      customerMock.findFirst.mockResolvedValue(mockCustomer);
      customerPricingMock.findMany.mockResolvedValue(mockPricingList);

      const result = await service.findPricing(1);

      expect(customerMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(customerPricingMock.findMany).toHaveBeenCalledWith({
        where: { customerId: 1 },
        include: {
          fabric: {
            select: {
              id: true,
              fabricCode: true,
              name: true,
              defaultPrice: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockPricingList);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when customer has no special pricing', async () => {
      customerMock.findFirst.mockResolvedValue(mockCustomer);
      customerPricingMock.findMany.mockResolvedValue([]);

      const result = await service.findPricing(1);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should throw NotFoundException when customer not found', async () => {
      customerMock.findFirst.mockResolvedValue(null);

      await expect(service.findPricing(999)).rejects.toThrow(NotFoundException);
      await expect(service.findPricing(999)).rejects.toThrow(
        'Customer with ID 999 not found',
      );
      expect(customerPricingMock.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for soft-deleted customer', async () => {
      customerMock.findFirst.mockResolvedValue(null);

      await expect(service.findPricing(1)).rejects.toThrow(NotFoundException);
      expect(customerPricingMock.findMany).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 2.2.8 Create Customer Pricing Tests
  // ============================================================
  describe('createPricing', () => {
    const mockCustomer = {
      id: 1,
      companyName: 'XYZ Furniture Co.',
      contactName: 'Li Ming',
      phone: '13800138000',
      wechat: null,
      email: null,
      addresses: null,
      creditType: 'prepay',
      creditDays: null,
      notes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockFabric = {
      id: 10,
      fabricCode: 'BF-2501-0001',
      name: 'Premium Cotton',
      defaultPrice: 99.99,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createDto: CreateCustomerPricingDto = {
      fabricId: 10,
      specialPrice: 89.99,
    };

    const mockPricing = {
      id: 1,
      customerId: 1,
      fabricId: 10,
      specialPrice: 89.99,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a customer pricing record successfully', async () => {
      customerMock.findFirst.mockResolvedValue(mockCustomer);
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.create.mockResolvedValue(mockPricing);

      const result = await service.createPricing(1, createDto);

      expect(customerMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 10, isActive: true },
      });
      expect(customerPricingMock.create).toHaveBeenCalledWith({
        data: {
          customerId: 1,
          fabricId: 10,
          specialPrice: 89.99,
        },
      });
      expect(result).toEqual(mockPricing);
    });

    it('should throw NotFoundException when customer not found', async () => {
      customerMock.findFirst.mockResolvedValue(null);

      await expect(service.createPricing(999, createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createPricing(999, createDto)).rejects.toThrow(
        'Customer with ID 999 not found',
      );
      expect(fabricMock.findFirst).not.toHaveBeenCalled();
      expect(customerPricingMock.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when fabric not found', async () => {
      customerMock.findFirst.mockResolvedValue(mockCustomer);
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.createPricing(1, createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createPricing(1, createDto)).rejects.toThrow(
        'Fabric with ID 10 not found',
      );
      expect(customerPricingMock.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when fabric is soft-deleted', async () => {
      customerMock.findFirst.mockResolvedValue(mockCustomer);
      fabricMock.findFirst.mockResolvedValue(null); // isActive: false won't match

      await expect(service.createPricing(1, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when pricing already exists for customer-fabric pair', async () => {
      customerMock.findFirst.mockResolvedValue(mockCustomer);
      fabricMock.findFirst.mockResolvedValue(mockFabric);

      // Simulate Prisma unique constraint violation
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );
      customerPricingMock.create.mockRejectedValue(prismaError);

      await expect(service.createPricing(1, createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createPricing(1, createDto)).rejects.toThrow(
        'Customer already has special pricing for fabric ID 10',
      );
    });

    it('should re-throw non-P2002 Prisma errors', async () => {
      customerMock.findFirst.mockResolvedValue(mockCustomer);
      fabricMock.findFirst.mockResolvedValue(mockFabric);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Some other error',
        { code: 'P2025', clientVersion: '5.0.0' },
      );
      customerPricingMock.create.mockRejectedValue(prismaError);

      await expect(service.createPricing(1, createDto)).rejects.toThrow(
        prismaError,
      );
    });
  });

  // ============================================================
  // 2.2.9 Update Customer Pricing Tests
  // ============================================================
  describe('updatePricing', () => {
    const mockCustomer = {
      id: 1,
      companyName: 'XYZ Furniture Co.',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPricing = {
      id: 1,
      customerId: 1,
      fabricId: 10,
      specialPrice: 89.99,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updateDto: UpdateCustomerPricingDto = {
      specialPrice: 99.99,
    };

    it('should update a customer pricing record successfully', async () => {
      const updatedPricing = { ...mockPricing, specialPrice: 99.99 };
      customerMock.findFirst.mockResolvedValue(mockCustomer);
      customerPricingMock.findUnique.mockResolvedValue(mockPricing);
      customerPricingMock.update.mockResolvedValue(updatedPricing);

      const result = await service.updatePricing(1, 1, updateDto);

      expect(customerMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(customerPricingMock.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(customerPricingMock.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { specialPrice: 99.99 },
      });
      expect(result.specialPrice).toBe(99.99);
    });

    it('should throw NotFoundException when customer not found', async () => {
      customerMock.findFirst.mockResolvedValue(null);

      await expect(service.updatePricing(999, 1, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updatePricing(999, 1, updateDto)).rejects.toThrow(
        'Customer with ID 999 not found',
      );
      expect(customerPricingMock.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when pricing record not found', async () => {
      customerMock.findFirst.mockResolvedValue(mockCustomer);
      customerPricingMock.findUnique.mockResolvedValue(null);

      await expect(service.updatePricing(1, 999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updatePricing(1, 999, updateDto)).rejects.toThrow(
        'Customer pricing with ID 999 not found',
      );
      expect(customerPricingMock.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when pricing does not belong to customer', async () => {
      const otherCustomerPricing = { ...mockPricing, customerId: 2 };
      customerMock.findFirst.mockResolvedValue(mockCustomer);
      customerPricingMock.findUnique.mockResolvedValue(otherCustomerPricing);

      await expect(service.updatePricing(1, 1, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updatePricing(1, 1, updateDto)).rejects.toThrow(
        'Customer pricing with ID 1 not found',
      );
      expect(customerPricingMock.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 2.2.10 Delete Customer Pricing Tests
  // ============================================================
  describe('removePricing', () => {
    const mockCustomer = {
      id: 1,
      companyName: 'XYZ Furniture Co.',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPricing = {
      id: 1,
      customerId: 1,
      fabricId: 10,
      specialPrice: 89.99,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete a customer pricing record successfully', async () => {
      customerMock.findFirst.mockResolvedValue(mockCustomer);
      customerPricingMock.findUnique.mockResolvedValue(mockPricing);
      customerPricingMock.delete.mockResolvedValue(mockPricing);

      await service.removePricing(1, 1);

      expect(customerMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(customerPricingMock.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(customerPricingMock.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      customerMock.findFirst.mockResolvedValue(null);

      await expect(service.removePricing(999, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removePricing(999, 1)).rejects.toThrow(
        'Customer with ID 999 not found',
      );
      expect(customerPricingMock.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when pricing record not found', async () => {
      customerMock.findFirst.mockResolvedValue(mockCustomer);
      customerPricingMock.findUnique.mockResolvedValue(null);

      await expect(service.removePricing(1, 999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removePricing(1, 999)).rejects.toThrow(
        'Customer pricing with ID 999 not found',
      );
      expect(customerPricingMock.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when pricing does not belong to customer', async () => {
      const otherCustomerPricing = { ...mockPricing, customerId: 2 };
      customerMock.findFirst.mockResolvedValue(mockCustomer);
      customerPricingMock.findUnique.mockResolvedValue(otherCustomerPricing);

      await expect(service.removePricing(1, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removePricing(1, 1)).rejects.toThrow(
        'Customer pricing with ID 1 not found',
      );
      expect(customerPricingMock.delete).not.toHaveBeenCalled();
    });
  });
});
