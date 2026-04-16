# Testing Patterns

**Analysis Date:** 2026-04-16

## Test Framework Stack

**Backend:**
- Runner: Jest (via `ts-jest`)
- HTTP assertions: SuperTest
- Config: `package.json#jest` (unit), `backend/test/jest-e2e.json` (E2E)
- Unit test regex: `.*\.spec\.ts$` under `rootDir: src`
- E2E test regex: `.e2e-spec.ts$` under `rootDir: .` (project root)

**Frontend:**
- Runner: Vitest (config embedded in `frontend/vite.config.ts`)
- DOM environment: jsdom
- Component testing: React Testing Library (`@testing-library/react`)
- User events: `@testing-library/user-event`
- Setup file: `frontend/src/test/setup.ts`
- Global timeout: `testTimeout: 15000`

**Run Commands:**
```bash
# Backend unit tests
cd backend && pnpm test
cd backend && pnpm test:watch
cd backend && pnpm test:cov

# Backend E2E tests
cd backend && pnpm test:e2e
cd backend && pnpm test:e2e -- --testPathPattern=supplier

# Frontend tests
cd frontend && pnpm test
cd frontend && pnpm test:coverage
```

## Test File Organization

**Backend unit tests:** Co-located with source, same directory.
```
backend/src/supplier/
├── supplier.controller.ts
├── supplier.controller.spec.ts    # controller unit test
├── supplier.service.ts
├── supplier.service.spec.ts       # service unit test
└── supplier.module.ts
```

**Backend E2E tests:** Separate `backend/test/` directory.
```
backend/test/
├── supplier.e2e-spec.ts
├── auth.e2e-spec.ts
├── order.e2e-spec.ts
├── quote.e2e-spec.ts
└── helpers/
    └── mock-builders.ts           # shared test utilities
```

**Frontend tests:** `__tests__/` subdirectory within each feature folder.
```
frontend/src/
├── components/forms/__tests__/FabricForm.test.tsx
├── components/layout/__tests__/Header.test.tsx
├── pages/suppliers/__tests__/SupplierDetailPage.test.tsx
├── utils/__tests__/statusHelpers.test.ts
└── test/
    ├── setup.ts                   # global jsdom setup
    ├── testUtils.tsx              # renderWithProviders helper
    ├── mocks/mockFactories.ts     # entity factory functions
    └── integration/
        ├── integrationTestUtils.tsx       # renderIntegration helper
        ├── auth-flow.integration.test.tsx
        ├── fabric-crud.integration.test.tsx
        ├── order-status.integration.test.tsx
        ├── payment-flow.integration.test.tsx
        └── quote-convert.integration.test.tsx
```

## Backend Unit Test Structure

**Service tests** — inject mock providers via `Test.createTestingModule`:

```typescript
// backend/src/supplier/supplier.service.spec.ts
describe('SupplierService', () => {
  let service: SupplierService;

  const supplierMock = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrismaService = {
    supplier: supplierMock,
    $transaction: jest.fn().mockImplementation((callback: CallableFunction) =>
      callback({ supplier: supplierMock, ... }),
    ),
    $raw: { supplier: rawSupplierMock },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SupplierService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();
    service = module.get<SupplierService>(SupplierService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a supplier successfully', async () => {
      supplierMock.findFirst.mockResolvedValue(null);
      supplierMock.create.mockResolvedValue(mockSupplier);
      const result = await service.create(createDto);
      expect(result).toEqual(mockSupplier);
    });
  });
});
```

**Controller tests** — override guards, inject mock service:

```typescript
// backend/src/supplier/supplier.controller.spec.ts
const module = await Test.createTestingModule({
  controllers: [SupplierController],
  providers: [
    { provide: SupplierService, useValue: mockSupplierService },
    { provide: ClsService, useValue: { get: () => ({ id: 1, weworkId: 'test' }) } },
  ],
})
  .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
  .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
  .compile();
```

## Backend E2E Test Pattern

**Module composition rule:** Import only the specific feature module (never `AppModule`). `AppModule` loads `ScheduleModule` and cron jobs that prevent the test worker from exiting.

```typescript
// backend/test/supplier.e2e-spec.ts — correct minimal composition
const moduleFixture = await Test.createTestingModule({
  imports: [SupplierModule],
})
  .overrideProvider(PrismaService)
  .useValue(mockPrismaService)
  .compile();

app = moduleFixture.createNestApplication();
// Apply same pipes/filters as in AppModule
app.useGlobalPipes(new ValidationPipe({
  whitelist: true, forbidNonWhitelisted: true,
  transform: true, transformOptions: { enableImplicitConversion: true },
}));
app.useGlobalFilters(new AllExceptionsFilter(createMockCls()));
app.useGlobalInterceptors(new TransformInterceptor());
await app.init();
```

When a module requires Redis (e.g. `AuthModule`, `QuoteModule`): also override `RedisService`:
```typescript
.overrideProvider(RedisService).useValue(mockRedisService)
```

**HTTP assertions via SuperTest:**
```typescript
// backend/test/supplier.e2e-spec.ts
const response = await request(app.getHttpServer())
  .post('/api/v1/suppliers')
  .send({ companyName: 'ABC Textiles' })
  .expect(201);

const body = response.body as ApiSuccessResponse<SupplierData>;
expect(body.code).toBe(201);
expect(body.message).toBe('success');
expect(body.data.companyName).toBe('ABC Textiles');
```

Always type-cast `response.body` for safe property access:
```typescript
interface ApiSuccessResponse<T> { code: number; message: string; data: T; }
interface ApiErrorResponse { code: number; message: string; path: string; timestamp: string; }
```

## Auth Cookie Testing (Phase 13+)

Auth uses **HttpOnly cookies** — no Bearer token in request body/header from browser. Cookie name: `bf_auth_token`.

**Controller unit test** — mock `res.cookie` directly:
```typescript
// backend/src/auth/auth.controller.spec.ts
const mockResponse = () => {
  const res: Partial<Response> = {
    redirect: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
  return res as Response;
};

// Assert cookie was set with HttpOnly
expect(res.cookie).toHaveBeenCalledWith(
  'bf_auth_token',
  'jwt-token',
  expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
);
```

**Secure flag environment test** — override `process.env.FORCE_HTTPS_COOKIES`:
```typescript
const savedEnv = { ...process.env };
process.env.FORCE_HTTPS_COOKIES = 'true';
// ... test assertions ...
process.env = savedEnv;
```

**Frontend E2E tests** — verify `withCredentials: true` on axios client:
```typescript
// frontend/src/api/__tests__/client.test.ts
expect(mockCreate).toHaveBeenCalledWith(
  expect.objectContaining({ withCredentials: true }),
);
```

## Shared E2E Helpers

`backend/test/helpers/mock-builders.ts` provides:

```typescript
// Typed mock auth request for controller tests
export function createMockAuthRequest(userId = 1): AuthenticatedRequest { ... }

// Minimal ClsService mock (required by AllExceptionsFilter)
export function createMockCls(): ClsService {
  return { getId: () => 'test-correlation-id' } as unknown as ClsService;
}

// Buffer cast for ExcelJS under Node 22
export async function loadTestWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}
```

## Frontend Unit Test Setup

**jsdom setup** (`frontend/src/test/setup.ts`):
```typescript
import '@testing-library/jest-dom';

// Required: Ant Design responsive components
Object.defineProperty(window, 'matchMedia', { ... });

// Required: Ant Design layout components
globalThis.ResizeObserver = class ResizeObserver {
  observe() {} unobserve() {} disconnect() {}
};
```

**Custom render with Ant Design locale** (`frontend/src/test/testUtils.tsx`):
```typescript
export function renderWithProviders(ui: ReactElement, options?: RenderOptions): RenderResult {
  return render(ui, { wrapper: TestProviders, ...options });
}
// TestProviders wraps with <ConfigProvider locale={zhCN}>
```

## Frontend Integration Test Pattern

Integration tests in `frontend/src/test/integration/` keep TanStack Query, Zustand, and React Router alive while mocking only the API layer.

**The `mockModule` + `vi.hoisted()` pattern** (required for Vitest module mock hoisting):

```typescript
// frontend/src/test/integration/fabric-crud.integration.test.tsx
const { mockModule } = vi.hoisted(() => {
  function mockModule(fns: string[], nsKey: string): Record<string, unknown> {
    const mocks: Record<string, unknown> = {};
    for (const fn of fns) mocks[fn] = vi.fn();
    mocks[nsKey] = { ...mocks };
    return mocks;
  }
  return { mockModule };
});

vi.mock('@/api/fabric.api', () => mockModule(
  ['getFabrics', 'getFabric', 'createFabric', 'updateFabric', 'deleteFabric'],
  'fabricApi',
));

type FabricApiModule = typeof import('@/api/fabric.api');
const { fabricApi } =
  vi.mocked(await vi.importMock<FabricApiModule>('@/api/fabric.api'));

// Usage in test
fabricApi.getFabrics.mockResolvedValue(createPaginatedResponse(mockFabrics));
```

**`renderIntegration` helper** (`frontend/src/test/integration/integrationTestUtils.tsx`):
```typescript
renderIntegration(
  <Routes>
    <Route path="/products/fabrics" element={<FabricListPage />} />
  </Routes>,
  { initialEntries: ['/products/fabrics'], withAuth: true },
);
```

`withAuth: true` pre-populates Zustand authStore via `setupAuthenticatedState()`.

**Isolated QueryClient per test** — retries disabled, cache cleared immediately:
```typescript
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}
```

## Mock Factories

`frontend/src/test/mocks/mockFactories.ts` — factory functions with auto-incrementing IDs and `overrides` support:

```typescript
export function createMockFabric(overrides?: Partial<Fabric>): Fabric {
  const id = overrides?.id ?? getNextId();
  return { id, fabricCode: `FAB-${String(id).padStart(4, '0')}`, ... , ...overrides };
}
export function createMockFabrics(count: number): Fabric[] {
  return Array.from({ length: count }, () => createMockFabric());
}
export function resetIdCounter(): void { idCounter = 1; }
```

Always call `resetIdCounter()` in `beforeEach` when using factories. Available factories: `createMockFabric`, `createMockSupplier`, `createMockCustomer`, `createMockOrder`, `createMockOrderItem`, `createMockQuote`, `createMockQuoteItem`, `createMockSupplierPayment`, `createMockAuthUser`.

## Coverage

**Backend:** No enforced threshold. Run with `pnpm test:cov` → reports to `backend/coverage/`.

**Frontend:** Coverage enforced for specific utility files only (`frontend/vite.config.ts`):
```typescript
coverage: {
  include: [
    'src/utils/statusHelpers.ts',
    'src/utils/format.ts',
    'src/utils/validation.ts',
    'src/api/client.ts',
    'src/store/authStore.ts',
  ],
  thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
}
```
Run with `pnpm test:coverage`.

## Test Types

**Backend unit tests (`*.spec.ts`):**
- Scope: single service or controller method
- Mocks: all dependencies (PrismaService, CacheService, ClsService)
- Location: co-located with source file

**Backend E2E tests (`*.e2e-spec.ts`):**
- Scope: full HTTP request/response cycle including validation pipeline
- Mocks: only external dependencies (PrismaService, RedisService)
- Module: minimal module composition (never AppModule)
- Location: `backend/test/`

**Frontend unit tests (`*.test.tsx`):**
- Scope: single component or hook
- Mocks: hooks via `vi.mock`, navigate via `vi.mock('react-router-dom', ...)`
- Location: `__tests__/` co-located with component directory

**Frontend integration tests (`*.integration.test.tsx`):**
- Scope: multi-component flows (list + form + navigation)
- Mocks: only API layer (`vi.mock('@/api/xxx.api', ...)`)
- Keeps real: TanStack Query, Zustand stores, React Router, component tree
- Location: `frontend/src/test/integration/`

## Ant Design Testing Gotchas

**1. Tabs render all panels simultaneously**

Ant Design `Tabs` renders all tab panel content into the DOM at once. Use `getAllByText` when expecting duplicates, or `within()` to scope:

```typescript
// Tabs example — assert tab labels exist
expect(screen.getByText('基本信息')).toBeInTheDocument();
expect(screen.getByText('关联面料')).toBeInTheDocument();

// For content that appears in multiple places
expect(screen.getAllByText('东莞纺织有限公司').length).toBeGreaterThan(0);
```

**2. Modal footer OK button — use `document.querySelector`**

`screen.getByRole('button', { name: '确认' })` fails for Ant Design Modal primary buttons. Use CSS selector instead:

```typescript
// frontend/src/test/integration/payment-flow.integration.test.tsx
const modalFooter = document.querySelector('.ant-modal-footer');
const okButton = modalFooter!.querySelector('.ant-btn-primary') as HTMLButtonElement;
await user.click(okButton);

// For danger button (e.g. delete confirm)
const dangerButton = modalFooter!.querySelector('.ant-btn-dangerous') as HTMLButtonElement;
```

**3. Chinese two-character button spacing in jsdom**

Ant Design inserts a zero-width space between two Chinese characters in `<Button>` text (e.g. `取 消`). Use regex matcher:

```typescript
// ✅ Works in jsdom
expect(screen.getByRole('button', { name: /取.*消/ })).toBeInTheDocument();
expect(screen.getByText(/取.*消/)).toBeInTheDocument();

// ❌ Fails — exact text match
expect(screen.getByText('取消')).toBeInTheDocument();
```

**4. Ant Design message mock in unit tests**

```typescript
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: { success: vi.fn(), error: vi.fn() },
  };
});
```

**5. Ant Design icons / anticon**

Assert icon presence via CSS class:
```typescript
expect(document.querySelector('.anticon-exclamation-circle')).toBeInTheDocument();
```

**6. `window.matchMedia` and `ResizeObserver`**

Both must be mocked globally in `frontend/src/test/setup.ts`. Without them, Ant Design components throw in jsdom. Already configured — do not remove.

## Async Test Patterns

**Wait for data load:**
```typescript
await waitFor(() => {
  expect(screen.getByText(mockFabrics[0].fabricCode)).toBeInTheDocument();
});
```

**Timer-based navigation (e.g. redirect after login):**
```typescript
vi.useFakeTimers({ shouldAdvanceTime: true });
// ... trigger action ...
vi.advanceTimersByTime(600);
await waitFor(() => {
  expect(screen.getByText('Protected Home')).toBeInTheDocument();
});
vi.useRealTimers();
```

**Error boundary / rejected promise:**
```typescript
getCurrentUser.mockRejectedValueOnce(new Error('Authorization failed'));
renderAuthRoutes(['/auth/callback?success=true']);
await waitFor(() => {
  expect(screen.getByText('登录失败')).toBeInTheDocument();
});
```

## Mock Reset Pattern

Use `jest.clearAllMocks()` / `vi.clearAllMocks()` in `beforeEach` — not `afterEach`. Some factories also require `resetIdCounter()`:

```typescript
// Backend
beforeEach(() => {
  jest.clearAllMocks();
});

// Frontend integration
beforeEach(() => {
  clearAuthState();
  resetIdCounter();
  vi.clearAllMocks();
});
```

---

*Testing analysis: 2026-04-16*
