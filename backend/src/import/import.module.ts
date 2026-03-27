import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { FabricImportStrategy } from './strategies/fabric-import.strategy';
import { SupplierImportStrategy } from './strategies/supplier-import.strategy';
import { ProductImportStrategy } from './strategies/product-import.strategy';
import { PurchaseOrderImportStrategy } from './strategies/purchase-order-import.strategy';
import { SalesContractImportStrategy } from './strategies/sales-contract-import.strategy';

@Module({
  imports: [PrismaModule],
  controllers: [ImportController],
  providers: [
    ImportService,
    FabricImportStrategy,
    SupplierImportStrategy,
    ProductImportStrategy,
    PurchaseOrderImportStrategy,
    SalesContractImportStrategy,
  ],
  exports: [ImportService],
})
export class ImportModule {}
