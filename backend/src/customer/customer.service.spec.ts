/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCustomerDto,
  QueryCustomerDto,
  UpdateCustomerDto,
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

  const customerPricingMock = { count: jest.fn() };
  const orderMock = { count: jest.fn() };
  const quoteMock = { count: jest.fn() };

  // Build the mock service with proper transaction support
  const mockPrismaService = {
    customer: customerMock,
    customerPricing: customerPricingMock,
    order: orderMock,
    quote: quoteMock,
    // Transaction mock - callback receives the same mock with proper typing

    $transaction: jest.fn().mockImplementation((callback: CallableFunction) =>
      callback({
        customer: customerMock,
        customerPricing: customerPricingMock,
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

      customerMock.findUnique.mockResolvedValue(existingCustomer);
      customerMock.update.mockResolvedValue(updatedCustomer);

      const result = await service.update(1, updateDto);

      expect(customerMock.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(customerMock.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
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

      customerMock.findUnique.mockResolvedValue(existingCustomer);
      customerMock.update.mockResolvedValue(updatedCustomer);

      const result = await service.update(1, updateDto);

      expect(result.companyName).toBe('XYZ Furniture Updated');
    });

    it('should throw NotFoundException when customer not found', async () => {
      const updateDto: UpdateCustomerDto = { contactName: 'Wang Wei' };
      customerMock.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(customerMock.update).not.toHaveBeenCalled();
    });

    // Note: Customer companyName is NOT unique, so no conflict check needed
    it('should allow updating companyName without conflict check', async () => {
      const updateDto: UpdateCustomerDto = { companyName: 'ABC Home Decor' };
      const updatedCustomer = {
        ...existingCustomer,
        companyName: 'ABC Home Decor',
      };

      customerMock.findUnique.mockResolvedValue(existingCustomer);
      customerMock.update.mockResolvedValue(updatedCustomer);

      const result = await service.update(1, updateDto);

      expect(result.companyName).toBe('ABC Home Decor');
      // No findFirst call for conflict check
      expect(customerMock.findFirst).not.toHaveBeenCalled();
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
});
