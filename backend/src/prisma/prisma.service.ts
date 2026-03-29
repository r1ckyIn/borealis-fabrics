import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createSoftDeleteExtension } from 'prisma-extension-soft-delete';

// Soft-deletable model names and their config
const SOFT_DELETE_MODELS = [
  'User',
  'Fabric',
  'Supplier',
  'Customer',
  'Product',
  'ProductBundle',
] as const;

const modelConfig = Object.fromEntries(
  SOFT_DELETE_MODELS.map((model) => [
    model,
    {
      field: 'deletedAt',
      createValue: (deleted: boolean) => (deleted ? new Date() : null),
    },
  ]),
);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();

    // Apply soft-delete extension.
    // $extends returns a new client instance with intercepted query behavior.
    // We copy the extended model delegates back onto `this` so that all
    // existing code using `this.prisma.<model>` gets auto-filtered queries
    // and soft-delete behavior on delete() calls.
    const extended = this.$extends(
      createSoftDeleteExtension({ models: modelConfig }),
    );

    // Patch model delegates from extended client onto this instance.
    // This preserves PrismaClient type compatibility while adding soft-delete behavior.
    for (const model of [
      'user',
      'fabric',
      'supplier',
      'customer',
      'product',
      'productBundle',
      'fabricImage',
      'fabricSupplier',
      'customerPricing',
      'productSupplier',
      'productBundleItem',
      'order',
      'orderItem',
      'orderTimeline',
      'quote',
      'quoteItem',
      'logistics',
      'supplierPayment',
      'paymentRecord',
      'paymentVoucher',
      'file',
      'auditLog',
    ] as const) {
      Object.defineProperty(this, model, {
        get: () => (extended as Record<string, unknown>)[model],
        configurable: true,
      });
    }

    // Route $transaction through extended client so that interactive
    // transaction callbacks (tx) also apply soft-delete filtering.
    // Without this, tx.<model> inside $transaction would bypass soft-delete.
    const boundTransaction = (
      extended.$transaction as PrismaClient['$transaction']
    ).bind(extended);
    Object.defineProperty(this, '$transaction', {
      value: boundTransaction,
      configurable: true,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
