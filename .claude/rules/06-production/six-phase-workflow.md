---
paths:
  - "**/backend/**"
  - "**/frontend/**"
  - "**/app/**"
  - "**/src/**"
---

# 生产级六阶段开发流程

**适用于公司级别的生产系统开发。与学习项目不同，生产级项目要求更严格的工程纪律。**

---

## 完整流程图

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│              生产级开发工作流 (Solo Developer, Enterprise Discipline)         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  阶段 0：需求分析与设计                                                       │
│  ──────────────────────                                                     │
│  □ 编写 docs/REQUIREMENTS.md（功能需求、用户故事）                             │
│  □ 编写 docs/API_SPEC.md（API 设计，推荐 OpenAPI 3.0）                       │
│  □ 编写 docs/DATABASE.md（数据模型设计、ER 图）                               │
│  □ 创建 ADR（Architecture Decision Record）记录架构决策                       │
│  □ 获得自我审查通过后才开始编码                                               │
│                                                                             │
│  阶段 1：项目骨架搭建                                                         │
│  ──────────────────────                                                     │
│  □ 初始化 Clean Architecture 目录结构                                        │
│  □ 配置 CI/CD（GitHub Actions）                                             │
│  □ 配置 pre-commit hooks                                                    │
│  □ 配置 Docker + docker-compose（本地开发环境）                               │
│  □ 配置数据库迁移框架（Alembic）                                              │
│  □ 配置环境变量管理（.env + pydantic-settings）                               │
│  □ 配置日志框架（structlog / JSON 格式）                                      │
│  □ 初始化前端项目（Next.js + TypeScript strict）                              │
│                                                                             │
│  阶段 2：逐功能开发（核心循环，不可跳过）                                       │
│  ──────────────────────                                                     │
│  对每个功能垂直切片（从 domain 到 API 到前端）：                                │
│    ┌──────────────────────────────────────────────────────────────────┐     │
│    │ 1. 定义 Domain Entity / Value Object（类型 + 业务规则）           │     │
│    │ 2. 编写 Use Case + 单元测试（TDD：先写测试）                     │     │
│    │ 3. 实现 Repository 接口 + 具体实现                               │     │
│    │ 4. 编写数据库迁移（alembic revision --autogenerate）             │     │
│    │ 5. 编写 API Endpoint + 集成测试                                  │     │
│    │ 6. 实现前端 Feature Module（组件 + hooks + API 调用）            │     │
│    │ 7. 运行完整检查：                                                │     │
│    │    Backend:  pytest --cov + mypy src/ + ruff check .             │     │
│    │    Frontend: vitest + tsc --noEmit + eslint .                    │     │
│    │ 8. /commit                                                       │     │
│    └──────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  阶段 3：模块集成与测试                                                       │
│  ──────────────────────                                                     │
│  □ 跨功能集成测试                                                            │
│  □ E2E 测试（关键用户路径：注册→创建合同→支付 等）                              │
│  □ 性能基准测试（API 响应时间）                                               │
│  □ 安全审计（依赖扫描、OWASP 检查）                                          │
│                                                                             │
│  阶段 4：部署流水线                                                           │
│  ──────────────────────                                                     │
│  □ /commit-push-pr                                                          │
│  □ CI 自动运行：lint → type check → test → build → security scan            │
│  □ /code-review                                                             │
│  □ 合并到 main → 自动部署到 staging                                          │
│  □ 手动审批 → 部署到 production                                              │
│                                                                             │
│  阶段 5：运维与监控                                                           │
│  ──────────────────────                                                     │
│  □ 结构化日志（JSON 格式，方便搜索）                                          │
│  □ 错误追踪（Sentry）                                                       │
│  □ 健康检查端点（/health, /ready）                                           │
│  □ 数据库备份策略                                                            │
│  □ 告警配置（关键错误通知）                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 阶段 0：需求分析与设计

### 必须产出

- `docs/REQUIREMENTS.md` - 功能需求、用户故事
- `docs/API_SPEC.md` - API 设计（推荐 OpenAPI 3.0）
- `docs/DATABASE.md` - 数据模型设计、ER 图
- `docs/adr/` - 架构决策记录

### 完成标准

- 所有需求明确、无歧义
- API 设计完整
- 数据模型清晰
- 重要决策有 ADR 记录

---

## 阶段 1：项目骨架搭建

### 必须配置

- [ ] Clean Architecture 目录结构
- [ ] CI/CD（GitHub Actions）
- [ ] pre-commit hooks
- [ ] Docker + docker-compose
- [ ] 数据库迁移（Alembic）
- [ ] 环境变量管理
- [ ] 日志框架
- [ ] 前端项目（TypeScript strict）

---

## 阶段 2：逐功能开发

### 垂直切片开发

每个功能从 domain 到 API 到前端完整实现：

1. 定义 Domain Entity / Value Object
2. 编写 Use Case + 单元测试（TDD）
3. 实现 Repository 接口 + 具体实现
4. 编写数据库迁移
5. 编写 API Endpoint + 集成测试
6. 实现前端 Feature Module
7. 运行完整检查
8. /commit

---

## 阶段 3：模块集成与测试

### 测试类型

- 跨功能集成测试
- E2E 测试（关键用户路径）
- 性能基准测试
- 安全审计

---

## 阶段 4：部署流水线

### 流程

1. `/commit-push-pr`
2. CI 自动运行
3. `/code-review`
4. 合并到 main → 自动部署到 staging
5. 手动审批 → 部署到 production

---

## 阶段 5：运维与监控

### 必须配置

- 结构化日志（JSON 格式）
- 错误追踪（Sentry）
- 健康检查端点
- 数据库备份策略
- 告警配置
