# Coding Conventions

**Analysis Date:** 2026-03-17

## Naming Patterns

**Files:**
- Classes/Services: `kebab-case.ts` (e.g., `customer.service.ts`, `supplier.controller.ts`)
- DTOs: `kebab-case.dto.ts` (e.g., `create-customer.dto.ts`, `query-supplier.dto.ts`)
- Modules: `kebab-case.module.ts` (e.g., `customer.module.ts`)
- Specs: `kebab-case.spec.ts` (e.g., `customer.service.spec.ts`)
- Test files (Frontend): `kebab-case.test.tsx` (e.g., `AmountDisplay.test.tsx`) in `__tests__/` subdirectories
- Components: `PascalCase.tsx` (e.g., `CustomerSelector.tsx`, `PageContainer.tsx`)
- Utils/Utilities: `kebab-case.ts` (e.g., `pagination.ts`, `decimal.ts`)
- Constants: `kebab-case.constants.ts` (e.g., `auth.constants.ts`, `file.constants.ts`)

**Functions:**
- camelCase for all functions (e.g., `buildPaginationArgs`, `findSupplierFabrics`)
- Async functions: same camelCase convention (e.g., `async findOne()`, `async create()`)
- Callback/handler functions: descriptive camelCase (e.g., `formatCustomerLabel`, `extractPrismaErrorCode`)
- React components: PascalCase (e.g., `CustomerSelector`, `LoadingSpinner`)
- React hooks (custom): `useXxx` pattern (e.g., `useAsync`, `useDebounce`)

**Variables:**
- camelCase for all variables (e.g., `supplierId`, `fabricSuppliers`, `customerMock`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEBOUNCE_DELAY`, `CREDIT_TYPE_CONFIG`)
- Boolean flags: prefix with `is`, `has`, or `can` (e.g., `isActive`, `hasRelations`, `canDelete`)
- Collection variables: plural form (e.g., `suppliers`, `fabricSuppliers`, `items`)

**Types:**
- Interfaces: PascalCase, prefixed with `I` or descriptive suffix (e.g., `CustomerSelectorProps`, `PaginatedResult<T>`)
- Enums: PascalCase (e.g., `CreditType`, `OrderStatus`)
- Type aliases: PascalCase (e.g., `SupplierFabricItem`)
- Discriminator unions: descriptive PascalCase (e.g., `CreateCustomerDto`, `UpdateCustomerDto`)

**Backend (NestJS):**
- Services: `{Resource}Service` (e.g., `SupplierService`, `CustomerService`)
- Controllers: `{Resource}Controller` (e.g., `SupplierController`)
- Modules: `{Resource}Module` (e.g., `SupplierModule`)
- Guards: `{Name}Guard` (e.g., `JwtAuthGuard`)
- Strategies: `{Name}Strategy` (e.g., `JwtStrategy`)
- Filters: `{Name}Filter` (e.g., `AllExceptionsFilter`)
- DTOs: `Create{Resource}Dto`, `Update{Resource}Dto`, `Query{Resource}Dto` (e.g., `CreateSupplierDto`)

**Frontend (React):**
- Page components: `{ResourceType}Page.tsx` (e.g., `CustomerListPage.tsx`, `FabricDetailPage.tsx`)
- Form components: `{Resource}Form.tsx` (e.g., `CustomerForm.tsx`, `OrderForm.tsx`)
- Business components: Descriptive name (e.g., `AddressManager.tsx`, `ImportResultModal.tsx`)
- Common/layout components: Functional name (e.g., `PageContainer.tsx`, `ErrorBoundary.tsx`)
- Stores/state: `{domain}Store.ts` (e.g., `authStore.ts`)
- API client: `client.ts`
- Types: `{domain}.types.ts` (e.g., `entities.types.ts`, `enums.types.ts`)
- Utilities: `{domain}.ts` (e.g., `format.ts`, `validation.ts`)

## Code Style

**Formatting:**
- Tool: **Prettier** (ESLint plugin configured)
- Key settings:
  - Single quotes: `true`
  - Trailing commas: `all`
  - Print width: 80 (frontend), default (backend)
  - Tab width: 2
  - Semicolons: `true` (frontend)

**Linting:**
- Backend: **ESLint 9** with `typescript-eslint`
  - Config: `eslint.config.mjs`
  - Flat config format (ESLint 9+)
  - Rules: TypeScript recommended + prettier/recommended
  - Disabled rules: `@typescript-eslint/no-explicit-any` (off), `@typescript-eslint/no-floating-promises` (warn)

- Frontend: **ESLint 9** with React plugins
  - Config: `eslint.config.js`
  - Includes: `react-hooks`, `react-refresh` plugins
  - Target: ES2020, browser environment

## Import Organization

**Order (Backend):**
1. NestJS framework imports (e.g., `@nestjs/common`)
2. NestJS feature-specific imports (e.g., `@nestjs/swagger`)
3. Third-party imports (e.g., `@prisma/client`, `class-validator`)
4. Local absolute imports (e.g., `../prisma/prisma.service`)
5. Relative imports (only within same module)

**Order (Frontend):**
1. React core imports (e.g., `react`, `react-dom`)
2. Antd imports (e.g., `antd`, `@ant-design/icons`)
3. Third-party imports (e.g., `zustand`, `axios`)
4. Alias imports (e.g., `@/types/entities.types`, `@/utils/format`)
5. Relative imports (only for local component organization)

**Path Aliases:**
- Backend: `@/` → Configured in `tsconfig.json` (baseUrl: `./`)
- Frontend: `@/` → Configured in `vite.config.ts` (resolves to `./src`)

## Error Handling

**Patterns:**
- NestJS exceptions: Use built-in exceptions from `@nestjs/common`
  - `NotFoundException` for missing records (HTTP 404)
  - `ConflictException` for constraint violations (HTTP 409)
  - `BadRequestException` for validation errors (HTTP 400)
  - `UnauthorizedException` for auth failures (HTTP 401)

- Service-level error handling:
  ```typescript
  // Check existence first
  const existing = await this.prisma.supplier.findFirst({
    where: { id, isActive: true },
  });
  if (!existing) {
    throw new NotFoundException(`Supplier with ID ${id} not found`);
  }

  // Handle conflicts in transactions
  const conflict = await tx.supplier.findFirst({
    where: { companyName: updateSupplierDto.companyName },
  });
  if (conflict && conflict.id !== id) {
    throw new ConflictException(
      `Supplier with company name "${updateSupplierDto.companyName}" already exists`,
    );
  }
  ```

- Controller-level documentation:
  - Use `@ApiResponse()` decorators to document all status codes
  - Include `description` for each response (e.g., "Validation error", "Company name already exists")

- Frontend error handling:
  - Use optional chaining for API responses (e.g., `response?.data`)
  - Handle Promise rejections in async operations
  - Wrap async operations in try-catch in integration tests

- Global error filter: `AllExceptionsFilter` in `src/common/filters/http-exception.filter.ts`
  - Catches all exceptions
  - Returns standardized error response: `{ code, message, errors?, path, timestamp }`
  - Hides sensitive details in production (uses `getSafeErrorMessage()`)
  - Logs unhandled exceptions at error level

## Logging

**Framework:** `nestjs-pino` (NestJS) + console/standard logging (Frontend)

**Patterns:**
- Backend: Injected logger from `@nestjs/common` or pino integration
- Frontend: Simple `console.log` in development (no logging framework)
- Error logging: Use logger.error() with stack traces in error handlers
- Exception filter logs unhandled exceptions with full stack

## Comments

**When to Comment:**
- Complex business logic (e.g., transaction handling, validation rules)
- Non-obvious algorithmic decisions
- Workarounds or temporary solutions
- API constraints or third-party integration requirements

**JSDoc/TSDoc:**
- Used extensively for service methods (e.g., `/**\n * Create a new supplier.\n * Uses transaction to prevent race conditions...\n */`)
- Used for DTO properties via `@ApiProperty()` decorators in NestJS
- Frontend components use JSDoc for props interfaces
- Consistent style: descriptive comments above methods/functions

**Example from codebase:**
```typescript
/**
 * Create a new supplier.
 * Uses transaction to prevent race conditions on companyName uniqueness check.
 * Throws ConflictException if companyName already exists.
 */
async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
  // ...
}

/**
 * Customer selector component with search support.
 * Uses debounced search and displays customer info.
 */
export function CustomerSelector(props: CustomerSelectorProps) {
  // ...
}
```

## Function Design

**Size:** Service methods typically 15-50 lines; kept focused on single responsibility

**Parameters:**
- Avoid long parameter lists; use DTOs for complex inputs
- Type all parameters explicitly
- Use proper NestJS decorators (`@Body()`, `@Param()`, `@Query()`) in controllers
- Optional parameters: use `?` or provide defaults

**Return Values:**
- Explicit type annotations on all functions
- Use DTOs for consistent API responses
- Service methods return domain entities (e.g., `Supplier`, `Customer`)
- Use generics for reusable patterns (e.g., `PaginatedResult<T>`)
- Async functions explicitly return `Promise<T>`

**Example:**
```typescript
async findAll(query: QuerySupplierDto): Promise<PaginatedResult<Supplier>> {
  // Build where, pagination, sorting
  const [items, total] = await Promise.all([
    this.prisma.supplier.findMany({ where, ...paginationArgs, orderBy }),
    this.prisma.supplier.count({ where }),
  ]);
  return buildPaginatedResult(items, total, query);
}
```

## Module Design

**Exports:**
- NestJS modules export services via `@Module()` exports
- Barrel exports (index.ts) not consistently used; imports reference specific files
- Frontend utilities exported as named exports from utility files (e.g., `export function buildPaginationArgs()`)

**Barrel Files:**
- Used in `dto/` directories (e.g., `dto/index.ts` exports all DTO classes)
- Used in service/constant directories (e.g., `services/index.ts`)
- Reduces import clutter: `import { CreateSupplierDto, QuerySupplierDto } from './dto'`

**Dependency Injection:**
- Backend: Constructor injection with explicit service dependencies
  ```typescript
  constructor(private readonly prisma: PrismaService) {}
  ```
- Frontend: Props-based dependencies for components; custom hooks for shared logic

---

*Convention analysis: 2026-03-17*
