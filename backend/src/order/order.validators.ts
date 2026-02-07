/**
 * Centralized validation helpers for Order module.
 * Reduces code duplication and ensures consistent error handling.
 */

import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Validates that entities with given IDs exist and are active.
 * Throws NotFoundException if any IDs are missing.
 *
 * @param tx - Prisma transaction client
 * @param entityType - Type of entity for error message
 * @param ids - Array of IDs to validate
 * @param findMany - Prisma findMany function for the entity
 * @returns Set of found IDs
 */
export async function validateEntityIds<T extends { id: number }>(
  tx: Prisma.TransactionClient,
  entityType: 'Customer' | 'Fabric' | 'Supplier' | 'Quote',
  ids: number[],
  findMany: (args: {
    where: { id: { in: number[] }; isActive?: boolean };
    select: { id: true };
  }) => Promise<T[]>,
  requireActive = true,
): Promise<Set<number>> {
  if (ids.length === 0) {
    return new Set();
  }

  const where: { id: { in: number[] }; isActive?: boolean } = {
    id: { in: ids },
  };
  if (requireActive && entityType !== 'Quote') {
    where.isActive = true;
  }

  const entities = await findMany({ where, select: { id: true } });
  const foundIds = new Set(entities.map((e) => e.id));
  const missingIds = ids.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    throw new NotFoundException(
      `${entityType}${missingIds.length > 1 ? 's' : ''} not found: ${missingIds.join(', ')}`,
    );
  }

  return foundIds;
}

/**
 * Validates a single entity exists and is active.
 * Throws NotFoundException if not found.
 *
 * @param entity - The entity to validate (can be null/undefined)
 * @param entityType - Type of entity for error message
 * @param id - ID for error message
 */
export function validateEntityExists<T>(
  entity: T | null | undefined,
  entityType: string,
  id: number | string,
): asserts entity is T {
  if (!entity) {
    throw new NotFoundException(`${entityType} with ID ${id} not found`);
  }
}

/**
 * Validates an order exists.
 */
export async function validateOrderExists(
  prisma: Prisma.TransactionClient,
  orderId: number,
): Promise<{ id: number; status: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });
  validateEntityExists(order, 'Order', orderId);
  return order;
}

/**
 * Validates an order item exists and belongs to the order.
 * Returns essential fields for status operations and updates.
 */
export async function validateOrderItemExists(
  prisma: Prisma.TransactionClient,
  orderId: number,
  itemId: number,
): Promise<{
  id: number;
  orderId: number;
  status: string;
  supplierId: number | null;
  prevStatus: string | null;
  quantity: unknown;
  salePrice: unknown;
}> {
  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId },
    select: {
      id: true,
      orderId: true,
      status: true,
      supplierId: true,
      prevStatus: true,
      quantity: true,
      salePrice: true,
    },
  });
  if (!item) {
    throw new NotFoundException(
      `Order item with ID ${itemId} not found in order ${orderId}`,
    );
  }
  return item;
}

/**
 * Validates a customer exists and is active.
 */
export async function validateCustomerExists(
  prisma: Prisma.TransactionClient,
  customerId: number,
): Promise<void> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, isActive: true },
    select: { id: true },
  });
  validateEntityExists(customer, 'Customer', customerId);
}

/**
 * Validates a fabric exists and is active.
 */
export async function validateFabricExists(
  prisma: Prisma.TransactionClient,
  fabricId: number,
): Promise<void> {
  const fabric = await prisma.fabric.findFirst({
    where: { id: fabricId, isActive: true },
    select: { id: true },
  });
  validateEntityExists(fabric, 'Fabric', fabricId);
}

/**
 * Validates a supplier exists and is active.
 */
export async function validateSupplierExists(
  prisma: Prisma.TransactionClient,
  supplierId: number,
): Promise<void> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, isActive: true },
    select: { id: true },
  });
  validateEntityExists(supplier, 'Supplier', supplierId);
}

/**
 * Validates a quote exists.
 */
export async function validateQuoteExists(
  prisma: Prisma.TransactionClient,
  quoteId: number,
): Promise<void> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { id: true },
  });
  validateEntityExists(quote, 'Quote', quoteId);
}

/**
 * Extracts unique IDs from an array of items with an optional ID property.
 */
export function extractUniqueIds<T>(items: T[], key: keyof T): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();

  for (const item of items) {
    const value = item[key];
    if (typeof value === 'number' && !seen.has(value)) {
      seen.add(value);
      ids.push(value);
    }
  }

  return ids;
}

/**
 * Validates multiple entity types in batch.
 * Used when creating/updating orders with items that reference fabrics, suppliers, quotes.
 */
export async function validateOrderItemReferences(
  prisma: Prisma.TransactionClient,
  items: Array<{
    fabricId: number;
    supplierId?: number;
    quoteId?: number;
  }>,
): Promise<void> {
  const fabricIds = extractUniqueIds(items, 'fabricId');
  const supplierIds = extractUniqueIds(items, 'supplierId');
  const quoteIds = extractUniqueIds(items, 'quoteId');

  // Validate in parallel for better performance
  await Promise.all([
    validateEntityIds(
      prisma,
      'Fabric',
      fabricIds,
      prisma.fabric.findMany.bind(prisma.fabric),
    ),
    supplierIds.length > 0
      ? validateEntityIds(
          prisma,
          'Supplier',
          supplierIds,
          prisma.supplier.findMany.bind(prisma.supplier),
        )
      : Promise.resolve(new Set<number>()),
    quoteIds.length > 0
      ? validateEntityIds(
          prisma,
          'Quote',
          quoteIds,
          prisma.quote.findMany.bind(prisma.quote),
          false,
        )
      : Promise.resolve(new Set<number>()),
  ]);
}
