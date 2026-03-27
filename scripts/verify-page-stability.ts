/**
 * Page Stability Checker
 *
 * Automated smoke test that verifies all API list endpoints return 200
 * with valid data after bulk import. Also checks detail pages for
 * the first record of each entity type.
 *
 * Prerequisites:
 *   - Backend running at http://localhost:3000
 *   - Data has been imported (run-full-import-test.ts completed)
 *
 * Endpoints checked:
 *   GET /api/v1/fabrics, /api/v1/products, /api/v1/suppliers,
 *       /api/v1/customers, /api/v1/orders, /api/v1/quotes
 *   Plus detail pages for the first record of each entity type.
 *
 * Usage: cd scripts && npx ts-node verify-page-stability.ts
 */

import * as path from 'path';

// ============================================================
// Configuration
// ============================================================

const BASE_URL = 'http://localhost:3000/api/v1';

interface EndpointCheck {
  name: string;
  path: string;
  type: 'list' | 'detail';
  expectItems?: boolean;
}

// List endpoints to check (all paginated)
const LIST_ENDPOINTS: EndpointCheck[] = [
  { name: '/fabrics list', path: '/fabrics?page=1&pageSize=10', type: 'list', expectItems: true },
  { name: '/products list', path: '/products?page=1&pageSize=10', type: 'list', expectItems: true },
  { name: '/suppliers list', path: '/suppliers?page=1&pageSize=10', type: 'list', expectItems: true },
  { name: '/customers list', path: '/customers?page=1&pageSize=10', type: 'list', expectItems: true },
  { name: '/orders list', path: '/orders?page=1&pageSize=10', type: 'list', expectItems: true },
  { name: '/quotes list', path: '/quotes?page=1&pageSize=10', type: 'list', expectItems: false },
];

// ============================================================
// Types
// ============================================================

interface CheckResult {
  name: string;
  pass: boolean;
  statusCode: number;
  recordCount?: number;
  error?: string;
}

// ============================================================
// Helpers
// ============================================================

let authCookie = '';

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

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    authCookie = setCookie.split(';')[0];
  } else {
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

async function checkEndpoint(
  endpoint: EndpointCheck,
): Promise<CheckResult> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint.path}`, {
      method: 'GET',
      headers: {
        Cookie: authCookie,
      },
    });

    if (!response.ok) {
      return {
        name: endpoint.name,
        pass: false,
        statusCode: response.status,
        error: `HTTP ${response.status}`,
      };
    }

    const body = await response.json() as Record<string, unknown>;

    if (endpoint.type === 'list') {
      // Paginated list should have items array and total
      const items = body.items as unknown[] | undefined;
      const total = body.total as number | undefined;

      if (!Array.isArray(items)) {
        return {
          name: endpoint.name,
          pass: false,
          statusCode: 200,
          error: 'Response missing "items" array',
        };
      }

      if (endpoint.expectItems && items.length === 0 && (total === 0 || total === undefined)) {
        return {
          name: endpoint.name,
          pass: false,
          statusCode: 200,
          error: 'Expected records but got 0',
        };
      }

      return {
        name: endpoint.name,
        pass: true,
        statusCode: 200,
        recordCount: total ?? items.length,
      };
    }

    // Detail endpoint -- just check it returned an object with an id
    if (!body.id) {
      return {
        name: endpoint.name,
        pass: false,
        statusCode: 200,
        error: 'Response missing "id" field',
      };
    }

    return {
      name: endpoint.name,
      pass: true,
      statusCode: 200,
    };
  } catch (err) {
    return {
      name: endpoint.name,
      pass: false,
      statusCode: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  console.log('=== Borealis Fabrics: Page Stability Check ===');
  console.log(`Backend: ${BASE_URL}`);
  console.log();

  await authenticate();

  const results: CheckResult[] = [];

  // Check all list endpoints
  console.log('Checking list endpoints...');
  for (const endpoint of LIST_ENDPOINTS) {
    const result = await checkEndpoint(endpoint);
    results.push(result);
  }

  // For each list with results, also check the first detail page
  console.log('Checking detail endpoints...');
  for (const endpoint of LIST_ENDPOINTS) {
    // Extract the entity path (e.g., /fabrics from /fabrics?page=1&pageSize=10)
    const entityPath = endpoint.path.split('?')[0];

    try {
      const listResponse = await fetch(
        `${BASE_URL}${entityPath}?page=1&pageSize=1`,
        {
          method: 'GET',
          headers: { Cookie: authCookie },
        },
      );

      if (listResponse.ok) {
        const body = (await listResponse.json()) as {
          items?: Array<{ id: number }>;
        };
        if (body.items && body.items.length > 0) {
          const firstId = body.items[0].id;
          const detailEndpoint: EndpointCheck = {
            name: `${entityPath}/${firstId} detail`,
            path: `${entityPath}/${firstId}`,
            type: 'detail',
          };
          const detailResult = await checkEndpoint(detailEndpoint);
          results.push(detailResult);
        }
      }
    } catch {
      // Skip detail check if list failed
    }
  }

  // Print results
  console.log('\n=== Page Stability Check Results ===\n');

  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    const status = r.pass ? 'PASS' : 'FAIL';
    const suffix = r.recordCount !== undefined ? ` (${r.recordCount} records)` : '';
    const errorSuffix = r.error ? ` -- ${r.error}` : '';
    const dots = '.'.repeat(Math.max(1, 40 - r.name.length));

    console.log(`  ${r.name} ${dots} ${status}${suffix}${errorSuffix}`);

    if (r.pass) {
      passCount++;
    } else {
      failCount++;
    }
  }

  console.log();
  console.log(
    `Total: ${passCount}/${results.length} PASS, ${failCount} FAIL`,
  );

  if (failCount > 0) {
    console.log('\nFailed checks:');
    for (const r of results) {
      if (!r.pass) {
        console.log(`  - ${r.name}: ${r.error || `HTTP ${r.statusCode}`}`);
      }
    }
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
