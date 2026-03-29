import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PaginatedResult } from '../common/utils/pagination';
import { AuditLog } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('AuditController', () => {
  let controller: AuditController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditController>(AuditController);
  });

  describe('GET /audit-logs', () => {
    it('should return paginated list of audit logs', async () => {
      const mockResult: PaginatedResult<AuditLog> = {
        items: [
          {
            id: 1,
            userId: 1,
            userName: 'Alice',
            action: 'create',
            entityType: 'Supplier',
            entityId: 42,
            changes: {},
            ip: '127.0.0.1',
            correlationId: 'abc',
            createdAt: new Date(),
          },
        ],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };

      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll({});

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith({});
    });

    it('should pass query filters to service', async () => {
      const query = { entityType: 'Supplier', action: 'create' };
      service.findAll.mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      });

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('GET /audit-logs/:id', () => {
    it('should return single audit log entry', async () => {
      const mockLog = {
        id: 1,
        userId: 1,
        userName: 'Alice',
        action: 'create',
        entityType: 'Supplier',
        entityId: 42,
        changes: {},
        ip: '127.0.0.1',
        correlationId: 'abc',
        createdAt: new Date(),
      };

      service.findOne.mockResolvedValue(mockLog);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockLog);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should propagate NotFoundException from service', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Audit log with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
