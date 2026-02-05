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
| 阶段 3 | 业务流程模块 | ✅ 已完成 |
| 阶段 4 | 前端开发 | ⏳ 待开始 |
| 阶段 5 | 集成测试与安全加固 | ⏳ 待开始 |
| 阶段 6 | 部署上线 | ⏳ 待开始 |

### 10.2 当前进度详情

**阶段 3：业务流程模块** ✅ 已完成

| 模块 | 状态 | 说明 |
|------|------|------|
| QuoteModule | ✅ 已完成 | 含定时任务、编号生成服务 |
| OrderModule | ✅ 已完成 | 主表 API + 明细 API (3.2.1-3.2.17) |
| LogisticsModule | ✅ 已完成 | 3.3.1-3.3.5 全部完成 |
| ImportModule | ✅ 已完成 | 3.4.1-3.4.4 全部完成 |
| AuthModule | ✅ 已完成 | 3.5.1-3.5.4 全部完成（企业微信 OAuth、JWT 认证） |
| SystemModule | ✅ 已完成 | 3.6.1 枚举 API |

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
| ExcelJS Buffer 转换 | `toArrayBuffer()` + `as ArrayBuffer` | Buffer.slice() 返回联合类型，需显式断言 |

---

## 十三、后端开发完成总结

> **后端开发状态**：阶段 1-3 全部完成，共计 39 个 API 端点，100% 测试覆盖

### 13.1 已完成模块

| 模块 | API 数量 | 状态 |
|------|---------|------|
| SupplierModule | 6 | ✅ 已完成 |
| CustomerModule | 11 | ✅ 已完成 |
| FabricModule | 16 | ✅ 已完成 |
| FileModule | 3 | ✅ 已完成 |
| QuoteModule | 6 | ✅ 已完成 |
| OrderModule | 17 | ✅ 已完成 |
| LogisticsModule | 5 | ✅ 已完成 |
| ImportModule | 4 | ✅ 已完成 |
| AuthModule | 4 | ✅ 已完成 |
| SystemModule | 3 | ✅ 已完成 |

### 13.2 技术服务

| 服务 | 状态 |
|------|------|
| 编号生成 (Redis INCR + DB Fallback) | ✅ 已完成 |
| 报价过期定时任务 | ✅ 已完成 |
| 订单状态聚合计算 | ✅ 已完成 |
| 金额自动计算 | ✅ 已完成 |

---

## 十四、阶段 4 前端开发详细进度

> **前端开发状态**：🔄 进行中
> **预计文件数**：~80 个
> **工作计划文档**：[docs/plans/frontend-phase4-workplan.md](./plans/frontend-phase4-workplan.md)
> **设计文档**：[docs/design/frontend-design-doc.md](./design/frontend-design-doc.md)

### 14.1 Phase 1：基础设施

#### Task 1.1：类型定义

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 1.1.1 | API 响应类型 | `src/types/api.types.ts` | ✅ | ✅ | ✅ | ✅ |
| 1.1.2 | 实体类型 | `src/types/entities.types.ts` | ✅ | ✅ | ✅ | ✅ |
| 1.1.3 | 枚举类型 | `src/types/enums.types.ts` | ✅ | ✅ | ✅ | ✅ |
| 1.1.4 | 表单类型 | `src/types/forms.types.ts` | ✅ | ✅ | ✅ | ✅ |
| 1.1.5 | 类型导出 | `src/types/index.ts` | ✅ | ✅ | ✅ | ✅ |

#### Task 1.2：工具函数

| # | 功能 | 文件路径 | 状态 | 单元测试 | Build | Lint |
|---|------|---------|------|---------|-------|------|
| 1.2.1 | 日期/金额格式化 | `src/utils/format.ts` | ✅ | ✅ | ✅ | ✅ |
| 1.2.2 | 表单验证规则 | `src/utils/validation.ts` | ✅ | ✅ | ✅ | ✅ |
| 1.2.3 | 全局常量 | `src/utils/constants.ts` | ✅ | ✅ | ✅ | ✅ |
| 1.2.4 | 订单状态工具 | `src/utils/statusHelpers.ts` | ✅ | ✅ | ✅ | ✅ |
| 1.2.5 | 工具导出 | `src/utils/index.ts` | ✅ | ✅ | ✅ | ✅ |

#### Task 1.3：API 客户端

| # | 功能 | 文件路径 | 状态 | 单元测试 | Build | Lint | Typecheck |
|---|------|---------|------|---------|-------|------|-----------|
| 1.3.1 | Axios 实例 | `src/api/client.ts` | ✅ | ✅ (9) | ✅ | ✅ | ✅ |
| 1.3.2 | 认证 API | `src/api/auth.api.ts` | ✅ | - | ✅ | ✅ | ✅ |
| 1.3.3 | 系统 API | `src/api/system.api.ts` | ✅ | - | ✅ | ✅ | ✅ |
| 1.3.4 | API 导出 | `src/api/index.ts` | ✅ | - | ✅ | ✅ | ✅ |

#### Task 1.4：Zustand Stores

| # | 功能 | 文件路径 | 状态 | 单元测试 | Build | Lint | Typecheck |
|---|------|---------|------|---------|-------|------|-----------|
| 1.4.1 | 认证状态 | `src/store/authStore.ts` | ✅ | ✅ (16) | ✅ | ✅ | ✅ |
| 1.4.2 | UI 状态 | `src/store/uiStore.ts` | ✅ | ✅ (14) | ✅ | ✅ | ✅ |
| 1.4.3 | 枚举缓存 | `src/store/enumStore.ts` | ✅ | ✅ (18) | ✅ | ✅ | ✅ |
| 1.4.4 | Store 导出 | `src/store/index.ts` | ✅ | - | ✅ | ✅ | ✅ |

#### Task 1.5：路由配置

| # | 功能 | 文件路径 | 状态 | 单元测试 | Build | Lint | Typecheck |
|---|------|---------|------|---------|-------|------|-----------|
| 1.5.1 | 路由定义 | `src/routes/index.tsx` | ✅ | - | ✅ | ✅ | ✅ |
| 1.5.2 | 路由守卫 | `src/routes/ProtectedRoute.tsx` | ✅ | ✅ (4) | ✅ | ✅ | ✅ |
| 1.5.3 | 布局占位 | `src/routes/layouts/MainLayout.tsx` | ✅ | - | ✅ | ✅ | ✅ |
| 1.5.4 | 页面占位 | `src/pages/**/*.tsx` (21 files) | ✅ | - | ✅ | ✅ | ✅ |

#### Task 1.6：布局组件

| # | 功能 | 文件路径 | 状态 | 单元测试 | Build | Lint | Typecheck |
|---|------|---------|------|---------|-------|------|-----------|
| 1.6.1 | 主布局 | `src/routes/layouts/MainLayout.tsx` | ✅ | - | ✅ | ✅ | ✅ |
| 1.6.2 | 侧边栏 | `src/components/layout/Sidebar.tsx` | ✅ | ✅ (6) | ✅ | ✅ | ✅ |
| 1.6.3 | 顶部导航 | `src/components/layout/Header.tsx` | ✅ | ✅ (8) | ✅ | ✅ | ✅ |
| 1.6.4 | 页面容器 | `src/components/layout/PageContainer.tsx` | ✅ | ✅ (7) | ✅ | ✅ | ✅ |
| 1.6.5 | 组件导出 | `src/components/layout/index.ts` | ✅ | - | ✅ | ✅ | ✅ |

#### Task 1.7：认证页面

| # | 功能 | 文件路径 | 状态 | 单元测试 | Build | Lint | Typecheck |
|---|------|---------|------|---------|-------|------|-----------|
| 1.7.1 | 登录页 | `src/pages/auth/LoginPage.tsx` | ✅ | ✅ (5) | ✅ | ✅ | ✅ |
| 1.7.2 | OAuth 回调 | `src/pages/auth/OAuthCallback.tsx` | ✅ | ✅ (8) | ✅ | ✅ | ✅ |

---

### 14.2 Phase 2：核心模块

#### Task 2.1：通用组件 ✅

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 2.1.1 | 搜索表单 | `src/components/common/SearchForm.tsx` | ✅ | ✅ | ✅ | ✅ |
| 2.1.2 | 状态标签 | `src/components/common/StatusTag.tsx` | ✅ | ✅ | ✅ | ✅ |
| 2.1.3 | 金额显示 | `src/components/common/AmountDisplay.tsx` | ✅ | ✅ | ✅ | ✅ |
| 2.1.4 | 加载指示器 | `src/components/common/LoadingSpinner.tsx` | ✅ | ✅ | ✅ | ✅ |
| 2.1.5 | 错误边界 | `src/components/common/ErrorBoundary.tsx` | ✅ | ✅ | ✅ | ✅ |
| 2.1.6 | 确认弹窗 | `src/components/common/ConfirmModal.tsx` | ✅ | ✅ | ✅ | ✅ |

#### Task 2.2：业务组件（Part 1）

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 2.2.1 | 图片上传 | `src/components/business/ImageUploader.tsx` | ✅ | ✅ | ✅ | ✅ |
| 2.2.2 | 地址管理 | `src/components/business/AddressManager.tsx` | ✅ | ✅ | ✅ | ✅ |
| 2.2.3 | 面料选择器 | `src/components/business/FabricSelector.tsx` | ✅ | ✅ | ✅ | ✅ |
| 2.2.4 | 供应商选择器 | `src/components/business/SupplierSelector.tsx` | ✅ | ✅ | ✅ | ✅ |
| 2.2.5 | 客户选择器 | `src/components/business/CustomerSelector.tsx` | ✅ | ✅ | ✅ | ✅ |

#### Task 2.3：API 服务（核心）

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 2.3.1 | 面料 API | `src/api/fabric.api.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.3.2 | 供应商 API | `src/api/supplier.api.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.3.3 | 客户 API | `src/api/customer.api.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.3.4 | 文件 API | `src/api/file.api.ts` | ✅ | ✅ | ✅ | ✅ |

#### Task 2.4：TanStack Query Hooks

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 2.4.1 | 面料 Hooks | `src/hooks/queries/useFabrics.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.4.2 | 供应商 Hooks | `src/hooks/queries/useSuppliers.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.4.3 | 客户 Hooks | `src/hooks/queries/useCustomers.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.4.4 | 枚举 Hooks | `src/hooks/queries/useEnums.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.4.5 | 分页 Hook | `src/hooks/usePagination.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.4.6 | 防抖 Hook | `src/hooks/useDebounce.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.4.7 | 本地存储 Hook | `src/hooks/useLocalStorage.ts` | ⏳ | ⏳ | ⏳ | ⏳ |

#### Task 2.5：面料模块页面

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 2.5.1 | 面料列表 | `src/pages/fabrics/FabricListPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.5.2 | 面料详情 | `src/pages/fabrics/FabricDetailPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.5.3 | 面料表单页 | `src/pages/fabrics/FabricFormPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.5.4 | 面料表单组件 | `src/components/forms/FabricForm.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |

#### Task 2.6：供应商模块页面

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 2.6.1 | 供应商列表 | `src/pages/suppliers/SupplierListPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.6.2 | 供应商详情 | `src/pages/suppliers/SupplierDetailPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.6.3 | 供应商表单页 | `src/pages/suppliers/SupplierFormPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.6.4 | 供应商表单组件 | `src/components/forms/SupplierForm.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |

#### Task 2.7：客户模块页面

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 2.7.1 | 客户列表 | `src/pages/customers/CustomerListPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.7.2 | 客户详情 | `src/pages/customers/CustomerDetailPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.7.3 | 客户表单页 | `src/pages/customers/CustomerFormPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 2.7.4 | 客户表单组件 | `src/components/forms/CustomerForm.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |

---

### 14.3 Phase 3：业务流程模块

#### Task 3.1：报价 API 和 Hooks

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 3.1.1 | 报价 API | `src/api/quote.api.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.1.2 | 报价 Hooks | `src/hooks/queries/useQuotes.ts` | ⏳ | ⏳ | ⏳ | ⏳ |

#### Task 3.2：报价模块页面

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 3.2.1 | 报价列表 | `src/pages/quotes/QuoteListPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.2.2 | 报价详情 | `src/pages/quotes/QuoteDetailPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.2.3 | 报价表单页 | `src/pages/quotes/QuoteFormPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.2.4 | 报价表单组件 | `src/components/forms/QuoteForm.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |

#### Task 3.3：业务组件（Part 2）

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 3.3.1 | 订单时间线 | `src/components/business/OrderTimeline.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.3.2 | 订单状态流程 | `src/components/business/OrderStatusFlow.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.3.3 | 付款状态卡片 | `src/components/business/PaymentStatusCard.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.3.4 | 定价表格 | `src/components/business/PricingTable.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |

#### Task 3.4：订单 API 和 Hooks

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 3.4.1 | 订单 API | `src/api/order.api.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.4.2 | 订单 Hooks | `src/hooks/queries/useOrders.ts` | ⏳ | ⏳ | ⏳ | ⏳ |

#### Task 3.5：订单模块页面

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 3.5.1 | 订单列表 | `src/pages/orders/OrderListPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.5.2 | 订单详情 | `src/pages/orders/OrderDetailPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.5.3 | 订单表单页 | `src/pages/orders/OrderFormPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.5.4 | 订单表单组件 | `src/components/forms/OrderForm.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.5.5 | 订单明细表单 | `src/components/forms/OrderItemForm.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |

#### Task 3.6：物流 API 和集成

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 3.6.1 | 物流 API | `src/api/logistics.api.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.6.2 | 物流 Hooks | `src/hooks/queries/useLogistics.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.6.3 | 物流表单 | `src/components/forms/LogisticsForm.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |

#### Task 3.7：导入模块

| # | 功能 | 文件路径 | 状态 | Build | Lint | Typecheck |
|---|------|---------|------|-------|------|-----------|
| 3.7.1 | 导入 API | `src/api/import.api.ts` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.7.2 | 导入页面 | `src/pages/import/ImportPage.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |
| 3.7.3 | 导入结果弹窗 | `src/components/business/ImportResultModal.tsx` | ⏳ | ⏳ | ⏳ | ⏳ |

---

### 14.4 Phase 4：质量保障

#### Task 4.1：集成测试

| # | 功能 | 状态 | 备注 |
|---|------|------|------|
| 4.1.1 | 认证流程测试 | ⏳ | 登录重定向、OAuth 回调、登出 |
| 4.1.2 | 面料 CRUD 测试 | ⏳ | API 集成测试 |
| 4.1.3 | 订单状态机测试 | ⏳ | 状态转换验证 |
| 4.1.4 | 付款更新测试 | ⏳ | 双向付款追踪 |
| 4.1.5 | 报价转订单测试 | ⏳ | 转换流程 |

#### Task 4.2：性能优化

| # | 功能 | 状态 | 目标 |
|---|------|------|------|
| 4.2.1 | 路由代码分割 | ⏳ | 按路由懒加载 |
| 4.2.2 | Bundle 大小检查 | ⏳ | 初始 <500KB |
| 4.2.3 | 大数据量测试 | ⏳ | 500+ 订单、100+ 供应商 |

#### Task 4.3：验收标准验证

| 模块 | 状态 | 备注 |
|------|------|------|
| AC-AUTH | ⏳ | 路由守卫、OAuth 集成 |
| AC-FABRIC | ⏳ | 列表、详情、表单、图片、供应商关联、定价 |
| AC-SUPPLIER | ⏳ | 列表、详情、表单、删除保护 |
| AC-CUSTOMER | ⏳ | 列表、详情、地址管理、定价、订单历史 |
| AC-QUOTE | ⏳ | 列表、详情、过期处理、转订单 |
| AC-ORDER | ⏳ | 状态机、付款追踪、时间线 |
| AC-LOGISTICS | ⏳ | 物流信息管理 |
| AC-IMPORT | ⏳ | 模板下载、Excel 上传、结果展示 |

#### Task 4.4：最终质量检查

| # | 检查项 | 状态 |
|---|--------|------|
| 4.4.1 | `pnpm build` 成功 | ⏳ |
| 4.4.2 | `pnpm test` 全部通过 | ⏳ |
| 4.4.3 | `pnpm lint` 无错误 | ⏳ |
| 4.4.4 | `pnpm typecheck` 无错误 | ⏳ |
| 4.4.5 | 关键路径测试覆盖率 >80% | ⏳ |
| 4.4.6 | 浏览器无 console 错误 | ⏳ |
| 4.4.7 | 平板响应式布局正常 | ⏳ |

---

### 14.5 状态图例

| 图标 | 含义 |
|-----|------|
| ⏳ | 待开始 |
| 🔄 | 进行中 |
| ✅ | 已完成 |
| ❌ | 失败待修复 |

---

**文档状态**：v2.1 - 阶段 4 前端开发进度追踪表已创建


**最后更新**：2026-02-05
