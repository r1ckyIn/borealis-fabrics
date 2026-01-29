---
paths:
  - "**/backend/**"
  - "**/frontend/**"
  - "**/.github/**"
---

# CI/CD Pipeline 配置

本文件定义了生产级项目的 CI/CD 配置标准。

---

## 触发条件

- push to PR
- push to main

---

## Backend Pipeline

```yaml
# .github/workflows/backend.yml
name: Backend CI

on:
  push:
    paths:
      - 'backend/**'
  pull_request:
    paths:
      - 'backend/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install uv
        uses: astral-sh/setup-uv@v4
      - name: Lint
        run: |
          cd backend
          uv run ruff check .

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install uv
        uses: astral-sh/setup-uv@v4
      - name: Type Check
        run: |
          cd backend
          uv run mypy src/

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install uv
        uses: astral-sh/setup-uv@v4
      - name: Test
        run: |
          cd backend
          uv run pytest --cov=app

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Security Scan
        run: |
          pip install safety
          safety check

  build:
    runs-on: ubuntu-latest
    needs: [lint, type-check, test, security]
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker Image
        run: |
          cd backend
          docker build -t backend:${{ github.sha }} .
```

### Pipeline 步骤

```text
Backend Pipeline:
├── ruff check .               # 代码风格
├── mypy src/                  # 类型检查（strict 模式）
├── pytest --cov=app           # 测试 + 覆盖率（>= 80%）
│   ├── tests/unit/            # 单元测试
│   └── tests/integration/     # 集成测试
├── safety check               # 依赖漏洞扫描
└── docker build               # 构建验证
```

---

## Frontend Pipeline

```yaml
# .github/workflows/frontend.yml
name: Frontend CI

on:
  push:
    paths:
      - 'frontend/**'
  pull_request:
    paths:
      - 'frontend/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          cache-dependency-path: frontend/pnpm-lock.yaml
      - name: Install dependencies
        run: cd frontend && pnpm install
      - name: Lint
        run: cd frontend && pnpm lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - name: Install dependencies
        run: cd frontend && pnpm install
      - name: Type Check
        run: cd frontend && pnpm tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - name: Install dependencies
        run: cd frontend && pnpm install
      - name: Test
        run: cd frontend && pnpm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, type-check, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - name: Install dependencies
        run: cd frontend && pnpm install
      - name: Build
        run: cd frontend && pnpm build
```

### Pipeline 步骤

```text
Frontend Pipeline:
├── tsc --noEmit               # TypeScript 类型检查
├── eslint .                   # 代码风格
├── vitest                     # 单元测试
└── next build                 # 构建验证
```

---

## 部署流程

```text
合并到 main 后:
└── 自动部署到 staging → 手动批准 → production
```

### Staging 部署

```yaml
deploy-staging:
  runs-on: ubuntu-latest
  needs: [build]
  if: github.ref == 'refs/heads/main'
  steps:
    - name: Deploy to Staging
      run: |
        # Deploy to staging environment
```

### Production 部署

```yaml
deploy-production:
  runs-on: ubuntu-latest
  needs: [deploy-staging]
  environment:
    name: production
    url: https://example.com
  steps:
    - name: Deploy to Production
      run: |
        # Deploy to production environment
```

---

## 测试覆盖率要求

| 层级 | 最低覆盖率 |
|------|-----------|
| 总体 | >= 80% |
| domain | >= 95% |
| application | >= 90% |
| infrastructure | >= 70% |
| presentation | >= 70% |

---

## 安全扫描

### 依赖扫描

```bash
# Python
safety check
pip-audit

# Node.js
pnpm audit
npm audit
```

### 代码扫描

```bash
# Python
bandit -r src/

# TypeScript
npx eslint . --ext .ts,.tsx
```
