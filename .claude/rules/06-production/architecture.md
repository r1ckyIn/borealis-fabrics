---
paths:
  - "**/backend/**"
  - "**/frontend/**"
  - "**/app/**"
  - "**/src/**"
---

# 生产级项目架构

本文件定义了生产级项目的架构标准。

---

## 项目信息

| 项目 | 值 |
|------|-------|
| 租房合同管理平台 | 合同 CRUD、租户管理、支付跟踪、文档生成 |
| 订单处理平台 | 商品管理、订单流程、支付集成、物流跟踪 |
| 后端技术栈 | Python 3.12+ / FastAPI / SQLAlchemy 2.0 / Alembic / Pydantic v2 |
| 前端技术栈 | React / Next.js 14+ (App Router) / TypeScript (strict) |
| 部署环境 | AWS + 阿里云（双云部署） |
| 开发方式 | 独立开发，企业级纪律 |
| 依赖管理 | Poetry 或 uv（后端）/ pnpm（前端） |
| 容器化 | Docker + docker-compose（本地开发） |

---

## 后端架构：Clean Architecture（强制）

```text
backend/
├── app/
│   ├── domain/              # 核心业务逻辑（零外部依赖）
│   │   ├── entities/        # 实体：Contract, Order, Tenant, Product
│   │   ├── value_objects/   # 值对象：Money, Address, DateRange
│   │   ├── repositories/    # 仓储接口（只有抽象类，不含实现）
│   │   ├── services/        # 领域服务（纯业务规则）
│   │   └── exceptions.py    # 领域异常
│   │
│   ├── application/         # 用例层（编排业务流程）
│   │   ├── use_cases/       # 具体用例：CreateContract, ProcessOrder
│   │   ├── dto/             # 数据传输对象（输入/输出）
│   │   └── interfaces/      # 外部服务接口（邮件、支付、存储等）
│   │
│   ├── infrastructure/      # 基础设施层（可替换）
│   │   ├── database/        # SQLAlchemy models + session 管理
│   │   ├── repositories/    # 仓储接口的具体实现
│   │   ├── external/        # 第三方服务（支付宝、AWS S3、阿里云 OSS）
│   │   └── config.py        # 配置管理（pydantic-settings）
│   │
│   └── presentation/        # API 层（FastAPI）
│       ├── api/             # 路由定义
│       ├── middleware/      # 认证、日志、CORS 等中间件
│       ├── dependencies/    # FastAPI 依赖注入
│       └── schemas/         # 请求/响应 Pydantic schema
│
├── tests/
│   ├── unit/                # 单元测试（domain + application）
│   ├── integration/         # 集成测试（infrastructure + API）
│   └── e2e/                 # 端到端测试（完整用户流程）
│
├── alembic/                 # 数据库迁移
│   └── versions/            # 迁移版本文件
├── scripts/                 # 部署/维护/数据脚本
├── pyproject.toml           # 依赖管理
├── Dockerfile
├── docker-compose.yml       # 本地开发环境
└── .env.example             # 环境变量模板（不含真实值）
```

### 依赖方向（严格单向）

```
presentation → application → domain ← infrastructure
                                    ↑
                            infrastructure 实现 domain 定义的接口
```

---

## 前端架构：Feature-Based 模块化（强制）

```text
frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # 认证相关页面组
│   │   ├── dashboard/       # 仪表盘
│   │   ├── contracts/       # 合同管理页面（租房平台）
│   │   ├── orders/          # 订单管理页面（订单平台）
│   │   └── layout.tsx       # 根布局
│   │
│   ├── features/            # 按功能模块划分（核心）
│   │   ├── contracts/       # 合同功能模块
│   │   │   ├── components/  # 该功能专用组件
│   │   │   ├── hooks/       # 该功能专用 hooks
│   │   │   ├── api/         # API 调用层
│   │   │   ├── types.ts     # 类型定义
│   │   │   └── utils.ts     # 功能专用工具函数
│   │   └── orders/          # 订单功能模块
│   │
│   ├── shared/              # 跨功能共享
│   │   ├── components/      # 通用 UI 组件（Button, Modal, Table）
│   │   ├── hooks/           # 通用 hooks（useAuth, usePagination）
│   │   ├── utils/           # 通用工具函数
│   │   ├── types/           # 全局类型定义
│   │   └── lib/             # 第三方库封装
│   │
│   └── config/              # 应用配置
│
├── tests/
│   ├── unit/                # 组件/hooks 单元测试
│   └── e2e/                 # Playwright E2E 测试
├── package.json
├── tsconfig.json            # strict: true
└── next.config.ts
```

---

## 防维护地狱关键实践

```text
1. 类型安全无死角
   - Backend: 每个函数都有类型注解 + Pydantic 验证所有边界数据
   - Frontend: TypeScript strict 模式，禁止 any

2. 数据库变更只通过迁移
   - 使用 Alembic，绝不手动改表

3. ADR 记录每个架构决策
   - 6个月后回来维护时，读 ADR 就能理解设计意图

4. 依赖版本锁定
   - pyproject.toml / package.json 中锁定精确版本
   - 定期更新依赖并运行完整测试

5. 自动化一切可自动化的
   - CI/CD 自动运行 lint/test/build
   - Pre-commit hooks 自动检查
   - 数据库迁移自动生成

6. 测试覆盖率 >= 80%
   - 核心业务逻辑（domain）覆盖率 >= 95%
   - 优先测试 use cases 和 domain services
```
