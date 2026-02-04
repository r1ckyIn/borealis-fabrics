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
import { UserResponseDto, LogoutResponseDto } from './dto';

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
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

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
    const result = await this.authService.handleOAuthCallback(code, state);

    // Get frontend URL from config
    const frontendUrl =
      this.configService.get<string>('cors.origins')?.[0] ||
      'http://localhost:5173';

    // Redirect to frontend with token
    res.redirect(`${frontendUrl}/auth/callback?token=${result.token}`);
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
  async logout(@Req() req: AuthenticatedRequest): Promise<LogoutResponseDto> {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    return this.authService.logout(token, req.user);
  }
}
