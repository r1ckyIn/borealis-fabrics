# Testing Patterns

**Analysis Date:** 2026-03-17

## Test Framework

**Runner:**
- Backend: **Jest** 30.0.0
  - Config: Embedded in `backend/package.json` (no separate jest.config.js)
  - Root directory: `src/`
  - Test regex: `.*\.spec\.ts$`
  - Transform: `ts-jest`

- Frontend: **Vitest** 4.0.18
  - Config: `frontend/vite.config.ts`
  - Environment: `jsdom`
  - Setup file: `frontend/src/test/setup.ts`
  - Test timeout: 15000ms (for slower async operations)

**Assertion Library:**
- Backend: Jest's built-in assertions
- Frontend: `@testing-library/react` + `@testing-library/jest-dom`

**Run Commands:**
```bash
# Backend
cd backend && pnpm test              # Run all unit tests
cd backend && pnpm test:watch        # Watch mode
cd backend && pnpm test:cov          # Coverage report
cd backend && pnpm test:e2e          # Run E2E tests

# Frontend
cd frontend && pnpm test             # Run all tests (passWithNoTests by default)
cd frontend && pnpm test:watch       # Watch mode
cd frontend && pnpm test:cov         # Coverage report
```

## Test File Organization

**Location:**
- Backend: Co-located with source (e.g., `customer.service.ts` → `customer.service.spec.ts`)
- Frontend: Tests in `__tests__/` subdirectory alongside components
  - Example: `components/common/AmountDisplay.tsx` → `components/common/__tests__/AmountDisplay.test.tsx`
  - Integration tests: `src/test/integration/` (e.g., `auth-flow.integration.test.tsx`)

**Naming:**
- Backend: `{name}.spec.ts` (e.g., `customer.service.spec.ts`, `jwt.strategy.spec.ts`)
- Frontend: `{name}.test.tsx` (e.g., `AmountDisplay.test.tsx`, `CustomerSelector.test.tsx`)

**Structure:**
```
backend/
├── src/
│   ├── customer/
│   │   ├── customer.service.ts
│   │   └── customer.service.spec.ts
│   └── auth/
│       ├── guards/
│       │   ├── jwt-auth.guard.ts
│       │   └── jwt-auth.guard.spec.ts
│
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── AmountDisplay.tsx
│   │   │   └── __tests__/
│   │   │       └── AmountDisplay.test.tsx
│   └── test/
│       ├── setup.ts
│       ├── testUtils.tsx
│       └── integration/
│           └── auth-flow.integration.test.tsx
```

## Test Structure

**Backend Suite Organization:**
```typescript
describe('CustomerService', () => {
  let service: CustomerService;
  let prisma: PrismaService;

  // Setup mocks before each test
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  describe('create', () => {
    it('should create a customer successfully', async () => {
      // Arrange
      const dto = { companyName: 'XYZ Co.' };

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result).toEqual({ id: 1, companyName: 'XYZ Co.' });
    });

    it('should throw ConflictException if company name exists', async () => {
      // Test conflict handling
      expect(async () => {
        await service.create({ companyName: 'Existing Co.' });
      }).rejects.toThrow(ConflictException);
    });
  });
});
```

**Frontend Test Structure:**
```typescript
describe('AmountDisplay', () => {
  describe('Null/undefined/empty handling', () => {
    it('renders "-" for null value', () => {
      render(<AmountDisplay value={null} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Valid number rendering', () => {
    it('renders number with default currency symbol ¥', () => {
      render(<AmountDisplay value={100} />);
      expect(screen.getByText('¥100.00')).toBeInTheDocument();
    });
  });

  describe('Combined options', () => {
    it('renders with all options combined', () => {
      const { container } = render(
        <AmountDisplay
          value={1234.5}
          prefix="$"
          showSign
          colorize
        />
      );
      expect(screen.getByText('+$1,234.50')).toBeInTheDocument();
      expect(container.querySelector('.ant-typography-success')).toBeInTheDocument();
    });
  });
});
```

**Patterns:**
- AAA pattern (Arrange, Act, Assert) consistently used
- Nested describe blocks for feature organization
- One assertion per test preferred for clarity
- Setup and teardown via `beforeEach()`/`afterEach()`

## Mocking

**Backend Framework:** Jest mocks via `jest.fn()` and `jest.spyOn()`

**Patterns:**
```typescript
// 1. Service-level mocking (most common)
const mockPrismaService = {
  customer: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((callback: CallableFunction) =>
    callback({
      customer: customerMock,
      // Pass mocks into transaction
    }),
  ),
};

// 2. Inject mocks into TestingModule
const module: TestingModule = await Test.createTestingModule({
  providers: [
    CustomerService,
    { provide: PrismaService, useValue: mockPrismaService },
  ],
}).compile();

// 3. Return values for test scenarios
jest.fn().mockResolvedValue(data);  // For async methods
jest.fn().mockImplementation(...);   // For custom behavior
jest.fn().mockRejectedValue(error);  // For error cases

// 4. Verify mock calls
expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith({
  where: { id: 1, isActive: true },
});
```

**Frontend Framework:** Vitest with `vi` utilities

**Patterns:**
```typescript
// 1. Use renderWithProviders from testUtils
import { renderWithProviders, screen } from '@/test/testUtils';

// 2. Mock fetch/API calls (if needed)
global.fetch = vi.fn().mockResolvedValue({
  json: async () => ({ success: true }),
});

// 3. Test user interactions
import { userEvent } from '@/test/testUtils';

const user = userEvent.setup();
await user.click(screen.getByRole('button'));

// 4. Mock timers for debounce/throttle
vi.useFakeTimers();
vi.advanceTimersByTime(300); // Advance debounce delay
vi.runAllTimers();           // Or run all pending timers
```

**What to Mock:**
- External API calls (fetch, axios)
- Database calls (PrismaService in backend)
- Third-party services (Redis, JWT, OAuth)
- Expensive operations (file uploads, encryption)

**What NOT to Mock:**
- Core business logic (pure functions, validators)
- Domain models and entities
- Utility functions from source code (test them directly)
- Standard library functions (JSON, dates, etc.)

## Fixtures and Factories

**Backend Test Data:**
```typescript
// Mock objects defined at top of spec file
const customerMock = {
  create: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Used in test scenarios
customerMock.findFirst.mockResolvedValue({
  id: 1,
  companyName: 'Test Co.',
  isActive: true,
});
```

**Frontend Test Utilities:**
- Location: `src/test/testUtils.tsx`
- Provides: `renderWithProviders()`, `userEvent`, custom async helpers
- Re-exports: All testing-library utilities for convenience

```typescript
// Custom test utils
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: TestProviders,  // Provides Ant Design config + locale
    ...options,
  });
}

export async function waitForAsync(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export function flushTimers(): void {
  vi.runAllTimers();
}
```

**Usage:**
```typescript
import { renderWithProviders, screen, userEvent } from '@/test/testUtils';

it('handles form submission', async () => {
  renderWithProviders(<CustomerForm onSubmit={onSubmit} />);
  const input = screen.getByLabelText('Company Name');

  const user = userEvent.setup();
  await user.type(input, 'New Company');
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  expect(onSubmit).toHaveBeenCalledWith({ companyName: 'New Company' });
});
```

## Coverage

**Requirements:**
- Backend: No explicit threshold enforcement in jest config
- Frontend: Thresholds in `vite.config.ts`:
  - Statements: 80%
  - Branches: 80%
  - Functions: 80%
  - Lines: 80%
  - Coverage provider: v8
  - Coverage only for critical files (auth, API client, utils)

**View Coverage:**
```bash
# Backend
cd backend && pnpm test:cov

# Frontend
cd frontend && pnpm test:cov
```

## Test Types

**Unit Tests:**
- Backend: Service methods tested in isolation with mocked dependencies
  - Example: `customer.service.spec.ts` tests all CRUD operations
  - Focus: Business logic, error handling, validation
  - Mocks: PrismaService, external services

- Frontend: Components tested with mocked props and API calls
  - Example: `AmountDisplay.test.tsx` tests all display scenarios
  - Focus: Rendering logic, user interactions, conditional rendering
  - Mocks: API calls, custom hooks

**Integration Tests:**
- Frontend: End-to-end flows across multiple components
  - Location: `src/test/integration/`
  - Examples: `auth-flow.integration.test.tsx`, `quote-convert.integration.test.tsx`
  - Scope: Auth login → redirect → protected routes
  - Pattern: Tests complete user workflows

- Backend: E2E tests via SuperTest
  - Location: `test/jest-e2e.json` config points to `*.e2e-spec.ts`
  - Pattern: Full HTTP request/response testing
  - Note: E2E tests may require minimal module setup (avoid ScheduleModule that adds cron workers)

**E2E Tests (Backend):**
- Configured in `test/jest-e2e.json`
- Naming: `*.e2e-spec.ts`
- Full application testing with HTTP calls
- Can take longer due to database operations

## Common Patterns

**Async Testing (Backend):**
```typescript
// Using async/await (preferred)
it('should find a customer by ID', async () => {
  customerMock.findFirst.mockResolvedValue({ id: 1, companyName: 'Test' });

  const result = await service.findOne(1);

  expect(result.id).toBe(1);
  expect(customerMock.findFirst).toHaveBeenCalledWith({
    where: { id: 1, isActive: true },
  });
});

// Mocking promises
jest.fn().mockResolvedValue(data);      // Resolves to data
jest.fn().mockRejectedValue(error);     // Rejects with error
jest.fn().mockResolvedValueOnce(data1).mockResolvedValueOnce(data2);  // Multiple calls
```

**Async Testing (Frontend):**
```typescript
// Vitest integration with React Testing Library
it('loads and displays data', async () => {
  const { container } = renderWithProviders(<MyComponent />);

  // Wait for async state updates
  await screen.findByText('Loaded Data');

  // Or use userEvent.setup() for consistent async handling
  const user = userEvent.setup();
  await user.click(screen.getByRole('button'));

  expect(screen.getByText('Result')).toBeInTheDocument();
});

// Using waitFor for polling
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(screen.queryByText('Loading')).not.toBeInTheDocument();
});
```

**Error Testing (Backend):**
```typescript
it('should throw NotFoundException for missing supplier', async () => {
  supplierMock.findFirst.mockResolvedValue(null);

  await expect(service.findOne(999)).rejects.toThrow(
    NotFoundException,
  );
});

// With message checking
await expect(service.findOne(999)).rejects.toThrow(
  'Supplier with ID 999 not found',
);
```

**Error Testing (Frontend):**
```typescript
// Error boundary testing
it('displays error when component throws', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  const { container } = renderWithProviders(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(container.textContent).toContain('Something went wrong');
});

// API error simulation
it('displays error message on API failure', async () => {
  vi.mocked(fetchData).mockRejectedValue(new Error('Network error'));

  renderWithProviders(<MyComponent />);

  await screen.findByText('Failed to load data');
});
```

## Test Setup & Configuration

**Backend Setup:**
- Testing module created per spec file using `@nestjs/testing`
- Mocks created at top of describe block for reusability
- Transaction mock allows callback-based testing
- Global fetch mocked for OAuth tests

**Frontend Setup (`src/test/setup.ts`):**
```typescript
// Ant Design responsive support
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    // ... other methods
  }),
});

// Ant Design ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
```

**Vitest Config (`vite.config.ts`):**
```typescript
test: {
  globals: true,              // Use global test functions
  environment: 'jsdom',       // Browser-like DOM
  setupFiles: './src/test/setup.ts',  // Run setup before tests
  testTimeout: 15000,         // Allow 15s for slow tests
  coverage: {
    provider: 'v8',
    reporter: ['text', 'text-summary'],
    include: [...],           // Only these files counted
    thresholds: {             // Enforce coverage minimums
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
}
```

---

*Testing analysis: 2026-03-17*
