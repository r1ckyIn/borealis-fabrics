import {
  Controller,
  ForbiddenException,
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
import { LoginResponseDto, UserResponseDto, LogoutResponseDto } from './dto';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from './constants';

/**
 * Extended Express Request with authenticated user.
 */
interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

/**
 * AuthController handles authentication endpoints including
 * WeWork OAuth flow, user info, and logout.
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
   * Get cookie options with environment-appropriate secure flag.
   */
  private getCookieOptions(): typeof AUTH_COOKIE_OPTIONS & { secure: boolean } {
    const isProduction =
      this.configService.get<string>('nodeEnv') === 'production';
    return { ...AUTH_COOKIE_OPTIONS, secure: isProduction };
  }

  /**
   * 3.5.1 WeWork OAuth login - redirects to WeWork authorization page.
   */
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
   * Dev mode login - bypasses WeWork OAuth for local development.
   * Only available when NODE_ENV=development.
   */
  @Post('dev/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dev mode login (development only)' })
  @ApiResponse({
    status: 200,
    description: 'Dev login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not in development mode' })
  async devLogin(
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const nodeEnv = this.configService.get<string>('nodeEnv');
    if (nodeEnv !== 'development') {
      throw new ForbiddenException(
        'Dev login is only available in development mode',
      );
    }

    const result = await this.authService.devLogin();
    res.cookie(AUTH_COOKIE_NAME, result.token, this.getCookieOptions());
    return result;
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
