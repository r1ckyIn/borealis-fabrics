import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Pino logger
  app.useLogger(app.get(Logger));

  // Security
  app.use(helmet());

  // CORS
  app.enableCors();

  // API prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'ready'],
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Borealis Fabrics API')
    .setDescription('Fabric trading management system API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
void bootstrap();
