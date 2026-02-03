# Vibe Coder 导览指南 - 铂润面料

> **你是项目负责人，Claude 是你的 AI 开发者。**
> 本文档告诉你**当前进度**和**下一步做什么**。

---
### 用户初始化输入格式

进行初始化，为[功能]创建一个新的分支并切换在严格执行01workflow开发周期八步骤的前提下开发它

## 当前状态速览

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段 1：项目骨架 | ✅ 完成 | NestJS + React + Prisma 搭建完毕 |
| 阶段 2：核心数据模块 | ✅ 完成 | 4 个模块全部完成 |
| 阶段 3：业务流程模块 | 🔄 进行中 | QuoteModule ✅, OrderModule 主表 API ✅ |
| 阶段 4：前端开发 | ⏳ 待开始 | - |
| 阶段 5：集成测试 | ⏳ 待开始 | - |
| 阶段 6：部署上线 | ⏳ 待开始 | 届时需购买腾讯云 |

---

## 阶段 2 详细进度

> **进度追踪以 CLAUDE.md 为准**，本节是简化视图。

### 2.1 SupplierModule ✅ 完成

| 功能 | 状态 |
|------|------|
| 基础 CRUD（列表/详情/创建/更新/删除） | ✅ |
| 2.1.7 获取供应商可供应面料 | ✅ |
| E2E 集成测试 | ✅ |

### 2.2 CustomerModule ✅ 完成

| 功能 | 状态 |
|------|------|
| 基础 CRUD | ✅ |
| 2.2.7-2.2.10 客户特殊定价 CRUD | ✅ |
| E2E 集成测试 | ✅ |
| 2.2.11 客户历史订单（依赖 OrderModule） | ⏳ 移至阶段 3 |

### 2.3 FabricModule ✅ 完成

| 功能 | 状态 |
|------|------|
| 基础 CRUD | ✅ |
| 2.3.7-2.3.8 图片上传/删除 | ✅ |
| 2.3.9-2.3.12 面料-供应商关联 CRUD | ✅ |
| 2.3.13-2.3.16 面料特殊定价 CRUD | ✅ |
| E2E 集成测试 | ✅ |

### 2.4 FileModule ✅ 完成

| 功能 | 状态 |
|------|------|
| 文件上传/获取/删除 | ✅ |
| 安全修复（路径遍历、文件名验证） | ✅ |
| E2E 集成测试 | ✅ |

---

## 现在要做什么

### 阶段 3 进行中

#### 已完成

- ✅ **QuoteModule**（报价管理）- 6 个 API 端点
- ✅ **OrderModule 订单主表 API**（3.2.1-3.2.5）- 5 个 API 端点

#### 下一步：订单明细 API（3.2.6-3.2.12）

```bash
# 1. 创建分支
git checkout -b feature/stage3-order-items-api

# 2. 告诉 Claude
"进行初始化，为订单明细 API（3.2.6-3.2.12）创建一个新的分支并切换在严格执行开发周期八步骤的前提下开发它"
```

#### 阶段 3 剩余模块

| 模块 | 功能 | 状态 |
|------|------|------|
| OrderModule 明细 API | 3.2.6-3.2.12 | ⏳ 下一步 |
| OrderModule 时间线 API | 3.2.13-3.2.14 | ⏳ |
| OrderModule 付款 API | 3.2.15-3.2.17 | ⏳ |
| LogisticsModule | 物流管理 | ⏳ |
| ImportModule | 批量导入 | ⏳ |
| AuthModule | 企业微信认证 | ⏳ |
| SystemModule | 枚举值+健康检查 | ⏳ |

---

## 人工干预工作流（简化版）

### 核心原则

```
❌ 不要一次说"把整个模块做完"
✅ 每轮给一个明确指令，确认后再继续

❌ 不要让 Claude 执行 git checkout/branch
✅ 分支操作自己做
```

### 单功能开发流程

```
┌─────────────────────────────────────────────────────────────┐
│  你的操作                     Claude 的操作                  │
├─────────────────────────────────────────────────────────────┤
│  1. git checkout -b feature/xxx                             │
│                                                             │
│  2. "开发功能 2.x.x"  ──────→  规划 + 征求批准               │
│                                                             │
│  3. "批准"           ──────→  TDD：写测试 → 实现 → 验证      │
│                              （Build/Test/Lint 循环）        │
│                                                             │
│  4. 等待完成         ←──────  提交 + 更新 CLAUDE.md          │
│                                                             │
│  5. "继续下一个" 或 "创建 PR"                                │
└─────────────────────────────────────────────────────────────┘
```

### 模块完成后

```bash
# 1. 你推送分支
git push -u origin feature/xxx

# 2. 告诉 Claude
"创建 PR 并运行 /code-review"

# 3. 修复 review 问题后，在 GitHub 上合并 PR

# 4. 合并后清理
git checkout main
git pull
git branch -d feature/xxx
```

---

## 验证命令速查

```bash
# 后端（在 backend/ 目录）
pnpm build && pnpm test && pnpm lint

# 后端 E2E 测试
pnpm test:e2e

# 前端（在 frontend/ 目录）
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

---

## 本地环境

### 每天开发前

```bash
# 1. 确保 Docker Desktop 已启动

# 2. 启动数据库
docker compose -f backend/docker-compose.yml up -d

# 3. 验证
docker compose -f backend/docker-compose.yml ps
```

### 查看数据库

```bash
cd backend && npx prisma studio
# 浏览器打开 http://localhost:5555
```

---

## 前端开发环境准备

### 启动前检查清单

| 项目 | 检查命令 | 预期结果 |
|------|---------|---------|
| Docker Desktop | - | 已启动 |
| MySQL | `docker ps \| grep mysql` | backend-db-1 运行中 |
| Redis | `docker ps \| grep redis` | redis 运行中 |
| 后端 .env | `ls backend/.env` | 文件存在 |
| 后端依赖 | `ls backend/node_modules` | 目录存在 |
| 前端依赖 | `ls frontend/node_modules` | 目录存在 |
| 数据库迁移 | `cd backend && npx prisma migrate status` | "Database schema is up to date!" |

### 启动开发服务器

需要**两个终端**分别运行：

**终端 1 - 后端 (NestJS)**
```bash
cd backend
pnpm start:dev
# 运行在 http://localhost:3000
```

**终端 2 - 前端 (React + Vite)**
```bash
cd frontend
pnpm dev
# 运行在 http://localhost:5173
```

### 一键启动数据库

```bash
# 启动 MySQL + Redis
docker compose -f backend/docker-compose.yml up -d

# 验证状态
docker compose -f backend/docker-compose.yml ps
```

### 前端 .env 配置（如需要）

```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

---

## 阶段 2 完成标准 ✅

阶段 2 已于 2026-01-30 完成：

- [x] SupplierModule 全部完成（基础 CRUD + 关联 API）
- [x] CustomerModule 基础 + 定价完成（历史订单移至阶段 3）
- [x] FabricModule 供应商关联 API（2.3.9-2.3.12）
- [x] FabricModule 特殊定价 API（2.3.13-2.3.16）
- [x] FileModule 全部完成（含安全修复）

**验证结果**：
- `pnpm build` ✅
- `pnpm test` ✅ 293 tests passed
- `pnpm test:e2e` ✅ 268 tests passed
- `pnpm lint` ✅

---

## 阶段 3 预览

完成阶段 2 后，阶段 3 将开发：

| 模块 | 说明 |
|------|------|
| QuoteModule | 报价管理 + 过期自动标记 |
| OrderModule | 订单状态机（9 个状态）+ 付款追踪 |
| LogisticsModule | 物流信息记录 |
| ImportModule | Excel 批量导入 |
| AuthModule | 企业微信 OAuth |
| SystemModule | 枚举值 + 健康检查 |

---

## 常见问题

**Q: 一个功能要多久？**
30-60 分钟。Claude 遵循 TDD + 验证循环，这是生产级代码的正常节奏。

**Q: 出 bug 了怎么办？**
直接描述问题，Claude 会走修复流程。

**Q: 腾讯云什么时候需要？**
阶段 6 才需要，现在一切在本地运行。

---

## 文档关系

| 文档 | 用途 |
|------|------|
| **CLAUDE.md** | 详细进度追踪（以此为准） |
| **VIBE_CODER_GUIDE.md** | 简化视图 + 操作指南（本文档） |
| **docs/REQUIREMENTS_TECHNICAL.md** | 技术需求规格 |
| **docs/REQUIREMENTS_BUSINESS.md** | 业务需求规格 |

---

*最后更新：2026-01-30（阶段 2 完成）*
