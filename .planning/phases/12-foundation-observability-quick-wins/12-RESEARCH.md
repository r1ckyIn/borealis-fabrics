# Phase 12: Foundation & Observability Quick Wins - Research

**Researched:** 2026-03-28
**Domain:** Cross-cutting infrastructure (correlation ID, soft delete, Sentry error tracking) + tech debt fixes
**Confidence:** HIGH

## Summary

Phase 12 covers four distinct technical domains: (1) request correlation ID via `nestjs-cls` integrated with `nestjs-pino` and Sentry, (2) soft-delete migration from `isActive` boolean to `deletedAt` timestamp using Prisma Client Extensions, (3) Sentry error tracking on both backend (`@sentry/nestjs`) and frontend (`@sentry/react`), and (4) three tech-debt fixes (OrderFormPage inline validation, operatorId fix, SalesContractImportStrategy hardening).

All four libraries (`nestjs-cls`, `@sentry/nestjs`, `@sentry/react`, `prisma-extension-soft-delete`) are mature, well-documented, and compatible with the project's current stack (NestJS 11, React 18, Prisma 6.19). The soft-delete migration is the highest-risk item due to 252 `isActive` occurrences across 32 backend files and the need for a MySQL-compatible unique constraint strategy. The Sentry and correlation ID integrations are relatively straightforward wiring.

**Primary recommendation:** Implement in this order: (1) Correlation ID (foundation for Sentry context), (2) Sentry backend + frontend, (3) Soft delete schema migration + extension, (4) Tech debt fixes. This sequence ensures each layer builds on the previous.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use `nestjs-cls` for request-scoped correlation ID storage. Generate UUID v4 per request via middleware.
- **D-02:** Propagate correlation ID through: pino log context (automatic via cls), Sentry scope tags, `X-Correlation-ID` response header.
- **D-03:** AllExceptionsFilter already exists -- enhance it to include correlation ID in error responses.
- **D-04:** Implement via Prisma Client Extensions with `deletedAt` timestamp column (not boolean). All 6 entities with `isActive` (User, Fabric, Supplier, Customer, Product, ProductBundle) are pure soft-delete semantics -- migrate all to `deletedAt`.
- **D-05:** Prisma Client Extensions auto-filter: all `findMany`/`findFirst`/`findUnique` queries automatically exclude `deletedAt IS NOT NULL`; explicit `includeDeleted: true` option available for admin queries.
- **D-06:** Unique constraints updated for soft-deleted records using MySQL `NULL != NULL` pattern (partial unique index or generated column approach).
- **D-07:** Backend restore API (`PATCH /:id/restore`) added for each entity -- sets `deletedAt = null`. Requires boss role.
- **D-08:** Frontend recovery UI (list page "show deleted" filter, boss-only) is **deferred to Phase 13** -- Phase 12 has no UI hint except DEBT-01.
- **D-09:** Backend: `@sentry/nestjs` with global exception filter integration. Sentry captures unhandled 500 errors with correlation ID in Sentry scope.
- **D-10:** `beforeSend` filter: exclude 400, 401, 403, 404 status codes. Scrub PII (email, phone) from error context.
- **D-11:** Frontend: `@sentry/react` with React Router integration. ErrorBoundary enhanced with `Sentry.ErrorBoundary` wrapper.
- **D-12:** Existing `ErrorBoundary.tsx` enhanced: add Sentry error reporting in `componentDidCatch`, keep existing graceful fallback UI (Ant Design Result component with retry button).
- **D-13:** All backend class-validator field errors mapped to inline Ant Design Form field errors via `form.setFields()`. No more toast-only for 400/422.
- **D-14:** Pattern: create a reusable `mapApiErrorsToFormFields()` utility that parses backend validation error response and returns `FieldData[]` for `form.setFields()`.
- **D-15:** Fix `operatorId: undefined` in `OrderPaymentService` (lines 47, 130). Extract operator ID from request auth context (JWT user). Requires passing auth user through service method or using nestjs-cls to access request user.
- **D-16:** Enhance resilience: flexible header matching (tolerate column name variants, RichText cleanup), auto-detect metadata row positions. No structural changes.

### Claude's Discretion
- Specific Sentry DSN configuration and environment setup
- Prisma migration naming and sequencing
- nestjs-cls vs manual AsyncLocalStorage implementation detail
- Error scrubbing rules (which PII fields to strip)
- Import strategy header matching tolerance thresholds

### Deferred Ideas (OUT OF SCOPE)
- **Frontend soft-delete recovery UI** -- List page "show deleted" filter visible only to boss role. Deferred to Phase 13.
- **SalesContractImportStrategy real-file tuning** -- Requires actual sales contract Excel files for testing. Deferred until user tests with real files.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OBS-04 | Request correlation ID via nestjs-cls, propagated through pino logs, Sentry context, and response headers | nestjs-cls v6.2.0 with `generateId: true` + UUID v4; pino integration via `genReqId` factory; Sentry scope via `Sentry.setTag()` |
| DATA-01 | Soft delete (deletedAt) on all business entities via Prisma Client Extensions | `prisma-extension-soft-delete` v2.0.1 or manual `$extends` with query override; 6 models to migrate |
| DATA-02 | Existing unique constraints updated to handle soft-deleted records (MySQL NULL != NULL pattern) | MySQL generated column approach: `unarchived BOOLEAN GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL))` + composite unique index |
| DATA-03 | All existing queries automatically filter deleted records; explicit includeDeleted option available | Prisma Client Extension query override on `findMany`/`findFirst`/`findUnique` injecting `where: { deletedAt: null }` |
| OBS-01 | Sentry error tracking integrated on backend (NestJS exception filter + @SentryExceptionCaptured) | `@sentry/nestjs` v10.46.0; `@SentryExceptionCaptured()` decorator on existing AllExceptionsFilter |
| OBS-02 | Sentry error tracking integrated on frontend (Sentry.ErrorBoundary + React Router integration) | `@sentry/react` v10.46.0; `reactRouterV7BrowserTracingIntegration` for React Router 7 |
| OBS-03 | Sentry beforeSend filters out expected errors (400/401/403/404) and scrubs PII | `beforeSend` callback in `Sentry.init()` checking `hint.originalException` status code; delete PII fields |
| OBS-05 | React ErrorBoundary with graceful fallback UI and Sentry error reporting | Enhance existing `ErrorBoundary.tsx` with `Sentry.captureException()` in `componentDidCatch` |
| DEBT-01 | OrderFormPage inline field validation for 400/422 responses (currently toast-only) | New `mapApiErrorsToFormFields()` utility returning `FieldData[]` for `form.setFields()` |
| DEBT-02 | Fix operatorId: undefined in OrderPaymentService | Use nestjs-cls `ClsService.get('user')` to access request user in service layer, or pass user through controller |
| DEBT-03 | Tune SalesContractImportStrategy for real file formats | Normalize headers via `.trim().toLowerCase()` + alias map; tolerate variable metadata row positions |
</phase_requirements>

## Standard Stack

### Core (New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `nestjs-cls` | 6.2.0 | Request-scoped continuation-local storage | Official NestJS ecosystem library for AsyncLocalStorage; compatible with NestJS 10-11 |
| `@sentry/nestjs` | 10.46.0 | Backend error tracking and APM | Official Sentry SDK for NestJS; provides SentryModule, exception filter decorator, tracing |
| `@sentry/react` | 10.46.0 | Frontend error tracking | Official Sentry SDK for React 18+; provides ErrorBoundary, React Router 7 integration |
| `prisma-extension-soft-delete` | 2.0.1 | Prisma Client Extension for soft delete auto-filtering | Maintained community extension; handles query/mutation interception transparently |

### Supporting (Already Installed)

| Library | Version | Purpose | Integration Point |
|---------|---------|---------|-------------------|
| `nestjs-pino` | 4.5.0 | Structured logging | Correlation ID injected via `genReqId` binding to CLS |
| `pino-http` | 11.0.0 | HTTP request logging | Automatic request context binding |
| `class-validator` | 0.14.3 | DTO validation | Field errors parsed by new frontend utility |
| `antd` | 6.2.2 | UI components | `Form.setFields()` for inline validation display |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `nestjs-cls` | Manual `AsyncLocalStorage` | nestjs-cls provides middleware/guard/interceptor hooks, ID generation, TypeScript types -- no reason to hand-roll |
| `prisma-extension-soft-delete` | Manual `$extends` query override | Library handles edge cases (nested writes, `include`, `select`); manual approach misses these |
| `@sentry/nestjs` | `@sentry/node` + manual integration | `@sentry/nestjs` provides `SentryModule`, decorator, auto-tracing -- no reason to use raw node SDK |

**Installation:**

```bash
# Backend
cd backend && pnpm add nestjs-cls @sentry/nestjs

# Frontend
cd frontend && pnpm add @sentry/react

# Backend (soft delete extension)
cd backend && pnpm add prisma-extension-soft-delete
```

**Version verification:** All versions confirmed via `npm view` on 2026-03-28.

## Architecture Patterns

### Recommended Changes to Project Structure

```
backend/src/
├── instrument.ts                    # NEW: Sentry init (imported first in main.ts)
├── main.ts                          # MODIFIED: import './instrument' at top
├── app.module.ts                    # MODIFIED: add ClsModule, SentryModule
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts # MODIFIED: add Sentry + correlation ID
│   ├── middleware/
│   │   └── correlation-id.middleware.ts  # NEW (optional, may use CLS middleware)
│   └── services/
│       └── ...
├── prisma/
│   ├── prisma.service.ts            # MODIFIED: add $extends for soft delete
│   └── prisma.module.ts
└── order/
    ├── order.controller.ts          # MODIFIED: inject @Req() for payment endpoints
    └── order-payment.service.ts     # MODIFIED: accept operatorId parameter

frontend/src/
├── instrument.ts                    # NEW: Sentry.init() for React
├── main.tsx                         # MODIFIED: import './instrument' at top
├── App.tsx                          # MODIFIED: wrap with Sentry.ErrorBoundary (or keep existing)
├── components/common/
│   └── ErrorBoundary.tsx            # MODIFIED: add Sentry.captureException
└── utils/
    └── errorMessages.ts             # MODIFIED: add mapApiErrorsToFormFields()
```

### Pattern 1: Correlation ID Flow

**What:** Every HTTP request gets a UUID v4 correlation ID that flows through all layers.
**When to use:** Every API request automatically.

```typescript
// backend/src/app.module.ts
import { ClsModule } from 'nestjs-cls';
import { v4 as uuidv4 } from 'crypto';

ClsModule.forRoot({
  middleware: {
    mount: true,
    generateId: true,
    idGenerator: (req: Request) =>
      (req.headers['x-correlation-id'] as string) ?? randomUUID(),
  },
}),

// In LoggerModule configuration -- bind CLS ID to pino context
LoggerModule.forRootAsync({
  imports: [ClsModule],
  inject: [ClsService],
  useFactory: (cls: ClsService) => ({
    pinoHttp: {
      genReqId: () => cls.getId(),
      // ... existing config
    },
  }),
}),
```

Note: `crypto.randomUUID()` is available in Node.js 19+ (built-in). No need for `uuid` package.

### Pattern 2: Soft Delete via Prisma Client Extensions

**What:** Override PrismaService to add soft-delete auto-filtering.
**When to use:** Applied globally in PrismaService constructor.

```typescript
// backend/src/prisma/prisma.service.ts
import { createSoftDeleteExtension } from 'prisma-extension-soft-delete';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private _extended: ReturnType<typeof this.withSoftDelete>;

  constructor() {
    super();
    this._extended = this.withSoftDelete();
  }

  private withSoftDelete() {
    return this.$extends(
      createSoftDeleteExtension({
        models: {
          User: { field: 'deletedAt', createValue: (deleted) => deleted ? new Date() : null },
          Fabric: { field: 'deletedAt', createValue: (deleted) => deleted ? new Date() : null },
          Supplier: { field: 'deletedAt', createValue: (deleted) => deleted ? new Date() : null },
          Customer: { field: 'deletedAt', createValue: (deleted) => deleted ? new Date() : null },
          Product: { field: 'deletedAt', createValue: (deleted) => deleted ? new Date() : null },
          ProductBundle: { field: 'deletedAt', createValue: (deleted) => deleted ? new Date() : null },
        },
      })
    );
  }
  // Note: The extended client type changes -- services use the extended version
}
```

**Critical consideration:** PrismaService currently extends PrismaClient directly. Adding `$extends` returns a _new_ type. The recommended approach is either:
- (A) Store the extended client as a property and expose it as a getter, or
- (B) Use `prisma-extension-soft-delete`'s recommended pattern where PrismaService returns the extended client

Approach B is cleaner but requires updating the DI token type. Approach A is less invasive. Given 32 files import PrismaService, Approach A (internal extended property, delegate methods) is recommended to minimize blast radius.

### Pattern 3: Sentry + AllExceptionsFilter Integration

**What:** Annotate existing filter with `@SentryExceptionCaptured()` decorator.
**When to use:** Global exception filter.

```typescript
// backend/src/common/filters/http-exception.filter.ts
import { SentryExceptionCaptured } from '@sentry/nestjs';
import * as Sentry from '@sentry/nestjs';
import { ClsService } from 'nestjs-cls';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    // ... existing logic ...
    const correlationId = this.cls.getId();

    // Add correlation ID to Sentry scope
    Sentry.getCurrentScope().setTag('correlation_id', correlationId);

    // Add correlation ID to response
    response.setHeader('X-Correlation-ID', correlationId);

    response.status(status).json({
      code: status,
      message,
      ...(errors ? { errors } : {}),
      correlationId,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Pattern 4: operatorId Fix via nestjs-cls

**What:** Access authenticated user from CLS in service layer without passing through parameters.
**When to use:** Services needing request user but not receiving it from controller.

```typescript
// Option A (preferred -- use CLS): In ClsModule setup, store user in CLS
// In JwtAuthGuard or a global interceptor:
this.cls.set('user', request.user);

// In OrderPaymentService:
constructor(private readonly cls: ClsService) {}
// ...
operatorId: this.cls.get('user')?.id ?? null,

// Option B (explicit parameter): Controller passes user to service
// Requires changing service method signatures
updateCustomerPayment(orderId: number, dto: UpdateCustomerPaymentDto, userId: number)
```

Option A (CLS) is preferred because D-15 already mentions nestjs-cls as an option, and the CLS is being added for correlation ID anyway. This avoids modifying service signatures across all payment endpoints.

### Anti-Patterns to Avoid

- **Do NOT use Prisma middleware for soft delete** -- Prisma middleware is deprecated in favor of Client Extensions.
- **Do NOT add `where: { deletedAt: null }` manually to every query** -- the extension handles this automatically.
- **Do NOT import Sentry lazily** -- `instrument.ts` MUST be imported before any other module in `main.ts`.
- **Do NOT use `SentryGlobalFilter` alongside the existing `AllExceptionsFilter`** -- use the `@SentryExceptionCaptured()` decorator on the existing filter instead.
- **Do NOT hard-code Sentry DSN** -- use environment variables (`SENTRY_DSN`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request-scoped storage | Manual AsyncLocalStorage wrapper | `nestjs-cls` | Handles NestJS lifecycle hooks, middleware/guard/interceptor setup, ID generation |
| Soft delete filtering | Manual `where: { deletedAt: null }` in every query | `prisma-extension-soft-delete` | Handles nested queries, `include`/`select`, `findUnique`; covers edge cases |
| Error tracking | Custom error logger + webhook | Sentry (`@sentry/nestjs` + `@sentry/react`) | Dashboard, grouping, alerts, source maps, performance monitoring |
| UUID generation | `uuid` npm package | `crypto.randomUUID()` | Built into Node.js 19+; zero dependencies |

**Key insight:** All four domains (CLS, soft delete, error tracking, UUID) have battle-tested solutions. Custom implementations would miss edge cases and add maintenance burden.

## Common Pitfalls

### Pitfall 1: Prisma Client Extension Type Incompatibility
**What goes wrong:** `PrismaService` extends `PrismaClient`, but `$extends()` returns a different type. Services expecting `PrismaClient` methods break.
**Why it happens:** Prisma Client Extensions create a new wrapper type, not a subclass.
**How to avoid:** Either (a) expose the extended client via a getter method and update service injection, or (b) use the `prisma-extension-soft-delete` library which provides type-safe wrapping. Test by running `pnpm build` after adding the extension.
**Warning signs:** TypeScript errors like "Property does not exist on type" after adding `$extends`.

### Pitfall 2: MySQL Unique Constraint with Soft Delete
**What goes wrong:** After soft-deleting a record, creating a new record with the same unique field (e.g., `fabricCode`) fails because the old row still exists.
**Why it happens:** MySQL unique indexes include soft-deleted rows.
**How to avoid:** Use the generated column pattern: add `unarchived BOOLEAN GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL)) VIRTUAL`, then create a composite unique index on `(field, unarchived)`. MySQL allows multiple `NULL` values in unique indexes, so deleted rows (where `unarchived = NULL`) don't conflict.
**Warning signs:** `P2002` unique constraint violation when creating records after soft-deleting records with the same unique field value.

### Pitfall 3: Sentry instrument.ts Must Be First Import
**What goes wrong:** Sentry doesn't capture errors or creates partial/broken traces.
**Why it happens:** `@sentry/nestjs` patches Node.js modules at import time. If other modules import before Sentry, they get unpatched versions.
**How to avoid:** `import './instrument'` MUST be the very first line in `main.ts`, before even `@nestjs/core`.
**Warning signs:** Sentry dashboard shows no events despite errors occurring; performance traces are incomplete.

### Pitfall 4: isActive to deletedAt Migration Data Loss
**What goes wrong:** Existing `isActive: false` records lose their deletion timestamp context.
**Why it happens:** `isActive` is boolean with no timestamp. Migration must set `deletedAt = NOW()` for `isActive = false` records.
**How to avoid:** Migration SQL: `UPDATE <table> SET deleted_at = NOW() WHERE is_active = false;` Run this BEFORE dropping the `isActive` column.
**Warning signs:** Soft-deleted records appear with `deletedAt = null` (treated as active) after migration.

### Pitfall 5: Frontend ErrorBoundary Class Component + Sentry.ErrorBoundary Conflict
**What goes wrong:** Double error reporting or broken fallback UI.
**Why it happens:** Using both `Sentry.ErrorBoundary` wrapper AND the existing class-based `ErrorBoundary` creates nested error boundaries.
**How to avoid:** Enhance the existing `ErrorBoundary.tsx` by adding `Sentry.captureException(error)` in `componentDidCatch`. Do NOT wrap with `Sentry.ErrorBoundary` -- that's for replacing, not wrapping.
**Warning signs:** Errors reported twice in Sentry; fallback UI doesn't render because outer boundary catches first.

### Pitfall 6: AllExceptionsFilter DI -- ClsService Injection
**What goes wrong:** `AllExceptionsFilter` currently uses `new Logger()` statically, not constructor injection.
**Why it happens:** The filter is registered via `APP_FILTER` with `useClass`, which does support DI, but the current implementation doesn't inject anything via constructor.
**How to avoid:** Add `ClsService` to constructor parameters. Since `ClsModule` is registered globally with `forRoot()`, it will be available for injection. Verify by checking the filter receives the correlation ID in tests.
**Warning signs:** `ClsService` is `undefined` in the filter; correlation ID missing from error responses.

### Pitfall 7: 252 isActive Occurrences Need Careful Audit
**What goes wrong:** Some `isActive` references in services/controllers/tests break after migration.
**Why it happens:** 252 occurrences across 32 files. Some are query filters (`where: { isActive: true }`), some are in tests, some in DTOs.
**How to avoid:** After adding the Prisma extension, most `where: { isActive: true }` filters become redundant (auto-filtered). Remove them systematically. For tests, update mock data. For DTOs (e.g., `QuerySupplierDto` has `isActive` filter), decide if the filter should remain as an explicit parameter or be removed.
**Warning signs:** Tests fail because they mock `isActive: true` but the field no longer exists.

## Code Examples

### Correlation ID -- instrument.ts (Backend)

```typescript
// backend/src/instrument.ts
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  beforeSend(event, hint) {
    const exception = hint?.originalException;
    // Filter out expected HTTP errors
    if (exception && typeof exception === 'object' && 'status' in exception) {
      const status = (exception as { status: number }).status;
      if ([400, 401, 403, 404].includes(status)) {
        return null; // Drop the event
      }
    }
    // Scrub PII
    if (event.user) {
      delete event.user.email;
    }
    // Remove phone numbers from extra context
    if (event.extra) {
      for (const key of Object.keys(event.extra)) {
        if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) {
          delete event.extra[key];
        }
      }
    }
    return event;
  },
});
```

### Frontend Sentry Init -- instrument.ts

```typescript
// frontend/src/instrument.ts
import * as Sentry from '@sentry/react';
import React from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
  ],
  tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,
});
```

### mapApiErrorsToFormFields Utility (DEBT-01)

```typescript
// frontend/src/utils/errorMessages.ts (addition)
import type { FieldData } from 'antd/es/form/interface';

/**
 * Map backend validation error response to Ant Design Form field errors.
 * Handles both single-message and array-message formats from class-validator.
 *
 * Backend returns either:
 * - { message: "field should not be empty" }
 * - { message: ["field1 error", "field2 error"] }
 * - { errors: [{ property: "field", constraints: { ... } }] }
 */
export function mapApiErrorsToFormFields(
  apiError: ApiError
): FieldData[] {
  const fields: FieldData[] = [];
  const messages = Array.isArray(apiError.message)
    ? apiError.message
    : [apiError.message];

  for (const msg of messages) {
    if (typeof msg !== 'string') continue;
    const parsed = parseFieldError(msg);
    if (parsed) {
      fields.push({ name: parsed.field, errors: [parsed.message] });
    }
  }
  return fields;
}
```

### MySQL Generated Column for Unique Constraint (DATA-02)

```sql
-- Prisma migration SQL (example for Fabric)
ALTER TABLE fabrics
  ADD COLUMN deleted_at DATETIME(3) NULL DEFAULT NULL;

-- Migrate existing soft-deleted records
UPDATE fabrics SET deleted_at = NOW(3) WHERE is_active = false;

-- Add generated column for unique constraint compatibility
ALTER TABLE fabrics
  ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL)) VIRTUAL;

-- Drop old unique index and create new composite one
ALTER TABLE fabrics
  DROP INDEX fabrics_fabric_code_key,
  ADD UNIQUE INDEX fabrics_fabric_code_unarchived_key (fabric_code, unarchived);

-- After verification, drop old column
ALTER TABLE fabrics DROP COLUMN is_active;
```

**Important:** Prisma doesn't natively support `GENERATED ALWAYS AS` columns in the schema. This must be done via raw SQL in a migration. The generated column should be marked with `@ignore` or handled as a DB-only column.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma middleware for soft delete | Prisma Client Extensions | Prisma 4.16+ (2023) | Middleware deprecated; extensions are the official path |
| `isActive: boolean` soft delete | `deletedAt: DateTime?` | Industry standard | Timestamps provide audit trail; NULL != NULL enables unique index tricks |
| Manual AsyncLocalStorage | `nestjs-cls` library | 2023+ | Type-safe, lifecycle-aware, ID generation built-in |
| `@ntegral/nestjs-sentry` (community) | `@sentry/nestjs` (official) | Sentry v8+ (2024) | Official SDK with NestJS-specific module, filter decorator, auto-tracing |

**Deprecated/outdated:**
- `prisma-soft-delete-middleware` -- superseded by `prisma-extension-soft-delete` (same author)
- `@ntegral/nestjs-sentry` -- superseded by official `@sentry/nestjs`
- React class-based ErrorBoundary as sole approach -- Sentry provides its own, but in this project we enhance the existing one

## Open Questions

1. **Prisma Generated Column Compatibility**
   - What we know: MySQL supports `GENERATED ALWAYS AS` virtual columns, and they work with unique indexes
   - What's unclear: Prisma schema introspection may not recognize generated columns; they may need `@ignore` annotation or manual SQL-only management
   - Recommendation: Use raw SQL in migration for generated columns; do NOT represent them in `schema.prisma`. Prisma `@@unique` constraint must be managed at DB level, not schema level. Test with `prisma db pull` to verify introspection behavior.

2. **PrismaService Extended Client Type**
   - What we know: `$extends()` returns a new type that includes extension methods
   - What's unclear: Whether the `prisma-extension-soft-delete` extension's type properly delegates all standard Prisma methods
   - Recommendation: Start with the library approach. If type issues arise, fall back to manual `$extends` with explicit type casting. Run `pnpm build` immediately after integration to catch type errors.

3. **CLS and Sentry Scope Interaction**
   - What we know: Both `nestjs-cls` and Sentry have their own scope management (AsyncLocalStorage-based)
   - What's unclear: Whether `Sentry.getCurrentScope()` inside the exception filter correctly picks up the scope set in middleware
   - Recommendation: Use `Sentry.withScope()` explicitly in the filter to ensure correlation ID is attached. Test with a deliberate 500 error.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Assumed | System | -- |
| pnpm | Package management | Assumed | System | -- |
| MySQL 8.0 | Database | Via Docker | 8.0 | -- |
| Redis | Caching | Via Docker | 7-alpine | -- |
| Sentry DSN | Error tracking | Not yet provisioned | -- | Set `enabled: false`; features work but don't report |

**Missing dependencies with no fallback:**
- None -- all new packages are npm installable

**Missing dependencies with fallback:**
- Sentry DSN: Not provisioned yet. Backend/frontend init both check `process.env.SENTRY_DSN` / `import.meta.env.VITE_SENTRY_DSN` and disable when empty. Implementation can proceed without a DSN; error tracking activates when DSN is added to environment.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (Backend) | Jest 30.0.0 |
| Framework (Frontend) | Vitest 4.0.18 |
| Config file (Backend) | `backend/package.json` (jest key) |
| Config file (Frontend) | `frontend/vite.config.ts` |
| Quick run command (Backend) | `cd backend && pnpm test -- --testPathPattern=<module>` |
| Quick run command (Frontend) | `cd frontend && pnpm test -- --testPathPattern=<file>` |
| Full suite command (Backend) | `cd backend && pnpm build && pnpm test && pnpm lint` |
| Full suite command (Frontend) | `cd frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OBS-04 | Correlation ID in response headers and pino logs | unit + E2E | `cd backend && pnpm test -- --testPathPattern=correlation` | Wave 0 |
| DATA-01 | Soft delete sets deletedAt, filtered from queries | unit | `cd backend && pnpm test -- --testPathPattern=soft-delete` | Wave 0 |
| DATA-02 | Re-create entity with same unique field after soft delete | E2E | `cd backend && pnpm test:e2e -- --testPathPattern=soft-delete` | Wave 0 |
| DATA-03 | findMany/findFirst auto-exclude deleted records | unit | `cd backend && pnpm test -- --testPathPattern=soft-delete` | Wave 0 |
| OBS-01 | Unhandled 500 captured by Sentry | unit (mock) | `cd backend && pnpm test -- --testPathPattern=exception.filter` | Existing (modify) |
| OBS-02 | Frontend React crash reports to Sentry | unit (mock) | `cd frontend && pnpm test -- --testPathPattern=ErrorBoundary` | Existing (modify) |
| OBS-03 | 4xx errors NOT sent to Sentry | unit (mock) | `cd backend && pnpm test -- --testPathPattern=sentry` | Wave 0 |
| OBS-05 | ErrorBoundary shows fallback + reports to Sentry | unit | `cd frontend && pnpm test -- --testPathPattern=ErrorBoundary` | Existing (modify) |
| DEBT-01 | Form field errors rendered inline for 400/422 | unit | `cd frontend && pnpm test -- --testPathPattern=errorMessages` | Existing (modify) |
| DEBT-02 | operatorId populated in PaymentRecord | unit | `cd backend && pnpm test -- --testPathPattern=order-payment` | Existing (modify) |
| DEBT-03 | Header matching tolerates column name variants | unit | `cd backend && pnpm test -- --testPathPattern=sales-contract` | Existing (modify) |

### Sampling Rate
- **Per task commit:** Relevant module test (`pnpm test -- --testPathPattern=<module>`)
- **Per wave merge:** Full suite (`pnpm build && pnpm test && pnpm lint`)
- **Phase gate:** Full backend + frontend suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/common/filters/__tests__/correlation-id.spec.ts` -- covers OBS-04 (correlation ID in response headers)
- [ ] `backend/src/prisma/__tests__/soft-delete.spec.ts` -- covers DATA-01, DATA-03 (auto-filter behavior)
- [ ] `backend/test/soft-delete.e2e-spec.ts` -- covers DATA-02 (unique constraint after soft delete)
- [ ] `backend/src/common/filters/__tests__/sentry-filter.spec.ts` -- covers OBS-03 (4xx filtering)

## Project Constraints (from CLAUDE.md)

- **Language**: Technical discussion in Chinese; code comments in English only
- **API path**: `/api/v1` (not `/api`)
- **Commit format**: `{type}({phase}-{plan}): {description}` (GSD format)
- **Verification loop**: `pnpm build && pnpm test && pnpm lint` (backend); `pnpm build && pnpm test && pnpm lint && pnpm typecheck` (frontend)
- **Testing**: Backend = Jest + SuperTest; Frontend = Vitest + @testing-library/react
- **Code style**: TypeScript strict mode; `unknown` not `any`; class-validator for DTOs
- **Security**: No hardcoded secrets; Sentry DSN via environment variable
- **Git**: Never push directly to main; feature branch per phase
- **Current branch**: `feature/gsd-12-foundation-observability-quick-wins` (already created)

## Sources

### Primary (HIGH confidence)
- [Sentry NestJS Official Docs](https://docs.sentry.io/platforms/javascript/guides/nestjs/) - Setup, SentryModule, exception filter decorator
- [Sentry React Official Docs](https://docs.sentry.io/platforms/javascript/guides/react/) - Setup, ErrorBoundary, React Router integration
- [Sentry Filtering Docs](https://docs.sentry.io/platforms/javascript/guides/nestjs/configuration/filtering/) - beforeSend callback pattern
- [NestJS CLS Official Docs](https://papooch.github.io/nestjs-cls/features-and-use-cases/request-id) - Request ID generation, ClsService API
- [prisma-extension-soft-delete GitHub](https://github.com/olivierwilkinson/prisma-extension-soft-delete) - Configuration, deletedAt field, limitations
- npm registry - Version verification for all packages (2026-03-28)

### Secondary (MEDIUM confidence)
- [PHP Architect - Advanced Unique Index Patterns](https://www.phparch.com/2026/02/advanced-unique-index-patterns-for-soft-deletes-mysql-and-postgresql/) - MySQL generated column pattern for soft delete + unique constraint
- [Aleksandra Sikora - MySQL nulls and unique constraint](https://www.aleksandra.codes/mysql-nulls) - MySQL NULL behavior in unique indexes
- [Frank's Dev Blog - True Soft Deletion in Prisma](https://matranga.dev/true-soft-deletion-in-prisma-orm/) - Prisma Client Extensions soft delete implementation pattern

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified via npm registry; peer dependencies confirmed compatible
- Architecture: HIGH - Patterns based on official documentation and existing codebase analysis
- Pitfalls: HIGH - Identified from codebase analysis (252 isActive occurrences) and known MySQL limitations
- Soft delete unique constraint: MEDIUM - Generated column approach is well-documented but Prisma schema integration is an open question

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable libraries, 30-day window)
