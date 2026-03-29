import { AuditInterceptor } from './audit.interceptor';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { AuditService } from './audit.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let reflector: Reflector;
  let cls: { get: jest.Mock; getId: jest.Mock };
  let auditService: {
    createLog: jest.Mock;
    fetchEntityById: jest.Mock;
  };

  const createMockContext = (
    params: Record<string, string> = {},
  ): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          params,
          ip: '127.0.0.1',
          headers: {},
        }),
      }),
    }) as unknown as ExecutionContext;

  const createMockNext = (result: unknown): CallHandler =>
    ({
      handle: () => of(result),
    }) as unknown as CallHandler;

  beforeEach(() => {
    reflector = new Reflector();
    cls = {
      get: jest
        .fn()
        .mockReturnValue({ id: 1, name: 'Alice', weworkId: 'w001' }),
      getId: jest.fn().mockReturnValue('corr-123'),
    };
    auditService = {
      createLog: jest.fn().mockResolvedValue(undefined),
      fetchEntityById: jest.fn().mockResolvedValue(null),
    };
    interceptor = new AuditInterceptor(
      reflector,
      cls as unknown as ClsService,
      auditService as unknown as AuditService,
    );
  });

  it('should pass through when no @Audited metadata', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
    const context = createMockContext();
    const next = createMockNext({ id: 1 });

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ id: 1 });
    expect(auditService.createLog).not.toHaveBeenCalled();
  });

  it('should call createLog for create action with result as afterState', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue({
      entityType: 'Supplier',
      action: 'create',
    });

    const context = createMockContext({});
    const next = createMockNext({ id: 42, companyName: 'Acme' });

    const result$ = await interceptor.intercept(context, next);
    await lastValueFrom(result$);

    // Wait for async tap to complete
    await new Promise((r) => setTimeout(r, 10));

    expect(auditService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        userName: 'Alice',
        action: 'create',
        entityType: 'Supplier',
        entityId: 42,
        ip: '127.0.0.1',
        correlationId: 'corr-123',
      }),
    );
  });

  it('should fetch beforeState for update action', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue({
      entityType: 'Supplier',
      action: 'update',
    });
    auditService.fetchEntityById.mockResolvedValue({
      id: 1,
      companyName: 'Old',
    });

    const context = createMockContext({ id: '1' });
    const next = createMockNext({ id: 1, companyName: 'New' });

    const result$ = await interceptor.intercept(context, next);
    await lastValueFrom(result$);
    await new Promise((r) => setTimeout(r, 10));

    expect(auditService.fetchEntityById).toHaveBeenCalledWith('Supplier', 1);
    expect(auditService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update',
        entityType: 'Supplier',
        entityId: 1,
      }),
    );
  });

  it('should fetch beforeState for delete action', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue({
      entityType: 'Supplier',
      action: 'delete',
    });
    auditService.fetchEntityById.mockResolvedValue({
      id: 1,
      companyName: 'Del',
    });

    const context = createMockContext({ id: '1' });
    const next = createMockNext(undefined);

    const result$ = await interceptor.intercept(context, next);
    await lastValueFrom(result$);
    await new Promise((r) => setTimeout(r, 10));

    expect(auditService.fetchEntityById).toHaveBeenCalledWith('Supplier', 1);
    expect(auditService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'delete',
        entityType: 'Supplier',
        entityId: 1,
      }),
    );
  });

  it('should not throw when audit write fails (fire-and-forget)', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue({
      entityType: 'Supplier',
      action: 'create',
    });
    auditService.createLog.mockRejectedValue(new Error('DB error'));

    const context = createMockContext({});
    const next = createMockNext({ id: 1 });

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    // Should not throw, result should still be returned
    expect(result).toEqual({ id: 1 });
  });

  it('should pass correlationId from cls.getId()', async () => {
    cls.getId.mockReturnValue('my-corr-id');
    jest.spyOn(reflector, 'get').mockReturnValue({
      entityType: 'Customer',
      action: 'create',
    });

    const context = createMockContext({});
    const next = createMockNext({ id: 5 });

    const result$ = await interceptor.intercept(context, next);
    await lastValueFrom(result$);
    await new Promise((r) => setTimeout(r, 10));

    expect(auditService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'my-corr-id',
      }),
    );
  });

  it('should use custom idParam when specified', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue({
      entityType: 'Supplier',
      action: 'update',
      idParam: 'supplierId',
    });
    auditService.fetchEntityById.mockResolvedValue({ id: 99 });

    const context = createMockContext({ supplierId: '99' });
    const next = createMockNext({ id: 99, companyName: 'Updated' });

    const result$ = await interceptor.intercept(context, next);
    await lastValueFrom(result$);
    await new Promise((r) => setTimeout(r, 10));

    expect(auditService.fetchEntityById).toHaveBeenCalledWith('Supplier', 99);
    expect(auditService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 99 }),
    );
  });
});
