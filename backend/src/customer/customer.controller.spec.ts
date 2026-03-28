import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import {
  CreateCustomerDto,
  CreateCustomerPricingDto,
  QueryCustomerDto,
  UpdateCustomerDto,
  UpdateCustomerPricingDto,
  CreditType,
} from './dto';

describe('CustomerController', () => {
  let controller: CustomerController;
  let service: CustomerService;

  const mockCustomerService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findPricing: jest.fn(),
    createPricing: jest.fn(),
    updatePricing: jest.fn(),
    removePricing: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        {
          provide: CustomerService,
          useValue: mockCustomerService,
        },
      ],
    }).compile();

    controller = module.get<CustomerController>(CustomerController);
    service = module.get<CustomerService>(CustomerService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have customer service injected', () => {
    expect(service).toBeDefined();
  });

  // ============================================================
  // 2.2.3 Create Customer Controller Tests
  // ============================================================
  describe('create (POST /)', () => {
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
      ...createDto,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a customer successfully', async () => {
      mockCustomerService.create.mockResolvedValue(mockCustomer);

      const result = await controller.create(createDto);

      expect(mockCustomerService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockCustomer);
    });
  });

  // ============================================================
  // 2.2.4 Get Customer by ID Controller Tests
  // ============================================================
  describe('findOne (GET /:id)', () => {
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
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return a customer when found', async () => {
      mockCustomerService.findOne.mockResolvedValue(mockCustomer);

      const result = await controller.findOne(1);

      expect(mockCustomerService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockCustomer);
    });

    it('should pass NotFoundException from service', async () => {
      mockCustomerService.findOne.mockRejectedValue(
        new NotFoundException('Customer with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // 2.2.7 Get Customer Pricing List Controller Tests
  // ============================================================
  describe('getPricing (GET /:id/pricing)', () => {
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

    it('should return customer pricing list', async () => {
      mockCustomerService.findPricing.mockResolvedValue(mockPricingList);

      const result = await controller.getPricing(1);

      expect(mockCustomerService.findPricing).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockPricingList);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no pricing exists', async () => {
      mockCustomerService.findPricing.mockResolvedValue([]);

      const result = await controller.getPricing(1);

      expect(mockCustomerService.findPricing).toHaveBeenCalledWith(1);
      expect(result).toEqual([]);
    });

    it('should pass NotFoundException from service', async () => {
      mockCustomerService.findPricing.mockRejectedValue(
        new NotFoundException('Customer with ID 999 not found'),
      );

      await expect(controller.getPricing(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================
  // 2.2.8 Create Customer Pricing Controller Tests
  // ============================================================
  describe('createPricing (POST /:id/pricing)', () => {
    const createPricingDto: CreateCustomerPricingDto = {
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

    it('should create customer pricing successfully', async () => {
      mockCustomerService.createPricing.mockResolvedValue(mockPricing);

      const result = await controller.createPricing(1, createPricingDto);

      expect(mockCustomerService.createPricing).toHaveBeenCalledWith(
        1,
        createPricingDto,
      );
      expect(result).toEqual(mockPricing);
    });

    it('should pass NotFoundException from service when customer not found', async () => {
      mockCustomerService.createPricing.mockRejectedValue(
        new NotFoundException('Customer with ID 999 not found'),
      );

      await expect(
        controller.createPricing(999, createPricingDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should pass NotFoundException from service when fabric not found', async () => {
      mockCustomerService.createPricing.mockRejectedValue(
        new NotFoundException('Fabric with ID 10 not found'),
      );

      await expect(
        controller.createPricing(1, createPricingDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should pass ConflictException from service when pricing already exists', async () => {
      mockCustomerService.createPricing.mockRejectedValue(
        new ConflictException(
          'Customer already has special pricing for fabric ID 10',
        ),
      );

      await expect(
        controller.createPricing(1, createPricingDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ============================================================
  // 2.2.9 Update Customer Pricing Controller Tests
  // ============================================================
  describe('updatePricing (PATCH /:id/pricing/:pricingId)', () => {
    const updatePricingDto: UpdateCustomerPricingDto = {
      specialPrice: 99.99,
    };

    const mockPricing = {
      id: 1,
      customerId: 1,
      fabricId: 10,
      specialPrice: 99.99,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update customer pricing successfully', async () => {
      mockCustomerService.updatePricing.mockResolvedValue(mockPricing);

      const result = await controller.updatePricing(1, 1, updatePricingDto);

      expect(mockCustomerService.updatePricing).toHaveBeenCalledWith(
        1,
        1,
        updatePricingDto,
      );
      expect(result).toEqual(mockPricing);
    });

    it('should pass NotFoundException from service when customer not found', async () => {
      mockCustomerService.updatePricing.mockRejectedValue(
        new NotFoundException('Customer with ID 999 not found'),
      );

      await expect(
        controller.updatePricing(999, 1, updatePricingDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should pass NotFoundException from service when pricing not found', async () => {
      mockCustomerService.updatePricing.mockRejectedValue(
        new NotFoundException('Customer pricing with ID 999 not found'),
      );

      await expect(
        controller.updatePricing(1, 999, updatePricingDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // 2.2.10 Delete Customer Pricing Controller Tests
  // ============================================================
  describe('removePricing (DELETE /:id/pricing/:pricingId)', () => {
    it('should delete customer pricing successfully', async () => {
      mockCustomerService.removePricing.mockResolvedValue(undefined);

      await controller.removePricing(1, 1);

      expect(mockCustomerService.removePricing).toHaveBeenCalledWith(1, 1);
    });

    it('should pass NotFoundException from service when customer not found', async () => {
      mockCustomerService.removePricing.mockRejectedValue(
        new NotFoundException('Customer with ID 999 not found'),
      );

      await expect(controller.removePricing(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should pass NotFoundException from service when pricing not found', async () => {
      mockCustomerService.removePricing.mockRejectedValue(
        new NotFoundException('Customer pricing with ID 999 not found'),
      );

      await expect(controller.removePricing(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================
  // 2.2.5 List Customers Controller Tests
  // ============================================================
  describe('findAll (GET /)', () => {
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
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockPaginatedResult = {
      items: mockCustomers,
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    };

    it('should return paginated customers', async () => {
      const query: QueryCustomerDto = {};
      mockCustomerService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(query);

      expect(mockCustomerService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass query parameters to service', async () => {
      const query: QueryCustomerDto = {
        companyName: 'XYZ',
        creditType: CreditType.PREPAY,
        page: 2,
        pageSize: 10,
      };
      mockCustomerService.findAll.mockResolvedValue({
        items: [],
        pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0 },
      });

      await controller.findAll(query);

      expect(mockCustomerService.findAll).toHaveBeenCalledWith(query);
    });
  });

  // ============================================================
  // 2.2.6 Update Customer Controller Tests
  // ============================================================
  describe('update (PATCH /:id)', () => {
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
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update a customer successfully', async () => {
      const updateDto: UpdateCustomerDto = { contactName: 'Wang Wei' };
      const updatedCustomer = { ...mockCustomer, contactName: 'Wang Wei' };
      mockCustomerService.update.mockResolvedValue(updatedCustomer);

      const result = await controller.update(1, updateDto);

      expect(mockCustomerService.update).toHaveBeenCalledWith(1, updateDto);
      expect(result.contactName).toBe('Wang Wei');
    });

    it('should pass NotFoundException from service', async () => {
      const updateDto: UpdateCustomerDto = { contactName: 'Wang Wei' };
      mockCustomerService.update.mockRejectedValue(
        new NotFoundException('Customer with ID 999 not found'),
      );

      await expect(controller.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================
  // 2.2.7 Delete Customer Controller Tests
  // ============================================================
  describe('remove (DELETE /:id)', () => {
    it('should delete a customer successfully (physical delete)', async () => {
      mockCustomerService.remove.mockResolvedValue(undefined);

      await controller.remove(1, false);

      expect(mockCustomerService.remove).toHaveBeenCalledWith(1, false);
    });

    it('should soft delete a customer with force=true', async () => {
      mockCustomerService.remove.mockResolvedValue(undefined);

      await controller.remove(1, true);

      expect(mockCustomerService.remove).toHaveBeenCalledWith(1, true);
    });

    it('should pass NotFoundException from service', async () => {
      mockCustomerService.remove.mockRejectedValue(
        new NotFoundException('Customer with ID 999 not found'),
      );

      await expect(controller.remove(999, false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should pass ConflictException from service', async () => {
      mockCustomerService.remove.mockRejectedValue(
        new ConflictException(
          'Cannot delete customer. Related data exists: 5 orders.',
        ),
      );

      await expect(controller.remove(1, false)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
