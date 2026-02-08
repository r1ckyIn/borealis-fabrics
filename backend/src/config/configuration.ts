// Environment variable validation for production
const validateProductionConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    const requiredVars = [
      'JWT_SECRET',
      'DATABASE_URL',
      'REDIS_URL',
      'COS_SECRET_ID',
      'COS_SECRET_KEY',
      'COS_BUCKET',
      'COS_REGION',
      'WEWORK_CORP_ID',
      'WEWORK_SECRET',
      'WEWORK_AGENT_ID',
      'WEWORK_REDIRECT_URI',
      'CORS_ORIGINS',
    ];

    const missing = requiredVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables for production: ${missing.join(', ')}`,
      );
    }

    // Ensure JWT_SECRET is not the default value
    if (process.env.JWT_SECRET === 'dev-secret') {
      throw new Error('JWT_SECRET must be set to a secure value in production');
    }

    // Ensure JWT_SECRET has sufficient length (32+ chars)
    if ((process.env.JWT_SECRET?.length ?? 0) < 32) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters in production',
      );
    }
  }
};

export default () => {
  validateProductionConfig();

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
      url: process.env.DATABASE_URL,
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
    },
    jwt: {
      // Only use default in development
      secret:
        process.env.NODE_ENV === 'production'
          ? process.env.JWT_SECRET
          : process.env.JWT_SECRET || 'dev-secret',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    wework: {
      corpId: process.env.WEWORK_CORP_ID,
      agentId: process.env.WEWORK_AGENT_ID,
      secret: process.env.WEWORK_SECRET,
      redirectUri: process.env.WEWORK_REDIRECT_URI,
    },
    cos: {
      secretId: process.env.COS_SECRET_ID,
      secretKey: process.env.COS_SECRET_KEY,
      bucket: process.env.COS_BUCKET,
      region: process.env.COS_REGION,
    },
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || [
        'http://localhost:5173',
      ],
    },
  };
};
