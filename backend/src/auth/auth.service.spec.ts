import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/services/redis.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let configService: { get: jest.Mock };
  let jwtService: { sign: jest.Mock; decode: jest.Mock };
  let redisService: { get: jest.Mock; setex: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    configService = {
      get: jest.fn(),
    };

    jwtService = {
      sign: jest.fn(),
      decode: jest.fn(),
    };

    redisService = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: ConfigService, useValue: configService },
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    mockFetch.mockReset();
  });

  describe('buildWeWorkAuthUrl', () => {
    it('should build valid WeWork OAuth URL', async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          'wework.corpId': 'test-corp-id',
          'wework.agentId': 'test-agent-id',
          'wework.redirectUri': 'https://example.com/callback',
        };
        return config[key];
      });
      redisService.setex.mockResolvedValue(true);

      const url = await service.buildWeWorkAuthUrl();

      expect(url).toContain(
        'https://open.weixin.qq.com/connect/oauth2/authorize',
      );
      expect(url).toContain('appid=test-corp-id');
      expect(url).toContain('agentid=test-agent-id');
      expect(url).toContain(
        'redirect_uri=https%3A%2F%2Fexample.com%2Fcallback',
      );
      expect(url).toContain('scope=snsapi_privateinfo');
      expect(url).toContain('#wechat_redirect');
    });

    it('should generate cryptographically secure state (32 hex chars)', async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          'wework.corpId': 'test-corp-id',
          'wework.agentId': 'test-agent-id',
          'wework.redirectUri': 'https://example.com/callback',
        };
        return config[key];
      });
      redisService.setex.mockResolvedValue(true);

      await service.buildWeWorkAuthUrl();

      // Verify state is 32 hex characters (16 bytes = 32 hex chars)
      const stateKeyArg = (
        redisService.setex.mock.calls as Array<[string, number, string]>
      )[0][0];
      const state = stateKeyArg.replace('auth:state:', '');
      expect(state).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should store state in Redis and await completion', async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          'wework.corpId': 'test-corp-id',
          'wework.agentId': 'test-agent-id',
          'wework.redirectUri': 'https://example.com/callback',
        };
        return config[key];
      });
      redisService.setex.mockResolvedValue(true);

      await service.buildWeWorkAuthUrl();

      expect(redisService.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^auth:state:[a-f0-9]{32}$/),
        300,
        '1',
      );
    });

    it('should throw error when config is incomplete', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.buildWeWorkAuthUrl()).rejects.toThrow(
        'WeWork OAuth configuration is incomplete',
      );
    });
  });

  describe('handleOAuthCallback', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          'wework.corpId': 'test-corp-id',
          'wework.secret': 'test-secret',
        };
        return config[key];
      });
    });

    it('should throw UnauthorizedException for invalid state', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(
        service.handleOAuthCallback('code', 'invalid-state'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.handleOAuthCallback('code', 'invalid-state'),
      ).rejects.toThrow('Invalid or expired OAuth state');
    });

    it('should delete state after successful validation to prevent replay attacks', async () => {
      redisService.get.mockResolvedValue('1');
      redisService.del.mockResolvedValue(true);

      // Mock WeWork API responses
      mockFetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              errcode: 0,
              access_token: 'test-access-token',
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              errcode: 0,
              userid: 'test-user-id',
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              errcode: 0,
              userid: 'test-user-id',
              name: 'Test User',
            }),
        });

      prismaService.user.upsert.mockResolvedValue({
        id: 1,
        weworkId: 'test-user-id',
        name: 'Test User',
        avatar: null,
        mobile: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      jwtService.sign.mockReturnValue('test-jwt-token');

      await service.handleOAuthCallback('code', 'valid-state');

      // Verify state was deleted after validation
      expect(redisService.del).toHaveBeenCalledWith('auth:state:valid-state');
    });

    it('should complete OAuth flow successfully', async () => {
      redisService.get.mockResolvedValue('1'); // Valid state
      redisService.del.mockResolvedValue(true);

      // Mock WeWork API responses
      mockFetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              errcode: 0,
              access_token: 'test-access-token',
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              errcode: 0,
              userid: 'test-user-id',
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              errcode: 0,
              userid: 'test-user-id',
              name: 'Test User',
              avatar: 'https://avatar.com/img.png',
              mobile: '13800138000',
            }),
        });

      const mockUser = {
        id: 1,
        weworkId: 'test-user-id',
        name: 'Test User',
        avatar: 'https://avatar.com/img.png',
        mobile: '13800138000',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaService.user.upsert.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('test-jwt-token');

      const result = await service.handleOAuthCallback('code', 'valid-state');

      expect(result.token).toBe('test-jwt-token');
      expect(result.user.id).toBe(1);
      expect(result.user.weworkId).toBe('test-user-id');
      expect(result.user.name).toBe('Test User');
    });

    it('should throw UnauthorizedException when WeWork token fetch fails', async () => {
      redisService.get.mockResolvedValue('1');
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            errcode: 40001,
            errmsg: 'invalid credential',
          }),
      });

      await expect(
        service.handleOAuthCallback('code', 'state'),
      ).rejects.toThrow('Failed to authenticate with WeWork');
    });
  });

  describe('getUserInfo', () => {
    it('should return user info for valid user', async () => {
      const mockUser = {
        id: 1,
        weworkId: 'test-user-id',
        name: 'Test User',
        avatar: null,
        mobile: '13800138000',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserInfo(1);

      expect(result.id).toBe(1);
      expect(result.weworkId).toBe('test-user-id');
      expect(result.name).toBe('Test User');
      expect(result.avatar).toBeUndefined();
      expect(result.mobile).toBe('13800138000');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserInfo(999)).rejects.toThrow(NotFoundException);
      await expect(service.getUserInfo(999)).rejects.toThrow('User not found');
    });

    it('should return isAdmin=true when weworkId is in BOSS_WEWORK_IDS', async () => {
      const originalEnv = process.env.BOSS_WEWORK_IDS;
      process.env.BOSS_WEWORK_IDS = 'boss-001, boss-002';

      const mockUser = {
        id: 1,
        weworkId: 'boss-001',
        name: 'Boss User',
        avatar: null,
        mobile: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserInfo(1);
      expect(result.isAdmin).toBe(true);

      process.env.BOSS_WEWORK_IDS = originalEnv;
    });

    it('should return isAdmin=true when weworkId is in DEV_WEWORK_IDS', async () => {
      const originalBoss = process.env.BOSS_WEWORK_IDS;
      const originalDev = process.env.DEV_WEWORK_IDS;
      process.env.BOSS_WEWORK_IDS = '';
      process.env.DEV_WEWORK_IDS = 'dev-001';

      const mockUser = {
        id: 1,
        weworkId: 'dev-001',
        name: 'Dev User',
        avatar: null,
        mobile: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserInfo(1);
      expect(result.isAdmin).toBe(true);

      process.env.BOSS_WEWORK_IDS = originalBoss;
      process.env.DEV_WEWORK_IDS = originalDev;
    });

    it('should return isAdmin=false when weworkId is not admin', async () => {
      const originalBoss = process.env.BOSS_WEWORK_IDS;
      const originalDev = process.env.DEV_WEWORK_IDS;
      process.env.BOSS_WEWORK_IDS = 'boss-001';
      process.env.DEV_WEWORK_IDS = 'dev-001';

      const mockUser = {
        id: 1,
        weworkId: 'regular-user',
        name: 'Regular User',
        avatar: null,
        mobile: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserInfo(1);
      expect(result.isAdmin).toBe(false);

      process.env.BOSS_WEWORK_IDS = originalBoss;
      process.env.DEV_WEWORK_IDS = originalDev;
    });
  });

  describe('logout', () => {
    it('should blacklist token with remaining TTL', async () => {
      const token = 'abcdefghijklmnopqrstuvwxyz1234567890';
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 3600; // 1 hour from now

      jwtService.decode.mockReturnValue({
        sub: 1,
        weworkId: 'test-user',
        name: 'Test',
        exp,
      });
      redisService.setex.mockResolvedValue(true);

      const result = await service.logout(token, {
        id: 1,
        weworkId: 'test-user',
        name: 'Test',
      });

      expect(result.message).toBe('Logged out successfully');
      expect(redisService.setex).toHaveBeenCalledWith(
        expect.stringContaining('auth:blacklist:'),
        expect.any(Number),
        '1',
      );

      // Verify TTL is approximately correct (within 5 seconds tolerance)
      const calledTtl = (
        redisService.setex.mock.calls as Array<[string, number, string]>
      )[0][1];
      expect(calledTtl).toBeGreaterThan(3595);
      expect(calledTtl).toBeLessThanOrEqual(3600);
    });

    it('should handle token without exp claim', async () => {
      const token = 'abcdefghijklmnopqrstuvwxyz1234567890';
      jwtService.decode.mockReturnValue({ sub: 1 });

      const result = await service.logout(token, {
        id: 1,
        weworkId: 'test-user',
        name: 'Test',
      });

      expect(result.message).toBe('Logged out successfully');
      expect(redisService.setex).not.toHaveBeenCalled();
    });

    it('should handle expired token', async () => {
      const token = 'abcdefghijklmnopqrstuvwxyz1234567890';
      const now = Math.floor(Date.now() / 1000);
      const exp = now - 100; // Already expired

      jwtService.decode.mockReturnValue({ sub: 1, exp });

      const result = await service.logout(token, {
        id: 1,
        weworkId: 'test-user',
        name: 'Test',
      });

      expect(result.message).toBe('Logged out successfully');
      expect(redisService.setex).not.toHaveBeenCalled();
    });
  });
});
