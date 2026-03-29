import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AuditService, CreateAuditLogData } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: {
    auditLog: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    supplier: { findFirst: jest.Mock };
    customer: { findFirst: jest.Mock };
    $queryRawUnsafe: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      supplier: { findFirst: jest.fn() },
      customer: { findFirst: jest.fn() },
      $queryRawUnsafe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('createLog', () => {
    it('should store audit entry with all required fields', async () => {
      const data: CreateAuditLogData = {
        userId: 1,
        userName: 'Alice',
        action: 'create',
        entityType: 'Supplier',
        entityId: 42,
        changes: { name: 'Test Supplier' },
        ip: '192.168.1.1',
        correlationId: 'abc-123',
      };

      prisma.auditLog.create.mockResolvedValue({ id: 1, ...data });

      await service.createLog(data);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          userName: 'Alice',
          action: 'create',
          entityType: 'Supplier',
          entityId: 42,
          changes: { name: 'Test Supplier' },
          ip: '192.168.1.1',
          correlationId: 'abc-123',
        },
      });
    });

    it('should not throw when create fails (fire-and-forget)', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('DB error'));

      const data: CreateAuditLogData = {
        userId: 1,
        userName: 'Alice',
        action: 'create',
        entityType: 'Supplier',
        entityId: 42,
        changes: {},
        ip: '',
        correlationId: '',
      };

      // Should not throw
      await expect(service.createLog(data)).resolves.toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const mockLogs = [
        { id: 1, action: 'create', entityType: 'Supplier' },
        { id: 2, action: 'update', entityType: 'Customer' },
      ];
      prisma.auditLog.findMany.mockResolvedValue(mockLogs);
      prisma.auditLog.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, pageSize: 20 });

      expect(result.items).toEqual(mockLogs);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by entityType', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({ entityType: 'Supplier' });

      const findManyCall = prisma.auditLog.findMany.mock.calls[0][0];
      expect(findManyCall.where.entityType).toBe('Supplier');
    });

    it('should filter by action', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({ action: 'create' });

      const findManyCall = prisma.auditLog.findMany.mock.calls[0][0];
      expect(findManyCall.where.action).toBe('create');
    });

    it('should filter by userId', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({ userId: 5 });

      const findManyCall = prisma.auditLog.findMany.mock.calls[0][0];
      expect(findManyCall.where.userId).toBe(5);
    });

    it('should filter by date range', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      const findManyCall = prisma.auditLog.findMany.mock.calls[0][0];
      expect(findManyCall.where.createdAt).toBeDefined();
      expect(findManyCall.where.createdAt.gte).toEqual(
        new Date('2026-01-01'),
      );
    });

    it('should search by keyword in userName', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({ keyword: 'Alice' });

      const findManyCall = prisma.auditLog.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return single audit entry by id', async () => {
      const mockLog = {
        id: 1,
        action: 'create',
        entityType: 'Supplier',
      };
      prisma.auditLog.findFirst.mockResolvedValue(mockLog);

      const result = await service.findOne(1);

      expect(result).toEqual(mockLog);
      expect(prisma.auditLog.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.auditLog.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('fetchEntityById', () => {
    it('should fetch entity using $queryRawUnsafe for soft-delete bypass', async () => {
      const mockEntity = [{ id: 1, companyName: 'Test' }];
      prisma.$queryRawUnsafe.mockResolvedValue(mockEntity);

      const result = await service.fetchEntityById('Supplier', 1);

      expect(result).toEqual({ id: 1, companyName: 'Test' });
      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should return null for unknown entity type', async () => {
      const result = await service.fetchEntityById('Unknown', 1);

      expect(result).toBeNull();
    });

    it('should return null when entity not found', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.fetchEntityById('Supplier', 999);

      expect(result).toBeNull();
    });
  });
});
