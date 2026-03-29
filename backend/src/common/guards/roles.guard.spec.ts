import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (weworkId?: string): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: weworkId ? { weworkId } : undefined,
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    // Set env vars before constructing guard
    process.env.BOSS_WEWORK_IDS = 'boss001,boss002';
    process.env.DEV_WEWORK_IDS = 'dev001,dev002';
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    delete process.env.BOSS_WEWORK_IDS;
    delete process.env.DEV_WEWORK_IDS;
  });

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext('anyone');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when roles array is empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const context = createMockContext('anyone');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user weworkId is in BOSS_WEWORK_IDS', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['boss']);
    const context = createMockContext('boss001');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user weworkId is in DEV_WEWORK_IDS', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['boss']);
    const context = createMockContext('dev001');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow developer role when weworkId is in DEV_WEWORK_IDS', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['developer']);
    const context = createMockContext('dev002');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user weworkId is in neither set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['boss']);
    const context = createMockContext('random123');
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when user has no weworkId', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['boss']);
    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  describe('isAdminUser', () => {
    it('should return true for boss weworkId', () => {
      expect(guard.isAdminUser('boss001')).toBe(true);
    });

    it('should return true for developer weworkId', () => {
      expect(guard.isAdminUser('dev001')).toBe(true);
    });

    it('should return false for non-admin weworkId', () => {
      expect(guard.isAdminUser('random123')).toBe(false);
    });
  });
});
