# Phase 2: Core Feature Implementation - Research

**Researched:** 2026-03-23
**Domain:** Quote-to-order conversion (NestJS + Prisma transactions + Redis locks), Tencent COS file storage (dual-mode with migration)
**Confidence:** HIGH

## Summary

Phase 2 implements two distinct feature domains: (1) quote-to-order conversion with N:1 merging, Redis distributed locking, and transaction safety; (2) Tencent COS file storage with a dual-mode abstraction layer, key-only database storage, and a one-time migration script for existing FabricImage records.

The codebase is well-prepared for both features. The `convertToOrder()` method in `quote.service.ts` (line 349) is a stub throwing `NotImplementedException` with clear TODO comments. The `OrderService.create()` method demonstrates the exact Prisma transaction pattern needed. COS config keys (`COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`, `COS_REGION`) are already defined in `configuration.ts`. `RedisService` is available globally via `CommonModule` with `set`/`get`/`del`/`setex` methods wrapping ioredis.

**Primary recommendation:** Implement quote-to-order conversion first (shared customer validation, Prisma transaction for order creation + quote status update, Redis lock wrapper), then COS storage abstraction, then migration script. Keep the current single-quote endpoint (`POST :id/convert-to-order`) but also add a batch endpoint for N-to-1 conversion.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- N quotes to 1 order: support selecting multiple quotes for the same customer, merging into one order with N OrderItems
- Each OrderItem links back to its source quote via `quoteId` FK (already exists in schema)
- Initial OrderItem status: PENDING (skips INQUIRY since quote already confirmed intent)
- Auto-fill `supplierId` from the fabric's associated supplier on each OrderItem
- Quote status: add new `QuoteStatus.CONVERTED` value; set on all converted quotes
- Conversion is atomic: if any quote is invalid (expired, wrong status), the entire batch fails with details on which quotes have issues
- Use Redis distributed lock per quote ID during conversion
- First request acquires lock, converts, and sets quote to CONVERTED; second request fails (409)
- Redis lock timeout: reasonable (e.g., 30s) to prevent deadlocks
- Dual-mode storage: local filesystem for development, Tencent COS for production
- Switch via environment variable (e.g., `STORAGE_MODE=local|cos`)
- Storage abstraction: interface with local and COS implementations, injected via DI
- Key-only storage: database stores COS key only (not full URL)
- URL generation at read-time: backend dynamically generates presigned URL (COS mode) or localhost URL (local mode)
- Migration script: one-time script to convert existing FabricImage.url from localhost URLs to COS keys, and upload local files to COS
- Presigned URLs with expiry for COS mode (private bucket)

### Claude's Discretion
- Presigned URL expiry duration
- Frontend behavior after successful conversion (jump to order detail vs stay on page)
- Storage interface design details
- Migration script implementation approach
- Transaction isolation level for conversion

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FEAT-01 | Quote-to-order conversion works end-to-end with transaction safety | Prisma `$transaction()` pattern from OrderService.create(); N:1 merging; PENDING initial status; supplierId auto-fill from FabricSupplier |
| FEAT-02 | Quote-to-order prevents duplicate conversion (concurrent request protection) | Redis SET NX EX pattern via existing RedisService; per-quote-ID lock key; 409 ConflictException |
| FEAT-03 | File upload uses Tencent COS SDK instead of local storage | cos-nodejs-sdk-v5 package; StorageProvider interface; COS implementation with putObject |
| FEAT-04 | Existing file URL records migrated from localhost to COS | Migration script strips localhost prefix to extract key; uploads local files to COS; updates FabricImage.url to key-only |
| FEAT-05 | File URLs use key-only storage with read-time URL generation | StorageProvider.getUrl(key) returns presigned URL (COS) or localhost URL (local); FabricImage.url stores key only |
| TEST-01 | Quote-to-order conversion has unit + integration tests including failure paths | Extend existing quote.service.spec.ts (currently tests stub); add E2E tests to quote.e2e-spec.ts |
| TEST-02 | Quote-to-order concurrent conversion test (returns 409 on duplicate) | Unit test mocking RedisService lock acquisition; E2E test with concurrent requests |
| TEST-03 | COS upload/download integration tests | Unit test with mocked COS SDK; test StorageProvider interface contract for both modes |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cos-nodejs-sdk-v5 | ^2.15.3 | Tencent COS object storage SDK | Official Tencent Cloud Node.js SDK; actively maintained; TypeScript definitions included |
| ioredis | ^5.9.2 | Redis client (already installed) | Already in use via RedisService; provides SET NX EX for distributed locking |
| @prisma/client | ^6.19.2 | ORM (already installed) | Already in use; `$transaction()` for atomic operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/config | ^4.0.2 | Configuration (already installed) | COS credentials, STORAGE_MODE env var |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cos-nodejs-sdk-v5 | @aws-sdk/client-s3 (COS is S3-compatible) | AWS SDK is more widely documented but adds unnecessary abstraction layer; COS SDK is simpler for Tencent-specific features like presigned URLs |
| Redis SET NX EX | Redlock (node-redlock) | Redlock is for multi-Redis-instance quorum; overkill for single-instance setup |
| Redis SET NX EX | Prisma optimistic locking | User explicitly chose Redis lock for stronger guarantees |

**Installation:**
```bash
cd backend && pnpm add cos-nodejs-sdk-v5
```

No other packages needed -- ioredis, Prisma, NestJS config are already installed.

## Architecture Patterns

### Recommended Project Structure
```
backend/src/
├── quote/
│   ├── quote.service.ts           # Add convertToOrder() + batchConvertToOrder() implementation
│   ├── quote.controller.ts        # Add batch convert endpoint
│   ├── dto/
│   │   ├── convert-quote.dto.ts   # NEW: ConvertQuotesToOrderDto (quoteIds array)
│   │   └── index.ts               # Update barrel export
│   ├── quote.service.spec.ts      # Extend with conversion tests
│   └── quote.module.ts            # Add OrderModule + CommonModule imports
├── file/
│   ├── storage/
│   │   ├── storage.interface.ts   # NEW: StorageProvider interface
│   │   ├── local.storage.ts       # NEW: LocalStorageProvider
│   │   ├── cos.storage.ts         # NEW: CosStorageProvider
│   │   └── index.ts               # Barrel export
│   ├── file.service.ts            # Refactor to use StorageProvider
│   ├── file.module.ts             # DI registration based on STORAGE_MODE
│   └── file.service.spec.ts       # Update tests for StorageProvider
├── common/
│   └── services/
│       └── redis.service.ts       # Add acquireLock() / releaseLock() methods
└── scripts/
    └── migrate-to-cos.ts          # NEW: One-time migration script
```

### Pattern 1: Quote-to-Order Conversion (Prisma Transaction + Redis Lock)
**What:** Atomic conversion of N quotes into 1 order using Prisma transaction, protected by Redis distributed locks
**When to use:** Any operation requiring both atomicity and concurrent access protection

```typescript
// Pattern: Redis lock + Prisma transaction
async batchConvertToOrder(dto: ConvertQuotesToOrderDto): Promise<Order> {
  // 1. Acquire Redis locks for ALL quote IDs (sorted to prevent deadlocks)
  const sortedIds = [...dto.quoteIds].sort((a, b) => a - b);
  const locks = await this.acquireQuoteLocks(sortedIds);

  try {
    // 2. Atomic transaction: validate, create order, update quotes
    return await this.prisma.$transaction(async (tx) => {
      // Validate all quotes (active, not expired, same customer)
      const quotes = await this.validateQuotesForConversion(tx, sortedIds);

      // Create order with items from all quotes
      const order = await this.createOrderFromQuotes(tx, quotes, dto.customerId);

      // Mark all quotes as CONVERTED
      await tx.quote.updateMany({
        where: { id: { in: sortedIds } },
        data: { status: QuoteStatus.CONVERTED },
      });

      return order;
    });
  } finally {
    // 3. Always release locks
    await this.releaseQuoteLocks(sortedIds);
  }
}
```

### Pattern 2: Storage Provider Interface (Strategy Pattern with DI)
**What:** Abstract storage behind an interface, switch implementations via env var
**When to use:** Any service that needs to work differently in dev vs production

```typescript
// Source: NestJS DI pattern for conditional providers
export interface StorageProvider {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  getUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// In file.module.ts - conditional DI registration
const storageProvider = {
  provide: 'STORAGE_PROVIDER',
  useFactory: (configService: ConfigService) => {
    const mode = configService.get<string>('STORAGE_MODE', 'local');
    if (mode === 'cos') {
      return new CosStorageProvider(configService);
    }
    return new LocalStorageProvider(configService);
  },
  inject: [ConfigService],
};
```

### Pattern 3: Redis Distributed Lock
**What:** SET NX EX pattern for mutual exclusion
**When to use:** Preventing concurrent execution of the same logical operation

```typescript
// Add to RedisService
async acquireLock(key: string, ttlSeconds: number = 30): Promise<boolean> {
  if (!this.isAvailable()) return false;

  try {
    // SET key value NX EX ttl -- atomic set-if-not-exists with expiry
    const result = await this.client!.set(
      `lock:${key}`, '1', 'EX', ttlSeconds, 'NX'
    );
    return result === 'OK';
  } catch (error) {
    this.logger.error(`Lock acquisition failed for ${key}: ${(error as Error).message}`);
    return false;
  }
}

async releaseLock(key: string): Promise<boolean> {
  return this.del(`lock:${key}`);
}
```

### Pattern 4: Presigned URL Generation (COS)
**What:** Generate time-limited download URLs for private bucket objects
**When to use:** Returning file URLs to frontend from private COS bucket

```typescript
// Source: Tencent Cloud COS documentation
// https://www.tencentcloud.com/document/product/436/31540
async getUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
  return new Promise((resolve, reject) => {
    this.cosClient.getObjectUrl({
      Bucket: this.bucket,
      Region: this.region,
      Key: key,
      Sign: true,
      Expires: expiresInSeconds,
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data.Url);
    });
  });
}
```

### Anti-Patterns to Avoid
- **Storing full COS URLs in database:** URLs change (bucket migration, domain change, presigned expiry). Store key only, generate URL at read time.
- **Acquiring locks without sorted order:** When locking multiple resources, always sort IDs to prevent ABBA deadlocks.
- **Forgetting lock release on error:** Always use try/finally to release locks, even on transaction failure.
- **Mixing conversion logic in OrderService:** Keep conversion logic in QuoteService -- it's a quote operation that creates an order, not an order operation.
- **Synchronous COS upload in request path:** For migration script, upload files sequentially or in small batches; don't try to upload all at once.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Distributed locking | Custom lock table in DB | Redis SET NX EX via ioredis | Atomic, auto-expiry, no cleanup needed |
| Object storage presigned URLs | Custom HMAC signature generation | cos-nodejs-sdk-v5 `getObjectUrl()` | COS signature algorithm is complex; SDK handles it correctly |
| File upload to COS | Manual HTTP multipart to COS API | cos-nodejs-sdk-v5 `putObject()` / `uploadFile()` | Handles chunked upload, retries, error codes |
| Order code generation | Random strings | Existing `CodeGeneratorService` | Already handles BF-YYMM-NNNN format with Redis sequence |

**Key insight:** The codebase already has most of the infrastructure -- RedisService, CodeGeneratorService, Prisma transactions, FileService. This phase is about connecting existing pieces and adding COS SDK, not building from scratch.

## Common Pitfalls

### Pitfall 1: QuoteStatus enum string mismatch
**What goes wrong:** Backend QuoteStatus uses lowercase strings (`'active'`, `'expired'`, `'converted'`), but database stores them as-is. Frontend QuoteStatus matches. If someone adds `CONVERTED = 'CONVERTED'` instead of `CONVERTED = 'converted'`, the status check breaks.
**Why it happens:** Existing enum uses lowercase: `ACTIVE = 'active'`, `EXPIRED = 'expired'`, `CONVERTED = 'converted'`. New code might follow the `OrderItemStatus` pattern which uses UPPERCASE values.
**How to avoid:** `QuoteStatus.CONVERTED` already exists as `'converted'` in the backend DTO. Use it, don't create a new enum value.
**Warning signs:** Status filter queries returning empty results; status display showing raw string instead of label.

### Pitfall 2: FabricSupplier lookup for auto-fill supplierId
**What goes wrong:** A fabric can have multiple suppliers via the FabricSupplier join table. Auto-filling `supplierId` requires choosing one.
**Why it happens:** The schema has `FabricSupplier` as a many-to-many with purchase prices. A fabric may have 0, 1, or N suppliers.
**How to avoid:** Use the first/primary FabricSupplier for auto-fill. If no supplier exists for a fabric, set `supplierId` to null (the field is nullable on OrderItem). If multiple exist, pick the one with the lowest purchase price or the first one created.
**Warning signs:** OrderItems created with null supplierId when user expected auto-fill.

### Pitfall 3: COS SDK callback-style API
**What goes wrong:** cos-nodejs-sdk-v5 uses Node.js callback pattern `(err, data) => {}`, not Promises. Mixing with async/await causes issues.
**Why it happens:** The SDK is older and follows Node.js callback convention.
**How to avoid:** Wrap all COS SDK calls in `new Promise((resolve, reject) => ...)` or use `util.promisify()` if the SDK method shape allows it. The SDK also supports `.then()` on some methods (as noted in docs: `cos.uploadFile({...}).then(data => ...)`).
**Warning signs:** Unhandled promise rejections; undefined data in responses.

### Pitfall 4: Lock not released on transaction failure
**What goes wrong:** If the Prisma transaction throws, the Redis lock stays acquired until TTL expires.
**Why it happens:** Lock acquisition happens before transaction, and release is in the success path only.
**How to avoid:** Always use `try/finally` pattern: acquire lock, try { do work } finally { release lock }.
**Warning signs:** Subsequent conversion attempts failing with 409 for 30 seconds after a failed conversion.

### Pitfall 5: Migration script modifying FabricImage.url while application is running
**What goes wrong:** If the app reads a FabricImage.url that has been converted to key-only format but the app is still using the old logic (generating full URLs from FileService), images break.
**Why it happens:** Migration and code deployment are not atomic.
**How to avoid:** Deploy the new code (that reads key-only and generates URLs at read-time) BEFORE running the migration script. The new code should handle both formats gracefully (detect if url starts with 'http' = legacy, otherwise = key).
**Warning signs:** Broken image URLs on fabric detail pages during deployment.

### Pitfall 6: Redis unavailability during conversion
**What goes wrong:** RedisService returns false/null when Redis is down. If lock acquisition silently fails, concurrent protection is lost.
**Why it happens:** RedisService.isAvailable() returns false gracefully rather than throwing.
**How to avoid:** In the conversion flow, if Redis is unavailable, throw a ServiceUnavailableException rather than proceeding without locks. The concurrent protection guarantee requires Redis.
**Warning signs:** Duplicate orders created from the same quote.

### Pitfall 7: ioredis TypeScript overload issue with SET NX EX
**What goes wrong:** `redis.set('key', 'value', 'NX', 'EX', 30)` may cause TypeScript compilation errors due to overload resolution.
**Why it happens:** ioredis TypeScript definitions have known issues with SET command overloads (GitHub issue #1811).
**How to avoid:** Use `redis.call('set', key, value, 'NX', 'EX', seconds)` instead of `redis.set()`, or cast as needed.
**Warning signs:** TypeScript compilation errors on `set` method call.

## Code Examples

### Quote-to-Order Conversion: Order Creation from Quotes

```typescript
// Pattern based on existing OrderService.create() in order.service.ts
private async createOrderFromQuotes(
  tx: Prisma.TransactionClient,
  quotes: QuoteWithRelations[],
  customerId: number,
): Promise<Order> {
  const orderCode = await this.codeGeneratorService.generateCode(CodePrefix.ORDER);

  // Calculate total from all quotes
  const totalAmount = quotes.reduce(
    (sum, q) => sum + Number(q.quantity) * Number(q.unitPrice), 0
  );

  // Look up supplier for each fabric
  const fabricIds = [...new Set(quotes.map(q => q.fabricId))];
  const fabricSuppliers = await tx.fabricSupplier.findMany({
    where: { fabricId: { in: fabricIds } },
    orderBy: { purchasePrice: 'asc' },
    distinct: ['fabricId'],
  });
  const supplierMap = new Map(fabricSuppliers.map(fs => [fs.fabricId, fs.supplierId]));

  const order = await tx.order.create({
    data: {
      orderCode,
      customerId,
      status: OrderItemStatus.PENDING,
      totalAmount,
      items: {
        create: quotes.map(q => ({
          fabricId: q.fabricId,
          supplierId: supplierMap.get(q.fabricId) ?? null,
          quoteId: q.id,
          quantity: q.quantity,
          salePrice: q.unitPrice,
          subtotal: Number(q.quantity) * Number(q.unitPrice),
          status: OrderItemStatus.PENDING,
        })),
      },
    },
    include: { items: true, customer: true },
  });

  // Create timeline entries
  await tx.orderTimeline.createMany({
    data: order.items.map(item => ({
      orderItemId: item.id,
      fromStatus: null,
      toStatus: OrderItemStatus.PENDING,
      remark: `Converted from quote`,
    })),
  });

  return order;
}
```

### Storage Provider Interface

```typescript
// backend/src/file/storage/storage.interface.ts
export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
  /**
   * Upload a file to storage.
   * @param key - Unique file key (e.g., uuid.ext)
   * @param buffer - File content
   * @param mimeType - MIME type for content-type header
   */
  upload(key: string, buffer: Buffer, mimeType: string): Promise<void>;

  /**
   * Get a URL for accessing a stored file.
   * For COS: returns a presigned URL with expiry.
   * For local: returns a localhost URL.
   * @param key - File key
   * @param expiresInSeconds - URL expiry (COS only, default 3600)
   */
  getUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Delete a file from storage.
   * @param key - File key
   */
  delete(key: string): Promise<void>;
}
```

### COS Storage Provider

```typescript
// backend/src/file/storage/cos.storage.ts
import COS from 'cos-nodejs-sdk-v5';

export class CosStorageProvider implements StorageProvider {
  private readonly cos: COS;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    const cosConfig = this.configService.get('cos');
    this.cos = new COS({
      SecretId: cosConfig.secretId,
      SecretKey: cosConfig.secretKey,
    });
    this.bucket = cosConfig.bucket;
    this.region = cosConfig.region;
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cos.putObject({
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    return new Promise((resolve, reject) => {
      this.cos.getObjectUrl({
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
        Sign: true,
        Expires: expiresInSeconds,
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data.Url);
      });
    });
  }

  async delete(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cos.deleteObject({
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
      }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
```

### Migration Script Pattern

```typescript
// backend/src/scripts/migrate-to-cos.ts
// Run: npx ts-node src/scripts/migrate-to-cos.ts
async function migrateFabricImagesToCos() {
  // 1. Find all FabricImage records with localhost URLs
  const images = await prisma.fabricImage.findMany({
    where: { url: { startsWith: 'http://localhost' } },
  });

  for (const image of images) {
    // 2. Extract key from URL: "http://localhost:3000/uploads/uuid.jpg" -> "uuid.jpg"
    const key = image.url.split('/uploads/').pop();
    if (!key) continue;

    // 3. Read local file
    const localPath = path.join(uploadDir, key);
    if (!fs.existsSync(localPath)) {
      console.warn(`File not found: ${localPath}, skipping image ${image.id}`);
      continue;
    }

    // 4. Upload to COS
    const buffer = await fs.promises.readFile(localPath);
    await cosProvider.upload(key, buffer, 'image/jpeg');

    // 5. Update database: store key only
    await prisma.fabricImage.update({
      where: { id: image.id },
      data: { url: key },
    });

    console.log(`Migrated: ${image.id} -> ${key}`);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Local file storage (MVP) | COS with presigned URLs | This phase | Production-ready file storage; URLs auto-expire |
| Full URL in database | Key-only storage | This phase | Database records survive bucket/domain changes |
| No concurrent protection | Redis distributed lock | This phase | Prevents duplicate order creation from same quote |
| Single quote to order | N quotes to 1 order | This phase | Matches real business flow |

**Deprecated/outdated:**
- `NotImplementedException` in `convertToOrder()` -- will be replaced with actual implementation
- Direct local file path in `FileService` -- replaced by `StorageProvider` interface

## Open Questions

1. **Presigned URL expiry duration (Claude's discretion)**
   - What we know: COS default is 900 seconds (15 min). Can be set to any value.
   - Recommendation: **1 hour (3600 seconds)** for internal team use. This balances security (URL expires) with usability (user won't hit expired URLs during normal workflow). For image display, this is generous enough that a loaded page won't break within a session.

2. **Frontend behavior after successful conversion (Claude's discretion)**
   - What we know: Current frontend navigates to order detail page (`navigate(`/orders/${order.id}`)`) on success.
   - Recommendation: **Keep the existing navigation to order detail page.** This is already implemented in `QuoteDetailPage.tsx` line 102 and provides immediate feedback. The quote detail will show CONVERTED status on return.

3. **Auto-fill supplierId: which supplier when multiple exist? (Claude's discretion)**
   - What we know: FabricSupplier is a many-to-many with purchasePrice per supplier.
   - Recommendation: **Use the supplier with the lowest purchasePrice.** Query with `orderBy: { purchasePrice: 'asc' }` and `distinct: ['fabricId']`. If no FabricSupplier record exists, leave supplierId as null (field is nullable).

4. **Transaction isolation level for conversion (Claude's discretion)**
   - What we know: Prisma on MySQL uses `REPEATABLE READ` by default. The Redis lock provides the main concurrency control.
   - Recommendation: **Use default isolation level.** The Redis lock prevents concurrent conversion of the same quote. Within the transaction, `updateMany` with status condition provides an additional safety net.

5. **Migration script approach (Claude's discretion)**
   - What we know: Need to migrate FabricImage.url from full localhost URLs to key-only.
   - Recommendation: **Standalone ts-node script** (not a Prisma migration, not an API endpoint). Run manually after deploying new code. Include dry-run mode, progress logging, and error recovery (skip failed files, report at end).

6. **Batch convert endpoint design**
   - What we know: Current endpoint is `POST /quotes/:id/convert-to-order` (single quote). CONTEXT requires N-to-1.
   - Recommendation: Add `POST /quotes/batch-convert` accepting `{ quoteIds: number[] }` body. Keep the single-quote endpoint as a convenience (it internally calls the batch logic with a single-element array). Both require same-customer validation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (Backend) | Jest 30 + SuperTest 7 |
| Framework (Frontend) | Vitest (via Vite config) |
| Config file (Backend unit) | `backend/package.json` jest section |
| Config file (Backend E2E) | `backend/test/jest-e2e.json` |
| Config file (Frontend) | `frontend/vite.config.ts` test section |
| Quick run command (Backend) | `cd backend && pnpm test -- --testPathPattern quote` |
| Full suite command (Backend) | `cd backend && pnpm test` |
| Quick run command (Frontend) | `cd frontend && pnpm test -- --run` |
| Full suite command | `cd backend && pnpm test && cd ../frontend && pnpm test -- --run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FEAT-01 | Quote-to-order conversion with transaction | unit | `cd backend && pnpm test -- --testPathPattern quote.service.spec` | Partial (stub tests exist) |
| FEAT-01 | Quote-to-order E2E | e2e | `cd backend && pnpm test:e2e -- --testPathPattern quote` | Partial (501 test exists) |
| FEAT-02 | Concurrent conversion returns 409 | unit | `cd backend && pnpm test -- --testPathPattern quote.service.spec` | No |
| FEAT-03 | COS upload works | unit | `cd backend && pnpm test -- --testPathPattern file.service.spec` | No (existing tests are local-only) |
| FEAT-04 | URL migration correctness | unit | `cd backend && pnpm test -- --testPathPattern migrate` | No |
| FEAT-05 | Key-only storage + URL generation | unit | `cd backend && pnpm test -- --testPathPattern file.service.spec` | No |
| TEST-01 | Conversion happy + failure paths | unit+e2e | `cd backend && pnpm test -- --testPathPattern quote` | No (new tests) |
| TEST-02 | Concurrent 409 test | unit | `cd backend && pnpm test -- --testPathPattern quote.service.spec` | No |
| TEST-03 | COS upload/download tests | unit | `cd backend && pnpm test -- --testPathPattern file` | No (new tests) |

### Sampling Rate
- **Per task commit:** `cd backend && pnpm test -- --testPathPattern <module> && pnpm build`
- **Per wave merge:** `cd backend && pnpm build && pnpm test && pnpm lint && cd ../frontend && pnpm build && pnpm test -- --run && pnpm lint && pnpm typecheck`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/file/storage/storage.interface.ts` -- StorageProvider interface definition
- [ ] `backend/src/file/storage/cos.storage.spec.ts` -- COS provider unit tests
- [ ] `backend/src/file/storage/local.storage.spec.ts` -- Local provider unit tests
- [ ] `backend/src/scripts/migrate-to-cos.spec.ts` -- Migration script tests (optional, can be manual-tested)
- [ ] `cos-nodejs-sdk-v5` package install -- `pnpm add cos-nodejs-sdk-v5`

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `backend/src/quote/quote.service.ts` -- existing convertToOrder stub and validation logic
- Codebase analysis: `backend/src/order/order.service.ts` -- OrderService.create() pattern for Prisma transaction + order creation
- Codebase analysis: `backend/src/common/services/redis.service.ts` -- existing RedisService with set/get/del/setex
- Codebase analysis: `backend/src/file/file.service.ts` -- current local storage implementation
- Codebase analysis: `backend/src/config/configuration.ts` -- COS config keys already defined
- Codebase analysis: `backend/prisma/schema.prisma` -- Quote, Order, OrderItem, FabricImage, File models

### Secondary (MEDIUM confidence)
- [Tencent Cloud COS Pre-Signed URL Documentation](https://www.tencentcloud.com/document/product/436/31540) -- getObjectUrl API with Sign/Expires params
- [Tencent Cloud COS Getting Started](https://www.tencentcloud.com/document/product/436/11459) -- SDK initialization and upload patterns
- [cos-nodejs-sdk-v5 GitHub](https://github.com/tencentyun/cos-nodejs-sdk-v5) -- v2.15.3, TypeScript definitions, putObject/getObjectUrl methods
- [ioredis distributed lock pattern](https://bpaulino.com/entries/distributed-lock-in-node-js) -- SET NX EX pattern with try/finally

### Tertiary (LOW confidence)
- [ioredis TypeScript SET overload issue](https://github.com/redis/ioredis/issues/1811) -- TypeScript type error with SET NX EX; may need `redis.call()` workaround

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- cos-nodejs-sdk-v5 is the official Tencent COS SDK, ioredis already in use, Prisma patterns well-established in codebase
- Architecture: HIGH -- Storage provider pattern is well-understood DI; conversion logic follows existing OrderService.create() pattern exactly
- Pitfalls: HIGH -- identified from codebase analysis (enum string values, FabricSupplier cardinality, COS callback API, lock release)
- COS SDK specifics: MEDIUM -- verified getObjectUrl and putObject from official docs, but SDK v2.15.3 API may have minor differences from documentation examples

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (30 days -- stable libraries, no fast-moving changes expected)
