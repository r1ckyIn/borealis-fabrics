import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RedisService } from '../../common/services/redis.service';
import { TOKEN_BLACKLIST_PREFIX, hashToken } from '../constants';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let configService: { get: jest.Mock };
  let jwtService: { verify: jest.Mock };
  let redisService: { get: jest.Mock };

  const mockRequest = (authHeader?: string) => ({
    headers: {
      authorization: authHeader,
    },
  });

  const mockExecutionContext = (request: object): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    };

    jwtService = {
      verify: jest.fn(),
    };

    redisService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: ConfigService, useValue: configService },
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  describe('development mode', () => {
    it('should allow access and inject mock user in development', async () => {
      configService.get.mockReturnValue('development');
      const request = mockRequest();
      const context = mockExecutionContext(request);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect((request as { user?: unknown }).user).toEqual({
        id: 1,
        weworkId: 'dev-user',
        name: 'Dev User',
      });
    });
  });

  describe('production mode', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'nodeEnv') return 'production';
        if (key === 'jwt.secret') return 'test-secret';
        return undefined;
      });
    });

    it('should throw UnauthorizedException when no authorization header', async () => {
      const request = mockRequest();
      const context = mockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing authorization token',
      );
    });

    it('should throw UnauthorizedException when authorization header is not Bearer', async () => {
      const request = mockRequest('Basic sometoken');
      const context = mockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is blacklisted', async () => {
      redisService.get.mockResolvedValue('1'); // Token is blacklisted
      const request = mockRequest('Bearer validtoken12345678901234567890');
      const context = mockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Token has been revoked',
      );
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      redisService.get.mockResolvedValue(null); // Not blacklisted
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      const request = mockRequest('Bearer invalidtoken1234567890123456');
      const context = mockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should allow access and attach user when token is valid', async () => {
      redisService.get.mockResolvedValue(null); // Not blacklisted
      jwtService.verify.mockReturnValue({
        sub: 123,
        weworkId: 'test-user-id',
        name: 'Test User',
      });
      const request = mockRequest('Bearer validtoken12345678901234567890');
      const context = mockExecutionContext(request);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect((request as { user?: unknown }).user).toEqual({
        id: 123,
        weworkId: 'test-user-id',
        name: 'Test User',
      });
    });

    it('should check blacklist with hashed token key', async () => {
      redisService.get.mockResolvedValue(null);
      jwtService.verify.mockReturnValue({
        sub: 1,
        weworkId: 'user',
        name: 'User',
      });
      const token = 'abcdefghijklmnopqrstuvwxyz1234567890';
      const request = mockRequest(`Bearer ${token}`);
      const context = mockExecutionContext(request);

      await guard.canActivate(context);

      expect(redisService.get).toHaveBeenCalledWith(
        `${TOKEN_BLACKLIST_PREFIX}${hashToken(token)}`,
      );
    });
  });
});
