import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule, ClsModule],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
