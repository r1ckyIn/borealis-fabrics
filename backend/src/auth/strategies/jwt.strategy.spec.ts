import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('should return user object for valid payload', () => {
      const payload = {
        sub: 123,
        weworkId: 'test-wework-id',
        name: 'Test User',
        iat: 1234567890,
        exp: 1234567890 + 3600,
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        id: 123,
        weworkId: 'test-wework-id',
        name: 'Test User',
      });
    });

    it('should throw UnauthorizedException when sub is missing', () => {
      const payload = {
        sub: undefined as unknown as number,
        weworkId: 'test-wework-id',
        name: 'Test User',
      };

      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
      expect(() => strategy.validate(payload)).toThrow('Invalid token payload');
    });

    it('should throw UnauthorizedException when weworkId is missing', () => {
      const payload = {
        sub: 123,
        weworkId: '',
        name: 'Test User',
      };

      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
      expect(() => strategy.validate(payload)).toThrow('Invalid token payload');
    });

    it('should handle payload with optional fields', () => {
      const payload = {
        sub: 456,
        weworkId: 'another-id',
        name: 'Another User',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        id: 456,
        weworkId: 'another-id',
        name: 'Another User',
      });
    });
  });
});
