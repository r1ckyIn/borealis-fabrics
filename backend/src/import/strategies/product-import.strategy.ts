import { Injectable } from '@nestjs/common';
import type * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CodeGeneratorService,
  CodePrefix,
} from '../../common/services/code-generator.service';
import { ProductCategory, ProductSubCategory } from '../../system/enums/index';
import type {
  ImportStrategy,
  ColumnDefinition,
  InstructionRow,
  RowValidationResult,
} from './import-strategy.interface';
import { getCellValue, parseNumber } from '../utils/excel.utils';

// Column index constants (1-based, matching Excel column order)
const COL_SUB_CATEGORY = 1;
const COL_MODEL_NUMBER = 2;
const COL_NAME = 3;
const COL_SPECIFICATION = 4;
const COL_DEFAULT_PRICE = 5;
const COL_SUPPLIER_NAME = 6;
const COL_PURCHASE_PRICE = 7;
const COL_NOTES = 8;

/** Composite key separator for modelNumber + name dedup */
const KEY_SEPARATOR = '::';

/**
 * Product template column definitions
 */
const PRODUCT_COLUMNS: ColumnDefinition[] = [
  { header: 'subCategory*', key: 'subCategory', width: 18 },
  { header: 'modelNumber*', key: 'modelNumber', width: 22 },
  { header: 'name*', key: 'name', width: 25 },
  { header: 'specification', key: 'specification', width: 30 },
  { header: 'defaultPrice', key: 'defaultPrice', width: 15 },
  { header: 'supplierName*', key: 'supplierName', width: 30 },
  { header: 'purchasePrice*', key: 'purchasePrice', width: 18 },
  { header: 'notes', key: 'notes', width: 35 },
];

/**
 * Product-specific instructions for the template
 */
const PRODUCT_INSTRUCTIONS: InstructionRow[] = [
  {
    field: 'subCategory',
    required: 'Yes',
    description:
      'Product sub-category: IRON_FRAME, MOTOR, MATTRESS, or ACCESSORY',
  },
  {
    field: 'modelNumber',
    required: 'Yes',
    description: 'Model number (e.g., A4318HK-0--5)',
  },
  {
    field: 'name',
    required: 'Yes',
    description: 'Product name/variant (e.g., single seat, double seat)',
  },
  {
    field: 'specification',
    required: 'No',
    description: 'Product specification or dimensions',
  },
  {
    field: 'defaultPrice',
    required: 'No',
    description: 'Default selling price',
  },
  {
    field: 'supplierName',
    required: 'Yes',
    description: 'Supplier company name (must exist in system)',
  },
  {
    field: 'purchasePrice',
    required: 'Yes',
    description: 'Purchase price from supplier',
  },
  {
    field: 'notes',
    required: 'No',
    description: 'Additional notes',
  },
];

/**
 * Maps sub-category to parent category.
 * All current product types belong to IRON_FRAME_MOTOR category.
 */
const SUBCATEGORY_TO_CATEGORY: Record<string, string> = {
  IRON_FRAME: ProductCategory.IRON_FRAME_MOTOR,
  MOTOR: ProductCategory.IRON_FRAME_MOTOR,
  MATTRESS: ProductCategory.IRON_FRAME_MOTOR,
  ACCESSORY: ProductCategory.IRON_FRAME_MOTOR,
};

/**
 * Maps sub-category to code generation prefix.
 */
const SUBCATEGORY_TO_PREFIX: Record<string, CodePrefix> = {
  IRON_FRAME: CodePrefix.IRON_FRAME,
  MOTOR: CodePrefix.MOTOR,
  MATTRESS: CodePrefix.MATTRESS,
  ACCESSORY: CodePrefix.ACCESSORY,
};

/** Valid sub-category values (uppercased enum values) */
const VALID_SUBCATEGORIES: string[] = Object.values(ProductSubCategory);

@Injectable()
export class ProductImportStrategy implements ImportStrategy {
  /** Pre-loaded supplier name-to-id mapping (populated by getExistingKeys) */
  private supplierMap = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly codeGenerator: CodeGeneratorService,
  ) {}

  getColumns(): ColumnDefinition[] {
    return PRODUCT_COLUMNS;
  }

  getInstructions(): InstructionRow[] {
    return PRODUCT_INSTRUCTIONS;
  }

  /**
   * Extract composite row key: modelNumber::name
   */
  getRowKey(row: ExcelJS.Row): string {
    const modelNumber = getCellValue(row, COL_MODEL_NUMBER);
    const name = getCellValue(row, COL_NAME);
    return `${modelNumber}${KEY_SEPARATOR}${name}`;
  }

  /**
   * Match when headers contain subcategory*, modelnumber*, and name* (case-insensitive)
   */
  matchesHeaders(headers: string[]): boolean {
    const lower = headers.map((h) => h.toLowerCase());
    return (
      lower.includes('subcategory*') &&
      lower.includes('modelnumber*') &&
      lower.includes('name*')
    );
  }

  /**
   * Fetch existing product composite keys and pre-load supplier map.
   * Called once before any validateRow() calls.
   */
  async getExistingKeys(): Promise<Set<string>> {
    // Load existing product keys
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { modelNumber: true, name: true },
    });

    // Pre-load supplier name-to-id map
    const suppliers = await this.prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, companyName: true },
    });
    this.supplierMap = new Map(suppliers.map((s) => [s.companyName, s.id]));

    return new Set(
      products
        .filter((p) => p.modelNumber)
        .map((p) => `${p.modelNumber}${KEY_SEPARATOR}${p.name}`),
    );
  }

  /**
   * Validate a single row of product data.
   * Checks required fields, subCategory enum, composite key duplicates,
   * and supplier existence in pre-loaded map.
   *
   * Critical: DB duplicates return failure (not skip) per user decision.
   */
  validateRow(
    row: ExcelJS.Row,
    rowNumber: number,
    batchKeys: Set<string>,
    existingKeys: Set<string>,
  ): RowValidationResult {
    const subCategoryRaw = getCellValue(row, COL_SUB_CATEGORY);
    const modelNumber = getCellValue(row, COL_MODEL_NUMBER);
    const name = getCellValue(row, COL_NAME);
    const supplierName = getCellValue(row, COL_SUPPLIER_NAME);
    const purchasePrice = parseNumber(row, COL_PURCHASE_PRICE);

    // Build identifier for error reporting
    const identifier =
      modelNumber && name
        ? `${modelNumber}::${name}`
        : modelNumber || name || `Row ${rowNumber}`;

    // Required field checks
    if (!subCategoryRaw) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason: 'Missing required field: subCategory',
        },
      };
    }

    if (!modelNumber) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason: 'Missing required field: modelNumber',
        },
      };
    }

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

    if (!supplierName) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason: 'Missing required field: supplierName',
        },
      };
    }

    if (purchasePrice === null || purchasePrice <= 0) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason:
            'Missing or invalid required field: purchasePrice (must be > 0)',
        },
      };
    }

    // Validate subCategory against enum (case-insensitive)
    const subCategoryUpper = subCategoryRaw.toUpperCase();
    if (!VALID_SUBCATEGORIES.includes(subCategoryUpper)) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason: `Invalid subCategory '${subCategoryRaw}'. Must be one of: ${VALID_SUBCATEGORIES.join(', ')}`,
        },
      };
    }

    // Composite key for dedup
    const compositeKey = `${modelNumber}${KEY_SEPARATOR}${name}`;

    // Check duplicate in current batch
    if (batchKeys.has(compositeKey)) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason:
            'Duplicate product in import file: modelNumber + name already exists in batch',
        },
      };
    }

    // Check duplicate in DB — return as FAILURE, not skip
    if (existingKeys.has(compositeKey)) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason:
            'Duplicate product: modelNumber + name already exists in database',
        },
      };
    }

    // Check supplier exists in pre-loaded map
    if (!this.supplierMap.has(supplierName)) {
      return {
        valid: false,
        failure: {
          rowNumber,
          identifier,
          reason: `Supplier '${supplierName}' not found in system`,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Transform a validated row into a plain object for createBatch.
   * Auto-derives category from subCategory. Passes through supplier data
   * via underscore-prefixed fields for createBatch to consume.
   */
  transformRow(row: ExcelJS.Row): Record<string, unknown> {
    const subCategoryRaw = getCellValue(row, COL_SUB_CATEGORY).toUpperCase();

    return {
      name: getCellValue(row, COL_NAME),
      category: SUBCATEGORY_TO_CATEGORY[subCategoryRaw],
      subCategory: subCategoryRaw,
      modelNumber: getCellValue(row, COL_MODEL_NUMBER),
      specification: getCellValue(row, COL_SPECIFICATION) || undefined,
      defaultPrice: parseNumber(row, COL_DEFAULT_PRICE) ?? undefined,
      notes: getCellValue(row, COL_NOTES) || undefined,
      // Pass through for createBatch to handle supplier association
      _supplierName: getCellValue(row, COL_SUPPLIER_NAME),
      _purchasePrice: parseNumber(row, COL_PURCHASE_PRICE),
    };
  }

  /**
   * Create Product + ProductSupplier records atomically in a transaction.
   * Auto-generates product codes using CodeGeneratorService.
   */
  async createBatch(entities: Record<string, unknown>[]): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      let created = 0;

      for (const entity of entities) {
        const { _supplierName, _purchasePrice, ...productData } = entity;
        const subCategory = productData.subCategory as string;
        const prefix = SUBCATEGORY_TO_PREFIX[subCategory];
        const productCode = await this.codeGenerator.generateCode(prefix);

        const product = await tx.product.create({
          data: {
            productCode,
            name: productData.name as string,
            category: productData.category as string,
            subCategory,
            modelNumber: productData.modelNumber as string,
            specification: (productData.specification as string) || null,
            defaultPrice:
              productData.defaultPrice != null
                ? (productData.defaultPrice as number)
                : null,
            notes: (productData.notes as string) || null,
          },
        });

        // Create ProductSupplier association
        const supplierId = this.supplierMap.get(_supplierName as string);
        if (supplierId && _purchasePrice != null) {
          await tx.productSupplier.create({
            data: {
              productId: product.id,
              supplierId,
              purchasePrice: _purchasePrice as number,
            },
          });
        }

        created++;
      }

      return created;
    });
  }
}
