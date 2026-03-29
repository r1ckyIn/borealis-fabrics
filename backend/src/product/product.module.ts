import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';

@Module({
  imports: [PrismaModule, AuthModule, ClsModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
