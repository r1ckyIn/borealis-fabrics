# Coding Conventions

**Analysis Date:** 2026-04-16

## Code Comments

All code comments must be in **pure English**. No Chinese, no bilingual, no exceptions.
Rule source: `.claude/rules/02-standards/code-comments.md` and `.claude/rules/00-project/coding-standards.md`.

```typescript
// ✅ Correct
// Create user with validation
// ❌ Wrong
// 创建用户
```

## Formatting

**Backend (`.prettierrc`):**
```json
{ "singleQuote": true, "trailingComma": "all" }
```
ESLint config: `backend/eslint.config.mjs` — uses `typescript-eslint recommendedTypeChecked` + prettier plugin.
Key rules: `@typescript-eslint/no-explicit-any: off` globally, `warn` in spec files.
Line ending: `"prettier/prettier": ["error", { "endOfLine": "auto" }]`

**Frontend (`package.json#prettier`):**
```json
{ "singleQuote": true, "trailingComma": "all", "printWidth": 80, "semi": true, "tabWidth": 2 }
```
ESLint config: `frontend/eslint.config.js` — uses `tseslint.configs.recommended` + `reactHooks.configs.flat.recommended`.

## TypeScript Strict Mode

**Backend** (`backend/tsconfig.json`): `"strict": true`

**Frontend** (`frontend/tsconfig.app.json`): `"strict": true` plus:
- `"noUnusedLocals": true`
- `"noUnusedParameters": true`
- `"erasableSyntaxOnly": true` — TypeScript `enum` declarations are **forbidden**; use `as const` objects instead

Frontend enum pattern required by `erasableSyntaxOnly`:
```typescript
// frontend/src/types/enums.types.ts — the mandatory pattern
export const OrderItemStatus = {
  INQUIRY: 'INQUIRY',
  PENDING: 'PENDING',
} as const;
export type OrderItemStatus = (typeof OrderItemStatus)[keyof typeof OrderItemStatus];
```

**Backend uses native TypeScript enums** (no `erasableSyntaxOnly`):
```typescript
// backend/src/supplier/dto/create-supplier.dto.ts
export enum SupplierStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ELIMINATED = 'eliminated',
}
```

## Naming Conventions

**Files:**

| Type | Pattern | Example |
|------|---------|---------|
| NestJS Module | `<name>.module.ts` | `supplier.module.ts` |
| NestJS Service | `<name>.service.ts` | `supplier.service.ts` |
| NestJS Controller | `<name>.controller.ts` | `supplier.controller.ts` |
| DTO | `<action>-<name>.dto.ts` | `create-supplier.dto.ts` |
| Test (unit) | `<name>.<type>.spec.ts` | `supplier.service.spec.ts` |
| Test (E2E) | `<name>.e2e-spec.ts` | `supplier.e2e-spec.ts` |
| React Component | `PascalCase.tsx` | `FabricList.tsx` |
| React Hook | `use<Name>.ts` | `useFabrics.ts` |
| API module | `<name>.api.ts` | `fabric.api.ts` |
| Type file | `<name>.types.ts` | `fabric.types.ts` |

**Identifiers:**

| Kind | Rule | Example |
|------|------|---------|
| Class/Interface | PascalCase | `SupplierService` |
| Method/Variable | camelCase | `findById` |
| Constant | SCREAMING_SNAKE_CASE | `MAX_PAGE_SIZE` |
| DTO property | camelCase | `supplierName` |
| Backend enum value | SCREAMING_SNAKE_CASE | `OrderItemStatus.PENDING` |
| Frontend const-enum value | SCREAMING_SNAKE_CASE | `OrderItemStatus.PENDING` |

**Database columns:** camelCase via Prisma (maps to snake_case in MySQL).

**API paths:** `GET /api/v1/suppliers`, `PATCH /api/v1/suppliers/:id`. Prefix is always `/api/v1` — never `/api`.
Confirmed in `frontend/src/utils/constants.ts`:
```typescript
export const API_BASE_URL = '/api/v1';
```

## DTO Patterns

Three standard DTO types per module:

```typescript
// Create DTO — uses class-validator decorators
// backend/src/supplier/dto/create-supplier.dto.ts
export class CreateSupplierDto {
  @Transform(trimTransform)      // always trim strings first
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyName!: string;

  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus = SupplierStatus.ACTIVE;
}

// Update DTO — always PartialType(Create)
// backend/src/supplier/dto/update-supplier.dto.ts
export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

// Query DTO — always extends PaginationDto
// backend/src/supplier/dto/query-supplier.dto.ts
export class QuerySupplierDto extends PaginationDto { ... }
```

**Mandatory string transform:**
```typescript
// backend/src/common/transforms/index.ts
export const trimTransform = ({ value }: { value: unknown }): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;
```
Apply `@Transform(trimTransform)` to every string DTO field before `@IsString()`.

**Boolean query param transform** — query params arrive as strings:
```typescript
@Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
@IsBoolean()
includeDeleted?: boolean;
```

**Address as nested JSON** (`backend/src/customer/dto/create-customer.dto.ts`):
```typescript
@IsArray()
@ValidateNested({ each: true })
@Type(() => AddressDto)
addresses?: AddressDto[];
```
Stored as JSON column in MySQL. Frontend type: `Address` interface in `frontend/src/types/entities.types.ts`.

**PaginationDto base** (`backend/src/common/utils/pagination.ts`): provides `page`, `pageSize`, `sortBy`, `sortOrder`. All query DTOs extend this.

**Whitelist sort fields** — always define a `SortField` enum and `@IsEnum(SortField)` on `sortBy` to prevent arbitrary column injection.

**ValidationPipe config** (applied globally in `main.ts` and E2E setup):
```typescript
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
})
```

## isActive vs status

**Two separate concepts — never conflate:**

- `isActive` / `deletedAt` = soft delete marker. `isActive: false` means the record is archived. Managed by `prisma-extension-soft-delete` on the `deletedAt` field. Soft-deletable models: User, Fabric, Supplier, Customer, Product, ProductBundle.
- `status` = business workflow state (e.g. `OrderItemStatus.PENDING`, `SupplierStatus.ACTIVE`).

**Soft delete via Prisma extension** (`backend/src/prisma/prisma.service.ts`):
```typescript
// Normal queries auto-filter deletedAt != null via extension
this.prisma.supplier.findMany(...)  // excludes deleted

// Admin queries bypass via $raw
this.prisma.$raw.supplier.findMany(...)  // includes deleted
```

**Physical delete with soft-delete fallback pattern:**
- No relations → physical delete (`supplier.delete()` — extension intercepts to set `deletedAt`)
- Has relations + `force=false` → throw `ConflictException`
- Has relations + `force=true` → soft delete

## Error Handling

**NestJS standard exceptions only:**
```typescript
throw new NotFoundException('Supplier with ID 999 not found');
throw new ConflictException('Supplier with company name "X" already exists');
throw new BadRequestException('Invalid input');
```

**Global exception filter** (`backend/src/common/filters/http-exception.filter.ts`):
- Catches all exceptions including Prisma errors (P2002/P2003/P2025)
- In production: sanitizes error details
- Attaches `correlationId` from CLS to every error response header and body
- Captures to Sentry via `@SentryExceptionCaptured()`
- Error response shape: `{ code, message, errors?, correlationId, path, timestamp }`

**Success response shape** (via `TransformInterceptor` in `backend/src/common/interceptors/transform.interceptor.ts`):
```typescript
{ code: number, message: 'success', data: T }
```

## Audit Logging

Apply `@Audited()` decorator on every CUD controller method. Decorator defined in `backend/src/audit/decorators/audited.decorator.ts`:

```typescript
// backend/src/supplier/supplier.controller.ts
@Post()
@Audited({ entityType: 'Supplier', action: 'create' })
create(@Body() dto: CreateSupplierDto) { ... }

@Patch(':id')
@Audited({ entityType: 'Supplier', action: 'update' })
update(@Param('id', ParseIntPipe) id: number, ...) { ... }

@Delete(':id')
@Audited({ entityType: 'Supplier', action: 'delete' })
remove(@Param('id', ParseIntPipe) id: number, ...) { ... }

@Patch(':id/restore')
@Audited({ entityType: 'Supplier', action: 'restore' })
restore(@Param('id', ParseIntPipe) id: number) { ... }
```

`AuditInterceptor` (`backend/src/audit/audit.interceptor.ts`) is registered globally in AppModule after `UserClsInterceptor`. It captures before/after state automatically. Audit writes are fire-and-forget — never block main request.

## Logging

**Backend:** `nestjs-pino` via `LoggerModule` in `backend/src/app.module.ts`. Services use NestJS `Logger` class:
```typescript
private readonly logger = new Logger(SupplierService.name);
this.logger.log('Some info message');
this.logger.error('Failed to write audit log', error);
```

In production: logs ship to Grafana Loki via `pino-loki`. In development: `pino-pretty`.
Slow query detection (`backend/src/prisma/prisma.service.ts`): queries over `SLOW_QUERY_THRESHOLD_MS` (default 200ms) emit a warn log tagged `SlowQuery`.

## Encoding Format

Business entity codes: `BF-YYMM-NNNN` (4-digit sequence). Generated via Redis INCR with DB UNIQUE as fallback in `backend/src/common/services/code-generator.service.ts`.

## Chinese Labels (User-Facing Text)

All user-facing text in React uses Chinese. Each enum has a companion label map:

```typescript
// frontend/src/types/enums.types.ts
export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  [OrderItemStatus.INQUIRY]: '询价中',
  [OrderItemStatus.PENDING]: '待下单',
  [OrderItemStatus.ORDERED]: '已下单',
  // ...
};
export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  [SupplierStatus.ACTIVE]: '活跃',
  // ...
};
```

Helper: `getStatusLabel(status)` from `frontend/src/utils/statusHelpers.ts`.
Ant Design locale: `<ConfigProvider locale={zhCN}>` in all test providers and app root.

When adding a new enum status: add entry to the label map immediately. Tests assert Chinese label text.

## Import Organization (Frontend)

Path alias: `@/` maps to `frontend/src/`. Configured in `frontend/tsconfig.app.json` and `frontend/vite.config.ts`.

```typescript
// 1. External packages
import { useState } from 'react';
import { Table } from 'antd';
// 2. Internal types and utils
import type { Fabric } from '@/types';
import { API_BASE_URL } from '@/utils/constants';
// 3. Internal components and hooks
import { FabricForm } from '@/components/forms/FabricForm';
import { useFabrics } from '@/hooks/queries/useFabrics';
```

## Excel Import Conflict Rule

When importing Excel data, skip records that already exist — never overwrite. Applies to all import strategies in `backend/src/import/strategies/`.

## Validation Commands

Must all pass before committing:

**Backend:**
```bash
cd backend && pnpm build && pnpm test && pnpm lint && npx tsc --noEmit
```

**Frontend:**
```bash
cd frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

`npx tsc --noEmit` is mandatory — local `pnpm build` may pass while CI fails.

## CI TypeScript Pitfalls

1. **Node 22 Buffer generics**: `Buffer.from(arrayBuffer)` returns `Buffer<ArrayBufferLike>`. Cast with `buffer as unknown as ArrayBuffer`. See `backend/test/helpers/mock-builders.ts:loadTestWorkbook`.
2. **Constructor changes**: After modifying a constructor signature, run `grep -r "new ClassName"` to find all call sites.
3. **DTO mock desync**: After adding a DTO field, run `grep -r "MockDto\|: DtoName ="` to find all mock objects needing update.
4. **async→sync refactor**: After changing a service method from async to sync, grep for `await service.method` and `mockResolvedValue` — both must be updated in tests and controllers.

## Commit Format

Format enforced by GSD community hook (`hooks.community: true` in `.planning/config.json`):
```
<type>(<phase>-<plan>): <description>
```
Example: `feat(17-1): add HTTPS cookie flag environment variable`
Co-Authored-By trailers are blocked by `.claude/hooks/validate-commit-msg.sh`.

---

*Convention analysis: 2026-04-16*
