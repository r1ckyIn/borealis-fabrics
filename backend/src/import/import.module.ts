import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { FabricImportStrategy } from './strategies/fabric-import.strategy';
import { SupplierImportStrategy } from './strategies/supplier-import.strategy';

@Module({
  imports: [PrismaModule],
  controllers: [ImportController],
  providers: [ImportService, FabricImportStrategy, SupplierImportStrategy],
  exports: [ImportService],
})
export class ImportModule {}
