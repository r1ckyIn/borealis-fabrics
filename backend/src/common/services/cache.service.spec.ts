import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisService } from './redis.service';

describe('CacheService', () => {
  let service: CacheService;
  let mockRedisService: {
    get: jest.Mock;
    setex: jest.Mock;
    getClient: jest.Mock;
    isAvailable: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRedisService = {
      get: jest.fn(),
      setex: jest.fn(),
      getClient: jest.fn(),
      isAvailable: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  describe('getOrSet', () => {
    it('should return cached value when Redis has the key (no factory call)', async () => {
      const cachedData = { items: [{ id: 1, name: 'Fabric A' }], total: 1 };
      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedData));

      const factory = jest.fn();
      const result = await service.getOrSet('fabric:list:{}', 300, factory);

      expect(result).toEqual(cachedData);
      expect(factory).not.toHaveBeenCalled();
      expect(mockRedisService.get).toHaveBeenCalledWith('cache:fabric:list:{}');
    });

    it('should call factory and store result when cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.setex.mockResolvedValue(true);

      const freshData = { items: [{ id: 2, name: 'Fabric B' }], total: 1 };
      const factory = jest.fn().mockResolvedValue(freshData);

      const result = await service.getOrSet('fabric:list:{}', 300, factory);

      expect(result).toEqual(freshData);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(mockRedisService.setex).toHaveBeenCalledWith(
        'cache:fabric:list:{}',
        300,
        JSON.stringify(freshData),
      );
    });

    it('should call factory when Redis is unavailable (graceful degradation)', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.setex.mockResolvedValue(false);

      const freshData = { items: [], total: 0 };
      const factory = jest.fn().mockResolvedValue(freshData);

      const result = await service.getOrSet('supplier:list:{}', 300, factory);

      expect(result).toEqual(freshData);
      expect(factory).toHaveBeenCalledTimes(1);
      // setex returns false when Redis is unavailable, but no error thrown
    });

    it('should call factory when cached value is unparseable JSON', async () => {
      mockRedisService.get.mockResolvedValue('not-valid-json{{{');
      mockRedisService.setex.mockResolvedValue(true);

      const freshData = { items: [], total: 0 };
      const factory = jest.fn().mockResolvedValue(freshData);

      const result = await service.getOrSet('fabric:list:{}', 300, factory);

      expect(result).toEqual(freshData);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(mockRedisService.setex).toHaveBeenCalledWith(
        'cache:fabric:list:{}',
        300,
        JSON.stringify(freshData),
      );
    });

    it('should prefix all cache keys with cache: namespace', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.setex.mockResolvedValue(true);

      const factory = jest.fn().mockResolvedValue({ data: 'test' });
      await service.getOrSet('my:key', 60, factory);

      expect(mockRedisService.get).toHaveBeenCalledWith('cache:my:key');
      expect(mockRedisService.setex).toHaveBeenCalledWith(
        'cache:my:key',
        60,
        JSON.stringify({ data: 'test' }),
      );
    });
  });

  describe('invalidateByPrefix', () => {
    it('should scan and delete all keys matching pattern using SCAN', async () => {
      const mockClient = {
        scan: jest.fn(),
        del: jest.fn().mockResolvedValue(2),
      };

      // First scan returns 2 keys and a cursor, second returns cursor '0'
      mockClient.scan
        .mockResolvedValueOnce([
          '5',
          ['cache:fabric:list:1', 'cache:fabric:list:2'],
        ])
        .mockResolvedValueOnce(['0', []]);

      mockRedisService.getClient.mockReturnValue(mockClient);

      await service.invalidateByPrefix('fabric:');

      expect(mockClient.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'cache:fabric:*',
        'COUNT',
        100,
      );
      expect(mockClient.del).toHaveBeenCalledWith(
        'cache:fabric:list:1',
        'cache:fabric:list:2',
      );
    });

    it('should do nothing when Redis client is null', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      // Should not throw
      await expect(
        service.invalidateByPrefix('fabric:'),
      ).resolves.toBeUndefined();
    });

    it('should handle multiple SCAN iterations', async () => {
      const mockClient = {
        scan: jest.fn(),
        del: jest.fn().mockResolvedValue(1),
      };

      // Three iterations: first returns keys + cursor, second returns keys + cursor, third returns cursor '0'
      mockClient.scan
        .mockResolvedValueOnce(['10', ['cache:product:list:a']])
        .mockResolvedValueOnce(['20', ['cache:product:list:b']])
        .mockResolvedValueOnce(['0', []]);

      mockRedisService.getClient.mockReturnValue(mockClient);

      await service.invalidateByPrefix('product:');

      expect(mockClient.scan).toHaveBeenCalledTimes(3);
      expect(mockClient.del).toHaveBeenCalledTimes(2);
      expect(mockClient.del).toHaveBeenCalledWith('cache:product:list:a');
      expect(mockClient.del).toHaveBeenCalledWith('cache:product:list:b');
    });
  });
});
