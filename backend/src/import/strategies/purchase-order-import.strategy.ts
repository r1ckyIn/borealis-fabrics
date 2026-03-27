import { Injectable, Logger } from '@nestjs/common';
import type * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CodeGeneratorService,
  CodePrefix,
} from '../../common/services/code-generator.service';
import { ProductCategory } from '../../system/enums/index';
import type {
  ImportStrategy,
  ColumnDefinition,
  InstructionRow,
  RowValidationResult,
} from './import-strategy.interface';
import { getCellValue, parseNumber } from '../utils/excel.utils';

// Column index constants (1-based, matching 采购单 row 4 headers)
const COL_PO_NUMBER = 1;
const COL_NAME = 2;
const COL_SPECIFICATION = 3;
const COL_UNIT = 4;
const COL_QUANTITY = 5;
const COL_UNIT_PRICE = 6;
const COL_DELIVERY_DATE = 7;
const COL_NOTES = 8;

/** Composite key separator for specification + name dedup */
const KEY_SEPARATOR = '::';

/** Supplier name (hardcoded from file context) */
const SUPPLIER_NAME = '海宁优途';

/** Self-customer company name (Borealis Fabrics) */
const SELF_CUSTOMER_NAME = '铂润面料';

/**
 * Maps product name keywords to sub-category.
 */
const SUBCATEGORY_KEYWORDS: [string, string][] = [
  ['铁架', 'IRON_FRAME'],
  ['架', 'IRON_FRAME'],
  ['电机', 'MOTOR'],
  ['床垫', 'MATTRESS'],
];

const DEFAULT_SUBCATEGORY = 'ACCESSORY';

/**
 * Maps sub-category to code generation prefix.
 */
const SUBCATEGORY_TO_PREFIX: Record<string, CodePrefix> = {
  IRON_FRAME: CodePrefix.IRON_FRAME,
  MOTOR: CodePrefix.MOTOR,
  MATTRESS: CodePrefix.MATTRESS,
  ACCESSORY: CodePrefix.ACCESSORY,
};

/**
 * Column definitions for reference (not used for template generation since
 * purchase orders are not template-based, but required by ImportStrategy interface).
 */
const PO_COLUMNS: ColumnDefinition[] = [
  { header: '订单PO#', key: 'poNumber', width: 15 },
  { header: '名称', key: 'name', width: 25 },
  { header: '规格型号', key: 'specification', width: 25 },
  { header: '单位', key: 'unit', width: 10 },
  { header: '数量', key: 'quantity', width: 10 },
  { header: '单价', key: 'unitPrice', width: 12 },
  { header: '交货日期', key: 'deliveryDate', width: 15 },
  { header: '备注', key: 'notes', width: 25 },
];

const PO_INSTRUCTIONS: InstructionRow[] = [
  {
    field: 'poNumber',
    required: 'No',
    description: 'Purchase order number (PO#)',
  },
  {
    field: 'name',
    required: 'Yes',
    description: 'Product name',
  },
  {
    field: 'specification',
    required: 'No',
    description: 'Product specification / model number',
  },
  {
    field: 'unit',
    required: 'No',
    description: 'Unit of measurement',
  },
  {
    field: 'quantity',
    required: 'Yes',
    description: 'Quantity ordered',
  },
  {
    field: 'unitPrice',
    required: 'Yes',
    description: 'Unit price (purchase price)',
  },
  {
    field: 'deliveryDate',
    required: 'No',
    description: 'Expected delivery date',
  },
  {
    field: 'notes',
    required: 'No',
    description: 'Additional notes',
  },
];

/**
 * Infer product sub-category from name using keyword matching.
 */
function inferSubCategory(name: string): string {
  for (const [keyword, subCategory] of SUBCATEGORY_KEYWORDS) {
    if (name.includes(keyword)) {
      return subCategory;
    }
  }
  return DEFAULT_SUBCATEGORY;
}

/**
 * Import strategy for 海宁优途-采购单 (purchase order) format.
 *
 * Non-standard layout:
 * - Row 1: Company header
 * - Row 2: Recipient info
 * - Row 3: Intro text
 * - Row 4: Column headers (订单PO# | 名称 | 规格型号 | 单位 | 数量 | 单价 | 交货日期 | 备注)
 * - Row 5+: Data
 *
 * Creates BOTH products/prices AND Order+OrderItem records.
 * Uses a "self-customer" pattern: creates a Customer record for 铂润面料
 * to represent the company placing orders to suppliers.
 */
@Injectable()
export class PurchaseOrderImportStrategy implements ImportStrategy {
  private readonly logger = new Logger(PurchaseOrderImportStrategy.name);

  /** Pre-loaded supplier id for 海宁优途 */
  private supplierId: number | null = null;

  /** Pre-loaded self-customer id for 铂润面料 */
  private selfCustomerId: number | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly codeGenerator: CodeGeneratorService,
  ) {}

  getColumns(): ColumnDefinition[] {
    return PO_COLUMNS;
  }

  getInstructions(): InstructionRow[] {
    return PO_INSTRUCTIONS;
  }

  /**
   * Extract composite row key: specification::name
   */
  getRowKey(row: ExcelJS.Row): string {
    const specification = getCellValue(row, COL_SPECIFICATION);
    const name = getCellValue(row, COL_NAME);
    return `${specification}${KEY_SEPARATOR}${name}`;
  }

  /**
   * Match when headers contain '订单' or 'PO#' combined with '名称' and '数量'.
   * Uses case-insensitive substring matching.
   */
  matchesHeaders(headers: string[]): boolean {
    const joined = headers.join(' ').toLowerCase();
    const hasOrderOrPO =
      joined.includes('订单') || joined.includes('po#') || joined.includes('po');
    const hasName = joined.includes('名称');
    const hasQuantity = joined.includes('数量');
    // Exclude sales contract headers (面料名称, 品名)
    const hasFabricName = joined.includes('面料名称');
    const hasProductName = joined.includes('品名');

    return hasOrderOrPO && hasName && hasQuantity && !hasFabricName && !hasProductName;
  }

  /**
   * Fetch existing product keys, pre-load supplier map and self-customer.
   * Called once before any validateRow() calls.
   */
  async getExistingKeys(): Promise<Set<string>> {
    // Load existing product keys (specification::name)
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { modelNumber: true, name: true },
    });

    // Load supplier 海宁优途
    const suppliers = await this.prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, companyName: true },
    });
    const supplierEntry = suppliers.find(
      (s) => s.companyName === SUPPLIER_NAME,
    );
    this.supplierId = supplierEntry?.id ?? null;

    // Load or create self-customer 铂润面料
    const customers = await this.prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, companyName: true },
    });
    const selfCustomer = customers.find((c) =>
      c.companyName.includes('铂润'),
    );

    if (selfCustomer) {
      this.selfCustomerId = selfCustomer.id;
    } else {
      // Create self-customer
      const created = await this.prisma.customer.create({
        data: {
          companyName: SELF_CUSTOMER_NAME,
          notes: 'Auto-created for purchase order import (self-customer)',
        },
      });
      this.selfCustomerId = created.id;
      this.logger.log(
        `Created self-customer '${SELF_CUSTOMER_NAME}' with id ${created.id}`,
      );
    }

    return new Set(
      products
        .filter((p) => p.modelNumber)
        .map((p) => `${p.modelNumber}${KEY_SEPARATOR}${p.name}`),
    );
  }

  /**
   * Validate a single row of purchase order data.
   * Checks required fields: name and quantity.
   * Skips rows that already exist in DB or batch (product dedup).
   */
  validateRow(
    row: ExcelJS.Row,
    rowNumber: number,
    batchKeys: Set<string>,
    existingKeys: Set<string>,
  ): RowValidationResult {
    const name = getCellValue(row, COL_NAME);
    const quantity = parseNumber(row, COL_QUANTITY);
    const specification = getCellValue(row, COL_SPECIFICATION);

    // Build identifier for error reporting
    const identifier = name || `Row ${rowNumber}`;

    // Skip empty rows
    if (!name && quantity === null) {
      return { valid: false, skipped: true };
    }

    // Required: name
    if (!name) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason: 'Missing required field: name',
        },
      };
    }

    // Required: quantity > 0
    if (quantity === null || quantity <= 0) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason:
            'Missing or invalid required field: quantity (must be > 0)',
        },
      };
    }

    // Check supplier availability
    if (this.supplierId === null) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason: `Supplier '${SUPPLIER_NAME}' not found in system`,
        },
      };
    }

    // Product dedup key: specification::name
    const compositeKey = `${specification}${KEY_SEPARATOR}${name}`;

    // Skip if duplicate in current batch
    if (batchKeys.has(compositeKey)) {
      return { valid: false, skipped: true };
    }

    // Skip if already exists in DB
    if (existingKeys.has(compositeKey)) {
      return { valid: false, skipped: true };
    }

    return { valid: true };
  }

  /**
   * Transform a validated row into a plain object for createBatch.
   * Includes sub-category inference from product name.
   */
  transformRow(row: ExcelJS.Row): Record<string, unknown> {
    const name = getCellValue(row, COL_NAME);
    const subCategory = inferSubCategory(name);

    return {
      poNumber: getCellValue(row, COL_PO_NUMBER) || undefined,
      name,
      specification: getCellValue(row, COL_SPECIFICATION) || undefined,
      unit: getCellValue(row, COL_UNIT) || '个',
      quantity: parseNumber(row, COL_QUANTITY),
      unitPrice: parseNumber(row, COL_UNIT_PRICE) ?? 0,
      deliveryDate: getCellValue(row, COL_DELIVERY_DATE) || undefined,
      notes: getCellValue(row, COL_NOTES) || undefined,
      _subCategory: subCategory,
    };
  }

  /**
   * Create Product + ProductSupplier + Order + OrderItems in a single transaction.
   * Generates product codes and order codes via CodeGeneratorService.
   */
  async createBatch(entities: Record<string, unknown>[]): Promise<number> {
    if (entities.length === 0) return 0;

    // Generate all codes outside the transaction (Redis calls)
    const productCodes: string[] = [];
    for (const entity of entities) {
      const subCategory = entity._subCategory as string;
      const prefix = SUBCATEGORY_TO_PREFIX[subCategory];
      const code = await this.codeGenerator.generateCode(prefix);
      productCodes.push(code);
    }
    const orderCode = await this.codeGenerator.generateCode(CodePrefix.ORDER);

    return this.prisma.$transaction(async (tx) => {
      const orderItems: {
        productId: number;
        quantity: number;
        unit: string;
        unitPrice: number;
        subtotal: number;
        deliveryDate: string | undefined;
        notes: string | undefined;
      }[] = [];

      // Create products and supplier pricing
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const subCategory = entity._subCategory as string;

        const product = await tx.product.create({
          data: {
            productCode: productCodes[i],
            name: entity.name as string,
            category: ProductCategory.IRON_FRAME_MOTOR,
            subCategory,
            modelNumber: (entity.specification as string) || null,
            specification: (entity.specification as string) || null,
          },
        });

        // Create ProductSupplier pricing
        if (this.supplierId !== null) {
          await tx.productSupplier.create({
            data: {
              productId: product.id,
              supplierId: this.supplierId,
              purchasePrice: (entity.unitPrice as number) || 0,
            },
          });
        }

        orderItems.push({
          productId: product.id,
          quantity: entity.quantity as number,
          unit: (entity.unit as string) || '个',
          unitPrice: (entity.unitPrice as number) || 0,
          subtotal:
            ((entity.quantity as number) || 0) *
            ((entity.unitPrice as number) || 0),
          deliveryDate: entity.deliveryDate as string | undefined,
          notes: entity.notes as string | undefined,
        });
      }

      // Calculate total amount
      const totalAmount = orderItems.reduce(
        (sum, item) => sum + item.subtotal,
        0,
      );

      // Collect PO numbers for notes
      const poNumbers = entities
        .map((e) => e.poNumber as string)
        .filter(Boolean);
      const poNote = poNumbers.length > 0 ? poNumbers.join(', ') : '';
      const orderNotes = `采购单 (Purchase Order) - ${SUPPLIER_NAME}${poNote ? ` - ${poNote}` : ''}`;

      // Create Order with OrderItems
      await tx.order.create({
        data: {
          orderCode,
          customerId: this.selfCustomerId!,
          status: 'INQUIRY',
          totalAmount,
          notes: orderNotes,
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              supplierId: this.supplierId,
              quantity: item.quantity,
              unit: item.unit,
              salePrice: 0, // Not applicable for purchase orders
              purchasePrice: item.unitPrice,
              subtotal: item.subtotal,
              status: 'INQUIRY',
              deliveryDate: item.deliveryDate
                ? new Date(item.deliveryDate)
                : null,
              notes: item.notes || null,
            })),
          },
        },
        include: { items: true },
      });

      return entities.length;
    });
  }
}
