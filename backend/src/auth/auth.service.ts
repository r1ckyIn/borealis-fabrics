import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { JwtPayload, RequestUser } from './interfaces';
import { UserResponseDto, LoginResponseDto, LogoutResponseDto } from './dto';

/** Redis key prefix for blacklisted tokens */
const TOKEN_BLACKLIST_PREFIX = 'auth:blacklist:';

/** Redis key prefix for OAuth state */
const OAUTH_STATE_PREFIX = 'auth:state:';

/** OAuth state expiration time in seconds (5 minutes) */
const OAUTH_STATE_TTL = 300;

/**
 * WeWork user info response structure.
 */
interface WeWorkUserInfo {
  userid: string;
  name: string;
  avatar?: string;
  mobile?: string;
}

/**
 * AuthService handles authentication operations including
 * WeWork OAuth flow, JWT token management, and user session handling.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Build WeWork OAuth authorization URL.
   */
  buildWeWorkAuthUrl(): string {
    const corpId = this.configService.get<string>('wework.corpId');
    const agentId = this.configService.get<string>('wework.agentId');
    const redirectUri = this.configService.get<string>('wework.redirectUri');

    if (!corpId || !agentId || !redirectUri) {
      throw new Error('WeWork OAuth configuration is incomplete');
    }

    const state = this.generateState();

    // Store state in Redis for CSRF protection
    void this.redisService.setex(
      `${OAUTH_STATE_PREFIX}${state}`,
      OAUTH_STATE_TTL,
      '1',
    );

    const params = new URLSearchParams({
      appid: corpId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'snsapi_privateinfo',
      state,
      agentid: agentId,
    });

    return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
  }

  /**
   * Handle OAuth callback: exchange code for user info and sign JWT.
   */
  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<LoginResponseDto> {
    // Validate state parameter (CSRF protection)
    const isValidState = await this.validateState(state);
    if (!isValidState) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    // Get WeWork access token
    const accessToken = await this.getWeWorkAccessToken();

    // Get user info from WeWork
    const userInfo = await this.getWeWorkUserInfo(accessToken, code);

    // Upsert user in database
    const user = await this.upsertUser(userInfo);

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      token,
      user: this.toUserResponseDto(user),
    };
  }

  /**
   * Get current user information.
   */
  async getUserInfo(userId: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserResponseDto(user);
  }

  /**
   * Logout user by blacklisting their token.
   */
  async logout(token: string, user: RequestUser): Promise<LogoutResponseDto> {
    // Calculate remaining token TTL

    const decoded: { exp?: number } | null = this.jwtService.decode(token);

    if (decoded && typeof (decoded as { exp?: unknown }).exp === 'number') {
      const ttl = (decoded.exp as number) - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        // Add token to blacklist with remaining TTL
        const key = `${TOKEN_BLACKLIST_PREFIX}${this.hashToken(token)}`;
        await this.redisService.setex(key, ttl, '1');
        this.logger.log(`User ${user.weworkId} logged out`);
      }
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Generate a random state string for OAuth CSRF protection.
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Validate OAuth state parameter.
   */
  private async validateState(state: string): Promise<boolean> {
    const key = `${OAUTH_STATE_PREFIX}${state}`;
    const value = await this.redisService.get(key);
    return value !== null;
  }

  /**
   * Get WeWork access token using corp credentials.
   */
  private async getWeWorkAccessToken(): Promise<string> {
    const corpId = this.configService.get<string>('wework.corpId');
    const secret = this.configService.get<string>('wework.secret');

    if (!corpId || !secret) {
      throw new Error('WeWork credentials not configured');
    }

    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`;

    const response = await fetch(url);
    const data = (await response.json()) as {
      errcode?: number;
      errmsg?: string;
      access_token?: string;
    };

    if (data.errcode !== 0 || !data.access_token) {
      this.logger.error(`Failed to get WeWork access token: ${data.errmsg}`);
      throw new UnauthorizedException('Failed to authenticate with WeWork');
    }

    return data.access_token;
  }

  /**
   * Get user info from WeWork using OAuth code.
   */
  private async getWeWorkUserInfo(
    accessToken: string,
    code: string,
  ): Promise<WeWorkUserInfo> {
    // First, get user ID from code
    const userInfoUrl = `https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=${accessToken}&code=${code}`;

    const userInfoResponse = await fetch(userInfoUrl);
    const userInfoData = (await userInfoResponse.json()) as {
      errcode?: number;
      errmsg?: string;
      userid?: string;
    };

    if (userInfoData.errcode !== 0 || !userInfoData.userid) {
      this.logger.error(
        `Failed to get WeWork user info: ${userInfoData.errmsg}`,
      );
      throw new UnauthorizedException('Failed to get user info from WeWork');
    }

    // Then, get detailed user info
    const userDetailUrl = `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&userid=${userInfoData.userid}`;

    const userDetailResponse = await fetch(userDetailUrl);
    const userDetailData = (await userDetailResponse.json()) as {
      errcode?: number;
      errmsg?: string;
      userid?: string;
      name?: string;
      avatar?: string;
      mobile?: string;
    };

    if (userDetailData.errcode !== 0 || !userDetailData.userid) {
      this.logger.error(
        `Failed to get WeWork user details: ${userDetailData.errmsg}`,
      );
      throw new UnauthorizedException('Failed to get user details from WeWork');
    }

    return {
      userid: userDetailData.userid,
      name: userDetailData.name || userDetailData.userid,
      avatar: userDetailData.avatar,
      mobile: userDetailData.mobile,
    };
  }

  /**
   * Create or update user in database.
   */
  private async upsertUser(userInfo: WeWorkUserInfo) {
    return this.prisma.user.upsert({
      where: { weworkId: userInfo.userid },
      create: {
        weworkId: userInfo.userid,
        name: userInfo.name,
        avatar: userInfo.avatar,
        mobile: userInfo.mobile,
      },
      update: {
        name: userInfo.name,
        avatar: userInfo.avatar,
        mobile: userInfo.mobile,
      },
    });
  }

  /**
   * Generate JWT token for user.
   */
  private generateToken(user: {
    id: number;
    weworkId: string;
    name: string;
  }): string {
    const payload: JwtPayload = {
      sub: user.id,
      weworkId: user.weworkId,
      name: user.name,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Convert database user to response DTO.
   */
  private toUserResponseDto(user: {
    id: number;
    weworkId: string;
    name: string;
    avatar: string | null;
    mobile: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.weworkId = user.weworkId;
    dto.name = user.name;
    dto.avatar = user.avatar ?? undefined;
    dto.mobile = user.mobile ?? undefined;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }

  /**
   * Simple hash function for token blacklist keys.
   */
  private hashToken(token: string): string {
    return token.substring(0, 32);
  }
}
