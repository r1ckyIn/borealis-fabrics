import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderItemService } from './order-item.service';
import { OrderPaymentService } from './order-payment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { FileModule } from '../file/file.module';

@Module({
  imports: [PrismaModule, CommonModule, FileModule],
  controllers: [OrderController],
  providers: [OrderService, OrderItemService, OrderPaymentService],
  exports: [OrderService],
})
export class OrderModule {}
