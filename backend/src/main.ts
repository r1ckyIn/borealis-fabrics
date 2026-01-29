import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);

  // Pino logger
  app.useLogger(app.get(Logger));

  // Security
  app.use(helmet());

  // CORS - use configured origins instead of allowing all
  const corsOrigins = configService.get<string[]>('cors.origins') || [
    'http://localhost:5173',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // API prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'ready'],
  });

  // Swagger - only expose in non-production environments
  const nodeEnv = configService.get<string>('nodeEnv') || 'development';
  if (nodeEnv !== 'production') {
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
