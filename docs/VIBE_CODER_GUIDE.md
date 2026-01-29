# Vibe Coder 导览指南 - 铂润面料

> **你是项目的 Vibe Coder（项目负责人），Claude 是你的 AI 开发者。**
> 本文档告诉你在每个阶段**你需要做什么**，哪些事情 Claude 会自动处理。

---

## 目录

- [当前状态速览](#当前状态速览)
- [现在你需要做什么](#现在你需要做什么)
- [Claude 的迭代开发流程](#claude-的迭代开发流程)
- [阶段 2 详细进度追踪](#阶段-2-详细进度追踪)
- [本地环境：一次性设置](#本地环境一次性设置)
- [每次开发 Session 的流程](#每次开发-session-的流程)
- [各阶段详细分工](#各阶段详细分工)
- [腾讯云部署：什么时候需要](#腾讯云部署什么时候需要)
- [常见问题](#常见问题)

---

## 当前状态速览

| 阶段 | 状态 | 你需要做什么 |
|------|------|-------------|
| 阶段 0：需求文档修正 | ✅ 已完成 | 无 |
| 阶段 1：项目骨架搭建 | ✅ 已完成 | **首次启动本地环境**（见下方） |
| 阶段 2：核心数据模块 | 🔄 进行中 | 审查 PR、验证 API |
| 阶段 3：业务流程模块 | ⏳ 待开始 | 审查 PR、验证业务逻辑 |
| 阶段 4：前端开发 | ⏳ 待开始 | 体验 UI/UX、提供业务反馈 |
| 阶段 5：集成测试与加固 | ⏳ 待开始 | 端到端业务流程验收 |
| 阶段 6：部署上线 | ⏳ 待开始 | **购买腾讯云资源、配置域名** |

---

## 现在你需要做什么

### 立即行动清单

**1. 创建 GitHub 仓库（如果还没有）**

```bash
# 在 GitHub 上创建 Private 仓库：borealis-fabrics
# 然后在本地：
cd /Users/qinyuan/claude/r1ckyIn_GitHub/borealis-fabrics
git init
git add .
git commit -m "feat: project skeleton - phase 1 complete"
git remote add origin git@github.com:r1ckyIn/borealis-fabrics.git
git push -u origin main
```

**2. 启动本地开发环境**

你需要在本地运行 MySQL 和 Redis，后端和前端才能工作。

```bash
# 步骤 1：启动数据库和 Redis（Docker 必须先运行）
cd /Users/qinyuan/claude/r1ckyIn_GitHub/borealis-fabrics
docker compose -f backend/docker-compose.yml up -d

# 步骤 2：验证容器正在运行
docker compose -f backend/docker-compose.yml ps
# 应该看到 mysql 和 redis 两个容器状态为 running

# 步骤 3：运行数据库迁移（首次或 schema 变更后）
cd backend
npx prisma migrate dev

# 步骤 4：启动后端（终端 1）
pnpm start:dev

# 步骤 5：启动前端（终端 2）
cd ../frontend
pnpm dev
```

**3. 验证一切正常**

```bash
# 后端存活检查
curl http://localhost:3000/health
# 预期返回：{"status":"ok", ...}

# 前端页面
# 浏览器打开 http://localhost:5173
```

> **不需要现在做的事**：购买腾讯云、配置域名、配置企业微信——这些都是阶段 6（部署上线）才需要。

---

## Claude 的迭代开发流程

> **为什么一个功能要这么多步骤？**
>
> 这是生产级项目的标准做法。每一步检查都是为了：
> - **提前发现问题** - 避免后期大规模返工
> - **确保代码质量** - 测试覆盖、类型安全、代码风格
> - **保证安全性** - 检查 SQL 注入、XSS、硬编码密钥等漏洞

### Claude 做一个功能时会发生什么

```
┌────────────────────────────────────────────────────────────────┐
│  1. 规划（~5 分钟）                                             │
│     Claude 分析功能需求，列出要做的事情，征求你的同意             │
│     → 你审查计划，确认或提出修改                                 │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  2. 写测试（~10-15 分钟）                                       │
│     先写测试代码，运行测试确认它们失败（这是正常的 - TDD 红色）    │
│     → 你不需要做任何事                                          │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  3. 实现代码（~15-30 分钟）                                      │
│     写代码让测试通过，这个过程中会多次运行测试                    │
│     → 你不需要做任何事                                          │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  4. 验证循环（~10-20 分钟）                                      │
│     反复运行 build → test → lint，修复所有问题                   │
│     这个过程可能需要多轮，直到全部通过                           │
│     → 你不需要做任何事                                          │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  5. 代码审查（~5 分钟）                                          │
│     Claude 自己检查代码质量和安全性                              │
│     → 你可以同时审查代码变更                                     │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  6. 提交 + 更新文档（~5 分钟）                                   │
│     提交代码，更新 CLAUDE.md 的进度                              │
│     → 你确认功能完成，说"下一个"或提出问题                       │
└────────────────────────────────────────────────────────────────┘
```

**一个功能预计需要 30-60 分钟，不是几分钟。** 这是正常的生产级开发节奏。

### 验证循环是什么？

每次代码变更后，Claude 都会运行：

| 检查 | 命令 | 目的 |
|------|------|------|
| 构建 | `pnpm build` | 确保代码能编译 |
| 测试 | `pnpm test` | 确保功能正常工作 |
| Lint | `pnpm lint` | 确保代码风格一致 |
| 类型 | `pnpm typecheck` | 确保类型安全（前端） |

如果任何一步失败，Claude 会：
1. 停下来分析错误
2. 修复问题
3. **重新运行所有检查**
4. 反复直到全部通过

这个过程可能需要多轮，但这正是保证代码质量的关键。

---

## 阶段 2 详细进度追踪

### SupplierModule 功能清单

| # | 功能 | 描述 | 状态 |
|---|------|------|------|
| 2.1.1 | Service 基础设施 | 创建 SupplierService 类和依赖注入 | ✅ |
| 2.1.2 | Controller 基础设施 | 创建 SupplierController 和路由 | ✅ |
| 2.1.3 | Create Supplier | POST /api/v1/suppliers | ✅ |
| 2.1.4 | Get Supplier | GET /api/v1/suppliers/:id | ✅ |
| 2.1.5 | List Suppliers | GET /api/v1/suppliers (分页+筛选) | ✅ |
| 2.1.6 | Update Supplier | PATCH /api/v1/suppliers/:id | ✅ |
| 2.1.7 | Delete Supplier | DELETE /api/v1/suppliers/:id (软删除) | ✅ |
| 2.1.8 | 模块集成测试 | 测试所有 API 端点协同工作 | ✅ |

### CustomerModule 功能清单

| # | 功能 | 描述 | 状态 |
|---|------|------|------|
| 2.2.1 | Service 基础设施 | 创建 CustomerService 类和依赖注入 | ⏳ |
| 2.2.2 | Controller 基础设施 | 创建 CustomerController 和路由 | ⏳ |
| 2.2.3 | Create Customer | POST /api/v1/customers | ⏳ |
| 2.2.4 | Get Customer | GET /api/v1/customers/:id | ⏳ |
| 2.2.5 | List Customers | GET /api/v1/customers (分页+筛选) | ⏳ |
| 2.2.6 | Update Customer | PATCH /api/v1/customers/:id | ⏳ |
| 2.2.7 | Delete Customer | DELETE /api/v1/customers/:id (软删除) | ⏳ |
| 2.2.8 | 模块集成测试 | 测试所有 API 端点协同工作 | ⏳ |

### FabricModule 功能清单

| # | 功能 | 描述 | 状态 |
|---|------|------|------|
| 2.3.1 | Service 基础设施 | 创建 FabricService 类和依赖注入 | ⏳ |
| 2.3.2 | Controller 基础设施 | 创建 FabricController 和路由 | ⏳ |
| 2.3.3 | Create Fabric | POST /api/v1/fabrics | ⏳ |
| 2.3.4 | Get Fabric | GET /api/v1/fabrics/:id | ⏳ |
| 2.3.5 | List Fabrics | GET /api/v1/fabrics (分页+筛选) | ⏳ |
| 2.3.6 | Update Fabric | PATCH /api/v1/fabrics/:id | ⏳ |
| 2.3.7 | Delete Fabric | DELETE /api/v1/fabrics/:id (软删除) | ⏳ |
| 2.3.8 | 模块集成测试 | 测试所有 API 端点协同工作 | ⏳ |

### FileModule 功能清单

| # | 功能 | 描述 | 状态 |
|---|------|------|------|
| 2.4.1 | Service 基础设施 | 创建 FileService 类和依赖注入 | ⏳ |
| 2.4.2 | Controller 基础设施 | 创建 FileController 和路由 | ⏳ |
| 2.4.3 | Upload File | POST /api/v1/files | ⏳ |
| 2.4.4 | Get File | GET /api/v1/files/:id | ⏳ |
| 2.4.5 | Delete File | DELETE /api/v1/files/:id | ⏳ |
| 2.4.6 | 模块集成测试 | 测试所有 API 端点协同工作 | ⏳ |

### 当前进度

- **已完成功能**: SupplierModule 全部功能 (2.1.1 - 2.1.8)
- **当前状态**: SupplierModule 开发完成，PR #1 审查中
- **下一个功能**: 2.2.1 CustomerService 基础设施

---

## 本地环境：一次性设置

### 必须安装的软件

如果你还没有安装，按以下顺序安装：

| 软件 | 安装方式 | 用途 |
|------|----------|------|
| Docker Desktop | [下载](https://www.docker.com/products/docker-desktop/) | 运行 MySQL + Redis |
| Node.js 20 | `brew install node@20` 或 nvm | JavaScript 运行时 |
| pnpm | `npm install -g pnpm` | 包管理器 |

### 每天开发前需要做的事

```bash
# 1. 确保 Docker Desktop 已启动（macOS 菜单栏能看到 Docker 图标）

# 2. 启动数据库（如果昨天关了电脑的话）
docker compose -f backend/docker-compose.yml up -d

# 3. 你不需要每次手动启动后端和前端
#    Claude 在开发 session 中会告诉你什么时候需要启动
```

### 关机前（可选）

```bash
# 关闭数据库容器（释放资源，数据会保留）
docker compose -f backend/docker-compose.yml down

# 如果想清掉所有数据重新开始（谨慎）
docker compose -f backend/docker-compose.yml down -v
```

---

## 每次开发 Session 的流程

每个 Session = Claude 帮你实现一个功能。流程如下：

```
你的操作                                Claude 的操作
────────                                ──────────

1. 告诉 Claude 要做什么                  ─→
   "开始阶段 2 的 SupplierModule"

                                        ←─ 2. Claude 确认当前进度
                                           阅读 CLAUDE.md，确认要做的功能

                                        ←─ 3. Claude 制定计划，征求你的同意

3. 审查计划，说"可以"或提出修改          ─→

                                        ←─ 4. Claude 进入迭代循环：
                                           写测试 → 运行 → 写代码 → 运行
                                           build → test → lint → 修复
                                           反复直到全部通过
                                           （这可能需要 30-60 分钟）

                                        ←─ 5. Claude 完成后创建 commit
                                           并更新 CLAUDE.md 进度

6. 审查代码变更                          ─→
   （看 git diff 或 Claude 的摘要）

                                        ←─ 7. 功能完成，准备下一个

8. 如果是模块最后一个功能：              ─→
   - 手动测试 API（可选但推荐）
   - 说"创建 PR"

                                        ←─ 9. Claude 创建 PR + 运行 code review
                                           并更新 VIBE_CODER_GUIDE 进度
```

### 你需要关注的事情

| 关注点 | 什么时候 | 怎么做 |
|--------|---------|--------|
| **审查 Claude 的计划** | 每个功能开始前 | 看计划是否符合业务需求 |
| **审查代码变更** | 每个功能完成后 | 看 `git diff` 或 Claude 的摘要 |
| **手动测试 API** | 模块完成后（可选） | 用 Prisma Studio 或 curl 验证数据 |
| **体验前端 UI** | 阶段 4 | 在桌面浏览器打开 localhost:5173 |
| **提供业务反馈** | 随时 | 告诉 Claude 哪里不符合实际业务 |

### 你不需要做的事情

- ❌ 不需要自己写代码
- ❌ 不需要手动运行 lint/test/build（Claude 会做，而且会反复做）
- ❌ 不需要配置 ESLint/Prettier/TypeScript（已配好）
- ❌ 不需要写数据库迁移（Claude 用 Prisma 处理）
- ❌ 不需要现在部署到腾讯云（阶段 6 才需要）

---

## 各阶段详细分工

### 阶段 2：核心数据模块（后端）

**Claude 做什么**：按顺序实现 Supplier → Customer → Fabric → File 四个模块的 CRUD API，包含完整的测试。每个功能都会经历完整的迭代周期。

**你需要做什么**：

1. **每个模块开始时**：告诉 Claude "开始 SupplierModule"
2. **审查计划**：确认 API 设计符合业务需求
3. **模块完成后**（可选但推荐）：
   ```bash
   # 用 Prisma Studio 查看数据库
   cd backend && npx prisma studio
   # 浏览器会打开 http://localhost:5555，可以看到所有表和数据
   ```
4. **每个模块完成后**：告诉 Claude "创建 PR"
   - Claude 会创建 PR 并运行 /code-review
   - 你审查 PR，确认没问题后合并

**PR 创建节点（专业工作流）**：

| 模块 | PR |
|------|-----|
| SupplierModule 完成 | feature/supplier-module → main |
| CustomerModule 完成 | feature/customer-module → main |
| FabricModule 完成 | feature/fabric-module → main |
| FileModule 完成 | feature/file-module → main |

**预计需要 4-8 个 Session**（每个模块 1-2 个 Session，取决于功能复杂度）

---

### 阶段 3：业务流程模块（后端）

**Claude 做什么**：实现 Quote（报价）、Order（订单，最复杂，拆为 6 个子功能）、Logistics（物流）、Import（Excel 导入）、Auth（认证）、System（系统）模块。

**你需要做什么**：

1. **订单模块重点审查**：订单是最核心的业务，状态机逻辑（9 个状态转换）需要你确认是否符合实际流程
2. **Excel 导入测试**：Claude 完成后，你可以准备一个实际的面料 Excel 文件测试导入
3. **认证模块**：开发阶段使用 Mock 用户，企业微信 OAuth 在部署阶段接入

**预计需要 8-10 个 Session**

---

### 阶段 4：前端开发

**Claude 做什么**：实现所有桌面端页面（工作台、面料、供应商、客户、订单、报价、导入），使用 Ant Design 组件库。

**你需要做什么**：

1. **启动前端开发服务器**：
   ```bash
   cd frontend && pnpm dev
   ```
2. **在桌面浏览器测试**：
   - 打开 `http://localhost:5173`
   - 系统以桌面端为主要使用场景，直接在电脑浏览器中体验即可
3. **提供 UI/UX 反馈**：
   - 表格布局、列宽是否合理
   - 操作流程是否顺畅
   - 中文文案是否恰当
   - 是否缺少某些操作入口
   - 表单字段顺序和分组是否符合实际工作习惯

**这是你最需要参与的阶段** - 因为 UI 体验需要人工判断。

**预计需要 6-8 个 Session**

---

### 阶段 5：集成测试与安全加固

**Claude 做什么**：编写端到端测试、安全审计、性能测试。

**你需要做什么**：

1. **业务流程验收**：跟着 Claude 的测试场景走一遍完整流程：
   - 创建报价 → 转为订单 → 状态流转 → 付款 → 发货 → 完成
2. **确认测试结果**：Claude 会展示测试报告

---

### 阶段 6：部署上线

> **这是唯一需要你花钱和做大量手动操作的阶段。**

**Claude 做什么**：创建 Docker 生产配置、Nginx 配置、部署脚本。

**你需要做什么**（按顺序）：

| 步骤 | 操作 | 预计费用 |
|------|------|---------|
| 1 | 购买腾讯云轻量应用服务器（2C4G） | ~¥50-100/月 |
| 2 | 购买腾讯云 CDB MySQL | ~¥30-60/月 |
| 3 | 开通腾讯云 COS 存储桶（面料图片） | 按量计费，~¥5-10/月 |
| 4 | 开通腾讯云 Redis（可选，小规模可用服务器内 Redis） | ¥0-30/月 |
| 5 | 购买域名 + 完成 ICP 备案 | 域名 ~¥50/年，备案免费 |
| 6 | 申请 SSL 证书（免费） | ¥0 |
| 7 | 创建企业微信应用（用于员工登录） | ¥0 |
| 8 | 在服务器上配置 .env.production | Claude 会指导你 |
| 9 | 运行部署脚本 | Claude 会提供命令 |

> **ICP 备案需要 7-20 个工作日**，建议在阶段 4 前端开发期间就开始备案流程。

---

## 腾讯云部署：什么时候需要

```
现在（阶段 1-4）          不需要腾讯云，一切在本地运行
│
├── 阶段 4 期间            建议开始域名备案（需要时间）
│
└── 阶段 6                 购买服务器 + 部署上线
```

**本地开发 vs 线上的区别**：

| | 本地开发 | 线上部署 |
|--|---------|---------|
| 数据库 | Docker MySQL | 腾讯云 CDB |
| 缓存 | Docker Redis | 腾讯云 Redis |
| 文件存储 | 本地磁盘 | 腾讯云 COS |
| 认证 | Mock 用户（自动登录） | 企业微信 OAuth |
| 访问方式 | localhost | https://你的域名 |
| 费用 | ¥0 | ~¥100-200/月 |

---

## 与 Claude 协作的最佳实践

### 怎么开始一个 Session

```
✅ 好的开始方式：
"开始阶段 2 的 SupplierModule，实现供应商 CRUD"
"继续上次的 OrderModule，接着做状态机部分"
"前端的订单列表页面，参考需求文档 5.4 节"

❌ 避免的方式：
"把所有功能都写完"         → 太大了，一次只做一个功能
"帮我部署到线上"           → 还不到阶段 6
"这个代码看起来不对"       → 应该说具体哪里不对
```

### 什么时候该打断 Claude

- 计划中的 API 设计不符合实际业务
- 状态流转逻辑与你的业务流程不同
- 你觉得某个功能不需要或需要增减
- 前端页面的操作流程不直觉

### 什么时候让 Claude 自己跑

- 编写测试 → 实现代码 → 验证的循环
- ESLint/TypeScript 错误修复
- 数据库迁移生成
- CI/CD 配置调整

---

## 常见问题

### Q: 我需要懂编程吗？

不需要写代码，但建议理解以下概念：
- API 是什么（前端调用后端获取数据的接口）
- 数据库表和字段（Prisma Studio 可以可视化查看）
- Git commit 和 PR（代码变更的保存和审查机制）

### Q: 开发过程中数据会丢失吗？

- Docker 容器的数据保存在 volume 中，`docker compose down`（不加 `-v`）不会丢失数据
- 只有 `docker compose down -v` 才会清空数据
- Git 会保存所有代码变更历史，可以回滚

### Q: 我可以同时开两个 Claude Session 吗？

不建议。一次一个 Session，做完一个功能再做下一个，避免代码冲突。

### Q: 如果 Claude 写的代码有 bug 怎么办？

直接告诉 Claude 具体问题："供应商列表没有返回联系人信息" 或 "订单状态从生产中不应该能跳到已完成"。Claude 会走 bug 修复流程（写失败测试 → 修复 → 验证）。

### Q: 中途想修改需求怎么办？

直接告诉 Claude。如果变更影响数据库结构，Claude 会生成新的迁移文件。如果影响多个已完成的模块，Claude 会评估影响范围并给出修改计划。

### Q: 备案期间能继续开发吗？

可以。备案只影响线上域名访问，不影响本地开发。建议在阶段 4 就启动备案流程。

### Q: 为什么一个功能要这么久？

因为 Claude 遵循**严格的迭代开发流程**：

1. **先写测试** - 确保功能有明确的验收标准
2. **再写代码** - 只写足够通过测试的代码
3. **验证循环** - build → test → lint 全部通过
4. **如果失败** - 修复 → 重新运行所有验证 → 反复

这个过程确保每个功能都是：
- 有测试覆盖的
- 能编译的
- 符合代码规范的
- 类型安全的

一个功能 30-60 分钟是正常的，这不是效率低，而是生产级代码应有的质量标准。

### Q: Claude 在反复检查什么？

每次代码变更后，Claude 都会运行 4 项检查：

| 检查 | 检查什么 | 为什么重要 |
|------|---------|-----------|
| `pnpm build` | 代码能否编译 | 防止语法错误上线 |
| `pnpm test` | 功能是否正常 | 防止 bug 上线 |
| `pnpm lint` | 代码风格是否一致 | 保持代码可维护性 |
| `pnpm typecheck` | 类型是否正确 | 防止运行时类型错误 |

如果任何一项失败，Claude 会修复问题并**重新运行所有检查**，直到全部通过。

---

## 速查卡

```
┌─────────────────────────────────────────────────────┐
│                 Vibe Coder 速查卡                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  每天开发前：                                        │
│  1. 打开 Docker Desktop                             │
│  2. docker compose -f backend/docker-compose.yml    │
│     up -d                                           │
│                                                     │
│  开始 Session：                                      │
│  "开始 [阶段X] 的 [模块名]"                          │
│                                                     │
│  Claude 做完后：                                     │
│  1. 审查代码摘要                                     │
│  2. 有问题就提出                                     │
│  3. 没问题就说"下一个"或"创建 PR"                     │
│                                                     │
│  查看数据库：                                        │
│  cd backend && npx prisma studio                    │
│                                                     │
│  查看前端页面：                                      │
│  浏览器打开 http://localhost:5173                    │
│                                                     │
│  出问题了：                                          │
│  直接描述问题，Claude 会修复                          │
│                                                     │
│  为什么这么慢：                                      │
│  Claude 遵循严格迭代流程：                            │
│  规划 → 写测试 → 写代码 → 验证循环 → 提交            │
│  一个功能 30-60 分钟是正常的                          │
│                                                     │
│  腾讯云：阶段 6 才需要，现在不用管                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```
