import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FileModule } from '../file/file.module';
import { AuthModule } from '../auth/auth.module';
import { FabricService } from './fabric.service';
import { FabricController } from './fabric.controller';

@Module({
  imports: [PrismaModule, FileModule, AuthModule],
  controllers: [FabricController],
  providers: [FabricService],
  exports: [FabricService],
})
export class FabricModule {}
