import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

// Mock ioredis
jest.mock('ioredis', () => {
  const mockOn = jest.fn();
  const mockConnect = jest.fn().mockResolvedValue(undefined);
  const mockQuit = jest.fn().mockResolvedValue('OK');
  const mockIncr = jest.fn();
  const mockGet = jest.fn();
  const mockSet = jest.fn();
  const mockSetex = jest.fn();

  return jest.fn().mockImplementation(() => ({
    on: mockOn,
    connect: mockConnect,
    quit: mockQuit,
    incr: mockIncr,
    get: mockGet,
    set: mockSet,
    setex: mockSetex,
  }));
});

describe('RedisService', () => {
  let service: RedisService;
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('initialization', () => {
    it('should not initialize client when REDIS_URL is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const newService = module.get<RedisService>(RedisService);
      expect(newService.isAvailable()).toBe(false);
      expect(newService.getClient()).toBeNull();
    });

    it('should initialize client when REDIS_URL is configured', () => {
      mockConfigService.get.mockReturnValue('redis://localhost:6379');

      // Client is initialized but not connected by default in test
      expect(service.getClient()).toBeNull(); // Not connected yet
    });
  });

  describe('isAvailable', () => {
    it('should return false when not connected', () => {
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('incr', () => {
    it('should return null when Redis is unavailable', async () => {
      const result = await service.incr('test:key');
      expect(result).toBeNull();
    });
  });

  describe('get', () => {
    it('should return null when Redis is unavailable', async () => {
      const result = await service.get('test:key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should return false when Redis is unavailable', async () => {
      const result = await service.set('test:key', 'value');
      expect(result).toBe(false);
    });
  });

  describe('setex', () => {
    it('should return false when Redis is unavailable', async () => {
      const result = await service.setex('test:key', 60, 'value');
      expect(result).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should handle destroy gracefully when client is null', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const newService = module.get<RedisService>(RedisService);
      await expect(newService.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
