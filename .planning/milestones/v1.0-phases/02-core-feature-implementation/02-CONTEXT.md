# Phase 2: Core Feature Implementation - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Quote-to-order conversion and COS file storage work end-to-end with transaction safety and data migration. Covers FEAT-01~05 (conversion logic, duplicate protection, COS upload, URL migration, key-only storage) and TEST-01~03 (conversion tests, concurrent tests, COS tests). No new UI pages — only implementing backend logic and updating existing frontend flows.

</domain>

<decisions>
## Implementation Decisions

### Quote-to-order conversion model
- N quotes → 1 order: support selecting multiple quotes for the same customer, merging into one order with N OrderItems
- Each OrderItem links back to its source quote via `quoteId` FK (already exists in schema)
- Initial OrderItem status: PENDING (skips INQUIRY since quote already confirmed intent)
- Auto-fill `supplierId` from the fabric's associated supplier on each OrderItem
- Quote status: add new `QuoteStatus.CONVERTED` value; set on all converted quotes
- Conversion is atomic: if any quote is invalid (expired, wrong status), the entire batch fails with details on which quotes have issues

### Concurrent conversion protection (FEAT-02)
- Use Redis distributed lock per quote ID during conversion
- First request acquires lock, converts, and sets quote to CONVERTED
- Second request either fails to acquire lock (409) or finds quote already CONVERTED (409)
- Redis lock timeout should be reasonable (e.g., 30s) to prevent deadlocks

### COS file storage (FEAT-03~05)
- Dual-mode storage: local filesystem for development, Tencent COS for production
- Switch via environment variable (e.g., `STORAGE_MODE=local|cos`)
- Storage abstraction: interface with local and COS implementations, injected via DI
- Key-only storage: database stores COS key only (not full URL)
- URL generation at read-time: backend dynamically generates presigned URL (COS mode) or localhost URL (local mode) when returning file data
- Migration script: one-time script to convert existing FabricImage.url from localhost URLs to COS keys, and upload local files to COS

### File access pattern
- Presigned URLs with expiry for COS mode (private bucket)
- Expiry duration: Claude's discretion (balance security and usability for internal team)
- Local mode: standard localhost URL (no signing needed)

### Claude's Discretion
- Presigned URL expiry duration
- Frontend behavior after successful conversion (jump to order detail vs stay on page)
- Storage interface design details
- Migration script implementation approach
- Transaction isolation level for conversion

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/PROJECT.md` — Business context, product categories, numbering systems
- `.planning/REQUIREMENTS.md` — FEAT-01~05, TEST-01~03 requirement definitions
- `.planning/ROADMAP.md` — Phase 2 success criteria and dependency graph

### Existing Documentation
- `docs/ARCHITECTURE.md` — Business architecture, API specifications, module relationships
- `docs/reference/backend-types-reference.md` — Backend API types, enums, entity structures

### Key Source Files — Quote-to-Order
- `backend/src/quote/quote.service.ts` — `convertToOrder()` at line 349 (currently NotImplementedException)
- `backend/src/quote/quote.controller.ts` — `POST :id/convert-to-order` endpoint at line 122
- `backend/src/order/enums/order-status.enum.ts` — 9-state workflow, status transitions, aggregate calculation
- `backend/prisma/schema.prisma` — Quote model (line 289), Order model (line 200), OrderItem model (line 236)
- `frontend/src/api/quote.api.ts` — `convertToOrder` API call (line 48)
- `frontend/src/pages/quotes/QuoteDetailPage.tsx` — Convert button UI

### Key Source Files — File Storage
- `backend/src/file/file.service.ts` — Current local storage implementation with COS TODO
- `backend/src/config/configuration.ts` — COS config keys already defined (lines 8-11, 68-71)
- `backend/src/fabric/fabric.service.ts` — Uses FileService for image upload (line 338)
- `backend/prisma/schema.prisma` — File model (line 86), FabricImage model (line 70)

### Phase 1 Context
- `.planning/phases/01-frontend-bug-fixes/01-CONTEXT.md` — Error handling patterns, API conventions established in Phase 1

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RedisService`: already available for distributed locking (used in auth/caching)
- `PrismaService.$transaction()`: available for atomic multi-table operations
- `CodeGeneratorService`: generates order codes (ORD-YYMM-NNNN format)
- `OrderTimeline` model: ready for recording "Converted from quote QT-xxx" events
- `calculateAggregateStatus()`: computes order-level status from item statuses
- COS config keys already in `configuration.ts` — just need COS SDK integration

### Established Patterns
- API client unwraps `ApiResponse<T>` in interceptor — consumers receive data directly
- Error handling: ERROR_CODE_MESSAGES > HTTP_STATUS > raw message > fallback (Phase 1)
- Form pages: useParams for ID, create/edit mode toggle, onFinish handler
- TanStack Query hooks per module for data fetching

### Integration Points
- `quote.service.ts:convertToOrder()` — main implementation target
- `file.service.ts` — needs storage abstraction layer
- `fabric.service.ts:uploadImage()` — uses FileService, will need URL generation update
- Frontend quote detail page — conversion button and flow
- `FabricImage.url` — needs migration from full URL to key-only

</code_context>

<specifics>
## Specific Ideas

- User explicitly chose Redis distributed lock over optimistic locking for concurrent protection — stronger guarantee preferred
- N-to-1 conversion model (multiple quotes → one order) matches real business flow where a customer's multiple fabric quotes become a single order
- "Best practice" chosen for file access — presigned URLs with private bucket is the standard approach for internal systems

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-core-feature-implementation*
*Context gathered: 2026-03-23*
