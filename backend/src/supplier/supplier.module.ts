import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule, ClsModule],
  controllers: [SupplierController],
  providers: [SupplierService],
  exports: [SupplierService],
})
export class SupplierModule {}
