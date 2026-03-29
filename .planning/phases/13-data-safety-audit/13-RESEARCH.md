# Phase 13: Data Safety & Audit - Research

**Researched:** 2026-03-29
**Domain:** Audit logging, data export, RBAC extension, soft-delete recovery UI, DB backup
**Confidence:** HIGH

## Summary

Phase 13 covers six requirements (DATA-04 through DATA-09) spanning audit logging infrastructure, frontend audit log page with RBAC, data export to Excel, soft-delete recovery UI (deferred from Phase 12), and database backup verification. The project already has strong foundations: `nestjs-cls` provides correlation IDs, `RolesGuard` with `BOSS_WEWORK_IDS` handles boss role checks, ExcelJS 4.4.0 is installed for import (reusable for export), and all 6 entity types have backend restore endpoints (`PATCH /:id/restore`) with boss-only guards.

The main technical challenges are: (1) designing the audit interceptor to capture before/after state for updates (requires fetching the entity before the service method executes), (2) exposing role information to the frontend (currently the `/auth/me` response has no role field -- the RolesGuard only checks server-side), and (3) the AuditLog Prisma model design with appropriate indexing for query performance on what will become a high-volume table.

**Primary recommendation:** Use a NestJS interceptor + custom `@Audited()` decorator approach. The interceptor captures request metadata (user, IP, correlation ID) and the decorator marks which controller methods to audit and provides entity type metadata. For updates, fetch the entity before the handler executes, then diff after. Store audit logs in a dedicated `audit_logs` MySQL table with composite indexes on `(entityType, createdAt)` and `(userId, createdAt)`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Add `DEV_WEWORK_IDS` environment variable alongside existing `BOSS_WEWORK_IDS`. RolesGuard checks both sets for admin-level roles.
- **D-02:** Developer role has identical permissions to boss (audit log access, soft-delete restore, all admin operations).
- **D-03:** Extend `@Roles('boss')` guard to accept `@Roles('boss', 'developer')` -- both check their respective env var ID sets.
- **D-04:** NestJS interceptor captures all CUD operations automatically. Store: userId, action (create/update/delete), entityType, entityId, changes diff, IP, correlationId, timestamp.
- **D-05:** Changes diff format: field-level comparison -- `{ field: { old: value, new: value } }` for updates. Create operations store all initial field values. Delete operations store entity summary.
- **D-06:** Consume correlation ID from nestjs-cls (already available from Phase 12).
- **D-07:** New sidebar menu item "审计日志" -- accessible only to boss/developer roles. Hidden from other users.
- **D-08:** List view with 5 filters: operator (dropdown), action type (create/update/delete), entity type (dropdown), time range (date picker), keyword search (text input searching changes content and entity names).
- **D-09:** Detail view: field-level change comparison table (field name + old value -> new value). Create shows all fields, delete shows entity summary.
- **D-10:** Centralized export page in sidebar ("数据导出") -- all users can access.
- **D-11:** User selects entity type, then chooses which fields to include in the export via checkbox list.
- **D-12:** Export uses ExcelJS (already available from import module). Backend generates Excel file, frontend triggers download.
- **D-13:** All 6 entity list pages (fabric, product, supplier, customer, order, quote) get a "显示已删除" toggle switch, visible only to boss/developer roles.
- **D-14:** Deleted items shown with visual distinction (e.g., row styling). Each deleted item has a "恢复" (restore) button.
- **D-15:** Restore calls existing backend `PATCH /:id/restore` endpoints (already implemented in Phase 12).
- **D-16:** Verify CDB automatic backup is working. Create supplementary mysqldump-to-COS shell script with cron schedule and retention policy.

### Claude's Discretion
- Audit log Prisma model design and indexing strategy
- NestJS interceptor vs decorator implementation approach (or hybrid)
- ExcelJS export template and formatting
- Backup script scheduling and retention period
- Frontend component architecture for audit log page
- Keyword search implementation (SQL LIKE vs full-text index)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-04 | Audit log records all CUD operations with userId, action, entityType, entityId, changes, IP, timestamp | Interceptor + @Audited decorator pattern; AuditLog Prisma model; field-level diff utility |
| DATA-05 | Audit log consumes correlation ID from request context | nestjs-cls `cls.getId()` already available from Phase 12; store in audit record |
| DATA-06 | Audit log frontend page with list, filtering, and detail view | New AuditLogPage + AuditLogDetailPage; 5 filters; Ant Design Table + Descriptions |
| DATA-07 | RBAC -- audit log accessible only to boss and developer roles | Extend RolesGuard for DEV_WEWORK_IDS; expose `isAdmin` flag via /auth/me; conditional sidebar items |
| DATA-08 | Data export to Excel for all entities via centralized ExportModule | ExcelJS 4.4.0 reuse; backend ExportController + ExportService; field-configurable export |
| DATA-09 | CDB backup verified + supplementary mysqldump-to-COS script | Shell script with cron; COS CLI upload; retention policy |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nestjs-cls | 6.2.0 | Request-scoped correlation ID and user context | Already integrated in Phase 12; provides cls.getId() for correlation ID |
| exceljs | 4.4.0 | Excel file generation for data export | Already installed for import module; full-featured Excel manipulation |
| @prisma/client | 6.19.2 | ORM for AuditLog model and entity queries | Project standard ORM |
| antd | 6.2.2 | UI components for audit log page, export page, filters | Project standard UI library |
| @tanstack/react-query | 5.90.20 | Server state for audit log queries | Project standard data fetching |
| dayjs | 1.11.19 | Date formatting and range picker support | Already used across frontend |

### No New Dependencies Required
This phase does not require any new npm packages. All functionality can be built with the existing stack:
- Audit interceptor: NestJS core `@nestjs/common` (already installed)
- Excel export: `exceljs` (already installed)
- CLS access: `nestjs-cls` (already installed)
- Backup script: Pure shell script with `mysqldump` and `coscli` (Tencent COS CLI)

## Architecture Patterns

### Recommended Project Structure

```
backend/src/
├── audit/                      # NEW: AuditModule
│   ├── audit.module.ts
│   ├── audit.service.ts        # CRUD for audit logs
│   ├── audit.controller.ts     # GET /audit-logs, GET /audit-logs/:id
│   ├── audit.interceptor.ts    # Global interceptor for CUD capture
│   ├── decorators/
│   │   └── audited.decorator.ts  # @Audited('Supplier') decorator
│   ├── dto/
│   │   ├── query-audit-log.dto.ts
│   │   └── index.ts
│   └── audit.service.spec.ts
├── export/                     # NEW: ExportModule
│   ├── export.module.ts
│   ├── export.service.ts       # Excel generation logic
│   ├── export.controller.ts    # GET /export/:entityType
│   ├── dto/
│   │   ├── export-query.dto.ts
│   │   └── index.ts
│   └── export.service.spec.ts
├── common/
│   └── guards/
│       └── roles.guard.ts      # MODIFIED: Add DEV_WEWORK_IDS support

frontend/src/
├── pages/
│   ├── audit/                  # NEW: Audit log pages
│   │   ├── AuditLogPage.tsx
│   │   └── AuditLogDetailPage.tsx
│   └── export/                 # NEW: Data export page
│       └── ExportPage.tsx
├── api/
│   ├── audit.ts                # NEW: Audit log API
│   └── export.ts               # NEW: Export API
├── hooks/
│   └── queries/
│       ├── useAuditLogs.ts     # NEW
│       └── useExport.ts        # NEW
├── types/
│   └── api.types.ts            # MODIFIED: Add AuthUser.isAdmin, AuditLog types

scripts/
└── backup/                     # NEW: DB backup scripts
    └── mysqldump-to-cos.sh
```

### Pattern 1: Hybrid Interceptor + Decorator for Audit Logging

**What:** Use a NestJS interceptor that checks for a custom `@Audited()` decorator on the handler. Only methods with the decorator are audited. The decorator provides entity type and action metadata.

**When to use:** When you need selective, automatic audit capture without modifying service code.

**Why hybrid (not pure interceptor):** A pure interceptor that captures all POST/PATCH/DELETE would also capture login, import, health check, etc. The decorator gives explicit control over which endpoints are audited.

**Example:**
```typescript
// decorators/audited.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMetadata {
  entityType: string;
  action: 'create' | 'update' | 'delete' | 'restore';
  /** Entity ID param name in route params (default: 'id') */
  idParam?: string;
}

export const Audited = (metadata: AuditMetadata) =>
  SetMetadata(AUDIT_KEY, metadata);
```

```typescript
// Usage on controller
@Patch(':id')
@Audited({ entityType: 'Supplier', action: 'update' })
update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto) {
  return this.supplierService.update(id, dto);
}
```

```typescript
// audit.interceptor.ts (simplified)
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly cls: ClsService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const metadata = this.reflector.get<AuditMetadata>(
      AUDIT_KEY,
      context.getHandler(),
    );
    if (!metadata) return next.handle(); // Not audited

    const request = context.switchToHttp().getRequest();
    const entityId = request.params[metadata.idParam || 'id'];

    // For updates/deletes: fetch before-state
    let beforeState: Record<string, unknown> | null = null;
    if ((metadata.action === 'update' || metadata.action === 'delete') && entityId) {
      beforeState = await this.fetchEntity(metadata.entityType, +entityId);
    }

    return next.handle().pipe(
      tap(async (result) => {
        const user = this.cls.get<RequestUser>('user');
        const correlationId = this.cls.getId();
        const ip = request.ip || request.headers['x-forwarded-for'];

        const afterState = metadata.action === 'delete'
          ? beforeState  // Delete: store entity summary
          : result;      // Create/Update: store result

        const changes = this.buildChanges(metadata.action, beforeState, afterState);
        const resolvedEntityId = entityId ? +entityId : (result as { id?: number })?.id;

        await this.auditService.createLog({
          userId: user?.id ?? null,
          userName: user?.name ?? 'system',
          action: metadata.action,
          entityType: metadata.entityType,
          entityId: resolvedEntityId ?? 0,
          changes,
          ip: ip ?? '',
          correlationId,
        });
      }),
    );
  }
}
```

### Pattern 2: Role Exposure to Frontend

**What:** The backend currently only checks roles server-side (RolesGuard). The frontend has no concept of "boss" or "developer" role. To conditionally show/hide sidebar items and soft-delete toggles, the frontend needs role information.

**Recommended approach:** Add an `isAdmin` boolean field to the `/auth/me` response. Computed server-side by checking if the user's weworkId is in BOSS_WEWORK_IDS or DEV_WEWORK_IDS. This avoids exposing the raw ID lists to the client.

```typescript
// Backend: UserResponseDto
export class UserResponseDto {
  id!: number;
  weworkId!: string;
  name!: string;
  avatar?: string;
  mobile?: string;
  isAdmin!: boolean;  // NEW: true if boss or developer
  createdAt!: Date;
  updatedAt!: Date;
}

// AuthService.toUserResponseDto
dto.isAdmin = this.isBossOrDeveloper(user.weworkId);
```

```typescript
// Frontend: AuthUser type
export interface AuthUser {
  id: number;
  weworkId: string;
  name: string;
  avatar?: string;
  mobile?: string;
  isAdmin: boolean;  // NEW
  createdAt: string;
  updatedAt: string;
}
```

### Pattern 3: Soft-Delete Recovery on List Pages

**What:** Add `includeDeleted` query parameter to existing list endpoints. When true, include soft-deleted records (marked by non-null `deletedAt`). Frontend shows a toggle switch visible only to admin users.

**Backend approach:** Add `includeDeleted` boolean to each entity's QueryDto. When true, use raw SQL or bypass the Prisma soft-delete extension to include records with `deletedAt IS NOT NULL`. Mark deleted records in the response with a `deletedAt` field.

**Frontend approach:**
```typescript
// On each list page (e.g., FabricListPage)
const { user } = useAuthStore();
const [showDeleted, setShowDeleted] = useState(false);

// In toolbar, conditionally render:
{user?.isAdmin && (
  <Switch
    checkedChildren="显示已删除"
    unCheckedChildren="仅显示活跃"
    checked={showDeleted}
    onChange={setShowDeleted}
  />
)}

// Pass to query:
const combinedParams = { ...searchParams, ...queryParams, includeDeleted: showDeleted };

// Table row styling for deleted items:
rowClassName={(record) => record.deletedAt ? 'deleted-row' : ''}
```

### Pattern 4: Data Export with Field Selection

**What:** Backend generates Excel files with user-selected fields. Frontend provides checkbox list per entity type.

**Backend approach:**
```typescript
// ExportController
@Get(':entityType')
@Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
async exportEntity(
  @Param('entityType') entityType: string,
  @Query('fields') fields: string,  // Comma-separated field names
  @Res() res: Response,
) {
  const buffer = await this.exportService.export(entityType, fields.split(','));
  res.set({
    'Content-Disposition': `attachment; filename=${entityType}-export-${dayjs().format('YYYYMMDD')}.xlsx`,
  });
  res.end(buffer);
}
```

### Anti-Patterns to Avoid

- **Logging in service layer:** Do NOT add audit logging calls inside each service method. Use the interceptor pattern to keep services clean.
- **Storing full entity snapshots:** Do NOT store the entire entity JSON on every change. Store only the changed fields (diff) for updates. Full snapshot only on create/delete.
- **Frontend role check by weworkId:** Do NOT expose BOSS_WEWORK_IDS/DEV_WEWORK_IDS to the frontend. Compute `isAdmin` server-side.
- **Querying all records for export:** Do NOT load all records into memory. Use Prisma cursor pagination or streaming for large exports.
- **Blocking audit writes:** Do NOT let audit log write failures block the main request. Use fire-and-forget (catch and log errors) or a message queue pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel generation | Custom CSV/buffer assembly | ExcelJS 4.4.0 (already installed) | Handles cell formatting, column widths, sheet naming, streaming |
| JSON diff | Manual field-by-field comparison | Simple utility function (10 lines) | Audit diff is shallow object comparison, not deep nested -- simple enough to write |
| RBAC framework | Custom permission system | Extend existing RolesGuard pattern | MVP has 2-5 users; env-var approach is sufficient |
| DB backup | Custom backup system | mysqldump + coscli shell script + cron | Standard approach for MySQL backups to object storage |

**Key insight:** The project's RBAC is deliberately simple (env-var ID lists, 2-5 users). Do not over-engineer with a full permission framework. The `isAdmin` boolean is sufficient.

## Common Pitfalls

### Pitfall 1: Audit Interceptor Execution Order
**What goes wrong:** The audit interceptor must run AFTER JwtAuthGuard and UserClsInterceptor (so `cls.get('user')` is available), but BEFORE the response is sent.
**Why it happens:** NestJS interceptor ordering depends on registration order in providers array.
**How to avoid:** Register AuditInterceptor as APP_INTERCEPTOR after UserClsInterceptor in app.module.ts providers array. Test that `cls.get('user')` is populated when the interceptor runs.
**Warning signs:** `userId` is null in audit logs.

### Pitfall 2: Fetching Before-State for Updates
**What goes wrong:** The interceptor needs the entity's state BEFORE the update to compute the diff. But the interceptor runs at the controller level, not inside the transaction.
**Why it happens:** By the time `next.handle()` returns, the entity is already updated.
**How to avoid:** Fetch the entity state in the interceptor's pre-handler phase (before `next.handle()`). Use PrismaService directly with `findFirst` by ID. This is a separate read query, but it's acceptable for audit purposes.
**Warning signs:** All "old" values in the diff are the same as "new" values.

### Pitfall 3: Prisma Soft-Delete Extension Bypass for Deleted Record Queries
**What goes wrong:** The Prisma soft-delete extension automatically filters out `deletedAt IS NOT NULL` records. When building the "show deleted" feature, normal Prisma queries won't return deleted records.
**Why it happens:** `prisma-extension-soft-delete` intercepts all find operations.
**How to avoid:** Use raw SQL (`$queryRawUnsafe`) for queries that need to include deleted records -- this is the established pattern in the codebase (see `supplier.service.ts:restore()`). Alternatively, for list endpoints, add a dedicated raw SQL query path when `includeDeleted` is true.
**Warning signs:** Toggle is on but no deleted records appear.

### Pitfall 4: Frontend AuthUser Type Breaking Change
**What goes wrong:** Adding `isAdmin` field to AuthUser changes the type. Existing tests and mocks may break if they don't include the new field.
**Why it happens:** TypeScript strict mode requires all non-optional fields.
**How to avoid:** Add `isAdmin` as a required field but update all test fixtures and mock factories (`mockFactories.ts`) in the same commit. Default to `false` in test mocks.
**Warning signs:** TypeScript errors in test files after type change.

### Pitfall 5: Large Audit Log Table Performance
**What goes wrong:** Audit log table grows unbounded. Queries without proper indexes become slow.
**Why it happens:** Every CUD operation creates a record. With 6 entity types and active usage, this grows fast.
**How to avoid:** Add composite indexes: `(entityType, createdAt)`, `(userId, createdAt)`. Use `createdAt` range in all queries (enforce date range filter). Consider pagination with cursor-based approach for large result sets.
**Warning signs:** Audit log page loads slowly after a few months of usage.

### Pitfall 6: Blob Download in Axios Client
**What goes wrong:** The export endpoint returns a binary Excel file, but the Axios response interceptor tries to unwrap `.data.data` (the ApiResponse wrapper).
**Why it happens:** The existing interceptor assumes all responses are `ApiResponse<T>` JSON.
**How to avoid:** The existing client already handles this -- there's a `responseType === 'blob'` check in `client.ts` line 31. Use `apiClient.get(url, { responseType: 'blob' })` for export requests.
**Warning signs:** Excel file download produces corrupted/empty file.

### Pitfall 7: Export Endpoint Must NOT Use TransformInterceptor
**What goes wrong:** The global `TransformInterceptor` wraps all responses in `{ code, message, data }` format. Binary file responses must bypass this.
**Why it happens:** The interceptor is registered globally.
**How to avoid:** In the export controller, use `@Res()` to write directly to the response object. When using `@Res()`, NestJS interceptors are bypassed for that handler.
**Warning signs:** Excel file has JSON wrapper bytes prepended.

## Code Examples

### AuditLog Prisma Model

```prisma
// prisma/schema.prisma
model AuditLog {
  id            Int      @id @default(autoincrement())
  userId        Int?     @map("user_id")
  userName      String   @map("user_name")
  action        String   // "create" | "update" | "delete" | "restore"
  entityType    String   @map("entity_type") // "Supplier" | "Customer" | "Fabric" etc.
  entityId      Int      @map("entity_id")
  changes       Json     @db.Json // { field: { old, new } } for updates
  ip            String   @default("")
  correlationId String   @default("") @map("correlation_id")
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([entityType, createdAt])
  @@index([userId, createdAt])
  @@index([action, createdAt])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### Changes Diff Utility

```typescript
// audit/utils/diff.ts
export interface FieldDiff {
  old: unknown;
  new: unknown;
}

/**
 * Build field-level changes diff between before and after state.
 * Excludes internal fields (id, createdAt, updatedAt, deletedAt).
 */
export function buildChangesDiff(
  action: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Record<string, FieldDiff> | Record<string, unknown> {
  const EXCLUDE_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt']);

  if (action === 'create' && after) {
    // Store all initial field values
    const changes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(after)) {
      if (!EXCLUDE_FIELDS.has(key) && value !== null && value !== undefined) {
        changes[key] = value;
      }
    }
    return changes;
  }

  if (action === 'delete' && before) {
    // Store entity summary
    const changes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(before)) {
      if (!EXCLUDE_FIELDS.has(key) && value !== null && value !== undefined) {
        changes[key] = value;
      }
    }
    return changes;
  }

  if (action === 'update' && before && after) {
    const diff: Record<string, FieldDiff> = {};
    for (const key of Object.keys(after)) {
      if (EXCLUDE_FIELDS.has(key)) continue;
      const oldVal = before[key];
      const newVal = after[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diff[key] = { old: oldVal ?? null, new: newVal ?? null };
      }
    }
    return diff;
  }

  return {};
}
```

### RolesGuard Extension for Developer Role

```typescript
// common/guards/roles.guard.ts (modified)
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly bossIds: Set<string>;
  private readonly devIds: Set<string>;

  constructor(private readonly reflector: Reflector) {
    this.bossIds = this.parseIds(process.env.BOSS_WEWORK_IDS);
    this.devIds = this.parseIds(process.env.DEV_WEWORK_IDS);
  }

  private parseIds(idsStr?: string): Set<string> {
    return new Set(
      (idsStr || '').split(',').map((id) => id.trim()).filter(Boolean),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: { weworkId?: string } }>();
    const user = request.user;
    if (!user?.weworkId) throw new ForbiddenException('Authentication required');

    // Check if user satisfies any required role
    const isAdmin = this.bossIds.has(user.weworkId) || this.devIds.has(user.weworkId);

    for (const role of requiredRoles) {
      if ((role === 'boss' || role === 'developer') && isAdmin) return true;
    }

    throw new ForbiddenException('Insufficient role privileges');
  }

  /** Public helper for AuthService to check admin status */
  isAdminUser(weworkId: string): boolean {
    return this.bossIds.has(weworkId) || this.devIds.has(weworkId);
  }
}
```

### ExcelJS Export Example

```typescript
// export/export.service.ts
import * as ExcelJS from 'exceljs';

async export(entityType: string, fields: string[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(entityType);

  // Header row
  sheet.columns = fields.map((field) => ({
    header: this.getFieldLabel(entityType, field),
    key: field,
    width: 20,
  }));

  // Style header
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Data rows (paginated fetch)
  const data = await this.fetchAllRecords(entityType);
  for (const record of data) {
    const row: Record<string, unknown> = {};
    for (const field of fields) {
      row[field] = this.formatFieldValue(record[field]);
    }
    sheet.addRow(row);
  }

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual audit logging in each service | Interceptor-based automatic capture | Standard NestJS pattern | Zero service code changes for audit |
| CSV export | ExcelJS structured export | ExcelJS 4.x stable | Better formatting, column types, Chinese character support |
| Frontend role checks by ID matching | Server-computed `isAdmin` field | Security best practice | No sensitive ID lists exposed to client |

## Open Questions

1. **Audit log retention policy**
   - What we know: The table will grow unbounded with every CUD operation
   - What's unclear: Whether the user wants automatic cleanup (e.g., delete logs older than 1 year)
   - Recommendation: Do not implement auto-cleanup in Phase 13. Add a `createdAt` index and document the retention question for a future phase. The table will be manageable for a 2-5 user system for years.

2. **Entity model mapping for interceptor**
   - What we know: The interceptor needs to fetch entities by type and ID before updates
   - What's unclear: Whether to use a registry pattern (map entityType string to Prisma model) or inject PrismaService directly
   - Recommendation: Use a simple switch statement or map in the AuditService: `{ Supplier: 'supplier', Customer: 'customer', ... }` -> `this.prisma[modelName].findFirst()`. Keep it simple for 6 entity types.

3. **Export pagination for large datasets**
   - What we know: Some entity types (orders, quotes) could have thousands of records
   - What's unclear: Whether to use streaming or load all into memory
   - Recommendation: For MVP (2-5 users, moderate data), load all into memory with `findMany()`. Add cursor-based pagination if performance issues arise. ExcelJS supports streaming but adds complexity.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (Backend) | Jest 30.0.0 |
| Framework (Frontend) | Vitest 4.0.18 |
| Config file (Backend) | `backend/package.json` jest section |
| Config file (Frontend) | `frontend/vite.config.ts` test section |
| Quick run command (Backend) | `cd backend && pnpm test -- --testPathPattern=audit` |
| Quick run command (Frontend) | `cd frontend && pnpm test -- --testPathPattern=audit` |
| Full suite command (Backend) | `cd backend && pnpm build && pnpm test && pnpm lint` |
| Full suite command (Frontend) | `cd frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-04 | Audit interceptor captures CUD operations | unit | `cd backend && pnpm test -- --testPathPattern=audit.interceptor` | Wave 0 |
| DATA-04 | AuditService creates log entries | unit | `cd backend && pnpm test -- --testPathPattern=audit.service` | Wave 0 |
| DATA-05 | Correlation ID stored in audit log | unit | `cd backend && pnpm test -- --testPathPattern=audit.interceptor` | Wave 0 |
| DATA-06 | Audit log API endpoint returns filtered data | unit | `cd backend && pnpm test -- --testPathPattern=audit.controller` | Wave 0 |
| DATA-07 | RolesGuard accepts boss and developer roles | unit | `cd backend && pnpm test -- --testPathPattern=roles.guard` | Existing (extend) |
| DATA-07 | Audit log page hidden from non-admin users | unit | `cd frontend && pnpm test -- --testPathPattern=Sidebar` | Existing (extend) |
| DATA-08 | Export generates valid Excel buffer | unit | `cd backend && pnpm test -- --testPathPattern=export.service` | Wave 0 |
| DATA-08 | Export controller returns blob response | unit | `cd backend && pnpm test -- --testPathPattern=export.controller` | Wave 0 |
| DATA-09 | Backup script exists and is executable | manual-only | Verify script file exists and is chmod +x | N/A |

### Sampling Rate
- **Per task commit:** Quick run command for changed module
- **Per wave merge:** Full suite for both backend and frontend
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/audit/audit.service.spec.ts` -- covers DATA-04, DATA-05
- [ ] `backend/src/audit/audit.interceptor.spec.ts` -- covers DATA-04, DATA-05
- [ ] `backend/src/audit/audit.controller.spec.ts` -- covers DATA-06
- [ ] `backend/src/export/export.service.spec.ts` -- covers DATA-08
- [ ] `backend/src/export/export.controller.spec.ts` -- covers DATA-08
- [ ] `frontend/src/pages/audit/__tests__/AuditLogPage.test.tsx` -- covers DATA-06, DATA-07
- [ ] `frontend/src/pages/export/__tests__/ExportPage.test.tsx` -- covers DATA-08

## Project Constraints (from CLAUDE.md)

- **Code comments:** All code comments must be in pure English (no Chinese)
- **API path prefix:** `/api/v1` (not `/api`)
- **Commit format:** GSD format `{type}({phase}-{plan}): {description}`
- **Verification loop:** Backend: `pnpm build && pnpm test && pnpm lint`; Frontend: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
- **TDD:** Business logic tasks should follow TDD (write tests first)
- **PR flow:** Use `/pr-cycle` after phase completion
- **Excel import conflict:** Skip existing, don't overwrite (not directly relevant but export should not modify data)
- **No AI features:** Do not propose AI/OCR/auto-extraction features
- **HttpOnly cookie auth:** Frontend does not store tokens; `withCredentials: true` for all API calls
- **E2E test pattern:** Do not use AppModule (causes ScheduleModule worker leak); use minimal module composition

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `backend/src/common/guards/roles.guard.ts` -- existing RBAC pattern
- Codebase analysis: `backend/src/common/interceptors/user-cls.interceptor.ts` -- CLS user storage pattern
- Codebase analysis: `backend/src/import/utils/excel.utils.ts` -- existing ExcelJS usage
- Codebase analysis: `backend/prisma/schema.prisma` -- all 15+ existing models, naming conventions
- Codebase analysis: `backend/src/supplier/supplier.service.ts:restore()` -- raw SQL bypass for soft-delete extension
- Codebase analysis: `frontend/src/components/layout/Sidebar.tsx` -- static menuItems pattern
- Codebase analysis: `frontend/src/types/api.types.ts` -- AuthUser type (no role field currently)
- Codebase analysis: `frontend/src/api/client.ts` -- blob response handling already exists

### Secondary (MEDIUM confidence)
- NestJS interceptor lifecycle: pre-handler and post-handler phases are well-documented NestJS features
- ExcelJS API: `workbook.xlsx.writeBuffer()` returns Buffer suitable for HTTP response

### Tertiary (LOW confidence)
- None -- all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in the project
- Architecture: HIGH -- patterns follow existing codebase conventions exactly
- Pitfalls: HIGH -- identified from actual codebase analysis (e.g., Prisma extension bypass, Axios interceptor behavior)
- Audit interceptor design: MEDIUM -- the before-state fetch approach is straightforward but adds one extra DB read per audited update/delete

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (30 days -- stable stack, no version changes expected)
