# Codebase Structure

**Analysis Date:** 2026-03-17

## Directory Layout

```
borealis-fabrics/
├── backend/                    # NestJS backend application
│   ├── src/
│   │   ├── main.ts             # Application entry point
│   │   ├── app.module.ts       # Root module
│   │   ├── config/             # ConfigService configuration
│   │   ├── auth/               # AuthModule (OAuth, JWT)
│   │   ├── common/             # CommonModule (cross-cutting)
│   │   ├── prisma/             # PrismaModule, schema, migrations
│   │   ├── supplier/           # SupplierModule
│   │   ├── customer/           # CustomerModule
│   │   ├── fabric/             # FabricModule
│   │   ├── order/              # OrderModule (state machine)
│   │   ├── quote/              # QuoteModule (includes scheduler)
│   │   ├── logistics/          # LogisticsModule
│   │   ├── file/               # FileModule (COS uploads)
│   │   ├── import/             # ImportModule (Excel batch)
│   │   └── system/             # SystemModule (enums API)
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Database migration files
│   ├── test/                   # E2E test files
│   └── Dockerfile              # Production container image
│
├── frontend/                   # React 18 frontend
│   ├── src/
│   │   ├── main.tsx            # React root entry
│   │   ├── App.tsx             # Root component (providers)
│   │   ├── routes/
│   │   │   ├── index.tsx       # Router config with lazy loading
│   │   │   ├── ProtectedRoute.tsx # Authentication guard
│   │   │   └── layouts/MainLayout.tsx
│   │   ├── pages/              # Page components
│   │   │   ├── auth/           # LoginPage, OAuthCallback
│   │   │   ├── fabrics/        # Fabric CRUD pages
│   │   │   ├── suppliers/      # Supplier CRUD pages
│   │   │   ├── customers/      # Customer CRUD pages
│   │   │   ├── orders/         # Order management pages
│   │   │   ├── quotes/         # Quote pages
│   │   │   ├── import/         # Excel import page
│   │   │   └── errors/         # 404 etc.
│   │   ├── components/
│   │   │   ├── layout/         # Header, Sidebar, PageContainer
│   │   │   ├── forms/          # CustomerForm, FabricForm, OrderForm etc.
│   │   │   ├── business/       # Domain-specific: OrderStatusFlow, PaymentStatusCard, AddressManager
│   │   │   └── common/         # Generic: StatusTag, AmountDisplay, ConfirmModal, LoadingSpinner
│   │   ├── api/                # API request layer
│   │   │   ├── client.ts       # Axios instance config
│   │   │   ├── fabric.ts       # Fabric API requests
│   │   │   ├── order.ts        # Order API requests
│   │   │   └── types.ts        # API type definitions
│   │   ├── store/              # Zustand state stores
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # Helper functions (constants, formatting)
│   │   ├── types/              # TypeScript type definitions
│   │   └── test/               # Unit and integration tests
│   └── vite.config.ts          # Vite build config
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # System architecture (technical)
│   ├── REQUIREMENTS_BUSINESS.md # BRD (business requirements)
│   ├── REQUIREMENTS_TECHNICAL.md # TRD (technical specs)
│   ├── SECURITY.md             # Security measures
│   ├── design/                 # Design documents
│   ├── plans/                  # Phase execution workplans
│   └── reference/              # Type reference docs
│
├── .planning/                  # GSD orchestration
│   └── codebase/              # Codebase mapping documents
│
├── .github/workflows/          # CI/CD pipelines (GitHub Actions)
│
├── docker-compose.yml          # Development compose (MySQL + Redis)
└── package.json               # Workspace package config
```

## Directory Purposes

**backend/src/:**
- Purpose: All NestJS backend source code organized by module
- Contains: Controllers, services, DTOs, business logic, database layer
- Key files: `main.ts` (entry), `app.module.ts` (root module registration)

**backend/src/auth/:**
- Purpose: Authentication and authorization
- Contains: OAuth2 strategy, JWT guards, login controller
- Key files: `auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `strategies/`, `guards/`

**backend/src/common/:**
- Purpose: Shared utilities and infrastructure
- Contains: Exception filters, response interceptors, pagination utils, code generator, Redis service
- Key files: `common.module.ts` (Global provider), `services/code-generator.service.ts`, `utils/pagination.ts`

**backend/src/order/:**
- Purpose: Order management with state machine
- Contains: Order CRUD, status transitions, payment tracking, timeline tracking
- Key files: `order.service.ts` (state logic), `order.validators.ts` (transition rules), `order.includes.ts` (Prisma relations)

**backend/src/prisma/:**
- Purpose: Database schema and ORM integration
- Contains: Prisma schema definition, migrations, PrismaService provider
- Key files: `schema.prisma`, `prisma.service.ts`, `migrations/`

**backend/prisma/:**
- Purpose: Database artifacts
- Contains: `schema.prisma` (data model), `migrations/` (DDL history)

**frontend/src/routes/:**
- Purpose: Application routing and route protection
- Contains: Router configuration, lazy-loaded page components
- Key files: `index.tsx` (router setup), `ProtectedRoute.tsx` (auth guard)

**frontend/src/pages/:**
- Purpose: Page-level components (one per route)
- Contains: Page layouts, business logic aggregation, page-specific state
- Key files: `fabrics/FabricListPage.tsx`, `orders/OrderDetailPage.tsx`, etc.

**frontend/src/components/:**
- Purpose: Reusable UI components
- Contains:
  - `layout/`: Header, Sidebar, PageContainer (cross-page structure)
  - `forms/`: CustomerForm, OrderForm, QuoteForm (input components)
  - `business/`: OrderStatusFlow, AddressManager, PricingTable (domain-specific)
  - `common/`: StatusTag, AmountDisplay, ConfirmModal (generic UI)
- Key files: Organized by category, suffixed with `.tsx`

**frontend/src/api/:**
- Purpose: Backend API communication
- Contains: Axios client setup, API request functions using TanStack Query
- Key files: `client.ts` (Axios config), `fabric.ts`, `order.ts`, etc.

**frontend/src/store/:**
- Purpose: Client-side state management (Zustand)
- Contains: Stores for auth, UI state (sidebar collapse), theme
- Key files: Store modules with `useXStore()` hooks

**frontend/src/test/:**
- Purpose: Unit tests and integration tests
- Contains: Test utilities, mocks, test files (co-located with components)
- Key files: `testUtils.tsx` (test setup), `integration/` (E2E scenarios)

## Key File Locations

**Entry Points:**

- `backend/src/main.ts`: Backend HTTP server bootstrap, Helmet, CORS, Swagger setup
- `frontend/src/main.tsx`: React root mount point
- `frontend/src/App.tsx`: Provider setup (QueryClient, AntD, Router)

**Configuration:**

- `backend/src/config/configuration.ts`: Environment-based config for backend
- `backend/.env.example`: Environment variable template
- `frontend/.env.example`: Frontend environment template
- `frontend/vite.config.ts`: Vite build and dev server config
- `backend/prisma/schema.prisma`: Database schema (15 tables, relations)

**Core Logic:**

- `backend/src/order/order.service.ts`: Order state machine, status transitions
- `backend/src/order/order.validators.ts`: State transition validation rules
- `backend/src/common/services/code-generator.service.ts`: Unique code generation (Redis + DB fallback)
- `backend/src/quote/quote.scheduler.ts`: Hourly quote expiration check
- `frontend/src/routes/index.tsx`: Full application routing tree

**Testing:**

- `backend/test/`: E2E tests using SuperTest and Jest
- `frontend/src/components/**/*.test.tsx`: Vitest unit tests co-located with components
- `frontend/src/test/integration/`: Integration tests (cross-feature flows)
- `frontend/src/test/testUtils.tsx`: Vitest setup, mocking utilities

## Naming Conventions

**Files:**

- Controllers: `[module].controller.ts` (e.g., `fabric.controller.ts`)
- Services: `[module].service.ts` (e.g., `order.service.ts`)
- Modules: `[module].module.ts` (e.g., `customer.module.ts`)
- DTOs: `[action]-[resource].dto.ts` (e.g., `create-fabric.dto.ts`, `query-order.dto.ts`)
- Tests: `[module].spec.ts` or `[component].test.tsx`
- React components: PascalCase (`FabricForm.tsx`, `OrderStatusFlow.tsx`)
- Utilities: camelCase (`pagination.ts`, `validators.ts`)

**Directories:**

- Feature modules: lowercase singular (`fabric/`, `order/`, `supplier/`)
- Nested by function: `auth/strategies/`, `order/dto/`, `common/filters/`
- React pages: lowercase plural (`pages/fabrics/`, `pages/orders/`)
- React components: PascalCase directories matching component names or grouped by type (`components/forms/`, `components/business/`)

## Where to Add New Code

**New Backend Feature (e.g., LogisticsModule):**
- Primary code: `backend/src/logistics/`
- Create:
  - `logistics.module.ts` (module definition with imports/exports)
  - `logistics.service.ts` (business logic)
  - `logistics.controller.ts` (HTTP routes)
  - `dto/` subdirectory with `create-logistics.dto.ts`, `update-logistics.dto.ts`
- Tests: `logistics.service.spec.ts`, `logistics.controller.spec.ts`
- Register in: `backend/src/app.module.ts` imports array

**New Backend API Endpoint:**
- Add route in `[module].controller.ts`
- Add business logic in `[module].service.ts`
- Create DTO in `dto/[action]-[resource].dto.ts`
- Add validation rules if needed in `[module].validators.ts`
- Add test cases in `[module].service.spec.ts` and `[module].controller.spec.ts`
- Reference in architecture docs if it changes flow

**New React Page:**
- Create: `frontend/src/pages/[feature]/[Page]Page.tsx`
- Add route in `frontend/src/routes/index.tsx` (with lazy() wrapper)
- Create associated form if needed: `frontend/src/components/forms/[Feature]Form.tsx`
- Create test: `frontend/src/pages/[feature]/__tests__/[Page]Page.test.tsx`

**New React Component:**
- Location depends on scope:
  - Reusable business logic: `frontend/src/components/business/[Component].tsx`
  - Form-related: `frontend/src/components/forms/[Component].tsx`
  - Layout/structural: `frontend/src/components/layout/[Component].tsx`
  - Generic/utility: `frontend/src/components/common/[Component].tsx`
- Co-locate test: `frontend/src/components/[category]/__tests__/[Component].test.tsx`

**New Utility/Helper:**
- Shared helpers: `frontend/src/utils/[helper].ts`
- Custom hooks: `frontend/src/hooks/use[Hook].ts`
- Type definitions: `frontend/src/types/[domain].ts`
- API requests: Functions in `frontend/src/api/[module].ts` using TanStack Query patterns

**New Database Table:**
- Add to: `backend/prisma/schema.prisma`
- Run: `pnpm prisma migrate dev --name add_[table_name]`
- Generates migration file automatically in `backend/prisma/migrations/`
- Update affected services to use new table

## Special Directories

**backend/prisma/migrations/:**
- Purpose: Version control for database schema changes
- Generated: Automatically by `prisma migrate dev --name [description]`
- Committed: Yes (always commit migrations)
- Applied: Automatically on deployment via `prisma migrate deploy`

**frontend/node_modules/ and backend/node_modules/:**
- Purpose: npm dependencies
- Generated: Yes (from pnpm install)
- Committed: No (.gitignore excludes)

**.github/workflows/:**
- Purpose: CI/CD pipelines (GitHub Actions)
- Files: `ci.yml` (test/lint/build), `deploy.yml` (auto-deploy to production)
- Committed: Yes (part of repo)

**docs/:**
- Purpose: Non-code documentation (architecture, business, technical specs)
- Committed: Yes
- How to maintain: Edit directly when requirements or architecture changes

**.planning/codebase/:**
- Purpose: GSD codebase mapping documents (ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, etc.)
- Generated: By /gsd:map-codebase command
- Committed: Yes (consumed by /gsd:plan-phase and /gsd:execute-phase)

---

*Structure analysis: 2026-03-17*
