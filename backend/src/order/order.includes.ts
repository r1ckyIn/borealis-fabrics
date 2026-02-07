/**
 * Centralized Prisma include configurations for Order module.
 * Reduces duplication and ensures consistent data fetching.
 */

import { Prisma } from '@prisma/client';

/**
 * Basic customer select fields used in order listings.
 */
export const CUSTOMER_SELECT_BASIC = {
  id: true,
  companyName: true,
  contactName: true,
  phone: true,
} as const satisfies Prisma.CustomerSelect;

/**
 * Extended customer select fields used in order details.
 */
export const CUSTOMER_SELECT_DETAIL = {
  ...CUSTOMER_SELECT_BASIC,
  email: true,
} as const satisfies Prisma.CustomerSelect;

/**
 * Basic fabric select fields.
 */
export const FABRIC_SELECT = {
  id: true,
  fabricCode: true,
  name: true,
  composition: true,
} as const satisfies Prisma.FabricSelect;

/**
 * Supplier select fields.
 */
export const SUPPLIER_SELECT = {
  id: true,
  companyName: true,
  contactName: true,
  phone: true,
} as const satisfies Prisma.SupplierSelect;

/**
 * Quote select fields.
 */
export const QUOTE_SELECT = {
  id: true,
  quoteCode: true,
} as const satisfies Prisma.QuoteSelect;

/**
 * Operator select fields for timeline.
 */
export const OPERATOR_SELECT = {
  id: true,
  name: true,
  avatar: true,
} as const satisfies Prisma.UserSelect;

/**
 * Order item include for detail view.
 */
export const ORDER_ITEM_INCLUDE_DETAIL = {
  fabric: { select: FABRIC_SELECT },
  supplier: { select: SUPPLIER_SELECT },
  quote: { select: QUOTE_SELECT },
  timelines: { orderBy: { createdAt: 'desc' as const } },
  logistics: true,
} as const satisfies Prisma.OrderItemInclude;

/**
 * Order item include for basic operations (without timeline).
 */
export const ORDER_ITEM_INCLUDE_BASIC = {
  fabric: { select: FABRIC_SELECT },
  supplier: { select: SUPPLIER_SELECT },
} as const satisfies Prisma.OrderItemInclude;

/**
 * Order include for list view (summary).
 */
export const ORDER_INCLUDE_LIST = {
  customer: { select: CUSTOMER_SELECT_BASIC },
  items: {
    select: {
      id: true,
      fabricId: true,
      quantity: true,
      salePrice: true,
      subtotal: true,
      status: true,
    },
  },
} as const satisfies Prisma.OrderInclude;

/**
 * Order include for detail view (full).
 */
export const ORDER_INCLUDE_DETAIL = {
  customer: { select: CUSTOMER_SELECT_DETAIL },
  items: { include: ORDER_ITEM_INCLUDE_DETAIL },
  supplierPayments: true,
} as const satisfies Prisma.OrderInclude;

/**
 * Order include for update response (same as detail).
 */
export const ORDER_INCLUDE_UPDATE = ORDER_INCLUDE_DETAIL;

/**
 * Order include for customer payment update response (same shape as list).
 */
export const ORDER_INCLUDE_PAYMENT = ORDER_INCLUDE_LIST;

/**
 * Order item include for getOrderItems (with recent timeline).
 */
export const ORDER_ITEM_INCLUDE_WITH_TIMELINE = {
  fabric: { select: FABRIC_SELECT },
  supplier: { select: SUPPLIER_SELECT },
  quote: { select: QUOTE_SELECT },
  timelines: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
  },
  logistics: true,
} as const satisfies Prisma.OrderItemInclude;

/**
 * Timeline include for order timeline view.
 */
export const TIMELINE_INCLUDE_ORDER = {
  orderItem: {
    select: {
      id: true,
      fabric: {
        select: {
          id: true,
          fabricCode: true,
          name: true,
        },
      },
    },
  },
  operator: { select: OPERATOR_SELECT },
} as const satisfies Prisma.OrderTimelineInclude;

/**
 * Timeline include for item timeline view.
 */
export const TIMELINE_INCLUDE_ITEM = {
  operator: { select: OPERATOR_SELECT },
} as const satisfies Prisma.OrderTimelineInclude;

/**
 * Supplier payment include.
 */
export const SUPPLIER_PAYMENT_INCLUDE = {
  supplier: { select: SUPPLIER_SELECT },
} as const satisfies Prisma.SupplierPaymentInclude;
