import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FabricService } from './fabric.service';
import { FabricController } from './fabric.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FabricController],
  providers: [FabricService],
  exports: [FabricService],
})
export class FabricModule {}
