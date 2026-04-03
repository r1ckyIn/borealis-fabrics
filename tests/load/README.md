# Load Testing with k6

## Prerequisites

Install k6 (not an npm package):
```bash
brew install k6
```

## Running Tests

Start the backend first, then:

```bash
# Auth flow
k6 run tests/load/auth.k6.js

# Fabric CRUD (default: http://localhost:3000/api/v1)
k6 run tests/load/fabric-crud.k6.js

# Order list with filtering
k6 run tests/load/order-list.k6.js

# Custom base URL
k6 run -e BASE_URL=http://staging.example.com/api/v1 tests/load/fabric-crud.k6.js
```

## Baseline Thresholds

| Endpoint | p95 Target | Notes |
|----------|-----------|-------|
| POST /auth/dev-login | < 500ms | Auth + JWT generation |
| GET /fabrics (list) | < 500ms | Paginated, cached via Redis |
| GET /fabrics/:id | < 500ms | Single record |
| GET /orders (list) | < 1000ms | Heavier query with relations |

## Load Profile

- 5 virtual users (matches team size of 2-5)
- 30s ramp-up, 1m sustained, 10s ramp-down
- 1s think time between requests

## Note

These scripts use `/auth/dev-login` which is only available in development mode.
For production testing, update the auth flow to use real credentials.
