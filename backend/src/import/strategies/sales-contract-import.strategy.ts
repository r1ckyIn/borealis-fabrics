import { Injectable, Logger } from '@nestjs/common';
import type * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CodeGeneratorService,
  CodePrefix,
} from '../../common/services/code-generator.service';
import type {
  ImportStrategy,
  ColumnDefinition,
  InstructionRow,
  RowValidationResult,
} from './import-strategy.interface';
import { getCellValue, parseNumber } from '../utils/excel.utils';

/** Variant types for this strategy */
export type ContractVariant = 'fabric' | 'product';

// Fabric variant column indices (1-based)
const FABRIC_COL_NAME = 1; // 面料名称
const FABRIC_COL_COATING = 2; // 涂层
const FABRIC_COL_SERIES = 3; // 系列
const FABRIC_COL_COLOR_CODE = 4; // 色号
const FABRIC_COL_COLOR_CN = 5; // 颜色中文
const FABRIC_COL_COLOR_EN = 6; // 颜色英文
const FABRIC_COL_UNIT = 7; // 单位
const FABRIC_COL_QUANTITY = 8; // 数量
const FABRIC_COL_UNIT_PRICE = 9; // 单价
const FABRIC_COL_AMOUNT = 10; // 金额
const FABRIC_COL_DELIVERY_DATE = 11; // 交货日期
const FABRIC_COL_PI_NUMBER = 12; // PI.#
const FABRIC_COL_PRODUCTION_NUMBER = 13; // 生产单号

// Product variant column indices (1-based)
const PRODUCT_COL_NAME = 1; // 品名
const PRODUCT_COL_SPECIFICATION = 2; // 规格
const PRODUCT_COL_UNIT = 3; // 单位
const PRODUCT_COL_QUANTITY = 4; // 数量
const PRODUCT_COL_UNIT_PRICE = 5; // 单价
const PRODUCT_COL_AMOUNT = 6; // 金额
const PRODUCT_COL_DELIVERY_DATE = 7; // 交货日期
const PRODUCT_COL_PI_NUMBER = 8; // PI.#
const PRODUCT_COL_PRODUCTION_NUMBER = 9; // 生产单号
const PRODUCT_COL_MODEL_NUMBER = 10; // 型号
const PRODUCT_COL_NOTES = 11; // 备注

/**
 * Column definitions for reference (required by ImportStrategy interface).
 * Uses fabric variant as default.
 */
const SC_COLUMNS: ColumnDefinition[] = [
  { header: '面料名称', key: 'fabricName', width: 20 },
  { header: '涂层', key: 'coating', width: 10 },
  { header: '系列', key: 'series', width: 10 },
  { header: '色号', key: 'colorCode', width: 10 },
  { header: '颜色中文', key: 'colorCN', width: 12 },
  { header: '颜色英文', key: 'colorEN', width: 12 },
  { header: '单位', key: 'unit', width: 10 },
  { header: '数量', key: 'quantity', width: 10 },
  { header: '单价', key: 'unitPrice', width: 12 },
  { header: '金额', key: 'amount', width: 12 },
  { header: '交货日期', key: 'deliveryDate', width: 15 },
  { header: 'PI.#', key: 'piNumber', width: 15 },
  { header: '生产单号', key: 'productionNumber', width: 15 },
];

const SC_INSTRUCTIONS: InstructionRow[] = [
  {
    field: 'fabricName / productName',
    required: 'Yes',
    description: 'Fabric name or product name (must exist in system)',
  },
  { field: 'quantity', required: 'Yes', description: 'Quantity ordered' },
  {
    field: 'unitPrice',
    required: 'Yes',
    description: 'Unit sale price',
  },
  { field: 'unit', required: 'No', description: 'Unit of measurement' },
  {
    field: 'deliveryDate',
    required: 'No',
    description: 'Expected delivery date',
  },
];

/**
 * Import strategy for 购销合同 (sales contracts) and 客户订单 (customer orders).
 *
 * Handles BOTH 购销合同 (2 files) AND 客户订单 (6 files) — total 8 files
 * that share the same layout template.
 *
 * Non-standard layout:
 * - Rows 1-8: Metadata (company info, contract number, date, customer name)
 * - Row 9: Column headers (may contain RichText)
 * - Row 10+: Data
 *
 * Two column variants:
 * - Fabric variant: 面料名称 | 涂层 | 系列 | 色号 | ... | 数量 | 单价 | 金额
 * - Product variant: 品名 | 规格 | 单位 | 数量 | 单价 | 金额 | ... | 型号 | 备注
 *
 * Creates Order records with OrderItem records referencing existing fabrics/products.
 */
@Injectable()
export class SalesContractImportStrategy implements ImportStrategy {
  private readonly logger = new Logger(SalesContractImportStrategy.name);

  /** Currently active variant (set by service during file parsing) */
  private variant: ContractVariant = 'fabric';

  /** Pre-loaded entity maps */
  private customerMap = new Map<string, number>();
  private fabricMap = new Map<string, number>();
  private productMap = new Map<string, number>();

  /** Customer ID for the current import (set by service from metadata) */
  private customerId: number | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly codeGenerator: CodeGeneratorService,
  ) {}

  getColumns(): ColumnDefinition[] {
    return SC_COLUMNS;
  }

  getInstructions(): InstructionRow[] {
    return SC_INSTRUCTIONS;
  }

  /**
   * Set the column variant for this import session.
   * Called by ImportService after scanning the header row.
   */
  setVariant(variant: ContractVariant): void {
    this.variant = variant;
  }

  /**
   * Set customer ID for the current import.
   * Called by ImportService after extracting metadata from the file.
   */
  setCustomerId(customerId: number): void {
    this.customerId = customerId;
  }

  /**
   * Get the current variant.
   */
  getVariant(): ContractVariant {
    return this.variant;
  }

  /**
   * Extract row key: itemName (fabric name or product name).
   * Used for within-file dedup (same item appearing multiple times).
   */
  getRowKey(row: ExcelJS.Row): string {
    if (this.variant === 'fabric') {
      return getCellValue(row, FABRIC_COL_NAME);
    }
    return getCellValue(row, PRODUCT_COL_NAME);
  }

  /**
   * Match when headers contain '面料名称' or '品名' combined with '数量' and ('单价' or '金额').
   * RichText-safe: uses getCellValue-style string extraction.
   */
  matchesHeaders(headers: string[]): boolean {
    const joined = headers.join(' ');
    const hasFabricName = joined.includes('面料名称');
    const hasProductName = joined.includes('品名');
    const hasQuantity = joined.includes('数量');
    const hasPrice = joined.includes('单价') || joined.includes('金额');

    return (hasFabricName || hasProductName) && hasQuantity && hasPrice;
  }

  /**
   * Pre-load entity maps for validation.
   * - Customer name -> id
   * - Fabric name -> id (for fabric variant)
   * - Product name -> id (for product variant)
   * - Existing order codes for dedup
   */
  async getExistingKeys(): Promise<Set<string>> {
    // Load customers
    const customers = await this.prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, companyName: true },
    });
    this.customerMap = new Map(customers.map((c) => [c.companyName, c.id]));

    // Load fabrics
    const fabrics = await this.prisma.fabric.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    this.fabricMap = new Map(fabrics.map((f) => [f.name, f.id]));

    // Load products
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, modelNumber: true },
    });
    this.productMap = new Map(products.map((p) => [p.name, p.id]));

    // Load existing order codes for dedup
    const orders = await this.prisma.order.findMany({
      select: { orderCode: true },
    });
    return new Set(orders.map((o) => o.orderCode));
  }

  /**
   * Get the customer map (for service to resolve customer from metadata).
   */
  getCustomerMap(): Map<string, number> {
    return this.customerMap;
  }

  /**
   * Get the fabric map (for external validation).
   */
  getFabricMap(): Map<string, number> {
    return this.fabricMap;
  }

  /**
   * Get the product map (for external validation).
   */
  getProductMap(): Map<string, number> {
    return this.productMap;
  }

  /**
   * Validate a single row of sales contract / customer order data.
   * Checks required fields and entity references based on variant.
   */
  validateRow(
    row: ExcelJS.Row,
    rowNumber: number,
    _batchKeys: Set<string>,
    _existingKeys: Set<string>,
  ): RowValidationResult {
    if (this.variant === 'fabric') {
      return this.validateFabricRow(row, rowNumber);
    }
    return this.validateProductRow(row, rowNumber);
  }

  /**
   * Transform a validated row into a plain object for createBatch.
   */
  transformRow(row: ExcelJS.Row): Record<string, unknown> {
    if (this.variant === 'fabric') {
      return this.transformFabricRow(row);
    }
    return this.transformProductRow(row);
  }

  /**
   * Create Order with OrderItems in a single transaction.
   * All items belong to one order (per file/contract).
   */
  async createBatch(entities: Record<string, unknown>[]): Promise<number> {
    if (entities.length === 0) return 0;

    const orderCode = await this.codeGenerator.generateCode(CodePrefix.ORDER);

    return this.prisma.$transaction(async (tx) => {
      // Calculate total amount
      const totalAmount = entities.reduce(
        (sum, e) => sum + ((e.subtotal as number) || 0),
        0,
      );

      // Build order items data
      const itemsData = entities.map((entity) => {
        const isFabric = entity._variant === 'fabric';
        const fabricId = isFabric
          ? this.fabricMap.get(entity.itemName as string) ?? null
          : null;
        const productId = !isFabric
          ? this.productMap.get(entity.itemName as string) ?? null
          : null;

        return {
          fabricId,
          productId,
          quantity: (entity.quantity as number) || 0,
          unit: (entity.unit as string) || '米',
          salePrice: (entity.unitPrice as number) || 0,
          subtotal: (entity.subtotal as number) || 0,
          status: 'INQUIRY',
          deliveryDate: entity.deliveryDate
            ? new Date(entity.deliveryDate as string)
            : null,
          notes: (entity.notes as string) || null,
        };
      });

      await tx.order.create({
        data: {
          orderCode,
          customerId: this.customerId!,
          status: 'INQUIRY',
          totalAmount,
          notes: entities[0]?.contractNote as string || null,
          items: {
            create: itemsData,
          },
        },
        include: { items: true },
      });

      return entities.length;
    });
  }

  // ---- Private validation methods ----

  private validateFabricRow(
    row: ExcelJS.Row,
    rowNumber: number,
  ): RowValidationResult {
    const fabricName = getCellValue(row, FABRIC_COL_NAME);
    const quantity = parseNumber(row, FABRIC_COL_QUANTITY);
    const unitPrice = parseNumber(row, FABRIC_COL_UNIT_PRICE);
    const amount = parseNumber(row, FABRIC_COL_AMOUNT);

    const identifier = fabricName || `Row ${rowNumber}`;

    // Skip entirely empty rows
    if (!fabricName && quantity === null && unitPrice === null) {
      return { valid: false, skipped: true };
    }

    // Required: item name
    if (!fabricName) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason: 'Missing required field: fabric name',
        },
      };
    }

    // Required: quantity
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

    // Required: unit price or amount
    if (
      (unitPrice === null || unitPrice <= 0) &&
      (amount === null || amount <= 0)
    ) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason:
            'Missing or invalid required field: unit price or amount (must be > 0)',
        },
      };
    }

    // Check fabric exists in system
    if (!this.fabricMap.has(fabricName)) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason: `Fabric '${fabricName}' not found in system, import base data first`,
        },
      };
    }

    return { valid: true };
  }

  private validateProductRow(
    row: ExcelJS.Row,
    rowNumber: number,
  ): RowValidationResult {
    const productName = getCellValue(row, PRODUCT_COL_NAME);
    const quantity = parseNumber(row, PRODUCT_COL_QUANTITY);
    const unitPrice = parseNumber(row, PRODUCT_COL_UNIT_PRICE);
    const amount = parseNumber(row, PRODUCT_COL_AMOUNT);

    const identifier = productName || `Row ${rowNumber}`;

    // Skip entirely empty rows
    if (!productName && quantity === null && unitPrice === null) {
      return { valid: false, skipped: true };
    }

    // Required: item name
    if (!productName) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason: 'Missing required field: product name',
        },
      };
    }

    // Required: quantity
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

    // Required: unit price or amount
    if (
      (unitPrice === null || unitPrice <= 0) &&
      (amount === null || amount <= 0)
    ) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason:
            'Missing or invalid required field: unit price or amount (must be > 0)',
        },
      };
    }

    // Check product exists in system
    if (!this.productMap.has(productName)) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason: `Product '${productName}' not found in system, import base data first`,
        },
      };
    }

    return { valid: true };
  }

  // ---- Private transform methods ----

  private transformFabricRow(row: ExcelJS.Row): Record<string, unknown> {
    const quantity = parseNumber(row, FABRIC_COL_QUANTITY) ?? 0;
    const unitPrice = parseNumber(row, FABRIC_COL_UNIT_PRICE) ?? 0;
    const amount = parseNumber(row, FABRIC_COL_AMOUNT);

    return {
      itemName: getCellValue(row, FABRIC_COL_NAME),
      coating: getCellValue(row, FABRIC_COL_COATING) || undefined,
      series: getCellValue(row, FABRIC_COL_SERIES) || undefined,
      colorCode: getCellValue(row, FABRIC_COL_COLOR_CODE) || undefined,
      colorCN: getCellValue(row, FABRIC_COL_COLOR_CN) || undefined,
      colorEN: getCellValue(row, FABRIC_COL_COLOR_EN) || undefined,
      unit: getCellValue(row, FABRIC_COL_UNIT) || '米',
      quantity,
      unitPrice,
      subtotal: amount ?? quantity * unitPrice,
      deliveryDate:
        getCellValue(row, FABRIC_COL_DELIVERY_DATE) || undefined,
      piNumber: getCellValue(row, FABRIC_COL_PI_NUMBER) || undefined,
      productionNumber:
        getCellValue(row, FABRIC_COL_PRODUCTION_NUMBER) || undefined,
      notes: undefined,
      _variant: 'fabric' as const,
    };
  }

  private transformProductRow(row: ExcelJS.Row): Record<string, unknown> {
    const quantity = parseNumber(row, PRODUCT_COL_QUANTITY) ?? 0;
    const unitPrice = parseNumber(row, PRODUCT_COL_UNIT_PRICE) ?? 0;
    const amount = parseNumber(row, PRODUCT_COL_AMOUNT);

    return {
      itemName: getCellValue(row, PRODUCT_COL_NAME),
      specification:
        getCellValue(row, PRODUCT_COL_SPECIFICATION) || undefined,
      unit: getCellValue(row, PRODUCT_COL_UNIT) || '套',
      quantity,
      unitPrice,
      subtotal: amount ?? quantity * unitPrice,
      deliveryDate:
        getCellValue(row, PRODUCT_COL_DELIVERY_DATE) || undefined,
      piNumber: getCellValue(row, PRODUCT_COL_PI_NUMBER) || undefined,
      productionNumber:
        getCellValue(row, PRODUCT_COL_PRODUCTION_NUMBER) || undefined,
      modelNumber:
        getCellValue(row, PRODUCT_COL_MODEL_NUMBER) || undefined,
      notes: getCellValue(row, PRODUCT_COL_NOTES) || undefined,
      _variant: 'product' as const,
    };
  }
}
