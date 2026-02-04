# Borealis Fabrics - 系统架构文档

**文档版本**：v1.0
**创建日期**：2026-02-03
**关联文档**：[BRD v3.1](./REQUIREMENTS_BUSINESS.md) | [TRD v2.2](./REQUIREMENTS_TECHNICAL.md)

---

## 一、项目概述

### 1.1 系统名称

**Borealis Fabrics（铂润面料数字化管理系统）**

### 1.2 业务背景

铂润是一家面料贸易中间商，主营业务是从面料原厂采购面料，销售给大型家具公司。

| 指标 | 数值 |
|------|------|
| 供应商数量 | ~100 家 |
| B端客户数量 | ~50 家 |
| 月均订单量 | 500+ 单 |

### 1.3 商业模式

**纯贸易中间商模式**：

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  面料供应商    │ ───→ │    铂润      │ ───→ │  家具公司客户  │
│  （约100家）   │      │  （信息撮合）  │      │ （约50家B端） │
└──────────────┘      └──────────────┘      └──────────────┘
```

**关键特点**：
- ✅ **按需采购**（客户下单后再向供应商采购，不提前备货）
- ✅ **供应商直发**（供应商直接发货给客户）
- ✅ **买卖价差**（利润来源，无固定比例，随市场定价）
- ❌ 铂润没有自己的仓库（但存在少量库存概念，后期迭代）

### 1.4 核心目标

| 目标 | 描述 |
|------|------|
| 告别信息孤岛 | 将分散在 Excel、微信、纸质单据中的数据统一管理 |
| 提升工作效率 | 减少人工传话、重复沟通，实现信息自动同步 |
| 规范业务流程 | 建立标准化的询价、下单、跟踪流程（9个状态节点） |
| 智能辅助决策 | 通过AI帮助快速查找面料、自动处理常规事务（远期目标） |

---

## 二、业务架构

### 2.1 业务实体关系图

```
                    ┌─────────────┐
                    │   Customer  │
                    │   (客户)     │
                    └──────┬──────┘
                           │ 1:N
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │  Quote    │    │   Order   │    │ Customer  │
    │  (报价)   │───→│   (订单)   │    │  Pricing  │
    └─────┬─────┘    └─────┬─────┘    │ (特殊定价) │
          │                │          └─────┬─────┘
          │                │ 1:N            │
          │                ▼                │
          │          ┌───────────┐          │
          └─────────→│ OrderItem │←─────────┘
                     │ (订单明细) │
                     └─────┬─────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │  Fabric   │    │ Supplier  │    │ Logistics │
    │  (面料)   │    │  (供应商)  │    │  (物流)    │
    └─────┬─────┘    └─────┬─────┘    └───────────┘
          │                │
          └────────┬───────┘
                   ▼
           ┌─────────────┐
           │FabricSupplier│
           │(面料-供应商) │
           └─────────────┘
```

### 2.2 核心业务流程

```
阶段一：询价报价
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[客户] ──→ 通过微信/邮件询价，描述需要的面料
                    ↓
[铂润员工] ──→ 系统查找匹配的面料（取代记忆+相册）
                    ↓
[铂润员工] ──→ 向供应商询价，确认能否供货
                    ↓
[铂润员工] ──→ 给客户报价（有一定有效期，员工自定义）


阶段二：下单付款
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[客户] ──→ 确认接受报价，下单
                    ↓
[客户] ──→ 付款给铂润 ⭐（90%业务在此时付款，或走账期）
                    ↓
[铂润员工] ──→ 向供应商正式下单（付款或走账期）
                    ↓
[供应商] ──→ 确认订单，确认交货期


阶段三：生产质检
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[供应商] ──→ 安排生产
                    ↓
[供应商] ──→ 质量检验确认是否OK


阶段四：发货交付
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[供应商] ──→ 发送货物，提供物流信息
                    ↓
[铂润员工] ──→ 记录物流信息（物流公司、联系人、电话、单号）
                    ↓
[客户] ──→ 到达客户指定仓库


阶段五：对账收款
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[铂润员工] ──→ 对账
                    ↓
[客户] ──→ 收款完成（如有账期，此时付款）
                    ↓
[铂润员工] ──→ 向供应商付款（如有账期）
                    ↓
订单结束
```

### 2.3 关键业务规则速查

| 规则 | 描述 |
|------|------|
| **订单聚合状态** | 订单主表 status = 所有明细中进度最低的状态（已取消明细不参与） |
| **付款与订单状态** | MVP 不绑定，仅提醒，各自独立变更 |
| **账期** | 双向：客户→铂润、铂润→供应商，分别追踪 |
| **报价有效期** | 员工自定义（7天/15天/30天等均可能） |
| **报价转订单** | 仅 active 且未过期的报价可转换，转换后状态变为 converted |
| **Excel导入冲突** | 编号已存在的行**跳过不导入**，不覆盖、不更新 |
| **面料计量单位** | 统一为**米** |
| **定价优先级** | 客户特殊定价 > 面料默认销售价 |
| **供应商选择** | 员工人工选择，不区分主/备供应商 |

### 2.4 订单状态机

**9 个状态**：

```
┌────────────────────────────────────────────────────────────────────┐
│                          订单状态流转                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  INQUIRY ─→ PENDING ─→ ORDERED ─→ PRODUCTION ─→ QC                │
│  (询价中)   (待下单)   (已下单)    (生产中)    (质检中)              │
│                                                   │                │
│                          ┌────────────────────────┘                │
│                          ▼                                         │
│                       SHIPPED ─→ RECEIVED ─→ COMPLETED             │
│                       (已发货)   (已签收)    (已完成)               │
│                                                                    │
│  ═══════════════════════════════════════════════════════════════  │
│                                                                    │
│  任意状态 ──→ CANCELLED (已取消)                                   │
│              │                                                     │
│              └──→ 可恢复到 prevStatus（取消前的状态）                │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**状态转换规则**：

| 当前状态 | 允许转换到 |
|---------|-----------|
| INQUIRY | PENDING, CANCELLED |
| PENDING | ORDERED, CANCELLED |
| ORDERED | PRODUCTION, CANCELLED |
| PRODUCTION | QC, CANCELLED |
| QC | SHIPPED, CANCELLED |
| SHIPPED | RECEIVED, CANCELLED |
| RECEIVED | COMPLETED, CANCELLED |
| COMPLETED | CANCELLED |
| CANCELLED | 恢复到 prevStatus |

**状态进度排序**（用于聚合计算）：
```
INQUIRY < PENDING < ORDERED < PRODUCTION < QC < SHIPPED < RECEIVED < COMPLETED
```

---

## 三、技术架构

### 3.1 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层                                │
├──────────┬──────────────┬───────────────────────────────────┤
│ Web 工作台 │ 企业微信应用   │ 微信小程序（二期）                  │
│ (React)  │ (OAuth 登录)  │ (原生小程序)                      │
└────┬─────┴──────┬───────┴──────────┬────────────────────────┘
     │            │                  │
     └────────────┼──────────────────┘
                  │ HTTPS / REST API
     ┌────────────┴────────────────┐
     │       Nginx 反向代理         │
     └────────────┬────────────────┘
                  │
     ┌────────────┴────────────────────────────────────┐
     │      NestJS 模块化单体 (Modular Monolith)         │
     │  ┌──────────────────────────────────────────┐   │
     │  │ AuthModule     — 企业微信 OAuth           │   │
     │  │ FabricModule   — 面料 CRUD + 搜索         │   │
     │  │ SupplierModule — 供应商管理               │   │
     │  │ CustomerModule — 客户 + 特殊定价          │   │
     │  │ OrderModule    — 订单状态机 + 付款追踪     │   │
     │  │ QuoteModule    — 报价 + 有效期管理        │   │
     │  │ LogisticsModule— 物流信息记录             │   │
     │  │ FileModule     — COS 文件上传             │   │
     │  │ ImportModule   — Excel 批量导入           │   │
     │  │ CommonModule   — 日志/异常/拦截器         │   │
     │  └──────────────────────────────────────────┘   │
     │           Prisma ORM (类型安全 + 迁移)            │
     └────────────┬────────────────────────────────────┘
                  │
     ┌────────────┴────────────────┐
     │        数据层                │
     │  ┌──────┐ ┌──────┐ ┌─────┐ │
     │  │MySQL │ │Redis │ │ COS │ │
     │  │(CDB) │ │缓存  │ │存储 │ │
     │  └──────┘ └──────┘ └─────┘ │
     └─────────────────────────────┘
```

### 3.2 技术栈清单

#### 后端技术栈

| 技术 | 版本/选型 | 用途 |
|------|----------|------|
| 运行时 | Node.js 20 LTS | 服务端运行环境 |
| 框架 | NestJS 11.x | 模块化后端框架 |
| 语言 | TypeScript 5.x (strict) | 类型安全 |
| ORM | Prisma 6.x | 数据库访问 + 迁移 |
| 数据库 | MySQL 8.0 (腾讯云 CDB) | 主数据存储 |
| 缓存 | Redis 7.x | 编号生成、会话缓存 |
| 文件存储 | 腾讯云 COS | 面料图片 |
| 认证 | @nestjs/passport + passport-oauth2 | 企业微信 OAuth |
| 验证 | class-validator + class-transformer | DTO 验证 |
| 日志 | nestjs-pino | 结构化 JSON 日志 |
| 定时任务 | @nestjs/schedule | 报价过期检查 |
| Excel 解析 | exceljs | 批量导入 |
| 测试 | Jest + SuperTest | 单元测试 + E2E 测试 |

#### 前端技术栈（一期 Web 工作台）

| 技术 | 版本/选型 | 用途 |
|------|----------|------|
| 框架 | React 18.x | UI 框架 |
| 语言 | TypeScript 5.x (strict) | 类型安全 |
| 构建工具 | Vite 7.x | 快速构建 |
| UI 组件库 | Ant Design 5.x | 企业级 UI |
| 路由 | React Router v6 | SPA 路由 |
| 数据请求 | TanStack Query 5.x | 服务端状态管理 |
| HTTP 客户端 | Axios | API 请求 |
| 状态管理 | Zustand 5.x | 客户端状态 |
| 测试 | Vitest | 单元测试 |

### 3.3 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| MySQL | 3306 | 数据库 |
| Redis | 6381 | 缓存（避免与其他项目冲突） |
| 后端 API | 3000 | NestJS 服务（默认） |
| 前端 Vite | 5173 | 开发服务器（默认） |

---

## 四、后端架构

### 4.1 模块结构

| 模块 | 职责 | 对应 BRD 章节 |
|------|------|---------------|
| **AuthModule** | 企业微信 OAuth 登录、JWT 会话管理、用户信息同步 | - |
| **FabricModule** | 面料 CRUD、搜索筛选、图片管理、客户特殊定价 | BRD 5.1 |
| **SupplierModule** | 供应商 CRUD、面料-供应商关联管理 | BRD 5.2 |
| **CustomerModule** | 客户 CRUD、商务信息、特殊定价 | BRD 5.3 |
| **OrderModule** | 订单 CRUD、状态机流转、付款追踪（双向）、订单时间线 | BRD 5.4 |
| **QuoteModule** | 报价 CRUD、有效期管理、过期自动标记、报价转订单 | BRD 5.5 |
| **LogisticsModule** | 物流信息 CRUD、关联订单明细 | BRD 5.6 |
| **FileModule** | 文件上传到 COS、图片 URL 管理 | BRD 5.1.3 |
| **ImportModule** | Excel 批量导入（面料、供应商） | BRD 5.1.6, 5.2.3 |
| **CommonModule** | 全局异常过滤器、日志中间件、请求拦截器、分页工具 | - |

### 4.2 模块依赖关系

```
AuthModule ←──── 所有模块（认证守卫）
CommonModule ←── 所有模块（通用工具）

FabricModule ←── OrderModule（面料信息引用）
                 QuoteModule（面料报价引用）
                 ImportModule（面料批量导入）

SupplierModule ←── FabricModule（供应商关联）
                   OrderModule（采购供应商选择）
                   ImportModule（供应商批量导入）

CustomerModule ←── OrderModule（客户订单关联）
                   QuoteModule（客户报价关联）
                   FabricModule（客户特殊定价）

FileModule ←── FabricModule（图片上传）

LogisticsModule ←── OrderModule（物流关联）
```

### 4.3 目录结构

```
backend/
├── src/
│   ├── main.ts                  # 应用入口
│   ├── app.module.ts            # 根模块
│   │
│   ├── common/                  # CommonModule
│   │   ├── common.module.ts
│   │   ├── filters/             # 全局异常过滤器
│   │   ├── interceptors/        # 请求拦截器
│   │   ├── decorators/          # 自定义装饰器
│   │   └── dto/                 # 通用 DTO
│   │
│   ├── auth/                    # AuthModule
│   ├── fabric/                  # FabricModule
│   ├── supplier/                # SupplierModule
│   ├── customer/                # CustomerModule
│   ├── order/                   # OrderModule
│   ├── quote/                   # QuoteModule
│   ├── logistics/               # LogisticsModule
│   ├── file/                    # FileModule
│   ├── import/                  # ImportModule
│   ├── redis/                   # RedisModule
│   └── prisma/                  # PrismaModule
│
├── prisma/
│   ├── schema.prisma            # 数据库 Schema
│   └── migrations/              # 迁移文件
│
├── test/                        # E2E 测试
└── .env.example                 # 环境变量模板
```

### 4.4 单模块结构示例

```
src/order/
├── order.module.ts              # 模块定义
├── order.controller.ts          # 控制器
├── order.service.ts             # 服务层
├── order.controller.spec.ts     # 单元测试
├── order.service.spec.ts        # 单元测试
└── dto/
    ├── create-order.dto.ts      # 创建 DTO
    ├── update-order.dto.ts      # 更新 DTO
    ├── query-order.dto.ts       # 查询 DTO
    └── order-item.dto.ts        # 明细 DTO
```

---

## 五、前端架构

### 5.1 目录结构

```
frontend/src/
├── main.tsx                 # 入口
├── App.tsx                  # 根组件
│
├── pages/                   # 页面组件
│   ├── fabrics/             # 面料管理
│   ├── suppliers/           # 供应商管理
│   ├── customers/           # 客户管理
│   ├── orders/              # 订单管理
│   ├── quotes/              # 报价管理
│   └── import/              # 批量导入
│
├── components/              # 共享组件
│   ├── layout/              # 布局组件
│   ├── form/                # 表单组件
│   └── common/              # 通用组件
│
├── api/                     # API 请求封装
│   ├── client.ts            # Axios 实例
│   ├── fabric.ts
│   ├── supplier.ts
│   ├── customer.ts
│   ├── order.ts
│   ├── quote.ts
│   └── types.ts             # API 类型定义
│
├── hooks/                   # 自定义 Hooks
├── store/                   # Zustand 状态
├── utils/                   # 工具函数
└── types/                   # 全局类型
```

### 5.2 状态管理策略

| 状态类型 | 管理方案 | 示例 |
|---------|---------|------|
| 服务端状态 | TanStack Query | 面料列表、订单详情 |
| 客户端状态 | Zustand | 侧边栏折叠、主题设置 |
| 表单状态 | Ant Design Form | 创建/编辑表单 |
| URL 状态 | React Router | 分页、筛选参数 |

### 5.3 路由设计

```
/                           # 重定向到 /orders
/login                      # 登录页（企业微信 OAuth）
/fabrics                    # 面料列表
/fabrics/:id                # 面料详情
/suppliers                  # 供应商列表
/suppliers/:id              # 供应商详情
/customers                  # 客户列表
/customers/:id              # 客户详情
/orders                     # 订单列表
/orders/:id                 # 订单详情
/quotes                     # 报价列表
/quotes/:id                 # 报价详情
/import                     # 批量导入
```

---

## 六、数据库设计

### 6.1 ER 图概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                           数据库表关系                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  users ──────────────────────┬──────────────────────────────────┐  │
│    │                         │                                  │  │
│    │ 1:N                     │ 1:N                              │  │
│    ▼                         ▼                                  │  │
│  order_timelines          payment_records                       │  │
│                                                                     │
│  fabrics ────────────────────┬──────────────────────────────────┐  │
│    │                         │                                  │  │
│    │ 1:N                     │ 1:N                              │  │
│    ▼                         ▼                                  │  │
│  fabric_images           fabric_suppliers ─── suppliers         │  │
│    │                         │                    │             │  │
│    │                         │                    │ 1:N         │  │
│    │                         │                    ▼             │  │
│    │                         │            supplier_payments     │  │
│    │                         │                                  │  │
│  customers ──────────────────┼──────────────────────────────────┤  │
│    │                         │                                  │  │
│    │ 1:N                     │ 1:N                              │  │
│    ▼                         ▼                                  │  │
│  customer_pricing         quotes                                │  │
│    │                         │                                  │  │
│    │                         │ 1:N (via quoteId)                │  │
│    │                         ▼                                  │  │
│  orders ────────────────► order_items ◄──────── logistics       │  │
│    │                         │                                  │  │
│    │ 1:N                     │ 1:N                              │  │
│    ▼                         ▼                                  │  │
│  payment_records         order_timelines                        │  │
│                                                                     │
│  files (独立的通用文件表)                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 15 张表清单

| # | 表名 | 说明 | 关键字段 |
|---|------|------|---------|
| 1 | users | 员工/用户 | weworkId, name, avatar |
| 2 | fabrics | 面料目录 | fabricCode (BF-YYMM-NNNN), name, defaultPrice |
| 3 | fabric_images | 面料图片 | fabricId, url, sortOrder |
| 4 | fabric_suppliers | 面料-供应商关联 | fabricId, supplierId, purchasePrice, leadTimeDays |
| 5 | files | 通用文件存储 | key, url, originalName, mimeType |
| 6 | suppliers | 供应商 | companyName, status, settleType, creditDays |
| 7 | customers | 客户 | companyName, creditType, creditDays, addresses (JSON) |
| 8 | customer_pricing | 客户特殊定价 | customerId, fabricId, specialPrice |
| 9 | quotes | 报价单 | quoteCode (QT-YYMM-NNNN), validUntil, status |
| 10 | orders | 订单主表 | orderCode (ORD-YYMM-NNNN), status, totalAmount |
| 11 | order_items | 订单明细 | orderId, fabricId, supplierId, status, prevStatus |
| 12 | order_timelines | 订单状态追踪 | orderItemId, fromStatus, toStatus, operatorId |
| 13 | logistics | 物流信息 | orderItemId, carrier, trackingNo, shippedAt |
| 14 | supplier_payments | 供应商付款 | orderId, supplierId, payable, paid, payStatus |
| 15 | payment_records | 支付流水记录 | orderId, type (customer/supplier), amount |

### 6.3 关键枚举定义

#### OrderStatus（订单/明细状态）

```typescript
enum OrderStatus {
  INQUIRY = 'INQUIRY',       // 询价中
  PENDING = 'PENDING',       // 待下单
  ORDERED = 'ORDERED',       // 已下单
  PRODUCTION = 'PRODUCTION', // 生产中
  QC = 'QC',                 // 质检中
  SHIPPED = 'SHIPPED',       // 已发货
  RECEIVED = 'RECEIVED',     // 已签收
  COMPLETED = 'COMPLETED',   // 已完成
  CANCELLED = 'CANCELLED',   // 已取消
}
```

#### QuoteStatus（报价状态）

```typescript
enum QuoteStatus {
  ACTIVE = 'active',         // 有效
  EXPIRED = 'expired',       // 已过期（系统自动标记）
  CONVERTED = 'converted',   // 已转订单
}
```

#### PayStatus（付款状态）

```typescript
enum PayStatus {
  UNPAID = 'unpaid',         // 待付款
  PARTIAL = 'partial',       // 部分付款
  PAID = 'paid',             // 已付清
}
```

#### SupplierStatus（供应商状态）

```typescript
enum SupplierStatus {
  ACTIVE = 'active',         // 正常合作
  PAUSED = 'paused',         // 暂停
  ELIMINATED = 'eliminated', // 淘汰
}
```

### 6.4 索引策略

| 表 | 索引 | 用途 |
|---|------|------|
| fabrics | fabricCode (UNIQUE) | 编号唯一性 |
| fabrics | name, color | 搜索筛选 |
| orders | orderCode (UNIQUE) | 编号唯一性 |
| orders | customerId, status, createdAt | 列表查询 |
| order_items | orderId, status | 明细查询 |
| quotes | quoteCode (UNIQUE) | 编号唯一性 |
| quotes | status, validUntil | 过期检查定时任务 |
| supplier_payments | orderId, supplierId (UNIQUE) | 供应商付款维度 |

---

## 七、定时任务系统

### 7.1 QuoteScheduler（报价过期检查）

| 配置项 | 值 |
|--------|------|
| 执行周期 | 每小时（`0 * * * *`） |
| 任务逻辑 | 扫描 status=active 且 validUntil < now 的报价，批量更新为 expired |
| 并发保护 | 使用 `isRunning` 标志防止重复执行 |
| 错误处理 | 捕获异常并记录日志，不影响下次执行 |

### 7.2 编号生成服务（CodeGeneratorService）

| 编号类型 | 格式 | 示例 |
|---------|------|------|
| 面料编号 | BF-YYMM-NNNN | BF-2601-0001 |
| 订单编号 | ORD-YYMM-NNNN | ORD-2601-0001 |
| 报价编号 | QT-YYMM-NNNN | QT-2601-0001 |

**生成策略**：
1. **主策略**：Redis INCR 原子递增
2. **降级策略**：Redis 不可用时，查询数据库 MAX + 1
3. **恢复策略**：Redis 恢复后，从数据库同步最大序号

---

## 八、外部服务集成

### 8.1 企业微信 OAuth 2.0

**认证流程**：
```
1. 前端跳转到企业微信授权页
2. 用户授权后重定向到回调 URL（携带 code）
3. 后端用 code 换取 access_token
4. 后端用 access_token 获取用户信息
5. 后端创建/同步用户，签发 JWT
6. 前端保存 JWT，后续请求携带
```

**JWT 配置**：
- 过期时间：7 天
- 滑动过期策略：每次有效请求重置过期时间

### 8.2 腾讯云 COS（面料图片）

**上传流程**：
1. 前端选择文件
2. 调用 `POST /files/upload` 上传到后端
3. 后端验证文件类型和大小
4. 后端上传到 COS，获取 URL
5. 后端保存文件记录到 files 表
6. 返回文件 URL 给前端

**文件限制**：
- 允许类型：image/jpeg, image/png, image/webp
- 最大大小：5MB

---

## 九、API 规范

### 9.1 RESTful 设计原则

| 原则 | 规范 |
|------|------|
| URL 命名 | 全小写，复数名词，连字符分隔。例：`/api/v1/fabrics` |
| HTTP 方法 | GET（查询）、POST（创建）、PATCH（部分更新）、DELETE（删除） |
| 版本策略 | URL 路径版本：`/api/v1/...` |
| 嵌套资源 | 最多两层。例：`/api/v1/orders/:id/items` |

### 9.2 统一响应格式

**成功响应**：
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

**分页响应**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

**错误响应**：
```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "fabricName", "message": "fabricName must be a string" }
  ]
}
```

### 9.3 分页参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码（从 1 开始） |
| pageSize | number | 20 | 每页数量（最大 100） |
| sortBy | string | createdAt | 排序字段 |
| sortOrder | string | desc | 排序方向 (asc/desc) |

### 9.4 核心端点清单

#### SupplierModule
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /suppliers | 供应商列表 |
| GET | /suppliers/:id | 供应商详情 |
| POST | /suppliers | 创建供应商 |
| PATCH | /suppliers/:id | 更新供应商 |
| DELETE | /suppliers/:id | 删除供应商（软删除/409） |
| GET | /suppliers/:id/fabrics | 供应商可供应面料 |

#### CustomerModule
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /customers | 客户列表 |
| GET | /customers/:id | 客户详情 |
| POST | /customers | 创建客户 |
| PATCH | /customers/:id | 更新客户 |
| DELETE | /customers/:id | 删除客户（软删除/409） |
| GET | /customers/:id/pricing | 客户特殊定价列表 |
| POST | /customers/:id/pricing | 设置特殊定价 |
| PATCH | /customers/:id/pricing/:pricingId | 更新特殊定价 |
| DELETE | /customers/:id/pricing/:pricingId | 删除特殊定价 |
| GET | /customers/:id/orders | 客户历史订单 |

#### FabricModule
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /fabrics | 面料列表 |
| GET | /fabrics/:id | 面料详情 |
| POST | /fabrics | 创建面料 |
| PATCH | /fabrics/:id | 更新面料 |
| DELETE | /fabrics/:id | 删除面料（软删除/409） |
| POST | /fabrics/:id/images | 上传面料图片 |
| DELETE | /fabrics/:id/images/:imageId | 删除面料图片 |
| GET | /fabrics/:id/suppliers | 面料供应商列表 |
| POST | /fabrics/:id/suppliers | 关联供应商 |
| PATCH | /fabrics/:id/suppliers/:supplierId | 更新关联 |
| DELETE | /fabrics/:id/suppliers/:supplierId | 移除关联 |
| GET | /fabrics/:id/pricing | 面料特殊定价列表 |
| POST | /fabrics/:id/pricing | 设置特殊定价 |
| PATCH | /fabrics/:id/pricing/:pricingId | 更新特殊定价 |
| DELETE | /fabrics/:id/pricing/:pricingId | 删除特殊定价 |

#### QuoteModule
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /quotes | 报价列表 |
| GET | /quotes/:id | 报价详情 |
| POST | /quotes | 创建报价 |
| PATCH | /quotes/:id | 更新报价 |
| DELETE | /quotes/:id | 删除报价 |
| POST | /quotes/:id/convert-to-order | 报价转订单 |

#### OrderModule
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /orders | 订单列表 |
| GET | /orders/:id | 订单详情 |
| POST | /orders | 创建订单 |
| PATCH | /orders/:id | 更新订单 |
| DELETE | /orders/:id | 删除订单 |
| GET | /orders/:id/items | 订单明细列表 |
| POST | /orders/:id/items | 添加订单明细 |
| PATCH | /orders/:id/items/:itemId | 更新订单明细 |
| DELETE | /orders/:id/items/:itemId | 删除订单明细 |
| PATCH | /orders/:id/items/:itemId/status | 更新明细状态 |
| POST | /orders/:id/items/:itemId/cancel | 取消订单明细 |
| POST | /orders/:id/items/:itemId/restore | 恢复已取消明细 |
| GET | /orders/:id/timeline | 订单时间线 |
| PATCH | /orders/:id/customer-payment | 更新客户侧付款 |
| GET | /orders/:id/supplier-payments | 供应商付款列表 |
| PATCH | /orders/:id/supplier-payments/:supplierId | 更新供应商付款 |

#### LogisticsModule
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /logistics | 物流记录列表 |
| GET | /logistics/:id | 物流详情 |
| POST | /logistics | 创建物流记录 |
| PATCH | /logistics/:id | 更新物流信息 |
| DELETE | /logistics/:id | 删除物流记录 |

#### ImportModule
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | /import/fabrics | 批量导入面料 |
| POST | /import/suppliers | 批量导入供应商 |
| GET | /import/templates/fabrics | 下载面料导入模板 |
| GET | /import/templates/suppliers | 下载供应商导入模板 |

#### AuthModule
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /auth/wework/login | 企业微信 OAuth 登录 |
| GET | /auth/wework/callback | OAuth 回调处理 |
| GET | /auth/me | 获取当前用户信息 |
| POST | /auth/logout | 登出 |

#### SystemModule
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /system/enums | 返回所有枚举值 |
| GET | /health | 存活检查 |
| GET | /ready | 就绪检查 |

---

## 十、开发阶段规划

### 10.1 阶段概览

| 阶段 | 内容 | 状态 |
|------|------|------|
| 阶段 1 | 项目骨架搭建 | ✅ 已完成 |
| 阶段 2 | 核心数据模块 | ✅ 已完成 |
| 阶段 3 | 业务流程模块 | 🔄 进行中 |
| 阶段 4 | 前端开发 | ⏳ 待开始 |
| 阶段 5 | 集成测试与安全加固 | ⏳ 待开始 |
| 阶段 6 | 部署上线 | ⏳ 待开始 |

### 10.2 当前进度详情

**阶段 3：业务流程模块** 🔄 进行中

| 模块 | 状态 | 说明 |
|------|------|------|
| QuoteModule | ✅ 已完成 | 含定时任务、编号生成服务 |
| OrderModule | ✅ 已完成 | 主表 API + 明细 API (3.2.1-3.2.17) |
| LogisticsModule | ⏳ 待开始 | |
| ImportModule | ⏳ 待开始 | |
| AuthModule | ⏳ 待开始 | |
| SystemModule | ⏳ 待开始 | |

---

## 十一、快速命令参考

### 后端开发

```bash
cd backend
pnpm install              # 安装依赖
pnpm start:dev            # 开发模式启动
pnpm build                # 构建
pnpm test                 # 单元测试
pnpm test:e2e             # E2E 测试
pnpm lint                 # 代码检查
pnpm prisma generate      # 生成 Prisma Client
pnpm prisma migrate dev --name <name>  # 创建迁移
pnpm prisma studio        # 数据库 GUI
```

### 前端开发

```bash
cd frontend
pnpm install              # 安装依赖
pnpm dev                  # 开发服务器
pnpm build                # 构建
pnpm test                 # 测试
pnpm lint                 # 代码检查
pnpm typecheck            # 类型检查
```

### Docker

```bash
docker-compose up -d      # 启动容器（MySQL + Redis）
docker-compose down       # 停止容器
docker-compose logs -f    # 查看日志
```

### Git 工作流

```bash
/commit                   # 智能提交
/commit-push-pr           # 提交 + 推送 + 创建 PR
/code-review              # 代码审查
/clean_gone               # 清理已合并分支
```

---

## 十二、关键技术决策记录

| 决策 | 结论 | 理由 |
|------|------|------|
| 架构模式 | 模块式单体 | MVP 阶段，快速开发，后续可拆分。详见 [ADR-001](./adr/001-modular-monolith.md) |
| 付款与订单状态 | MVP 不绑定，仅提醒 | 业务确认，简化流程 |
| Excel 导入冲突 | 跳过已存在，不覆盖 | 业务确认，保护数据 |
| 编号序号位数 | 4 位（BF-YYMM-NNNN） | 足够支撑业务量 |
| 客户地址存储 | JSON + AddressVO | 支持多地址，结构灵活 |
| isActive vs status | isActive=软删除，status=业务状态 | 清晰区分 |
| 前端测试 | Vitest | 与 Vite 集成好 |
| 后端测试 | Jest + SuperTest | NestJS 官方推荐 |

---

## 十三、阶段 2 详细进度

> **重要说明**：根据技术需求文档 TRD 5.7 节 API 端点清单，每个模块除基础 CRUD 外，还需实现关联资源的子路由 API。

> **架构说明**：FileModule 作为底层通用文件上传服务，面料图片 API（`/fabrics/:id/images`）在 FabricModule 中实现，内部调用 FileService。

> **测试说明**：测试分为两类：
> - **单元测试**：测试单个 Service/Controller 的逻辑（`*.spec.ts`）
> - **E2E 测试**：测试完整 API 端点的集成行为（`test/*.e2e-spec.ts`）

### 13.1 SupplierModule ✅ 已完成

#### 基础 CRUD

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E | Build | Lint |
|---|------|---------|------|---------|-----|-------|------|
| 2.1.1 | 供应商列表（分页、搜索） | GET /suppliers | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.1.2 | 供应商详情 | GET /suppliers/:id | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.1.3 | 创建供应商 | POST /suppliers | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.1.4 | 更新供应商 | PATCH /suppliers/:id | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.1.5 | 删除供应商（软删除/409） | DELETE /suppliers/:id | ✅ | ✅ | ✅ | ✅ | ✅ |

#### 关联资源 API

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E | Build | Lint |
|---|------|---------|------|---------|-----|-------|------|
| 2.1.7 | 获取供应商可供应面料 | GET /suppliers/:id/fabrics | ✅ | ✅ | ✅ | ✅ | ✅ |

### 13.2 CustomerModule ✅ 已完成

#### 基础 CRUD

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E | Build | Lint |
|---|------|---------|------|---------|-----|-------|------|
| 2.2.1 | 客户列表（分页、搜索） | GET /customers | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.2.2 | 客户详情（含特殊定价） | GET /customers/:id | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.2.3 | 创建客户 | POST /customers | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.2.4 | 更新客户 | PATCH /customers/:id | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.2.5 | 删除客户（软删除/409） | DELETE /customers/:id | ✅ | ✅ | ✅ | ✅ | ✅ |

#### 客户特殊定价 API

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E | Build | Lint |
|---|------|---------|------|---------|-----|-------|------|
| 2.2.7 | 获取客户特殊定价列表 | GET /customers/:id/pricing | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.2.8 | 设置客户面料特殊定价 | POST /customers/:id/pricing | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.2.9 | 更新客户特殊定价 | PATCH /customers/:id/pricing/:pricingId | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.2.10 | 删除客户特殊定价 | DELETE /customers/:id/pricing/:pricingId | ✅ | ✅ | ✅ | ✅ | ✅ |

#### 客户历史订单 API（依赖 OrderModule）

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E | Build | Lint |
|---|------|---------|------|---------|-----|-------|------|
| 2.2.11 | 获取客户历史订单 | GET /customers/:id/orders | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

### 13.3 FabricModule ✅ 已完成

#### 基础 CRUD

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E | Build | Lint |
|---|------|---------|------|---------|-----|-------|------|
| 2.3.1 | 面料列表（分页、筛选、搜索） | GET /fabrics | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.3.2 | 面料详情（含供应商、图片、定价） | GET /fabrics/:id | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.3.3 | 创建面料 | POST /fabrics | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.3.4 | 更新面料 | PATCH /fabrics/:id | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.3.5 | 删除面料（软删除/409） | DELETE /fabrics/:id | ✅ | ✅ | ✅ | ✅ | ✅ |

#### 面料图片管理 API

> **实现说明**：在 FabricController 中实现，内部调用 FileService 上传文件后创建 FabricImage 记录关联到面料。

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E | Build | Lint |
|---|------|---------|------|---------|-----|-------|------|
| 2.3.7 | 上传面料图片 | POST /fabrics/:id/images | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.3.8 | 删除面料图片 | DELETE /fabrics/:id/images/:imageId | ✅ | ✅ | ✅ | ✅ | ✅ |

#### 面料-供应商关联 API

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E | Build | Lint |
|---|------|---------|------|---------|-----|-------|------|
| 2.3.9 | 获取面料供应商列表 | GET /fabrics/:id/suppliers | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.3.10 | 关联供应商到面料 | POST /fabrics/:id/suppliers | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.3.11 | 更新面料-供应商关联 | PATCH /fabrics/:id/suppliers/:supplierId | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.3.12 | 移除面料-供应商关联 | DELETE /fabrics/:id/suppliers/:supplierId | ✅ | ✅ | ✅ | ✅ | ✅ |

#### 面料特殊定价 API

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E | Build | Lint |
|---|------|---------|------|---------|-----|-------|------|
| 2.3.13 | 获取面料特殊定价列表 | GET /fabrics/:id/pricing | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.3.14 | 设置客户特殊定价 | POST /fabrics/:id/pricing | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.3.15 | 更新客户特殊定价 | PATCH /fabrics/:id/pricing/:pricingId | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.3.16 | 删除客户特殊定价 | DELETE /fabrics/:id/pricing/:pricingId | ✅ | ✅ | ✅ | ✅ | ✅ |

### 13.4 FileModule ✅ 已完成（底层服务）

> **定位说明**：FileModule 是通用文件上传底层服务。TRD 定义的面料图片 API（`POST /fabrics/:id/images`）在 FabricModule 的 2.3.7-2.3.8 中实现，通过调用 FileService 完成文件上传后关联到面料。

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E | Build | Lint |
|---|------|---------|------|---------|-----|-------|------|
| 2.4.1 | 上传文件（通用） | POST /files/upload | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.4.2 | 获取文件信息 | GET /files/:id | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.4.3 | 删除文件 | DELETE /files/:id | ✅ | ✅ | ✅ | ✅ | ✅ |

### 13.5 阶段 2 完成标准

#### SupplierModule ✅
- [x] 基础 CRUD 实现（2.1.1-2.1.5）
- [x] 关联资源 API 实现（2.1.7）
- [x] 单元测试全部通过
- [x] E2E 集成测试全部通过

#### CustomerModule ✅
- [x] 基础 CRUD 实现（2.2.1-2.2.5）
- [x] 特殊定价 API 实现（2.2.7-2.2.10）
- [x] 单元测试全部通过
- [x] E2E 集成测试全部通过
- 注：2.2.11 依赖 OrderModule，移至阶段 3

#### FabricModule ✅
- [x] 基础 CRUD 实现（2.3.1-2.3.5）
- [x] 图片管理 API 实现（2.3.7-2.3.8）
- [x] 供应商关联 API 实现（2.3.9-2.3.12）
- [x] 特殊定价 API 实现（2.3.13-2.3.16）
- [x] 单元测试全部通过
- [x] E2E 集成测试全部通过

#### FileModule ✅
- [x] 底层服务已完成（2.4.1-2.4.3）
- [x] 单元测试全部通过
- [x] E2E 集成测试全部通过
- [x] 安全问题已修复（路径遍历漏洞、文件名验证）

---

## 十四、阶段 3 详细规划

> **依赖关系**：阶段 3 依赖阶段 2 完成，特别是 FabricSupplier 和 CustomerPricing 关联 API。
>
> **模块概览**：阶段 3 包含 6 个核心模块，共计约 39 个 API 端点。

### 14.1 QuoteModule（报价管理）✅ 已完成

> **功能概述**：报价 CRUD、有效期管理、过期自动标记、报价转订单
>
> **报价状态枚举**：
> - `active`（有效）
> - `expired`（已过期）- 系统定时任务自动标记
> - `converted`（已转订单）
>
> **关键规则**：
> - 仅 active/expired 状态可更新
> - 仅 active/expired 状态允许删除，converted 状态不允许删除
> - 报价转订单：仅 active 且未过期的报价可转换；转换后状态变为 converted；生成的订单明细初始状态为 PENDING；时间线记录"从报价 QT-xxx 转换"
>
> **技术实现**：
> - RedisService：Redis 连接管理，支持 fallback 到数据库
> - CodeGeneratorService：编号生成服务（QT-YYMM-NNNN 格式）
> - QuoteScheduler：定时任务（@nestjs/schedule），每小时检查过期报价

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E |
|---|------|---------|------|---------|-----|
| 3.1.1 | 报价列表（分页、筛选） | GET /quotes | ✅ | ✅ | ✅ |
| 3.1.2 | 报价详情 | GET /quotes/:id | ✅ | ✅ | ✅ |
| 3.1.3 | 创建报价（含客户、面料、数量、单价、有效期） | POST /quotes | ✅ | ✅ | ✅ |
| 3.1.4 | 更新报价（仅 active/expired 状态可更新） | PATCH /quotes/:id | ✅ | ✅ | ✅ |
| 3.1.5 | 删除报价（仅 active/expired 状态允许删除） | DELETE /quotes/:id | ✅ | ✅ | ✅ |
| 3.1.6 | 报价转订单（501 占位，等 OrderModule） | POST /quotes/:id/convert-to-order | ✅ | ✅ | ✅ |

### 14.2 OrderModule（订单管理）

> **功能概述**：订单主表 CRUD、明细管理、状态机流转（9 个状态）、付款追踪（双向：客户侧、供应商侧）、时间线记录
>
> **订单状态枚举（9 个）**：
> ```
> INQUIRY (询价中) → PENDING (待下单) → ORDERED (已下单) → PRODUCTION (生产中)
> → QC (质检中) → SHIPPED (已发货) → RECEIVED (已签收) → COMPLETED (已完成)
> 任意状态 → CANCELLED (已取消) ← 可恢复到 prevStatus
> ```
>
> **状态转换规则**：
> - INQUIRY → PENDING, CANCELLED
> - PENDING → ORDERED, CANCELLED
> - ORDERED → PRODUCTION, CANCELLED
> - PRODUCTION → QC, CANCELLED
> - QC → SHIPPED, CANCELLED
> - SHIPPED → RECEIVED, CANCELLED
> - RECEIVED → COMPLETED, CANCELLED
> - COMPLETED → CANCELLED
> - CANCELLED → 恢复到 prevStatus（取消前的状态）
>
> **关键业务规则**：
> 1. **订单聚合状态计算**：订单主表 status = 所有明细中进度最低的状态（已取消明细不参与计算）
> 2. **金额自动计算**：
>    - 明细小计：`order_items.subtotal = quantity × salePrice`
>    - 订单总金额：`orders.totalAmount = Σ(所有明细 subtotal)`
>    - 供应商应付：`supplier_payments.payable = Σ(该供应商下所有明细 quantity × purchasePrice)`
> 3. **付款与订单状态关系（MVP 不绑定）**：付款状态和订单状态各自独立变更，互不阻塞，系统仅做提醒

#### 订单主表 API ✅ 已完成

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E |
|---|------|---------|------|---------|-----|
| 3.2.1 | 订单列表（分页、筛选、搜索） | GET /orders | ✅ | ✅ | ✅ |
| 3.2.2 | 订单详情（含明细、时间线、付款、物流） | GET /orders/:id | ✅ | ✅ | ✅ |
| 3.2.3 | 创建订单（必须包含至少一条明细） | POST /orders | ✅ | ✅ | ✅ |
| 3.2.4 | 更新订单基本信息（客户、收货地址、备注） | PATCH /orders/:id | ✅ | ✅ | ✅ |
| 3.2.5 | 删除订单（仅 INQUIRY 状态且无付款记录时允许） | DELETE /orders/:id | ✅ | ✅ | ✅ |

#### 订单明细 API ✅ 已完成

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E |
|---|------|---------|------|---------|-----|
| 3.2.6 | 获取订单明细列表 | GET /orders/:id/items | ✅ | ✅ | ✅ |
| 3.2.7 | 添加订单明细（面料、数量、销售单价、供应商、采购价、交期要求） | POST /orders/:id/items | ✅ | ✅ | ✅ |
| 3.2.8 | 更新订单明细（受状态机限制） | PATCH /orders/:id/items/:itemId | ✅ | ✅ | ✅ |
| 3.2.9 | 删除订单明细（仅 INQUIRY/PENDING 状态可删除） | DELETE /orders/:id/items/:itemId | ✅ | ✅ | ✅ |
| 3.2.10 | 更新明细状态（状态机流转） | PATCH /orders/:id/items/:itemId/status | ✅ | ✅ | ✅ |
| 3.2.11 | 取消订单明细（记录 prevStatus 以便恢复） | POST /orders/:id/items/:itemId/cancel | ✅ | ✅ | ✅ |
| 3.2.12 | 恢复已取消明细（从 CANCELLED 恢复到 prevStatus） | POST /orders/:id/items/:itemId/restore | ✅ | ✅ | ✅ |

#### 订单时间线 API ✅ 已完成

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E |
|---|------|---------|------|---------|-----|
| 3.2.13 | 获取订单时间线（按时间倒序，支持按明细筛选） | GET /orders/:id/timeline | ✅ | ✅ | ✅ |
| 3.2.14 | 获取指定明细的时间线 | GET /orders/:id/items/:itemId/timeline | ✅ | ✅ | ✅ |

#### 订单付款 API ✅ 已完成

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E |
|---|------|---------|------|---------|-----|
| 3.2.15 | 更新客户侧付款信息（应收、已收、付款状态、付款方式、账期、付款时间） | PATCH /orders/:id/customer-payment | ✅ | ✅ | ✅ |
| 3.2.16 | 获取订单的供应商付款列表（按订单-供应商维度） | GET /orders/:id/supplier-payments | ✅ | ✅ | ✅ |
| 3.2.17 | 更新指定供应商的付款信息 | PATCH /orders/:id/supplier-payments/:supplierId | ✅ | ✅ | ✅ |

> **注**：客户历史订单 API（GET /customers/:id/orders，原 2.2.11）依赖 OrderModule，在订单模块完成后作为 CustomerModule 附加功能实现。

### 14.3 LogisticsModule（物流管理）

> **功能概述**：物流记录 CRUD、关联订单明细
>
> **关键规则**：
> - 物流信息关联到面料级别（订单明细），同一订单不同面料可有不同物流信息
> - MVP 阶段：员工手动录入，不做实时跟踪
> - 预留物流 API 对接接口（后期开发）

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E |
|---|------|---------|------|---------|-----|
| 3.3.1 | 物流记录列表（支持按订单、明细、单号筛选） | GET /logistics | ⏳ | ⏳ | ⏳ |
| 3.3.2 | 物流详情（含关联的明细信息） | GET /logistics/:id | ⏳ | ⏳ | ⏳ |
| 3.3.3 | 创建物流记录（关联订单明细、物流公司、联系人、联系电话、物流单号、发货时间） | POST /logistics | ⏳ | ⏳ | ⏳ |
| 3.3.4 | 更新物流信息 | PATCH /logistics/:id | ⏳ | ⏳ | ⏳ |
| 3.3.5 | 删除物流记录（物理删除） | DELETE /logistics/:id | ⏳ | ⏳ | ⏳ |

### 14.4 ImportModule（批量导入）

> **功能概述**：Excel 批量导入面料和供应商、下载模板
>
> **冲突处理策略**：
> - 编号已存在的行**跳过不导入**，不覆盖、不更新已有数据
> - 部分成功：失败行汇总报告给用户，成功行正常导入
> - 返回导入结果报告：成功数、失败数、失败原因列表

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E |
|---|------|---------|------|---------|-----|
| 3.4.1 | 批量导入面料（Excel，冲突跳过） | POST /import/fabrics | ⏳ | ⏳ | ⏳ |
| 3.4.2 | 批量导入供应商（Excel，冲突跳过） | POST /import/suppliers | ⏳ | ⏳ | ⏳ |
| 3.4.3 | 下载面料导入模板（含列定义和示例数据） | GET /import/templates/fabrics | ⏳ | ⏳ | ⏳ |
| 3.4.4 | 下载供应商导入模板 | GET /import/templates/suppliers | ⏳ | ⏳ | ⏳ |

### 14.5 AuthModule（认证模块）

> **功能概述**：企业微信 OAuth 登录、JWT 会话管理
>
> **技术细节**：
> - 企业微信 OAuth 2.0 流程
> - JWT 配置：过期时间 7 天，滑动过期策略（每次有效请求重置）
> - 用户信息同步

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E |
|---|------|---------|------|---------|-----|
| 3.5.1 | 企业微信 OAuth 登录（重定向到授权页） | GET /auth/wework/login | ⏳ | ⏳ | ⏳ |
| 3.5.2 | OAuth 回调处理（换取 token、创建/同步用户、发送 JWT） | GET /auth/wework/callback | ⏳ | ⏳ | ⏳ |
| 3.5.3 | 获取当前用户信息 | GET /auth/me | ⏳ | ⏳ | ⏳ |
| 3.5.4 | 登出（清理或标记 JWT 过期） | POST /auth/logout | ⏳ | ⏳ | ⏳ |

### 14.6 SystemModule（系统模块）

> **功能概述**：枚举值返回、健康检查

| # | 功能 | API 端点 | 状态 | 单元测试 | E2E |
|---|------|---------|------|---------|-----|
| 3.6.1 | 返回所有枚举值及中文映射（MVP 硬编码） | GET /system/enums | ⏳ | ⏳ | ⏳ |
| 3.6.2 | 存活检查（简单的 200 OK 响应） | GET /health | ⏳ | ⏳ | ⏳ |
| 3.6.3 | 就绪检查（含数据库连接检查） | GET /ready | ⏳ | ⏳ | ⏳ |

---

## 十五、待实现的技术服务（跨模块）

> 以下技术点在 TRD 中定义，需在相应模块开发时实现：

| # | 技术服务 | 说明 | 实现时机 |
|---|---------|------|---------|
| T.1 | 编号生成服务 | Redis INCR 原子递增 + DB UNIQUE 兜底，支持 BF/ORD/QT 三种编号格式；格式 `XXX-{YYMM}-{4位序号}` | ✅ 已完成（QuoteModule） |
| T.2 | 定时任务 - 报价过期检查 | @nestjs/schedule 定时扫描 quotes.valid_until 字段，自动标记过期报价（status → expired） | ✅ 已完成（QuoteModule） |
| T.3 | 订单状态聚合计算 | 订单主表 status = 所有明细中进度最低的状态（已取消不参与）；触发器或 Service 逻辑实现 | 阶段 3 OrderModule 开发时 |
| T.4 | Redis Fallback 策略 | 编号生成服务 Redis 不可用时降级到 DB MAX+1；Redis 恢复后需从数据库同步最大序号 | ✅ 已完成（QuoteModule） |
| T.5 | 付款流水记录 | 每次付款操作自动创建 payment_records 流水；客户已付/供应商已付金额 = 对应流水金额之和 | 阶段 3 OrderModule 开发时 |

---

## 十六、开发计划审查记录

### [2026-01-29] TRD 对比审查

**审查内容**：对比 CLAUDE.md 开发计划与 TRD 5.7 节 API 端点清单

**审查结果**：

| 类别 | 问题 | 处理 |
|------|------|------|
| ✅ 一致 | SupplierModule 所有端点与 TRD 匹配 | - |
| ✅ 一致 | CustomerModule 所有端点与 TRD 匹配 | - |
| ✅ 一致 | FabricModule 所有端点与 TRD 匹配 | - |
| ✅ 一致 | 阶段 3 所有模块端点与 TRD 匹配 | - |
| ⚠️ 说明 | FileModule 定位 | 已添加说明：底层服务，面料图片 API 在 FabricModule 中实现 |
| ⚠️ 补充 | 遗漏技术服务 | 已添加"待实现的技术服务"章节 |

**结论**：开发计划与需求文档一致，已补充必要说明。

### [2026-01-29] 代码库同步审查

**审查内容**：核对代码库实际实现与 CLAUDE.md 记录的功能状态

**审查结果**：

| 类别 | 发现 | 处理 |
|------|------|------|
| ✗ 不一致 | 2.2.5 删除客户：CLAUDE.md 标记 ⏳，实际已实现 ✅ | 已更新状态为 ✅ |
| ✅ 一致 | SupplierModule 基础 CRUD 全部完成 | - |
| ✅ 一致 | CustomerModule 基础 CRUD 全部完成 | - |
| ✅ 一致 | FabricModule 基础 CRUD 全部完成 | - |
| ✅ 一致 | FileModule 全部完成 | - |
| ✅ 一致 | 所有关联资源 API 按计划待开发 | - |
| ✅ 一致 | 测试覆盖完整（Unit + E2E） | - |

**结论**：代码库与文档已同步，一致性 100%。

### [2026-01-29] 测试覆盖审查

**审查内容**：核对新完成功能的单元测试和 E2E 集成测试覆盖情况

**审查结果**：

| 功能 | 单元测试 | E2E 测试 | 状态 |
|------|---------|---------|------|
| 2.1.7 供应商面料列表 | ✅ 通过 | ✅ 通过 | 完成 |
| 2.2.7 客户定价列表 | ✅ 通过 | ✅ 通过 | 完成 |
| 2.2.8 创建客户定价 | ✅ 通过 | ✅ 通过 | 完成 |
| 2.2.9 更新客户定价 | ✅ 通过 | ✅ 通过 | 完成 |
| 2.2.10 删除客户定价 | ✅ 通过 | ✅ 通过 | 完成 |
| 2.3.7 上传面料图片 | ✅ 通过 | ✅ 通过 | 完成 |
| 2.3.8 删除面料图片 | ✅ 通过 | ✅ 通过 | 完成 |
| 2.3.13-2.3.16 面料特殊定价 | ✅ 通过 | ✅ 通过 | 完成 |

**发现的问题**：

1. E2E 测试 mock 需要使用 Prisma P2002 错误码模拟唯一约束冲突
2. 功能状态表格原先只有"测试"一列，未区分单元测试和 E2E

**处理措施**：

1. 将功能状态表格的"测试"列拆分为"单元测试"和"E2E"两列
2. 更新所有功能的测试覆盖状态
3. 添加测试说明区分两类测试

**结论**：开发计划已更新，测试覆盖状态更加清晰。

### [2026-01-30] 阶段 2 完成确认

**审查内容**：确认阶段 2 核心数据模块全部完成

**审查结果**：

| 模块 | 基础 CRUD | 关联资源 API | 单元测试 | E2E 测试 | 状态 |
|------|----------|-------------|---------|---------|------|
| SupplierModule | ✅ | ✅ | ✅ 293 tests | ✅ 268 tests | 完成 |
| CustomerModule | ✅ | ✅（定价 API） | ✅ | ✅ | 完成 |
| FabricModule | ✅ | ✅（图片+供应商+定价） | ✅ | ✅ | 完成 |
| FileModule | ✅ | N/A | ✅ | ✅ | 完成 |

**验证命令执行结果**：

- `pnpm build` ✅ 通过
- `pnpm test` ✅ 293 tests passed
- `pnpm test:e2e` ✅ 268 tests passed
- `pnpm lint` ✅ 无错误

**结论**：阶段 2 核心数据模块全部完成，可进入阶段 3 业务流程模块开发。

### [2026-01-30] 阶段 3 开发计划更新

**审查内容**：对比 CLAUDE.md 阶段 3 计划与 TRD 5.7 节 API 端点清单

**更新内容**：

| 类别 | 更新项 |
|------|--------|
| 结构优化 | 添加模块概述、状态枚举、关键规则说明 |
| 功能描述 | 统一使用 TRD 自然语言描述 |
| 表格格式 | 添加单元测试和 E2E 测试列 |
| 遗漏补充 | 添加 T.5 付款流水记录技术服务 |
| 遗漏补充 | 说明 2.2.11 客户历史订单 API 在 OrderModule 完成后实现 |
| 业务规则 | 添加 QuoteModule 状态枚举和转订单规则 |
| 业务规则 | 添加 OrderModule 状态机详细定义（9 个状态、转换规则） |
| 业务规则 | 添加金额自动计算规则（明细小计、订单总金额、供应商应付） |
| 业务规则 | 添加 ImportModule 冲突处理策略说明 |
| 业务规则 | 添加 LogisticsModule 物流关联规则 |
| 业务规则 | 添加 AuthModule OAuth/JWT 技术细节 |

**验证**：逐条对比 TRD 5.7 节，确认无遗漏

**结论**：阶段 3 开发计划已与需求文档完全对齐

---

**文档状态**：v1.1 - 整合开发进度

**最后更新**：2026-02-03
