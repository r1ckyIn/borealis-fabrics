import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_OPTIONS } from './constants';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { createMockAuthRequest } from '../../test/helpers/mock-builders';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    buildWeWorkAuthUrl: jest.Mock;
    handleOAuthCallback: jest.Mock;
    getUserInfo: jest.Mock;
    logout: jest.Mock;
    devLogin: jest.Mock;
  };
  let configService: { get: jest.Mock };

  const mockResponse = () => {
    const res: Partial<Response> = {
      redirect: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    return res as Response;
  };

  const mockAuthenticatedRequest = createMockAuthRequest;

  beforeEach(async () => {
    authService = {
      buildWeWorkAuthUrl: jest.fn(),
      handleOAuthCallback: jest.fn(),
      getUserInfo: jest.fn(),
      logout: jest.fn(),
      devLogin: jest.fn(),
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
    it('should set cookie and redirect to frontend on success', async () => {
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
      configService.get.mockImplementation((key: string) => {
        if (key === 'cors.origins') return ['http://localhost:5173'];
        if (key === 'nodeEnv') return 'development';
        return undefined;
      });
      const res = mockResponse();

      await controller.weWorkCallback('code', 'state', res);

      expect(authService.handleOAuthCallback).toHaveBeenCalledWith(
        'code',
        'state',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.cookie).toHaveBeenCalledWith(
        'bf_auth_token',
        'jwt-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          secure: false, // development mode
        }),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/auth/callback?success=true',
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
        'http://localhost:5173/auth/callback?success=true',
      );
    });

    it('should redirect with error on OAuth failure', async () => {
      authService.handleOAuthCallback.mockRejectedValue(
        new Error('Invalid code'),
      );
      configService.get.mockReturnValue(['http://localhost:5173']);
      const res = mockResponse();

      await controller.weWorkCallback('invalid-code', 'state', res);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/auth/callback?error=Invalid%20code',
      );
    });

    it('should set secure cookie in production mode', async () => {
      const mockResult = { token: 'jwt-token', user: {} };
      authService.handleOAuthCallback.mockResolvedValue(mockResult);
      configService.get.mockImplementation((key: string) => {
        if (key === 'cors.origins') return ['https://app.example.com'];
        if (key === 'nodeEnv') return 'production';
        return undefined;
      });
      const res = mockResponse();

      await controller.weWorkCallback('code', 'state', res);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.cookie).toHaveBeenCalledWith(
        'bf_auth_token',
        'jwt-token',
        expect.objectContaining({
          secure: true, // production mode
        }),
      );
    });
  });

  describe('devLogin', () => {
    it('should return login response and set cookie in development mode', async () => {
      const mockResult = {
        token: 'dev-jwt-token',
        user: {
          id: 1,
          weworkId: 'dev-user',
          name: 'Dev User',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      authService.devLogin.mockResolvedValue(mockResult);
      configService.get.mockReturnValue('development');
      const res = mockResponse();

      const result = await controller.devLogin(res);

      expect(authService.devLogin).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.cookie).toHaveBeenCalledWith(
        'bf_auth_token',
        'dev-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          secure: false,
        }),
      );
    });

    it('should throw ForbiddenException in production mode', async () => {
      configService.get.mockReturnValue('production');

      await expect(controller.devLogin(mockResponse())).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when nodeEnv is undefined', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(controller.devLogin(mockResponse())).rejects.toThrow(
        ForbiddenException,
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

      const result = await controller.me(req);

      expect(authService.getUserInfo).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('should logout user and return success message', async () => {
      const mockLogoutResponse = { message: 'Logged out successfully' };
      authService.logout.mockResolvedValue(mockLogoutResponse);
      const req = mockAuthenticatedRequest();
      const res = mockResponse();

      const result = await controller.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith('test-token', req.user);
      expect(result).toEqual(mockLogoutResponse);
    });

    it('should clear auth cookie on logout', async () => {
      const mockLogoutResponse = { message: 'Logged out successfully' };
      authService.logout.mockResolvedValue(mockLogoutResponse);
      configService.get.mockReturnValue('development');
      const req = mockAuthenticatedRequest();
      const res = mockResponse();

      await controller.logout(req, res);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.clearCookie).toHaveBeenCalledWith('bf_auth_token', {
        ...AUTH_COOKIE_OPTIONS,
        secure: false,
      });
    });

    it('should clear auth cookie with secure flag in production', async () => {
      const mockLogoutResponse = { message: 'Logged out successfully' };
      authService.logout.mockResolvedValue(mockLogoutResponse);
      configService.get.mockReturnValue('production');
      const req = mockAuthenticatedRequest();
      const res = mockResponse();

      await controller.logout(req, res);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.clearCookie).toHaveBeenCalledWith('bf_auth_token', {
        ...AUTH_COOKIE_OPTIONS,
        secure: true,
      });
    });

    it('should handle missing authorization header', async () => {
      const mockLogoutResponse = { message: 'Logged out successfully' };
      authService.logout.mockResolvedValue(mockLogoutResponse);
      const req = createMockAuthRequest(1, { authorization: '' });
      const res = mockResponse();

      const result = await controller.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith('', req.user);
      expect(result).toEqual(mockLogoutResponse);
    });
  });
});
