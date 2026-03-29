import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CreateSupplierDto,
  QuerySupplierDto,
  QuerySupplierFabricsDto,
  UpdateSupplierDto,
  SupplierStatus,
  SettleType,
  SupplierFabricSortField,
} from './dto';

describe('SupplierController', () => {
  let controller: SupplierController;
  let service: SupplierService;

  const mockSupplierService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findSupplierFabrics: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    restore: jest.fn(),
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

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
      deletedAt: null,
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
      deletedAt: null,
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

  // ============================================================
  // 2.1.5 List Suppliers Controller Tests
  // ============================================================
  describe('findAll (GET /)', () => {
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
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockPaginatedResult = {
      items: mockSuppliers,
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    };

    it('should return paginated suppliers', async () => {
      const query: QuerySupplierDto = {};
      mockSupplierService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(query);

      expect(mockSupplierService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass query parameters to service', async () => {
      const query: QuerySupplierDto = {
        companyName: 'ABC',
        status: SupplierStatus.ACTIVE,
        page: 2,
        pageSize: 10,
      };
      mockSupplierService.findAll.mockResolvedValue({
        items: [],
        pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0 },
      });

      await controller.findAll(query);

      expect(mockSupplierService.findAll).toHaveBeenCalledWith(query);
    });
  });

  // ============================================================
  // 2.1.6 Update Supplier Controller Tests
  // ============================================================
  describe('update (PATCH /:id)', () => {
    const mockSupplier = {
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
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update a supplier successfully', async () => {
      const updateDto: UpdateSupplierDto = { contactName: 'Jane Doe' };
      const updatedSupplier = { ...mockSupplier, contactName: 'Jane Doe' };
      mockSupplierService.update.mockResolvedValue(updatedSupplier);

      const result = await controller.update(1, updateDto);

      expect(mockSupplierService.update).toHaveBeenCalledWith(1, updateDto);
      expect(result.contactName).toBe('Jane Doe');
    });

    it('should pass NotFoundException from service', async () => {
      const updateDto: UpdateSupplierDto = { contactName: 'Jane Doe' };
      mockSupplierService.update.mockRejectedValue(
        new NotFoundException('Supplier with ID 999 not found'),
      );

      await expect(controller.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should pass ConflictException from service', async () => {
      const updateDto: UpdateSupplierDto = { companyName: 'XYZ Fabrics' };
      mockSupplierService.update.mockRejectedValue(
        new ConflictException(
          'Supplier with company name "XYZ Fabrics" already exists',
        ),
      );

      await expect(controller.update(1, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ============================================================
  // 2.1.7 Delete Supplier Controller Tests
  // ============================================================
  describe('remove (DELETE /:id)', () => {
    it('should delete a supplier successfully (physical delete)', async () => {
      mockSupplierService.remove.mockResolvedValue(undefined);

      await controller.remove(1, false);

      expect(mockSupplierService.remove).toHaveBeenCalledWith(1, false);
    });

    it('should soft delete a supplier with force=true', async () => {
      mockSupplierService.remove.mockResolvedValue(undefined);

      await controller.remove(1, true);

      expect(mockSupplierService.remove).toHaveBeenCalledWith(1, true);
    });

    it('should pass NotFoundException from service', async () => {
      mockSupplierService.remove.mockRejectedValue(
        new NotFoundException('Supplier with ID 999 not found'),
      );

      await expect(controller.remove(999, false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should pass ConflictException from service', async () => {
      mockSupplierService.remove.mockRejectedValue(
        new ConflictException(
          'Cannot delete supplier. Related data exists: 2 fabric supplier records.',
        ),
      );

      await expect(controller.remove(1, false)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ============================================================
  // 2.1.7 Find Supplier Fabrics Controller Tests
  // ============================================================
  describe('findSupplierFabrics (GET /:id/fabrics)', () => {
    const mockSupplierFabrics = {
      items: [
        {
          fabric: {
            id: 1,
            fabricCode: 'FB-2401-0001',
            name: 'Cotton Twill',
            color: 'Navy Blue',
            weight: 280.5,
            width: 150.0,
            defaultPrice: 45.5,
          },
          supplierRelation: {
            fabricSupplierId: 1,
            purchasePrice: 25.5,
            minOrderQty: 100,
            leadTimeDays: 7,
          },
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    };

    it('should return paginated fabrics for a supplier', async () => {
      const query: QuerySupplierFabricsDto = {};
      mockSupplierService.findSupplierFabrics.mockResolvedValue(
        mockSupplierFabrics,
      );

      const result = await controller.findSupplierFabrics(1, query);

      expect(mockSupplierService.findSupplierFabrics).toHaveBeenCalledWith(
        1,
        query,
      );
      expect(result).toEqual(mockSupplierFabrics);
    });

    it('should pass query parameters to service', async () => {
      const query: QuerySupplierFabricsDto = {
        fabricCode: 'FB-24',
        fabricName: 'Cotton',
        color: 'Navy Blue',
        page: 2,
        pageSize: 10,
        sortBy: SupplierFabricSortField.purchasePrice,
        sortOrder: 'asc',
      };
      mockSupplierService.findSupplierFabrics.mockResolvedValue({
        items: [],
        pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0 },
      });

      await controller.findSupplierFabrics(1, query);

      expect(mockSupplierService.findSupplierFabrics).toHaveBeenCalledWith(
        1,
        query,
      );
    });

    it('should pass NotFoundException from service', async () => {
      mockSupplierService.findSupplierFabrics.mockRejectedValue(
        new NotFoundException('Supplier with ID 999 not found'),
      );

      await expect(controller.findSupplierFabrics(999, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty list when supplier has no fabrics', async () => {
      const emptyResult = {
        items: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      };
      mockSupplierService.findSupplierFabrics.mockResolvedValue(emptyResult);

      const result = await controller.findSupplierFabrics(1, {});

      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });
});
