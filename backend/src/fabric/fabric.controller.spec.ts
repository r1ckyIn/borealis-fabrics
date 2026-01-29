import { Test, TestingModule } from '@nestjs/testing';
import { FabricController } from './fabric.controller';
import { FabricService } from './fabric.service';
import { CreateFabricDto, QueryFabricDto, UpdateFabricDto } from './dto';
import { Fabric } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PaginatedResult } from '../common/utils/pagination';

describe('FabricController', () => {
  let controller: FabricController;

  // Mock data
  const mockFabric: Fabric = {
    id: 1,
    fabricCode: 'FB-2401-0001',
    name: 'Premium Cotton Twill',
    material: null,
    composition: '80% Cotton, 20% Polyester',
    color: 'Navy Blue',
    weight: new Decimal(280.5),
    width: new Decimal(150.0),
    thickness: 'Medium',
    handFeel: 'Soft',
    glossLevel: 'Matte',
    application: null,
    defaultPrice: new Decimal(45.5),
    defaultLeadTime: 14,
    description: 'High-quality cotton twill fabric',
    tags: null,
    notes: null,
    isActive: true,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockPaginatedResult: PaginatedResult<Fabric> = {
    items: [mockFabric],
    pagination: {
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    },
  };

  const mockFabricService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FabricController],
      providers: [
        {
          provide: FabricService,
          useValue: mockFabricService,
        },
      ],
    }).compile();

    controller = module.get<FabricController>(FabricController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ========================================
  // CREATE Tests
  // ========================================
  describe('create (POST /)', () => {
    it('should create a fabric successfully', async () => {
      const createDto: CreateFabricDto = {
        fabricCode: 'FB-2401-0001',
        name: 'Premium Cotton Twill',
      };
      mockFabricService.create.mockResolvedValue(mockFabric);

      const result = await controller.create(createDto);

      expect(mockFabricService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockFabric);
    });
  });

  // ========================================
  // FIND ALL Tests
  // ========================================
  describe('findAll (GET /)', () => {
    it('should return paginated fabrics', async () => {
      const query: QueryFabricDto = { page: 1, pageSize: 20 };
      mockFabricService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(query);

      expect(mockFabricService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass query parameters to service', async () => {
      const query: QueryFabricDto = {
        page: 2,
        pageSize: 10,
        fabricCode: 'FB-2401',
        name: 'Cotton',
        color: 'Navy Blue',
      };
      mockFabricService.findAll.mockResolvedValue(mockPaginatedResult);

      await controller.findAll(query);

      expect(mockFabricService.findAll).toHaveBeenCalledWith(query);
    });
  });

  // ========================================
  // FIND ONE Tests
  // ========================================
  describe('findOne (GET /:id)', () => {
    it('should return a fabric by ID', async () => {
      mockFabricService.findOne.mockResolvedValue(mockFabric);

      const result = await controller.findOne(1);

      expect(mockFabricService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockFabric);
    });
  });

  // ========================================
  // UPDATE Tests
  // ========================================
  describe('update (PATCH /:id)', () => {
    it('should update a fabric successfully', async () => {
      const updateDto: UpdateFabricDto = { name: 'Updated Name' };
      const updatedFabric = { ...mockFabric, ...updateDto };
      mockFabricService.update.mockResolvedValue(updatedFabric);

      const result = await controller.update(1, updateDto);

      expect(mockFabricService.update).toHaveBeenCalledWith(1, updateDto);
      expect(result.name).toBe('Updated Name');
    });
  });

  // ========================================
  // REMOVE Tests
  // ========================================
  describe('remove (DELETE /:id)', () => {
    it('should remove a fabric without force', async () => {
      mockFabricService.remove.mockResolvedValue(undefined);

      await controller.remove(1, undefined);

      expect(mockFabricService.remove).toHaveBeenCalledWith(1, false);
    });

    it('should remove a fabric with force=true', async () => {
      mockFabricService.remove.mockResolvedValue(undefined);

      await controller.remove(1, true);

      expect(mockFabricService.remove).toHaveBeenCalledWith(1, true);
    });

    it('should remove a fabric with force=false', async () => {
      mockFabricService.remove.mockResolvedValue(undefined);

      await controller.remove(1, false);

      expect(mockFabricService.remove).toHaveBeenCalledWith(1, false);
    });
  });
});
