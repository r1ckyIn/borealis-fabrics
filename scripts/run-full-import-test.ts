/**
 * End-to-End Import Test Script
 *
 * Orchestrates the complete two-stage import of all 13 xlsx files
 * from /Users/qinyuan/Desktop/铂润测试资料/.
 *
 * Stage 1: Base data (suppliers via API, fabrics via prepared xlsx, products via prepared xlsx)
 * Stage 2: Orders (3x purchase orders, 2x sales contracts, 6x customer orders)
 *
 * Prerequisites:
 *   - Backend running at http://localhost:3000
 *   - Data preparation scripts already run (fabrics-prepared.xlsx, products-prepared.xlsx in output/)
 *   - MySQL and Redis running
 *
 * Endpoints used:
 *   POST /api/v1/import/fabrics
 *   POST /api/v1/import/products
 *   POST /api/v1/import/purchase-orders
 *   POST /api/v1/import/sales-contracts
 *   POST /api/v1/suppliers
 *   POST /api/v1/customers
 *
 * Usage: cd scripts && npx ts-node run-full-import-test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// Configuration
// ============================================================

const BASE_URL = 'http://localhost:3000/api/v1';
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const TEST_DATA_DIR = '/Users/qinyuan/Desktop/铂润测试资料';

// Prepared files from Plan 01 scripts
const FABRICS_FILE = path.join(OUTPUT_DIR, 'fabrics-prepared.xlsx');
const PRODUCTS_FILE = path.join(OUTPUT_DIR, 'products-prepared.xlsx');

// Raw test files (purchase orders, sales contracts, customer orders)
const PURCHASE_ORDER_FILES = [
  path.join(TEST_DATA_DIR, '海宁优途-采购单 2025.11.26.xlsx'),
  path.join(TEST_DATA_DIR, '海宁优途-采购单 2026.03.06.xlsx'),
  path.join(TEST_DATA_DIR, '海宁优途-采购单 2026.3.13.xlsx'),
];

const SALES_CONTRACT_FILES = [
  path.join(
    TEST_DATA_DIR,
    '购销合同SH20260129-03 77854 77855 (U16-116面料).xlsx',
  ),
  path.join(
    TEST_DATA_DIR,
    '购销合同SH20260131-02（U18-111铁架）.xlsx',
  ),
];

const CUSTOMER_ORDER_FILES = [
  path.join(TEST_DATA_DIR, '77947 U19-156 U18-111面料.xlsx'),
  path.join(TEST_DATA_DIR, '77947 U19-156 U18-111铁架.xlsx'),
  path.join(TEST_DATA_DIR, '77955 MABLE U72面料.xlsx'),
  path.join(TEST_DATA_DIR, '77955 MABLE U72铁架.xlsx'),
  path.join(TEST_DATA_DIR, '77962 SYDNEY面料.xlsx'),
  path.join(TEST_DATA_DIR, '77962 SYDNEY铁架.xlsx'),
];

// Suppliers to create before import (derived from prepare-fabric-pricelist.ts SUPPLIER_MAP)
const SUPPLIERS_TO_CREATE = [
  { companyName: '博源纺织' },
  { companyName: '恒丰纺织' },
  { companyName: '美联纺织' },
  { companyName: '科明纺织' },
  { companyName: '新恒纺织' },
  { companyName: '裕达顺实业' },
  { companyName: '宜宇纺织' },
  { companyName: '永强纺织' },
  { companyName: 'AMR纺织' },
  { companyName: '新博源纺织' },
  { companyName: 'Davis纺织' },
  { companyName: '奥坦斯纺织' },
  { companyName: '瑞茂纺织' },
  { companyName: '海宏纺织' },
  // Product suppliers from prepare-product-pricelist.ts
  { companyName: 'Cenro机械' },
  { companyName: '丽华机械' },
  { companyName: 'ASH家具' },
  { companyName: 'LFH家具' },
  { companyName: 'JZD家具' },
  // PO supplier
  { companyName: '海宁优途' },
];

// Customer for PO self-customer pattern
const CUSTOMERS_TO_CREATE = [
  { companyName: '铂润面料' },
  { companyName: 'Miraggo HomeLiving' },
];

// ============================================================
// Types
// ============================================================

interface ImportResult {
  successCount: number;
  skippedCount: number;
  failureCount: number;
  failures: Array<{ rowNumber: number; identifier: string; reason: string }>;
}

interface StepResult {
  file: string;
  success: boolean;
  result?: ImportResult;
  error?: string;
}

// ============================================================
// Helpers
// ============================================================

let authCookie = '';

/**
 * Authenticate with the dev login endpoint.
 * Extracts the auth cookie from the Set-Cookie response header.
 */
async function authenticate(): Promise<void> {
  console.log('Authenticating via dev login...');

  const response = await fetch(`${BASE_URL}/auth/dev/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(
      `Auth failed: ${response.status} ${response.statusText}`,
    );
  }

  // Extract Set-Cookie header for the auth token
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    // Parse cookie name=value from Set-Cookie header
    const cookiePart = setCookie.split(';')[0];
    authCookie = cookiePart;
  } else {
    // Fallback: extract token from response body
    const body = (await response.json()) as { token?: string };
    if (body.token) {
      authCookie = `auth_token=${body.token}`;
    }
  }

  if (!authCookie) {
    throw new Error('Failed to extract auth cookie from login response');
  }

  console.log('Authentication successful.\n');
}

/**
 * Upload a file to an import endpoint via multipart/form-data.
 */
async function uploadFile(
  endpoint: string,
  filePath: string,
): Promise<ImportResult> {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  // Build multipart form data manually using Blob API (Node 18+)
  const formData = new FormData();
  const blob = new Blob([fileBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  formData.append('file', blob, fileName);

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Cookie: authCookie,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return (await response.json()) as ImportResult;
}

/**
 * Create an entity via POST if it doesn't already exist.
 * Silently skips 409 Conflict (already exists).
 */
async function createEntity(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<{ created: boolean; error?: string }> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie,
    },
    body: JSON.stringify(body),
  });

  if (response.ok || response.status === 201) {
    return { created: true };
  }

  // 409 Conflict = already exists, which is fine
  if (response.status === 409) {
    return { created: false };
  }

  const text = await response.text();
  return { created: false, error: `HTTP ${response.status}: ${text}` };
}

function logImportResult(label: string, result: ImportResult): void {
  console.log(
    `  ${label}: ${result.successCount} success, ${result.skippedCount} skipped, ${result.failureCount} failed`,
  );
  if (result.failures.length > 0) {
    const showCount = Math.min(5, result.failures.length);
    for (let i = 0; i < showCount; i++) {
      const f = result.failures[i];
      console.log(
        `    Row ${f.rowNumber} [${f.identifier}]: ${f.reason}`,
      );
    }
    if (result.failures.length > 5) {
      console.log(
        `    ... and ${result.failures.length - 5} more failures`,
      );
    }
  }
}

// ============================================================
// Main Execution Flow
// ============================================================

async function main(): Promise<void> {
  console.log('=== Borealis Fabrics: Full Import Test ===');
  console.log(`Backend: ${BASE_URL}`);
  console.log(`Test data: ${TEST_DATA_DIR}`);
  console.log();

  // Pre-flight: check prepared files exist
  for (const f of [FABRICS_FILE, PRODUCTS_FILE]) {
    if (!fs.existsSync(f)) {
      console.error(`ERROR: Prepared file not found: ${f}`);
      console.error(
        'Run prepare-fabric-pricelist.ts and prepare-product-pricelist.ts first.',
      );
      process.exit(1);
    }
  }

  // Pre-flight: check raw test files exist
  const allRawFiles = [
    ...PURCHASE_ORDER_FILES,
    ...SALES_CONTRACT_FILES,
    ...CUSTOMER_ORDER_FILES,
  ];
  for (const f of allRawFiles) {
    if (!fs.existsSync(f)) {
      console.error(`ERROR: Test file not found: ${f}`);
      process.exit(1);
    }
  }

  // Authenticate
  await authenticate();

  const results: StepResult[] = [];

  // ============================================================
  // Stage 1: Base Data Import
  // ============================================================
  console.log('=== Stage 1: Base Data Import ===\n');

  // Step 1: Create suppliers via API
  console.log('Step 1: Creating suppliers...');
  let suppliersCreated = 0;
  let suppliersSkipped = 0;
  let suppliersErrored = 0;
  for (const supplier of SUPPLIERS_TO_CREATE) {
    const res = await createEntity('/suppliers', supplier);
    if (res.created) {
      suppliersCreated++;
    } else if (res.error) {
      suppliersErrored++;
      console.log(`  ERROR creating "${supplier.companyName}": ${res.error}`);
    } else {
      suppliersSkipped++;
    }
  }
  console.log(
    `  Suppliers: ${suppliersCreated} created, ${suppliersSkipped} already exist, ${suppliersErrored} errors`,
  );
  console.log();

  // Step 2: Create customers via API
  console.log('Step 2: Creating customers...');
  let customersCreated = 0;
  let customersSkipped = 0;
  for (const customer of CUSTOMERS_TO_CREATE) {
    const res = await createEntity('/customers', customer);
    if (res.created) {
      customersCreated++;
    } else if (res.error) {
      console.log(`  ERROR creating "${customer.companyName}": ${res.error}`);
    } else {
      customersSkipped++;
    }
  }
  console.log(
    `  Customers: ${customersCreated} created, ${customersSkipped} already exist`,
  );
  console.log();

  // Step 3: Import fabrics from prepared file
  console.log('Step 3: Importing fabrics...');
  try {
    const fabricResult = await uploadFile('/import/fabrics', FABRICS_FILE);
    logImportResult('Fabrics', fabricResult);
    results.push({
      file: 'fabrics-prepared.xlsx',
      success: true,
      result: fabricResult,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  Fabrics import FAILED: ${msg}`);
    results.push({ file: 'fabrics-prepared.xlsx', success: false, error: msg });
  }
  console.log();

  // Step 4: Import products from prepared file
  console.log('Step 4: Importing products...');
  try {
    const productResult = await uploadFile('/import/products', PRODUCTS_FILE);
    logImportResult('Products', productResult);
    results.push({
      file: 'products-prepared.xlsx',
      success: true,
      result: productResult,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  Products import FAILED: ${msg}`);
    results.push({
      file: 'products-prepared.xlsx',
      success: false,
      error: msg,
    });
  }
  console.log();

  // ============================================================
  // Stage 2: Order/Document Import
  // ============================================================
  console.log('=== Stage 2: Order/Document Import ===\n');

  // Step 5: Import purchase orders
  console.log('Step 5: Importing purchase orders (3 files)...');
  for (const poFile of PURCHASE_ORDER_FILES) {
    const fileName = path.basename(poFile);
    try {
      const result = await uploadFile('/import/purchase-orders', poFile);
      logImportResult(fileName, result);
      results.push({ file: fileName, success: true, result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${fileName} FAILED: ${msg}`);
      results.push({ file: fileName, success: false, error: msg });
    }
  }
  console.log();

  // Step 6: Import sales contracts
  console.log('Step 6: Importing sales contracts (2 files)...');
  for (const scFile of SALES_CONTRACT_FILES) {
    const fileName = path.basename(scFile);
    try {
      const result = await uploadFile('/import/sales-contracts', scFile);
      logImportResult(fileName, result);
      results.push({ file: fileName, success: true, result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${fileName} FAILED: ${msg}`);
      results.push({ file: fileName, success: false, error: msg });
    }
  }
  console.log();

  // Step 7: Import customer orders (same endpoint as sales contracts)
  console.log('Step 7: Importing customer orders (6 files)...');
  for (const coFile of CUSTOMER_ORDER_FILES) {
    const fileName = path.basename(coFile);
    try {
      const result = await uploadFile('/import/sales-contracts', coFile);
      logImportResult(fileName, result);
      results.push({ file: fileName, success: true, result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${fileName} FAILED: ${msg}`);
      results.push({ file: fileName, success: false, error: msg });
    }
  }
  console.log();

  // ============================================================
  // Summary
  // ============================================================
  console.log('=== Import Summary ===\n');

  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let filesSucceeded = 0;
  let filesFailed = 0;

  console.log(
    '| File                                          | Status  | Success | Skipped | Failed |',
  );
  console.log(
    '|-----------------------------------------------|---------|---------|---------|--------|',
  );

  for (const r of results) {
    if (r.success && r.result) {
      const s = r.result;
      console.log(
        `| ${r.file.padEnd(45)} | PASS    | ${String(s.successCount).padStart(7)} | ${String(s.skippedCount).padStart(7)} | ${String(s.failureCount).padStart(6)} |`,
      );
      totalSuccess += s.successCount;
      totalSkipped += s.skippedCount;
      totalFailed += s.failureCount;
      filesSucceeded++;
    } else {
      console.log(
        `| ${r.file.padEnd(45)} | FAIL    |       - |       - |      - |`,
      );
      filesFailed++;
    }
  }

  console.log(
    '|-----------------------------------------------|---------|---------|---------|--------|',
  );
  console.log(
    `| TOTAL (${results.length} files)${' '.repeat(32)} |         | ${String(totalSuccess).padStart(7)} | ${String(totalSkipped).padStart(7)} | ${String(totalFailed).padStart(6)} |`,
  );
  console.log();
  console.log(
    `Files: ${filesSucceeded} succeeded, ${filesFailed} failed out of ${results.length} total`,
  );
  console.log(
    `Records: ${totalSuccess} imported, ${totalSkipped} skipped, ${totalFailed} failed`,
  );

  if (filesFailed > 0) {
    console.log('\nFailed files:');
    for (const r of results) {
      if (!r.success) {
        console.log(`  - ${r.file}: ${r.error}`);
      }
    }
  }

  // Exit code: 0 if all files processed (even with row-level failures), 1 if file-level failures
  process.exit(filesFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
