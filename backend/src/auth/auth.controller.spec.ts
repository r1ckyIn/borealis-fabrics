import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    buildWeWorkAuthUrl: jest.Mock;
    handleOAuthCallback: jest.Mock;
    getUserInfo: jest.Mock;
    logout: jest.Mock;
  };
  let configService: { get: jest.Mock };

  const mockResponse = () => {
    const res: Partial<Response> = {
      redirect: jest.fn(),
    };
    return res as Response;
  };

  const mockAuthenticatedRequest = (userId = 1) => ({
    user: {
      id: userId,
      weworkId: 'test-user-id',
      name: 'Test User',
    },
    headers: {
      authorization: 'Bearer test-token',
    },
  });

  beforeEach(async () => {
    authService = {
      buildWeWorkAuthUrl: jest.fn(),
      handleOAuthCallback: jest.fn(),
      getUserInfo: jest.fn(),
      logout: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('weWorkLogin', () => {
    it('should redirect to WeWork OAuth URL', async () => {
      const mockUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize?...';
      authService.buildWeWorkAuthUrl.mockResolvedValue(mockUrl);
      const res = mockResponse();

      await controller.weWorkLogin(res);

      expect(authService.buildWeWorkAuthUrl).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.redirect).toHaveBeenCalledWith(mockUrl);
    });
  });

  describe('weWorkCallback', () => {
    it('should redirect to frontend with token on success', async () => {
      const mockResult = {
        token: 'jwt-token',
        user: {
          id: 1,
          weworkId: 'test-user',
          name: 'Test User',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      authService.handleOAuthCallback.mockResolvedValue(mockResult);
      configService.get.mockReturnValue(['http://localhost:5173']);
      const res = mockResponse();

      await controller.weWorkCallback('code', 'state', res);

      expect(authService.handleOAuthCallback).toHaveBeenCalledWith(
        'code',
        'state',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/auth/callback?token=jwt-token',
      );
    });

    it('should use default frontend URL when config is empty', async () => {
      const mockResult = { token: 'jwt-token', user: {} };
      authService.handleOAuthCallback.mockResolvedValue(mockResult);
      configService.get.mockReturnValue(undefined);
      const res = mockResponse();

      await controller.weWorkCallback('code', 'state', res);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/auth/callback?token=jwt-token',
      );
    });
  });

  describe('me', () => {
    it('should return current user info', async () => {
      const mockUser = {
        id: 1,
        weworkId: 'test-user-id',
        name: 'Test User',
        avatar: 'https://avatar.com/img.png',
        mobile: '13800138000',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      authService.getUserInfo.mockResolvedValue(mockUser);
      const req = mockAuthenticatedRequest();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.me(req as any);

      expect(authService.getUserInfo).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('should logout user and return success message', async () => {
      const mockResponse = { message: 'Logged out successfully' };
      authService.logout.mockResolvedValue(mockResponse);
      const req = mockAuthenticatedRequest();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.logout(req as any);

      expect(authService.logout).toHaveBeenCalledWith('test-token', req.user);
      expect(result).toEqual(mockResponse);
    });

    it('should handle missing authorization header', async () => {
      const mockResponse = { message: 'Logged out successfully' };
      authService.logout.mockResolvedValue(mockResponse);
      const req = {
        user: { id: 1, weworkId: 'test', name: 'Test' },
        headers: {},
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.logout(req as any);

      expect(authService.logout).toHaveBeenCalledWith('', req.user);
      expect(result).toEqual(mockResponse);
    });
  });
});
