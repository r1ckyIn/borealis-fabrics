import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RequestUser } from './interfaces';
import { UserResponseDto, LogoutResponseDto } from './dto';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from './constants';

/** Rate limit override for authentication endpoints (5 req/min). */
const AUTH_THROTTLE = { default: { ttl: 60000, limit: 5 } } as const;

/** Extended Express Request with authenticated user. */
interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

/**
 * AuthController handles authentication endpoints including
 * WeChat Work OAuth flow, user info, and logout.
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get cookie options with secure flag controlled by FORCE_HTTPS_COOKIES env var.
   * Set FORCE_HTTPS_COOKIES=true when SSL is configured.
   */
  private getCookieOptions(): typeof AUTH_COOKIE_OPTIONS & { secure: boolean } {
    const forceHttps = process.env.FORCE_HTTPS_COOKIES === 'true';
    return { ...AUTH_COOKIE_OPTIONS, secure: forceHttps };
  }

  /**
   * 3.5.1 WeWork OAuth login - redirects to WeWork authorization page.
   */
  @Throttle(AUTH_THROTTLE)
  @Get('wework/login')
  @ApiOperation({ summary: 'Initiate WeWork OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to WeWork authorization page',
  })
  async weWorkLogin(@Res() res: Response): Promise<void> {
    const authUrl = await this.authService.buildWeWorkAuthUrl();
    res.redirect(authUrl);
  }

  /**
   * 3.5.2 WeWork OAuth callback - exchanges code for JWT token.
   * Token is set via HttpOnly cookie instead of URL parameter for security.
   */
  @Throttle(AUTH_THROTTLE)
  @Get('wework/callback')
  @ApiOperation({ summary: 'WeWork OAuth callback handler' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with token' })
  @ApiResponse({ status: 401, description: 'Invalid OAuth state or code' })
  async weWorkCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('cors.origins')?.[0] ||
      'http://localhost:5173';

    try {
      const result = await this.authService.handleOAuthCallback(code, state);
      res.cookie(AUTH_COOKIE_NAME, result.token, this.getCookieOptions());
      res.redirect(`${frontendUrl}/auth/callback?success=true`);
    } catch (error) {
      this.logger.error('OAuth callback failed', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed';
      res.redirect(
        `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`,
      );
    }
  }

  /**
   * 3.5.3 Get current user info.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user info' })
  @ApiResponse({ status: 200, description: 'User info', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async me(@Req() req: AuthenticatedRequest): Promise<UserResponseDto> {
    return this.authService.getUserInfo(req.user.id);
  }

  /**
   * 3.5.4 Logout - invalidates the current token.
   * Clears the HttpOnly auth cookie and blacklists the token in Redis.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate token' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    type: LogoutResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponseDto> {
    res.clearCookie(AUTH_COOKIE_NAME, this.getCookieOptions());
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE_NAME] ||
      '';
    return this.authService.logout(token, req.user);
  }
}
