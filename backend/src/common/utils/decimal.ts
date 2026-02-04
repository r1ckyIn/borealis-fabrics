import { Decimal } from '@prisma/client/runtime/library';

/**
 * Convert a Prisma Decimal value to a JavaScript number.
 * Returns null if the input is null or undefined.
 *
 * @param value - The Decimal value to convert
 * @returns The number value or null
 *
 * @example
 * const price = toNumber(fabric.defaultPrice); // number | null
 */
export function toNumber(value: Decimal | null | undefined): number | null {
  return value !== null && value !== undefined ? Number(value) : null;
}

/**
 * Convert a Prisma Decimal value to a JavaScript number.
 * Use this when the value is guaranteed to be non-null.
 *
 * @param value - The Decimal value to convert
 * @returns The number value
 *
 * @example
 * const price = toNumberRequired(fabricSupplier.purchasePrice); // number
 */
export function toNumberRequired(value: Decimal): number {
  return Number(value);
}
