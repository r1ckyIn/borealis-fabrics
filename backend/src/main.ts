import './instrument';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);

  // Pino logger
  app.useLogger(app.get(Logger));

  // Security headers via Helmet
  const isProduction =
    (configService.get<string>('nodeEnv') || 'development') === 'production';
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: isProduction
            ? ["'self'"]
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Ant Design inline styles
          imgSrc: ["'self'", 'data:'],
          connectSrc: isProduction
            ? ["'self'"]
            : ["'self'", 'ws://localhost:*'], // Vite HMR WebSocket in dev
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
      },
    }),
  );

  // Cookie parser for HttpOnly cookie authentication
  app.use(cookieParser());

  // CORS - use configured origins instead of allowing all
  const corsOrigins = configService.get<string[]>('cors.origins') || [
    'http://localhost:5173',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    exposedHeaders: ['X-Correlation-ID'],
  });

  // Serve uploaded files (local storage)
  const uploadDir = configService.get<string>('UPLOAD_DIR') || './uploads';
  app.useStaticAssets(path.resolve(uploadDir), { prefix: '/uploads/' });

  // API prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'ready', 'metrics'],
  });

  // Swagger - only expose in non-production environments
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Borealis Fabrics API')
      .setDescription('Fabric trading management system API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);
}
void bootstrap();
