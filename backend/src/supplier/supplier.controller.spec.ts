import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto, SupplierStatus, SettleType } from './dto';

describe('SupplierController', () => {
  let controller: SupplierController;
  let service: SupplierService;

  const mockSupplierService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierController],
      providers: [
        {
          provide: SupplierService,
          useValue: mockSupplierService,
        },
      ],
    }).compile();

    controller = module.get<SupplierController>(SupplierController);
    service = module.get<SupplierService>(SupplierService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have supplier service injected', () => {
    expect(service).toBeDefined();
  });

  // ============================================================
  // 2.1.3 Create Supplier Controller Tests
  // ============================================================
  describe('create (POST /)', () => {
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
      ...createDto,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a supplier successfully', async () => {
      mockSupplierService.create.mockResolvedValue(mockSupplier);

      const result = await controller.create(createDto);

      expect(mockSupplierService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockSupplier);
    });

    it('should pass ConflictException from service', async () => {
      mockSupplierService.create.mockRejectedValue(
        new ConflictException(
          'Supplier with company name "ABC Textiles" already exists',
        ),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ============================================================
  // 2.1.4 Get Supplier by ID Controller Tests
  // ============================================================
  describe('findOne (GET /:id)', () => {
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
      mockSupplierService.findOne.mockResolvedValue(mockSupplier);

      const result = await controller.findOne(1);

      expect(mockSupplierService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockSupplier);
    });

    it('should pass NotFoundException from service', async () => {
      mockSupplierService.findOne.mockRejectedValue(
        new NotFoundException('Supplier with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
