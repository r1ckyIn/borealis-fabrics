# Architecture

**Analysis Date:** 2026-03-17

## Pattern Overview

**Overall:** Modular Monolith with NestJS backend and React 18 frontend

**Key Characteristics:**
- Backend: NestJS 11 with TypeScript strict mode, modular structure with shared CommonModule
- Frontend: React 18 + Vite, client-server state management separation (TanStack Query + Zustand)
- Database: MySQL 8.0 with Prisma ORM, Redis for caching and sequence generation
- Deployment: Multi-layer (Nginx reverse proxy → NestJS backend → MySQL/Redis)

## Layers

**Backend Layers:**

**Authentication & Authorization Layer:**
- Purpose: Enterprise WeChat OAuth 2.0 integration, JWT token management, cookie-based auth
- Location: `backend/src/auth/`
- Contains: OAuth strategy, JWT guards, authentication middleware
- Depends on: Passport, JWT libraries, ConfigService
- Used by: All authenticated endpoints (protected by JWT guard or cookie)

**API Layer (Controllers):**
- Purpose: HTTP request routing and validation
- Location: `backend/src/*/` (module-specific controllers)
- Contains: Request handlers with DTO validation via class-validator
- Depends on: Service layer, DTOs, Guards
- Used by: HTTP clients (frontend, API consumers)

**Business Logic Layer (Services):**
- Purpose: Core business rules, state transitions, data calculations
- Location: `backend/src/*/[module].service.ts`
- Contains: OrderService (state machine), CodeGeneratorService, QuoteScheduler, etc.
- Depends on: PrismaService, RedisService, external APIs
- Used by: Controllers and other services

**Data Access Layer (Prisma):**
- Purpose: Type-safe database queries and migrations
- Location: `backend/src/prisma/`, `backend/prisma/schema.prisma`
- Contains: Prisma schema definitions, migrations, PrismaService wrapper
- Depends on: MySQL 8.0
- Used by: All services requiring database access

**Common/Utility Layer:**
- Purpose: Cross-cutting concerns, shared utilities
- Location: `backend/src/common/`
- Contains: Exception filters, interceptors, pagination utils, validators, code generation
- Depends on: NestJS core, pino logger
- Used by: All modules via global pipes, guards, filters

**Frontend Layers:**

**Routing & Page Layer:**
- Purpose: Page-level routing and lazy code splitting
- Location: `frontend/src/routes/`, `frontend/src/pages/`
- Contains: Router configuration with ProtectedRoute, page components
- Depends on: React Router 7, authentication state
- Used by: Application entry point

**Components Layer:**
- Purpose: UI composition (layout, forms, business components, common UI)
- Location: `frontend/src/components/` (layout/, forms/, business/, common/)
- Contains: Form components, data displays, Ant Design wrapper components
- Depends on: Ant Design 5, React hooks
- Used by: Pages and other components

**API/Data Layer:**
- Purpose: HTTP communication with backend
- Location: `frontend/src/api/`
- Contains: Axios client setup, API request hooks using TanStack Query
- Depends on: Axios, TanStack Query, environment config
- Used by: Components via custom hooks

**State Management:**
- Purpose: Client-side state (UI state, theme) and server state caching
- Location: `frontend/src/store/`, TanStack Query configuration in App.tsx
- Contains: Zustand stores for UI state, TanStack Query for server state
- Depends on: Zustand, TanStack Query
- Used by: Components via hooks

**Utilities & Helpers:**
- Purpose: Formatting, validation, constants
- Location: `frontend/src/utils/`, `frontend/src/types/`, `frontend/src/hooks/`
- Contains: Custom hooks, type definitions, helper functions
- Depends on: React hooks, date libraries
- Used by: Components and pages

## Data Flow

**Create Quote Flow:**

1. User fills QuoteForm (component) with fabric, customer, price
2. Form validation via class-validator DTOs
3. Submit → `POST /api/v1/quotes` via Axios
4. Controller validates DTO (ValidationPipe)
5. Service creates quote in Prisma, generates QuoteCode via RedisService
6. Returns quote response
7. TanStack Query updates cache, UI reflects new quote
8. QuoteScheduler (cron: every hour) marks expired quotes

**Order State Transition Flow:**

1. OrderStatusFlow component displays current state
2. User clicks status button (e.g., "Move to PRODUCTION")
3. `PATCH /api/v1/orders/:id/items/:itemId/status` → Controller
4. Service validates transition (allowed by state machine rules)
5. Service updates order_items and order_timelines tables
6. Service recalculates order.status as MIN(all item statuses)
7. Response triggers TanStack Query invalidation
8. UI updates via re-fetch or optimistic update

**File Upload Flow:**

1. ImageUploader component selects file
2. `POST /api/v1/files/upload` → FileController
3. FileController validates MIME type and size (5MB limit)
4. Backend uploads to Tencent COS, stores metadata in files table
5. Returns file URL
6. Frontend stores URL in form state or directly in fabric data
7. TanStack Query cache updates, image displays

**State Management:**

- **Server State (TanStack Query):**
  - Fabrics list, order details, supplier data
  - Auto-invalidation after mutations
  - Configurable stale time (5 min default)

- **Client State (Zustand):**
  - Sidebar collapsed/expanded
  - Theme settings
  - User session data (from authStore)

## Key Abstractions

**OrderService State Machine:**
- Purpose: Enforce valid order status transitions (9 states, defined rules)
- Examples: `backend/src/order/order.service.ts`, `backend/src/order/order.validators.ts`
- Pattern: Transition validation before update, aggregate status calculation from items

**CodeGeneratorService:**
- Purpose: Generate unique codes (BF-YYMM-NNNN, ORD-YYMM-NNNN, QT-YYMM-NNNN)
- Examples: `backend/src/common/services/code-generator.service.ts`
- Pattern: Redis INCR atomic increment, fallback to DB MAX+1 if Redis unavailable

**TanStack Query Hooks:**
- Purpose: Server state synchronization with automatic caching and background refetch
- Examples: Custom hooks in `frontend/src/api/` using useQuery, useMutation
- Pattern: QueryKeys for cache invalidation, error boundary integration

**ProtectedRoute:**
- Purpose: Route-level authentication guard
- Examples: `frontend/src/routes/ProtectedRoute.tsx`
- Pattern: Redirects to /login if unauthenticated, passes through if authStore.user exists

**PaginationDto + buildPaginatedResult:**
- Purpose: Standardized pagination across all list endpoints
- Examples: `backend/src/common/utils/pagination.ts`
- Pattern: page/pageSize → skip/take conversion, total count calculation

## Entry Points

**Backend Entry Point:**
- Location: `backend/src/main.ts`
- Triggers: `node dist/main.js` or `pnpm start:dev`
- Responsibilities:
  - NestFactory bootstrap (AppModule)
  - Helmet security headers (CSP, HSTS)
  - CORS configuration
  - Cookie parser for HttpOnly auth
  - Swagger docs (dev only)
  - API prefix `/api/v1`

**Frontend Entry Point:**
- Location: `frontend/src/main.tsx`
- Triggers: `pnpm dev` or build artifact execution
- Responsibilities:
  - React root mount to #root DOM element
  - StrictMode React verification
  - App.tsx initialization

**App Component:**
- Location: `frontend/src/App.tsx`
- Triggers: Called by main.tsx
- Responsibilities:
  - TanStack Query client setup (staleTime 5min, retry 1)
  - Ant Design ConfigProvider (Chinese locale)
  - AppRouter initialization

**AppModule (Backend):**
- Location: `backend/src/app.module.ts`
- Triggers: Called by NestFactory.create()
- Responsibilities:
  - Module imports orchestration
  - Global pipes/guards/filters registration
  - Rate limiting (60 req/60s)
  - Scheduled task execution
  - Health check setup

## Error Handling

**Strategy:** Layered exception handling with global exception filter

**Patterns:**

**Backend:**
- DTOs validated by ValidationPipe (forbidNonWhitelisted, transform)
- Service-level business validation throws HttpException
- Global AllExceptionsFilter catches and formats responses
- Response format: `{ code: number, message: string, errors?: Array }`
- Example: `backend/src/common/filters/http-exception.filter.ts`

**Frontend:**
- TanStack Query error state in useQuery hook
- ErrorBoundary component catches React rendering errors
- API errors logged with context for debugging
- User-facing messages via Ant Design message.error()
- Example: `frontend/src/components/common/ErrorBoundary.tsx`

## Cross-Cutting Concerns

**Logging:**
- Backend: nestjs-pino (structured JSON logs, colorized in dev, JSON in prod)
- Frontend: console.log during development, production errors via Sentry (future)

**Validation:**
- Backend: class-validator decorators on all DTOs, custom validators in `backend/src/common/validators/`
- Frontend: React Hook Form + Ant Design Form components, client-side pre-validation

**Authentication:**
- Backend: JWT tokens stored in HttpOnly cookies, enterprise WeChat OAuth 2.0
- Frontend: authStore (Zustand) synced from server on app load, ProtectedRoute checks user presence

**Rate Limiting:**
- Backend: ThrottlerModule (60 requests/60 seconds global)
- Frontend: Request debouncing/throttling in components via useMemo/useCallback

---

*Architecture analysis: 2026-03-17*
