# Phase 09 Gap 1: SalesContractImportStrategy Failure Analysis

**Researched:** 2026-03-27
**Domain:** Sales contract / customer order Excel import parsing
**Confidence:** HIGH (verified by direct inspection of all 8 real files with ExcelJS)

## Summary

The SalesContractImportStrategy produces 0 successful imports from all 8 real files (2 购销合同 + 6 客户订单) due to **5 cascading bugs**, all stemming from a fundamental column offset mismatch between the strategy's assumptions and the real file layout. The unit tests pass because they construct mock data starting at column 1, but the real files have **column 1 always empty** (null) with actual data starting at **column 2**.

Additionally, the customer ID resolution is completely broken: `_pendingCustomerName` is stored on the strategy object but never read back, and the metadata extraction regex doesn't match the actual label format (`需方` vs `买方/客户`) used in the real files. Even if all data rows passed validation, `createBatch` would crash with `this.customerId` being null.

The 0/48/8 and 0/134/30 results break down as: "skipped" rows are empty rows, contract terms rows, and summary rows that the strategy correctly ignores; "failed" rows are actual data rows where the column offset causes the fabric/product name to be read from the wrong cell (gets the "商品名称" column value like "呼吸革" or "铁架" instead of the actual fabric/product name like "LEATHERGEL" or "A4318HK-11 电动").

**Primary recommendation:** Fix the 5 bugs identified below. The changes are surgical (column offset constants, metadata regex, customer ID lifecycle) -- not a rewrite.

## Root Cause Analysis

### Bug 1 (CRITICAL): Column Offset -- Data Starts at Column 2, Not Column 1

**What the strategy assumes:**
```
Col 1: 面料名称    Col 2: 涂层    Col 3: 系列    ...    Col 8: 数量    Col 9: 单价
Col 1: 品名        Col 2: 规格    Col 3: 单位    ...    Col 4: 数量    Col 5: 单价
```

**What the real files have (verified by ExcelJS inspection):**
```
Col 1: NULL    Col 2: 商品名称    Col 3: 面料名称    Col 4: 涂层    Col 5: 系列    Col 6: 色号    Col 7: 颜色    Col 8: 颜色    Col 9: 单位    Col 10: 数量    Col 11: 单价    Col 12: 金额    Col 13: 交货日期    Col 14: PI.#    Col 15: 生产单号
Col 1: NULL    Col 2: 商品名称    Col 3: 品名    Col 4: 规格    Col 5: 单位    Col 6: 数量    Col 7: 单价    Col 8: 金额    Col 9: 交货日期    Col 10: PI.#    Col 11: 生产单号    Col 12: 款式型号    Col 13: 工厂型号    Col 14: 备注    Col 15: 用料
```

**Impact:** Every column read is off by 1-2 positions. The strategy reads `getCellValue(row, 1)` (FABRIC_COL_NAME) expecting the fabric name, but gets NULL. Since `fabricName` is empty, `validateFabricRow` returns `{ valid: false, skipped: true }` (the "skip empty rows" path).

**Why the unit tests pass:** The test helper `createFabricVariantRow` creates a worksheet with `worksheet.columns = [{ header: '面料名称', key: 'fabricName' }, ...]` and `worksheet.addRow(data)`. ExcelJS populates data starting from column 1. The real files have a leading empty column 1 plus an extra "商品名称" column at position 2 that doesn't exist in the strategy's column map.

**Fix:** Update all column index constants to match the real layout. This is a +1 or +2 offset depending on which column.

### Bug 2 (CRITICAL): Extra "商品名称" Column Not Accounted For

The real files have an additional column "商品名称" (product category name) at column 2 that is NOT in the strategy's column definitions. This column contains values like "呼吸革", "PU", "烫金布" (for fabric variant) or "铁架" (for product variant).

**Fabric variant real columns (1-based):**
| Col | Header | Example Data |
|-----|--------|-------------|
| 1 | (empty) | NULL |
| 2 | 商品名称 | "呼吸革" |
| 3 | 面料名称 | "LEATHERGEL" |
| 4 | 涂层 | "普通" |
| 5 | 系列 | "LeatherGel" |
| 6 | 色号 | "LG02" |
| 7 | 颜色 (English) | "Elephant Grey" |
| 8 | 颜色 (Chinese) | "大象灰" |
| 9 | 单位 | "米" |
| 10 | 数量 | 246 |
| 11 | 单价 | 32 |
| 12 | 金额 | 7872 (formula) |
| 13 | 交货日期 | "2026.03.15" |
| 14 | PI.# | 77854 |
| 15 | 生产单号 | "U2-SA26010" |

**Product variant real columns (1-based):**
| Col | Header | Example Data |
|-----|--------|-------------|
| 1 | (empty) | NULL |
| 2 | 商品名称 | "铁架" |
| 3 | 品名 | "A4318HK-11 电动" |
| 4 | 规格 | "三人位/配电机/配欧标电源/..." |
| 5 | 单位 | "套" |
| 6 | 数量 | 30 |
| 7 | 单价 | 490 |
| 8 | 金额 | 14700 (formula) |
| 9 | 交货日期 | "2026.03.20" |
| 10 | PI.# | 77860 |
| 11 | 生产单号 | (empty) |
| 12 | 款式型号 | "SMALL" |
| 13 | 工厂型号 | "U18-111" |
| 14 | 备注 | (empty) |
| 15 | 用料 | (formula or empty) |

**Fix:** Redefine all column constants to match the actual layout. Also note the header row has TWO "颜色" columns (English + Chinese) where the strategy expected only one pair (颜色中文 + 颜色英文).

### Bug 3 (CRITICAL): Customer ID Never Resolved

The `configureSalesContractStrategy` method in ImportService:
1. Extracts customer name from metadata rows looking for `买方` or `客户`
2. The real files use `需方` (demand party): `"需方：Miraggo HomeLiving"`
3. The regex `[买方客户][：:]\s*(.+)` does NOT match `需方：...` because `需` is not in the character class `[买方客户]`
4. Even IF the customer name were extracted, it's stored via a hack: `(this.salesContractStrategy as any)._pendingCustomerName = customerName`
5. This property is **never read back**. There is no code that resolves `_pendingCustomerName` to `this.customerId` after `getExistingKeys()` is called
6. Result: `this.customerId` remains `null`
7. `createBatch` uses `this.customerId!` (non-null assertion) which would cause a DB error or null constraint violation

**Fix:**
- Change regex to also match `需方[：:]`
- Add post-`getExistingKeys()` resolution: after `getExistingKeys()` populates `customerMap`, resolve the customer name to an ID
- OR: extract customer name in `configureSalesContractStrategy`, then after `getExistingKeys()` call `setCustomerId()` with the resolved ID

### Bug 4 (MODERATE): Contract Terms and Summary Rows Cause Failures

After the data rows, the files contain:
- Row 13-14 (or similar): "合计：" summary row with formula totals
- Row 15+: "合计人民币（大写）：" followed by contract terms text (二/三/四/五/六/七/八/九 clauses)
- These rows have content in columns 2+ (merged cells appear as the same value in ExcelJS)

The strategy's "skip empty rows" check only skips when `!fabricName && quantity === null && unitPrice === null`. But for the "合计" row, column positions (with the offset bug) would read non-null values, so these rows would NOT be skipped -- they'd fail validation with "Fabric not found" or similar.

This explains the 8 failures in 购销合同 and 30 failures in 客户订单: they're the summary and contract text rows being processed as data.

**Fix:** Add detection for summary/total rows (check if cell value contains "合计") and contract terms rows (check if cell starts with "二、" through "九、"). Skip these rows.

### Bug 5 (MODERATE): Fabric/Product Name Lookup Mismatch

Even with column offsets fixed, the fabric name in the real files (e.g., "LEATHERGEL", "Leather hide", "PU") does NOT match the fabric names imported by the fabric price list strategy. The fabric import creates records with names from the 面料价格明细 file (different naming convention).

Similarly, product names in the real 购销合同 files (e.g., "A4318HK-11 电动", "5618H-2") are model numbers, not the full product names from the product import.

This means `this.fabricMap.has(fabricName)` and `this.productMap.has(productName)` will return false for most rows, causing "Fabric/Product not found in system" failures.

**Fix options:**
1. **Use fuzzy matching / partial matching** for entity lookup (check if name contains or is contained by the lookup value)
2. **Use the "品名" column (col 3 for product variant)** as model number lookup against `productMap` keyed by `modelNumber` instead of `name`
3. **Accept that entity lookup will fail for some rows** and focus on creating orders with whatever entities ARE found. Report unmatched as failures with clear messages.
4. **Build a name mapping** (recommended): since the contract files use a different naming convention, create an explicit mapping or use relaxed matching

## Corrected Column Constants

### Fabric Variant (corrected)
```typescript
// Real layout: Col 1 = empty, Col 2 = 商品名称 (category), Col 3+ = data
const FABRIC_COL_CATEGORY = 2;     // 商品名称 (e.g., "呼吸革", "PU")
const FABRIC_COL_NAME = 3;         // 面料名称 (e.g., "LEATHERGEL")
const FABRIC_COL_COATING = 4;      // 涂层
const FABRIC_COL_SERIES = 5;       // 系列
const FABRIC_COL_COLOR_CODE = 6;   // 色号
const FABRIC_COL_COLOR_EN = 7;     // 颜色 (English)
const FABRIC_COL_COLOR_CN = 8;     // 颜色 (Chinese)
const FABRIC_COL_UNIT = 9;         // 单位
const FABRIC_COL_QUANTITY = 10;    // 数量
const FABRIC_COL_UNIT_PRICE = 11;  // 单价
const FABRIC_COL_AMOUNT = 12;      // 金额
const FABRIC_COL_DELIVERY_DATE = 13; // 交货日期
const FABRIC_COL_PI_NUMBER = 14;   // PI.#
const FABRIC_COL_PRODUCTION_NUMBER = 15; // 生产单号
```

### Product Variant (corrected)
```typescript
// Real layout: Col 1 = empty, Col 2 = 商品名称 (category), Col 3+ = data
const PRODUCT_COL_CATEGORY = 2;     // 商品名称 (e.g., "铁架")
const PRODUCT_COL_NAME = 3;         // 品名 (model number, e.g., "A4318HK-11 电动")
const PRODUCT_COL_SPECIFICATION = 4; // 规格
const PRODUCT_COL_UNIT = 5;         // 单位
const PRODUCT_COL_QUANTITY = 6;     // 数量
const PRODUCT_COL_UNIT_PRICE = 7;   // 单价
const PRODUCT_COL_AMOUNT = 8;       // 金额
const PRODUCT_COL_DELIVERY_DATE = 9; // 交货日期
const PRODUCT_COL_PI_NUMBER = 10;   // PI.#
const PRODUCT_COL_PRODUCTION_NUMBER = 11; // 生产单号
const PRODUCT_COL_MODEL_NUMBER = 12; // 款式型号
const PRODUCT_COL_FACTORY_MODEL = 13; // 工厂型号
const PRODUCT_COL_NOTES = 14;       // 备注
const PRODUCT_COL_MATERIAL = 15;    // 用料
```

## Customer Resolution Fix

```typescript
// In configureSalesContractStrategy: change regex to also match 需方
// Original: val.includes('买方') || val.includes('客户')
// Fixed: val.includes('买方') || val.includes('需方') || val.includes('客户')
// Regex: /[买需]方[：:]\s*(.+)/ or simply extract after ：

// In importNonStandardData: after getExistingKeys(), resolve customer
// Add between line 245 and 246:
if (strategy === this.salesContractStrategy) {
  const pendingName = (this.salesContractStrategy as any)._pendingCustomerName;
  if (pendingName) {
    const customerMap = this.salesContractStrategy.getCustomerMap();
    const customerId = customerMap.get(pendingName);
    if (customerId) {
      this.salesContractStrategy.setCustomerId(customerId);
    }
  }
}
```

## Summary Row Detection Fix

```typescript
// Add to validateFabricRow / validateProductRow, before the existing skip-empty check:
// Detect summary and contract text rows
const firstCellValue = getCellValue(row, 2); // Col 2 has the first content
if (firstCellValue.includes('合计') ||
    firstCellValue.includes('合计人民币') ||
    /^[一二三四五六七八九]、/.test(firstCellValue)) {
  return { valid: false, skipped: true };
}
```

## Unit Test vs Real File Discrepancies

| Aspect | Unit Test Mock | Real Files |
|--------|---------------|------------|
| Column 1 | Has data (fabric/product name) | NULL (empty) |
| Extra "商品名称" column | Not present | Present at column 2 |
| 颜色 columns | "颜色中文" + "颜色英文" as separate headers | Two "颜色" columns (7=English, 8=Chinese) |
| Data start | Row 2 (after header) | Row 10 (after header row 9) |
| Summary rows | Not present | "合计" + "合计人民币" + contract terms |
| Customer metadata | `setCustomerId(1)` called directly | Must be extracted from "需方：" in row 5 |
| Fabric names | "Fabric X" (matches fabricMap) | "LEATHERGEL" (may not match) |
| Product names | "Product Y" (matches productMap) | "A4318HK-11 电动" (model number, may not match) |

## Required Changes (Ordered by Priority)

### Change 1: Fix Column Constants (CRITICAL)
- **File:** `sales-contract-import.strategy.ts`
- **Lines:** 19-45
- **Action:** Update all `FABRIC_COL_*` and `PRODUCT_COL_*` constants to match real layout (+2 offset for fabric, +2 offset for product)
- **Add:** New constants for the "商品名称" column and additional product columns (款式型号, 工厂型号, 用料)

### Change 2: Fix Customer Metadata Extraction (CRITICAL)
- **File:** `import.service.ts`
- **Lines:** 313-341 (`configureSalesContractStrategy`)
- **Action:** Change `买方`/`客户` to also match `需方`; fix regex to `/(供|需|买)[方][：:]\s*(.+)/`
- **Action:** After `getExistingKeys()`, resolve `_pendingCustomerName` to actual `customerId` via `setCustomerId()`

### Change 3: Add Summary/Contract Row Skipping (MODERATE)
- **File:** `sales-contract-import.strategy.ts`
- **Lines:** validateFabricRow / validateProductRow
- **Action:** Skip rows where col 2 contains "合计", "合计人民币", or starts with Chinese numeral clause markers

### Change 4: Relax Entity Name Matching (MODERATE)
- **File:** `sales-contract-import.strategy.ts`
- **Lines:** getExistingKeys() and validateFabricRow/validateProductRow
- **Action:** For fabric lookup, try matching by name (exact), then by partial name match
- **Action:** For product lookup, try matching by name, then by modelNumber
- **Alternative:** Accept failures for unmatched entities with clear error messages, and let user know which fabric/product names need to exist in the system first

### Change 5: Update Unit Tests (LOW)
- **File:** `sales-contract-import.strategy.spec.ts`
- **Action:** Update mock row helpers to start data at column 2 with leading null column and "商品名称" column to match real layout
- **Action:** Add test cases for summary row skipping and customer metadata extraction

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Column offset bug | HIGH | Verified by direct ExcelJS inspection of all 8 files |
| Customer resolution bug | HIGH | Code path traced: _pendingCustomerName set but never read |
| Summary row contamination | HIGH | Real file rows 13-14+ contain "合计" with non-null values |
| Entity name mismatch | HIGH | Real fabric names ("LEATHERGEL") differ from imported ("呼吸革"?) |
| Fix approach | HIGH | Column constants are the only change needed for data extraction; customer fix is straightforward |

## Sources

- Direct ExcelJS inspection of all 8 real files via `scripts/debug-sales-contracts.ts`
- `backend/src/import/strategies/sales-contract-import.strategy.ts` (516 lines)
- `backend/src/import/import.service.ts` lines 127-341 (importSalesContracts + configureSalesContractStrategy)
- `backend/src/import/strategies/sales-contract-import.strategy.spec.ts` (454 lines)
- `scripts/run-full-import-test.ts` (500 lines, actual test orchestrator)
- `.planning/phases/09-real-data-testing/09-03-SUMMARY.md` (results: 0/48/8 and 0/134/30)

---
*Research date: 2026-03-27*
*Diagnostic script: scripts/debug-sales-contracts.ts*
