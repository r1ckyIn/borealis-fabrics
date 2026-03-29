import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { PrismaModule } from '../prisma/prisma.module';
import { FileModule } from '../file/file.module';
import { AuthModule } from '../auth/auth.module';
import { FabricService } from './fabric.service';
import { FabricController } from './fabric.controller';

@Module({
  imports: [PrismaModule, FileModule, AuthModule, ClsModule],
  controllers: [FabricController],
  providers: [FabricService],
  exports: [FabricService],
})
export class FabricModule {}
