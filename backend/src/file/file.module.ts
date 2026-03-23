import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import {
  STORAGE_PROVIDER,
  LocalStorageProvider,
  CosStorageProvider,
} from './storage';

const storageProviderFactory = {
  provide: STORAGE_PROVIDER,
  useFactory: (configService: ConfigService) => {
    const mode = configService.get<string>('STORAGE_MODE', 'local');
    if (mode === 'cos') {
      return new CosStorageProvider(configService);
    }
    return new LocalStorageProvider(configService);
  },
  inject: [ConfigService],
};

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [FileController],
  providers: [storageProviderFactory, FileService],
  exports: [FileService],
})
export class FileModule {}
