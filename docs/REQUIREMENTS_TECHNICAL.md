# 铂润面料（Borealis Fabrics）技术需求文档

**文档版本**：v2.2
**创建日期**：2026年1月28日
**文档状态**：开发前修正版
**关联文档**：[业务需求文档 v3.1](./REQUIREMENTS_BUSINESS.md)

---

## 一、文档信息

### 1.1 文档目的

本文档是《铂润面料数字化转型业务需求文档》（BRD v3.0）的技术补充，定义系统的技术架构、非功能性需求、API 规范、数据库设计、部署方案等技术层面的需求规格。

### 1.2 读者对象

| 角色 | 关注章节 |
|------|----------|
| 开发工程师 | 全文 |
| 项目负责人 | 一~四、七、十三 |
| 运维工程师 | 九、十 |
| 测试工程师 | 十二 |

### 1.3 术语与缩写

| 术语 | 全称/解释 |
|------|-----------|
| BRD | Business Requirements Document，业务需求文档 |
| SRS | Software Requirements Specification，软件需求规格说明 |
| MVP | Minimum Viable Product，最小可行产品 |
| CDB | Cloud Database，腾讯云数据库 |
| COS | Cloud Object Storage，腾讯云对象存储 |
| PIPL | Personal Information Protection Law，个人信息保护法 |
| DTO | Data Transfer Object，数据传输对象 |
| ORM | Object-Relational Mapping，对象关系映射 |
| SLA | Service Level Agreement，服务等级协议 |
| RPO | Recovery Point Objective，恢复点目标 |
| RTO | Recovery Time Objective，恢复时间目标 |
| JSSDK | JavaScript SDK，企业微信/微信提供的前端开发工具包 |
| APM | Application Performance Monitoring，应用性能监控 |

---

## 二、项目技术概述

### 2.1 项目简述

铂润面料是一家面料贸易中间商，拥有约 100 家供应商和 50 家 B 端客户，月均处理 500+ 订单。本项目为其建设数字化管理系统，一期为内部供应链自动化系统（Web 工作台，桌面端为主 + 企业微信 OAuth 登录），二期为面向客户的 B2B 电商平台（微信小程序）。

完整业务需求详见 [BRD v3.0](./REQUIREMENTS_BUSINESS.md)。

### 2.2 技术目标

| 目标 | 描述 |
|------|------|
| **统一数据管理** | 将分散在 Excel、微信、纸质单据中的数据统一到结构化数据库 |
| **流程标准化** | 9 个订单状态节点，全流程可追溯 |
| **桌面优先** | Web 工作台以桌面浏览器为主要场景（99%），移动端通过响应式设计兼顾 |
| **可扩展** | 模块化架构，预留国际化、AI、物流 API 等扩展接口 |
| **数据安全** | 满足行业标准的备份、加密和访问控制 |
| **低运维成本** | 单体部署，腾讯云轻量服务器，月费可控在 100 元以内 |

### 2.3 技术约束与假设

**约束**：

| 约束项 | 描述 |
|--------|------|
| 云平台 | 腾讯云（与微信生态集成需要） |
| 用户认证 | 企业微信 OAuth 2.0（MVP 阶段 5 人团队，不自建账号） |
| 客户端平台 | 一期 Web 工作台（桌面端为主，响应式兼顾移动端），二期微信小程序 |
| 预算限制 | MVP 阶段服务器月费控制在 50-100 元 |
| 团队规模 | 独立开发，企业级纪律 |

**假设**：

- 企业微信已开通并配置好管理权限
- 腾讯云账号已注册并完成实名认证
- 域名已备案（中国大陆服务器需要 ICP 备案）
- MVP 阶段并发用户不超过 10 人

---

## 三、技术选型

### 3.1 技术栈总览

```
后端：    Node.js + NestJS + TypeScript
前端一期：React + TypeScript (Web 工作台，桌面端为主)
前端二期：微信原生小程序
架构：    模块化单体 (Modular Monolith)
ORM：     Prisma（类型安全 + 数据库迁移）
数据库：  MySQL (腾讯云 CDB)
缓存：    Redis（面料目录缓存、会话缓存）
文件存储：腾讯云 COS（面料图片）
CI/CD：   GitHub Actions
认证：    企业微信 OAuth 2.0
日志：    nestjs-pino（结构化 JSON 日志）
```

### 3.2 后端技术选型

| 技术 | 选型 | 选型理由 |
|------|------|----------|
| 运行时 | Node.js 20 LTS | 腾讯云/微信生态官方 SDK 支持最好 |
| 框架 | NestJS | 模块化架构天然适配，依赖注入，TypeScript 原生支持，生态成熟 |
| 语言 | TypeScript (strict) | 类型安全，减少运行时错误 |
| ORM | Prisma | 类型安全的数据库访问，自动生成迁移，声明式 Schema |
| 验证 | class-validator + class-transformer | NestJS 官方推荐的 DTO 验证方案 |
| 认证 | @nestjs/passport + passport-oauth2 | 企业微信 OAuth 认证 |
| API 文档 | @nestjs/swagger | 自动生成 OpenAPI 3.0 文档 |
| 配置管理 | @nestjs/config | 环境变量管理，支持 .env 文件 |
| 缓存 | @nestjs/cache-manager + Redis | 面料目录缓存、会话管理 |
| 定时任务 | @nestjs/schedule | 报价过期检查、数据清理等 |
| 限流 | @nestjs/throttler | API 限流防护 |
| 安全 | helmet | HTTP 安全头 |
| 日志 | nestjs-pino | 结构化 JSON 日志 |
| 文件上传 | multer + 腾讯云 COS SDK | 面料图片上传 |
| 健康检查 | @nestjs/terminus | /health, /ready 端点 |
| Excel 解析 | exceljs | 面料/供应商批量导入 |

### 3.3 前端技术选型（一期 Web 工作台）

| 技术 | 选型 | 选型理由 |
|------|------|----------|
| 框架 | React 18+ | 生态成熟，组件丰富 |
| 语言 | TypeScript (strict) | 类型安全，与后端类型共享 |
| UI 组件库 | Ant Design 5 | 桌面端优先的企业级 UI 组件库，表格/表单/布局功能完善 |
| 路由 | React Router v6 | SPA 路由管理 |
| 数据请求 | TanStack Query (React Query) | 服务端状态管理，缓存、重试 |
| HTTP 客户端 | Axios | 请求拦截、错误处理 |
| 构建工具 | Vite | 快速构建，HMR 支持 |
| 状态管理 | Zustand | 轻量级客户端状态管理（仅用于 UI 状态） |

### 3.4 前端技术选型（二期微信小程序）

| 技术 | 选型 | 选型理由 |
|------|------|----------|
| 框架 | 微信原生小程序 | 最佳性能，微信支付原生支持 |
| 语言 | TypeScript | 类型安全 |
| UI 组件库 | WeUI | 微信官方 UI 组件 |

### 3.5 NestJS 成熟生态模块清单

**原则：优先使用成熟生态模块，不自造轮子。**

| 模块 | 用途 | 替代自建 |
|------|------|----------|
| **Prisma** | ORM + 数据库迁移 + 类型安全 | 替代自建 SQL / TypeORM |
| **@nestjs/passport** + passport-oauth2 | 企业微信 OAuth 认证 | 替代自建认证逻辑 |
| **@nestjs/swagger** | 自动生成 OpenAPI 文档 | 替代手写 API 文档 |
| **@nestjs/config** | 环境变量管理 | 替代自建配置系统 |
| **class-validator** + **class-transformer** | DTO 请求验证 | 替代手动校验 |
| **@nestjs/cache-manager** + Redis | 缓存层 | 替代自建缓存 |
| **@nestjs/schedule** | 定时任务（报价过期等） | 替代自建调度器 |
| **@nestjs/throttler** | API 限流防护 | 替代自建限流 |
| **helmet** | HTTP 安全头 | 替代手动配置 |
| **nestjs-pino** | 结构化 JSON 日志 | 替代 console.log |
| **multer** + **腾讯云 COS SDK** | 文件上传到 COS | 替代自建文件处理 |
| **@nestjs/terminus** | 健康检查端点 | 替代自建 /health |
| **exceljs** | Excel 导入解析 | 替代自建解析器 |

---

## 四、系统架构设计

### 4.1 整体架构图

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

### 4.2 模块划分（NestJS Modules）

| 模块 | 职责 | 对应 BRD 章节 |
|------|------|---------------|
| **AuthModule** | 企业微信 OAuth 登录、JWT 会话管理、用户信息同步 | - |
| **FabricModule** | 面料 CRUD、搜索筛选、图片管理、客户特殊定价 | BRD 5.1 |
| **SupplierModule** | 供应商 CRUD、面料-供应商关联管理 | BRD 5.2 |
| **CustomerModule** | 客户 CRUD、商务信息、特殊定价 | BRD 5.3 |
| **OrderModule** | 订单 CRUD、状态机流转、付款追踪（双向）、订单时间线 | BRD 5.4 |
| **QuoteModule** | 报价 CRUD、有效期管理、过期自动标记 | BRD 5.5 |
| **LogisticsModule** | 物流信息 CRUD、关联订单明细 | BRD 5.6 |
| **FileModule** | 文件上传到 COS、图片 URL 管理 | BRD 5.1.3 |
| **ImportModule** | Excel 批量导入（面料、供应商） | BRD 5.1.6, 5.2.3 |
| **CommonModule** | 全局异常过滤器、日志中间件、请求拦截器、分页工具 | - |

### 4.3 依赖方向与模块通信

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

**模块通信原则**：

1. 模块间通过**服务注入**通信（NestJS 依赖注入）
2. 不允许循环依赖
3. CommonModule 不依赖任何业务模块
4. 每个模块只导出必要的 Service，不导出内部实现

### 4.4 目录结构设计

```
borealis-fabrics/
├── docs/
│   ├── REQUIREMENTS_BUSINESS.md     # 业务需求文档
│   ├── REQUIREMENTS_TECHNICAL.md    # 技术需求文档（本文档）
│   └── adr/                         # 架构决策记录
│       └── 001-modular-monolith.md
│
├── backend/
│   ├── src/
│   │   ├── main.ts                  # 应用入口
│   │   ├── app.module.ts            # 根模块
│   │   │
│   │   ├── common/                  # CommonModule
│   │   │   ├── common.module.ts
│   │   │   ├── filters/             # 全局异常过滤器
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── interceptors/        # 请求拦截器
│   │   │   │   ├── logging.interceptor.ts
│   │   │   │   └── transform.interceptor.ts
│   │   │   ├── decorators/          # 自定义装饰器
│   │   │   ├── guards/              # 通用守卫
│   │   │   ├── pipes/               # 通用管道
│   │   │   └── utils/               # 工具函数
│   │   │       └── pagination.ts
│   │   │
│   │   ├── auth/                    # AuthModule
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/          # Passport 策略
│   │   │   │   └── wework-oauth.strategy.ts
│   │   │   ├── guards/
│   │   │   │   └── jwt-auth.guard.ts
│   │   │   └── dto/
│   │   │
│   │   ├── fabric/                  # FabricModule
│   │   │   ├── fabric.module.ts
│   │   │   ├── fabric.controller.ts
│   │   │   ├── fabric.service.ts
│   │   │   └── dto/
│   │   │       ├── create-fabric.dto.ts
│   │   │       ├── update-fabric.dto.ts
│   │   │       └── query-fabric.dto.ts
│   │   │
│   │   ├── supplier/                # SupplierModule
│   │   │   ├── supplier.module.ts
│   │   │   ├── supplier.controller.ts
│   │   │   ├── supplier.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── customer/                # CustomerModule
│   │   │   ├── customer.module.ts
│   │   │   ├── customer.controller.ts
│   │   │   ├── customer.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── order/                   # OrderModule
│   │   │   ├── order.module.ts
│   │   │   ├── order.controller.ts
│   │   │   ├── order.service.ts
│   │   │   ├── order-state-machine.ts  # 订单状态机
│   │   │   └── dto/
│   │   │
│   │   ├── quote/                   # QuoteModule
│   │   │   ├── quote.module.ts
│   │   │   ├── quote.controller.ts
│   │   │   ├── quote.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── logistics/               # LogisticsModule
│   │   │   ├── logistics.module.ts
│   │   │   ├── logistics.controller.ts
│   │   │   ├── logistics.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── file/                    # FileModule
│   │   │   ├── file.module.ts
│   │   │   ├── file.controller.ts
│   │   │   ├── file.service.ts
│   │   │   └── cos.provider.ts      # 腾讯云 COS 封装
│   │   │
│   │   ├── import/                  # ImportModule
│   │   │   ├── import.module.ts
│   │   │   ├── import.controller.ts
│   │   │   ├── import.service.ts
│   │   │   └── validators/          # Excel 数据校验
│   │   │
│   │   └── prisma/                  # Prisma 服务
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma            # 数据库 Schema
│   │   └── migrations/              # 数据库迁移文件
│   │
│   ├── test/
│   │   ├── unit/                    # 单元测试
│   │   ├── integration/             # 集成测试
│   │   └── e2e/                     # 端到端测试
│   │
│   ├── .env.example                 # 环境变量模板
│   ├── Dockerfile
│   ├── docker-compose.yml           # 本地开发环境
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── package.json
│   └── .eslintrc.js
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                 # 入口
│   │   ├── App.tsx                  # 根组件
│   │   │
│   │   ├── pages/                   # 页面组件
│   │   │   ├── fabrics/             # 面料管理页面
│   │   │   ├── suppliers/           # 供应商管理页面
│   │   │   ├── customers/           # 客户管理页面
│   │   │   ├── orders/              # 订单管理页面
│   │   │   ├── quotes/              # 报价管理页面
│   │   │   └── import/              # 批量导入页面
│   │   │
│   │   ├── components/              # 共享组件
│   │   │   ├── layout/              # 布局组件
│   │   │   ├── form/                # 表单组件
│   │   │   └── common/              # 通用组件
│   │   │
│   │   ├── api/                     # API 请求封装
│   │   │   ├── client.ts            # Axios 实例
│   │   │   ├── fabric.ts
│   │   │   ├── supplier.ts
│   │   │   ├── customer.ts
│   │   │   ├── order.ts
│   │   │   ├── quote.ts
│   │   │   └── types.ts             # API 类型定义
│   │   │
│   │   ├── hooks/                   # 自定义 Hooks
│   │   ├── store/                   # Zustand 状态
│   │   ├── utils/                   # 工具函数
│   │   └── types/                   # 全局类型
│   │
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── .github/
│   └── workflows/
│       └── ci.yml                   # GitHub Actions CI/CD
│
├── .gitignore
└── README.md
```

---

## 五、API 设计规范

### 5.1 RESTful 设计原则

| 原则 | 规范 |
|------|------|
| URL 命名 | 全小写，复数名词，使用连字符分隔。例：`/api/v1/fabrics`，`/api/v1/order-items` |
| HTTP 方法 | GET（查询）、POST（创建）、PUT（全量更新）、PATCH（部分更新）、DELETE（删除） |
| 版本策略 | URL 路径版本：`/api/v1/...`。MVP 阶段使用 v1，后续版本共存 |
| 嵌套资源 | 最多两层嵌套。例：`/api/v1/orders/:orderId/items` |

### 5.2 请求/响应格式

**统一成功响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

**统一分页响应**：

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

**统一错误响应**：

```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "fabricName",
      "message": "fabricName must be a string"
    }
  ]
}
```

### 5.3 错误码规范

| HTTP 状态码 | 用途 | 说明 |
|-------------|------|------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功 |
| 400 | Bad Request | 请求参数验证失败 |
| 401 | Unauthorized | 未认证或认证过期 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（如重复编号） |
| 422 | Unprocessable Entity | 业务逻辑校验失败（如状态转换不允许） |
| 429 | Too Many Requests | 请求频率过高 |
| 500 | Internal Server Error | 服务端内部错误 |

### 5.4 分页/排序/筛选规范

**分页参数**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码（从 1 开始） |
| `pageSize` | number | 20 | 每页数量（最大 100） |

**排序参数**：

| 参数 | 格式 | 示例 |
|------|------|------|
| `sortBy` | `field` | `createdAt` |
| `sortOrder` | `asc` \| `desc` | `desc` |

**筛选参数**：

- 精确匹配：`?status=PRODUCTION`
- 模糊搜索：`?keyword=灰色绒布`
- 范围筛选：`?minPrice=50&maxPrice=200`
- 时间范围：`?startDate=2026-01-01&endDate=2026-01-31`
- 多值筛选：`?materials=polyester,cotton`

### 5.5 认证与授权

#### 5.5.1 企业微信 OAuth 2.0 认证流程

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│  前端 Web  │     │  后端 API │     │ 企业微信开放平台 │     │  Redis   │
└────┬─────┘     └────┬─────┘     └──────┬───────┘     └────┬─────┘
     │                │                   │                  │
     │  1. 访问 Web   │                   │                  │
     │───────────────→│                   │                  │
     │                │                   │                  │
     │  2. 重定向到企业微信授权页          │                  │
     │←───────────────│                   │                  │
     │                │                   │                  │
     │  3. 用户授权，回调带 code           │                  │
     │───────────────→│                   │                  │
     │                │  4. 用 code 换 access_token           │
     │                │──────────────────→│                  │
     │                │                   │                  │
     │                │  5. 返回 access_token + user_info     │
     │                │←──────────────────│                  │
     │                │                   │                  │
     │                │  6. 生成 JWT，存入 Redis              │
     │                │─────────────────────────────────────→│
     │                │                   │                  │
     │  7. 返回 JWT   │                   │                  │
     │←───────────────│                   │                  │
     │                │                   │                  │
     │  8. 后续请求带 Authorization: Bearer <JWT>            │
     │───────────────→│                   │                  │
     │                │  9. 验证 JWT      │                  │
     │                │─────────────────────────────────────→│
     │                │                   │                  │
```

#### 5.5.2 JWT 配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 算法 | HS256 | 对称加密，MVP 阶段足够 |
| 过期时间 | 7 天 | 企业内部应用可适当延长 |
| Payload | `{ userId, weworkId, name }` | 最小化存储 |
| 刷新策略 | 滑动过期 | 每次有效请求重置过期时间 |

#### 5.5.3 权限控制

MVP 阶段所有认证用户拥有全部权限（BRD 5.7），不做 RBAC。

后期迭代预留：在 JWT Payload 中添加 `roles` 字段，结合 `@Roles()` 装饰器和 `RolesGuard` 实现。

### 5.6 API 版本策略

- MVP 阶段使用 `/api/v1/`
- 后续版本新增 `/api/v2/`，旧版本保留至少 6 个月
- 版本变更仅在有**破坏性变更**时递增

### 5.5a 业务编号规范

| 编号类型 | 格式 | 示例 | 生成方式 |
|----------|------|------|----------|
| 面料编号 | `BF-{YYMM}-{4位序号}` | BF-2601-0001 | 系统创建自动生成，Excel 导入用户提供 |
| 订单编号 | `ORD-{YYMM}-{4位序号}` | ORD-2601-0001 | 系统自动生成 |
| 报价编号 | `QT-{YYMM}-{4位序号}` | QT-2601-0001 | 系统自动生成 |

**并发安全策略**：Redis INCR 原子递增（按月重置） + 数据库唯一约束兜底

**Redis 故障 Fallback 策略**：
1. Redis 正常：使用 Redis INCR 原子递增生成序号
2. Redis 不可用时：fallback 到数据库 `SELECT MAX(序号) + 1`，配合数据库唯一约束保证不重复
3. Redis 恢复后：从数据库读取当前最大序号，同步到 Redis 后恢复正常模式
4. 编号生成服务需捕获 Redis 连接异常，自动切换到 fallback 模式

### 5.7 核心 API 端点清单

> **删除策略**：
> - **有关联数据引用**的实体（如面料已被订单引用、供应商已有付款记录、客户已有订单）：DELETE 返回 `409 Conflict`，仅允许软删除（`PATCH` 设置 `isActive=false`）
> - **无关联数据引用**的实体：允许物理删除
> - **子资源**（图片、定价、物流记录等）：允许物理删除
>
> **`isActive` vs `status` 语义分工**：
> - `isActive`（布尔）：**软删除标识**。`false` 表示该记录已被"删除"，查询时默认过滤掉。适用于面料、供应商、客户、用户等主实体。
> - `status`（字符串）：**业务状态**。描述实体当前的业务阶段，如供应商的 active/suspended/eliminated、订单的 INQUIRY/PENDING/...、报价的 active/expired/converted。业务状态变更不影响 isActive。
> - 两者独立运作：一个 suspended 状态的供应商 isActive 仍为 true（仍然存在，只是暂停合作）；isActive=false 的供应商是被"删除"的，不会出现在任何查询结果中。

#### 5.7.1 认证模块 (AuthModule)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/auth/wework/login` | 企业微信 OAuth 登录（重定向） |
| GET | `/api/v1/auth/wework/callback` | OAuth 回调处理 |
| GET | `/api/v1/auth/me` | 获取当前用户信息 |
| POST | `/api/v1/auth/logout` | 登出 |

#### 5.7.2 面料模块 (FabricModule)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/fabrics` | 面料列表（分页、筛选、搜索） |
| GET | `/api/v1/fabrics/:id` | 面料详情（含供应商、图片、定价） |
| POST | `/api/v1/fabrics` | 创建面料 |
| PATCH | `/api/v1/fabrics/:id` | 更新面料信息 |
| DELETE | `/api/v1/fabrics/:id` | 删除面料（无订单引用时物理删除，有引用时返回 409） |
| POST | `/api/v1/fabrics/:id/images` | 上传面料图片 |
| DELETE | `/api/v1/fabrics/:id/images/:imageId` | 删除面料图片 |
| GET | `/api/v1/fabrics/:id/suppliers` | 获取面料的供应商列表 |
| POST | `/api/v1/fabrics/:id/suppliers` | 关联供应商到面料 |
| PATCH | `/api/v1/fabrics/:id/suppliers/:supplierId` | 更新面料-供应商关联信息 |
| DELETE | `/api/v1/fabrics/:id/suppliers/:supplierId` | 移除面料-供应商关联 |
| GET | `/api/v1/fabrics/:id/pricing` | 获取面料的客户特殊定价列表 |
| POST | `/api/v1/fabrics/:id/pricing` | 设置客户特殊定价 |
| PATCH | `/api/v1/fabrics/:id/pricing/:pricingId` | 更新客户特殊定价 |
| DELETE | `/api/v1/fabrics/:id/pricing/:pricingId` | 删除客户特殊定价 |

> **面料图片业务规则**：BRD 要求面料至少 3 张图片，MVP 阶段作为前端提示（非硬性校验）。面料详情 API 返回 `imageCount` 字段，前端在图片不足 3 张时显示黄色警告。

#### 5.7.3 供应商模块 (SupplierModule)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/suppliers` | 供应商列表（分页、搜索） |
| GET | `/api/v1/suppliers/:id` | 供应商详情（含可供应面料） |
| POST | `/api/v1/suppliers` | 创建供应商 |
| PATCH | `/api/v1/suppliers/:id` | 更新供应商信息 |
| DELETE | `/api/v1/suppliers/:id` | 删除供应商（无订单/付款引用时物理删除，有引用时返回 409） |
| GET | `/api/v1/suppliers/:id/fabrics` | 获取供应商的可供应面料 |

#### 5.7.4 客户模块 (CustomerModule)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/customers` | 客户列表（分页、搜索） |
| GET | `/api/v1/customers/:id` | 客户详情（含特殊定价、历史订单） |
| POST | `/api/v1/customers` | 创建客户 |
| PATCH | `/api/v1/customers/:id` | 更新客户信息 |
| DELETE | `/api/v1/customers/:id` | 删除客户（无订单引用时物理删除，有引用时返回 409） |
| GET | `/api/v1/customers/:id/pricing` | 获取客户的特殊定价列表 |
| POST | `/api/v1/customers/:id/pricing` | 设置客户的面料特殊定价 |
| PATCH | `/api/v1/customers/:id/pricing/:pricingId` | 更新客户特殊定价 |
| DELETE | `/api/v1/customers/:id/pricing/:pricingId` | 删除客户特殊定价 |
| GET | `/api/v1/customers/:id/orders` | 获取客户的历史订单 |

#### 5.7.5 订单模块 (OrderModule)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/orders` | 订单列表（分页、筛选、搜索；支持 ?fabricId=xxx 按面料筛选） |
| GET | `/api/v1/orders/:id` | 订单详情（含明细、时间线、付款、物流） |
| POST | `/api/v1/orders` | 创建订单（含明细项） |
| PATCH | `/api/v1/orders/:id` | 更新订单基本信息 |
| DELETE | `/api/v1/orders/:id` | 删除订单（仅 INQUIRY 状态且无付款记录时允许，其他状态使用取消） |
| GET | `/api/v1/orders/:id/items` | 获取订单明细列表 |
| POST | `/api/v1/orders/:id/items` | 添加订单明细 |
| PATCH | `/api/v1/orders/:id/items/:itemId` | 更新订单明细 |
| DELETE | `/api/v1/orders/:id/items/:itemId` | 删除订单明细（仅 INQUIRY/PENDING 状态可删除，其他状态返回 422） |
| PATCH | `/api/v1/orders/:id/items/:itemId/status` | 更新订单明细状态（状态机流转） |
| POST | `/api/v1/orders/:id/items/:itemId/cancel` | 取消订单明细 |
| POST | `/api/v1/orders/:id/items/:itemId/restore` | 恢复已取消的订单明细 |
| GET | `/api/v1/orders/:id/timeline` | 获取订单时间线（支持 ?itemId=xxx 按明细筛选） |
| GET | `/api/v1/orders/:id/items/:itemId/timeline` | 获取指定明细的时间线 |
| PATCH | `/api/v1/orders/:id/customer-payment` | 更新客户侧付款信息 |
| GET | `/api/v1/orders/:id/supplier-payments` | 获取订单的供应商付款列表 |
| PATCH | `/api/v1/orders/:id/supplier-payments/:supplierId` | 更新指定供应商的付款信息 |

#### 5.7.6 报价模块 (QuoteModule)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/quotes` | 报价列表（分页、筛选） |
| GET | `/api/v1/quotes/:id` | 报价详情 |
| POST | `/api/v1/quotes` | 创建报价 |
| PATCH | `/api/v1/quotes/:id` | 更新报价 |
| DELETE | `/api/v1/quotes/:id` | 删除报价（仅 active/expired 状态允许，converted 状态不允许删除） |
| POST | `/api/v1/quotes/:id/convert-to-order` | 报价一键转订单（仅 active 且未过期的报价可转换，转换后报价状态变为 converted；生成的订单明细初始状态为 PENDING，时间线记录"从报价 QT-xxx 转换"） |

#### 5.7.7 物流模块 (LogisticsModule)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/logistics` | 物流记录列表 |
| GET | `/api/v1/logistics/:id` | 物流详情 |
| POST | `/api/v1/logistics` | 创建物流记录（关联订单明细） |
| PATCH | `/api/v1/logistics/:id` | 更新物流信息 |
| DELETE | `/api/v1/logistics/:id` | 删除物流记录 |

#### 5.7.8 导入模块 (ImportModule)

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/v1/import/fabrics` | 批量导入面料（Excel） |
| POST | `/api/v1/import/suppliers` | 批量导入供应商（Excel） |
| GET | `/api/v1/import/templates/fabrics` | 下载面料导入模板 |
| GET | `/api/v1/import/templates/suppliers` | 下载供应商导入模板 |

#### 5.7.9 系统模块

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/system/enums` | 返回所有枚举值及中文映射（MVP 硬编码） |
| GET | `/health` | 存活检查 |
| GET | `/ready` | 就绪检查（含数据库连接检查） |

---

## 六、数据库设计

### 6.1 ER 图（核心实体关系）

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    users     │       │     fabrics      │       │  suppliers   │
│──────────────│       │──────────────────│       │──────────────│
│ id           │       │ id               │       │ id           │
│ wework_id    │       │ fabric_code      │       │ company_name │
│ name         │       │ name             │       │ contact_name │
│ avatar       │       │ material (JSON)  │       │ phone        │
│ ...          │       │ color            │       │ wechat       │
└──────────────┘       │ weight (Decimal) │       │ email        │
                       │ width (Decimal)  │       │ address      │
                       │ application(JSON)│       │ status       │
                       │ tags (JSON)      │       │ settle_type  │
                       │ default_price    │       │ ...          │
                       │ ...              │       └──────┬───────┘
                       └───────┬──────────┘              │
                               │                         │
                               │  ┌────────────────────┐ │
                               └──│ fabric_suppliers   │─┘
                                  │────────────────────│
                                  │ fabric_id          │
                                  │ supplier_id        │
                                  │ purchase_price     │
                                  │ min_order_qty      │
                                  │ lead_time_days     │
                                  └────────────────────┘

┌──────────────┐       ┌──────────────────────┐
│  customers   │       │  customer_pricing    │
│──────────────│       │──────────────────────│
│ id           │───┐   │ id                   │
│ company_name │   ├──→│ customer_id          │
│ contact_name │   │   │ fabric_id            │←── fabrics.id
│ phone        │   │   │ special_price        │
│ wechat       │   │   └──────────────────────┘
│ email        │   │
│ credit_type  │   │   ┌──────────────────────┐
│ credit_days  │   │   │      orders          │
│ ...          │   │   │──────────────────────│
└──────────────┘   └──→│ id                   │
                       │ order_code           │
                       │ customer_id          │
                       │ total_amount         │
                       │ customer_paid        │
                       │ customer_pay_status  │
                       │ delivery_address     │
                       │ notes                │
                       └───────┬──────────────┘
                               │
                  ┌────────────┼─────────────────────┐
                  │            │                     │
          ┌───────┴──────┐   ┌┴─────────────────┐   │
          │ order_items  │   │supplier_payments │   │
          │──────────────│   │─────────────────│   │
          │ id           │   │ id              │   │
          │ order_id     │   │ order_id        │   │
          │ fabric_id    │←──│ supplier_id     │←── suppliers.id
          │ supplier_id  │   │ payable         │   │
          │ quote_id     │←─ │ paid            │   │
          │ quantity     │   │ pay_status      │   │
          │ sale_price   │   │ pay_method      │   │
          │ purchase_price│  │ credit_days     │   │
          │ subtotal     │   └─────────────────┘   │
          │ status       │                         │
          │ delivery_date│                         │
          └───────┬──────┘                         │
                  │                                │
     ┌────────────┼────────────┐                   │
     │            │            │                   │
┌────┴───────┐ ┌──┴─────────┐ │                   │
│ order_     │ │ logistics  │ │                   │
│ timelines  │ │────────────│ │                   │
│────────────│ │ id         │ │                   │
│ id         │ │ order_item │ │                   │
│ order_item │ │ _id        │ │                   │
│ _id        │ │ carrier    │ │                   │
│ from_status│ │ contact_   │ │                   │
│ to_status  │ │   name     │ │                   │
│ operator_id│ │ tracking_no│ │                   │
│ remark     │ └────────────┘ │                   │
└────────────┘                │                   │
                              │                   │
                    ┌─────────┴───────┐           │
                    │     quotes      │           │
                    │─────────────────│           │
                    │ id              │           │
                    │ quote_code      │           │
                    │ customer_id     │←──────────┘
                    │ fabric_id       │←── fabrics.id
                    │ quantity        │
                    │ unit_price      │
                    │ total_price     │
                    │ valid_until     │
                    │ status          │
                    └─────────────────┘
                     ↑
                     └─── order_items.quote_id (可选关联)

┌──────────────────┐
│  fabric_images   │
│──────────────────│
│ id               │
│ fabric_id        │←── fabrics.id
│ url              │
│ sort_order       │
│ created_at       │
└──────────────────┘
```

### 6.2 核心表结构定义（Prisma Schema）

#### 6.2.1 用户表 (users)

```prisma
model User {
  id        Int      @id @default(autoincrement())
  weworkId  String   @unique @map("wework_id")     // 企业微信 UserId
  name      String                                  // 用户姓名
  avatar    String?                                 // 头像 URL
  mobile    String?                                 // 手机号
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  orderTimelines OrderTimeline[]
  createdOrders  Order[] @relation("OrderCreator")

  @@map("users")
}
```

#### 6.2.2 面料表 (fabrics)

```prisma
model Fabric {
  id               Int      @id @default(autoincrement())
  fabricCode       String   @unique @map("fabric_code")    // 面料编号 BF-2601-0001
  name             String                                   // 面料名称
  material         Json?    @db.Json                         // 材质/成分 JSON 数组 ["polyester", "cotton"]
  composition      String?                                  // 成分比例
  color            String?                                  // 颜色
  weight           Decimal? @db.Decimal(8, 2)               // 克重 g/m²
  width            Decimal? @db.Decimal(8, 2)               // 幅宽 cm
  thickness        String?                                  // 厚度等级：thin/medium/thick
  handFeel         String?  @map("hand_feel")               // 手感
  glossLevel       String?  @map("gloss_level")             // 光泽度
  application      Json?    @db.Json                         // 适用场景 JSON 数组 ["sofa", "curtain"]
  defaultPrice     Decimal? @map("default_price") @db.Decimal(10, 2)  // 默认销售价
  defaultLeadTime  Int?     @map("default_lead_time")       // 默认交货周期（天）
  description      String?  @db.Text                        // 面料描述（AI 语义检索预留）
  tags             Json?    @db.Json                         // 卖点标签 JSON 数组 ["耐磨", "防水"]
  notes            String?  @db.Text                        // 备注
  isActive         Boolean  @default(true) @map("is_active")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  // Relations
  images           FabricImage[]
  fabricSuppliers  FabricSupplier[]
  customerPricing  CustomerPricing[]
  orderItems       OrderItem[]
  quotes           Quote[]

  @@index([fabricCode])
  @@index([name])
  @@index([color])
  @@map("fabrics")
}
```

#### 6.2.3 面料图片表 (fabric_images)

```prisma
model FabricImage {
  id        Int      @id @default(autoincrement())
  fabricId  Int      @map("fabric_id")
  url       String                                   // COS 图片 URL
  sortOrder Int      @default(0) @map("sort_order")  // 排序顺序
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  fabric Fabric @relation(fields: [fabricId], references: [id], onDelete: Cascade)

  @@index([fabricId])
  @@map("fabric_images")
}
```

#### 6.2.4 供应商表 (suppliers)

```prisma
model Supplier {
  id              Int      @id @default(autoincrement())
  companyName     String   @unique @map("company_name")    // 公司名称
  contactName     String?  @map("contact_name")           // 联系人
  phone           String?                                  // 电话
  wechat          String?                                  // 微信
  email           String?                                  // 邮箱
  address         String?                                  // 地址
  status          String   @default("active")              // active/suspended/eliminated
  billReceiveType String?  @map("bill_receive_type")       // 账单接收方式
  settleType      String   @default("prepay") @map("settle_type")  // prepay/credit
  creditDays      Int?     @map("credit_days")             // 账期天数
  notes           String?  @db.Text
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  fabricSuppliers  FabricSupplier[]
  orderItems       OrderItem[]
  supplierPayments SupplierPayment[]

  @@index([status])
  @@map("suppliers")
}
```

#### 6.2.5 面料-供应商关联表 (fabric_suppliers)

```prisma
model FabricSupplier {
  id            Int      @id @default(autoincrement())
  fabricId      Int      @map("fabric_id")
  supplierId    Int      @map("supplier_id")
  purchasePrice Decimal  @map("purchase_price") @db.Decimal(10, 2)  // 采购单价
  minOrderQty   Decimal? @map("min_order_qty") @db.Decimal(10, 2)  // 最小起订量（米）
  leadTimeDays  Int?     @map("lead_time_days")                     // 交货周期（天）
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  fabric   Fabric   @relation(fields: [fabricId], references: [id], onDelete: Cascade)
  supplier Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)

  @@unique([fabricId, supplierId])
  @@index([fabricId])
  @@index([supplierId])
  @@map("fabric_suppliers")
}
```

#### 6.2.6 客户表 (customers)

```prisma
model Customer {
  id          Int      @id @default(autoincrement())
  companyName String   @map("company_name")                // 公司名称
  contactName String?  @map("contact_name")                // 联系人
  phone       String?                                       // 电话
  wechat      String?                                       // 微信
  email       String?                                       // 邮箱
  addresses   Json?    @db.Json                             // 收货地址列表 JSON: Array<AddressVO>
  // AddressVO: { label: string; address: string; contactName?: string; contactPhone?: string }
  // MVP 保持 JSON 存储，代码层封装为 AddressVO 值对象（便于后期迁移为独立表）
  creditType  String   @default("prepay") @map("credit_type")  // prepay/credit
  creditDays  Int?     @map("credit_days")                  // 账期天数
  notes       String?  @db.Text                             // 客户备注
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  customerPricing CustomerPricing[]
  orders          Order[]
  quotes          Quote[]

  @@index([companyName])
  @@map("customers")
}
```

#### 6.2.7 客户特殊定价表 (customer_pricing)

```prisma
model CustomerPricing {
  id           Int      @id @default(autoincrement())
  customerId   Int      @map("customer_id")
  fabricId     Int      @map("fabric_id")
  specialPrice Decimal  @map("special_price") @db.Decimal(10, 2)  // 特殊价格
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  fabric   Fabric   @relation(fields: [fabricId], references: [id], onDelete: Cascade)

  @@unique([customerId, fabricId])
  @@index([customerId])
  @@index([fabricId])
  @@map("customer_pricing")
}
```

#### 6.2.8 订单主表 (orders)

```prisma
model Order {
  id                 Int      @id @default(autoincrement())
  orderCode          String   @unique @map("order_code")    // 订单编号 ORD-2601-0001
  customerId         Int      @map("customer_id")
  status             String   @default("INQUIRY")              // 聚合状态（取所有明细中进度最低的状态，系统自动计算）
  totalAmount        Decimal  @default(0) @map("total_amount") @db.Decimal(12, 2)  // 订单总价（同时作为应收金额，后期如需折扣再添加独立字段）

  // 客户侧付款
  customerPaid       Decimal  @default(0) @map("customer_paid") @db.Decimal(12, 2)      // 已收金额
  customerPayStatus  String   @default("unpaid") @map("customer_pay_status")            // unpaid/partial/paid
  customerPayMethod  String?  @map("customer_pay_method")                                // wechat/alipay/bank/credit
  customerCreditDays Int?     @map("customer_credit_days")                               // 客户账期天数
  customerPaidAt     DateTime? @map("customer_paid_at")

  deliveryAddress    String?  @map("delivery_address") @db.Text  // 收货地址
  createdBy          Int?     @map("created_by")                // 创建人
  notes              String?  @db.Text                       // 订单备注
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  // Relations
  customer         Customer          @relation(fields: [customerId], references: [id])
  creator          User?             @relation("OrderCreator", fields: [createdBy], references: [id])
  items            OrderItem[]
  supplierPayments SupplierPayment[]
  paymentRecords   PaymentRecord[]

  @@index([orderCode])
  @@index([customerId])
  @@index([status])
  @@index([customerPayStatus])
  @@index([createdAt])
  @@map("orders")
}
```

#### 6.2.9 订单明细表 (order_items)

```prisma
model OrderItem {
  id            Int      @id @default(autoincrement())
  orderId       Int      @map("order_id")
  fabricId      Int      @map("fabric_id")
  supplierId    Int?     @map("supplier_id")                // 选择的供应商
  quoteId       Int?     @map("quote_id")                   // 关联报价单
  quantity      Decimal  @map("quantity") @db.Decimal(10, 2)  // 数量（米）
  salePrice     Decimal  @map("sale_price") @db.Decimal(10, 2)  // 销售单价
  purchasePrice Decimal? @map("purchase_price") @db.Decimal(10, 2)  // 采购单价
  subtotal      Decimal  @map("subtotal") @db.Decimal(12, 2)   // 小计 = quantity * salePrice
  status        String   @default("INQUIRY")                     // 订单状态（见状态机）
  prevStatus    String?  @map("prev_status")                     // 取消前的状态（用于恢复）
  deliveryDate  DateTime? @map("delivery_date")                  // 交期要求
  notes         String?  @db.Text
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  order     Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  fabric    Fabric          @relation(fields: [fabricId], references: [id])
  supplier  Supplier?       @relation(fields: [supplierId], references: [id])
  quote     Quote?          @relation(fields: [quoteId], references: [id])
  timelines OrderTimeline[]
  logistics Logistics[]

  @@index([orderId])
  @@index([fabricId])
  @@index([status])
  @@map("order_items")
}
```

#### 6.2.10 订单时间线表 (order_timelines)

```prisma
model OrderTimeline {
  id          Int      @id @default(autoincrement())
  orderItemId Int      @map("order_item_id")
  fromStatus  String?  @map("from_status")     // 前状态
  toStatus    String   @map("to_status")        // 后状态
  operatorId  Int?     @map("operator_id")      // 操作人
  remark      String?  @db.Text                 // 备注
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  orderItem OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  operator  User?     @relation(fields: [operatorId], references: [id])

  @@index([orderItemId])
  @@index([createdAt])
  @@map("order_timelines")
}
```

#### 6.2.11 报价表 (quotes)

```prisma
model Quote {
  id         Int      @id @default(autoincrement())
  quoteCode  String   @unique @map("quote_code")     // 报价编号 QT-2601-0001
  customerId Int      @map("customer_id")
  fabricId   Int      @map("fabric_id")
  quantity   Decimal  @db.Decimal(10, 2)              // 数量（米）
  unitPrice  Decimal  @map("unit_price") @db.Decimal(10, 2)  // 单价
  totalPrice Decimal  @map("total_price") @db.Decimal(12, 2) // 总价
  validUntil DateTime @map("valid_until")             // 有效期截止日
  status     String   @default("active")              // active/expired/converted
  notes      String?  @db.Text
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  // Relations
  customer   Customer    @relation(fields: [customerId], references: [id])
  fabric     Fabric      @relation(fields: [fabricId], references: [id])
  orderItems OrderItem[]

  @@index([quoteCode])
  @@index([customerId])
  @@index([fabricId])
  @@index([validUntil])
  @@index([status])
  @@map("quotes")
}
```

#### 6.2.12 物流表 (logistics)

```prisma
model Logistics {
  id           Int      @id @default(autoincrement())
  orderItemId  Int      @map("order_item_id")
  carrier      String                                    // 物流公司
  contactName  String?  @map("contact_name")             // 联系人
  contactPhone String?  @map("contact_phone")            // 联系电话
  trackingNo   String?  @map("tracking_no")              // 物流单号
  shippedAt    DateTime? @map("shipped_at")              // 发货时间
  notes        String?  @db.Text
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  orderItem OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)

  @@index([orderItemId])
  @@index([trackingNo])
  @@map("logistics")
}
```

#### 6.2.13 供应商付款表 (supplier_payments)

```prisma
model SupplierPayment {
  id              Int      @id @default(autoincrement())
  orderId         Int      @map("order_id")
  supplierId      Int      @map("supplier_id")
  payable         Decimal  @default(0) @db.Decimal(12, 2)     // 应付金额
  paid            Decimal  @default(0) @db.Decimal(12, 2)     // 已付金额
  payStatus       String   @default("unpaid") @map("pay_status")  // unpaid/partial/paid
  payMethod       String?  @map("pay_method")                     // prepay/credit
  creditDays      Int?     @map("credit_days")                    // 账期天数
  paidAt          DateTime? @map("paid_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  order    Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  supplier Supplier @relation(fields: [supplierId], references: [id])

  @@unique([orderId, supplierId])
  @@index([orderId])
  @@index([supplierId])
  @@index([payStatus])
  @@map("supplier_payments")
}
```

#### 6.2.14 付款流水表 (payment_records)

```prisma
model PaymentRecord {
  id              Int      @id @default(autoincrement())
  orderId         Int      @map("order_id")
  type            String                                    // customer（客户付款）/ supplier（供应商付款）
  supplierId      Int?     @map("supplier_id")              // 供应商付款时填写
  amount          Decimal  @db.Decimal(12, 2)               // 本次付款金额
  payMethod       String?  @map("pay_method")               // wechat/alipay/bank/credit
  remark          String?  @db.Text                         // 备注
  operatorId      Int?     @map("operator_id")              // 操作人
  createdAt       DateTime @default(now()) @map("created_at")

  // Relations
  order    Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  supplier Supplier? @relation(fields: [supplierId], references: [id])
  operator User?     @relation(fields: [operatorId], references: [id])

  @@index([orderId])
  @@index([supplierId])
  @@index([type])
  @@map("payment_records")
}
```

> **说明**：每次付款操作记录一条流水。客户已付/供应商已付金额 = 对应流水金额之和，系统自动汇总。

#### 6.2.15 金额自动计算规则

> **金额自动计算规则**：
> - `order_items.subtotal` = `quantity × salePrice`，明细变更时自动重算
> - `orders.totalAmount` = 所有明细 `subtotal` 之和，明细增删改时自动重算
> - `supplier_payments.payable` = 该供应商下所有明细 `quantity × purchasePrice` 之和，明细变更时自动重算

### 6.3 订单状态机定义

```
状态枚举值与转换规则：

INQUIRY     (询价中)
PENDING     (待下单)
ORDERED     (已下单)
PRODUCTION  (生产中)
QC          (质检中)
SHIPPED     (已发货)
RECEIVED    (已签收)
COMPLETED   (已完成)
CANCELLED   (已取消)

合法状态转换：
┌───────────┐
│  INQUIRY  │──→ PENDING ──→ ORDERED ──→ PRODUCTION ──→ QC ──→ SHIPPED ──→ RECEIVED ──→ COMPLETED
└───────────┘
     │            │           │             │            │         │           │            │
     └────────────┴───────────┴─────────────┴────────────┴─────────┴───────────┴────────────┘
                                            │
                                            ▼
                                       CANCELLED
                                            │
                                            ▼
                                    恢复到 prevStatus
```

**状态转换规则**：

| 当前状态 | 允许转换到 |
|----------|-----------|
| INQUIRY | PENDING, CANCELLED |
| PENDING | ORDERED, CANCELLED |
| ORDERED | PRODUCTION, CANCELLED |
| PRODUCTION | QC, CANCELLED |
| QC | SHIPPED, CANCELLED |
| SHIPPED | RECEIVED, CANCELLED |
| RECEIVED | COMPLETED, CANCELLED |
| COMPLETED | CANCELLED |
| CANCELLED | 恢复到 prevStatus（取消前的状态） |

### 6.4 索引策略

| 表名 | 索引字段 | 索引类型 | 用途 |
|------|----------|----------|------|
| fabrics | fabric_code | UNIQUE | 编号唯一查找 |
| fabrics | name | INDEX | 名称搜索 |
| fabrics | color | INDEX | 颜色筛选（material/application/tags 为 JSON 类型，不建普通索引） |
| suppliers | company_name | UNIQUE | 公司名称唯一约束 |
| customers | company_name | INDEX | 名称搜索 |
| orders | order_code | UNIQUE | 编号唯一查找 |
| orders | customer_id | INDEX | 客户订单查询 |
| orders | created_at | INDEX | 时间范围查询 |
| orders | customer_pay_status | INDEX | 客户付款状态筛选 |
| order_items | order_id | INDEX | 订单明细查询 |
| order_items | fabric_id | INDEX | 按面料筛选订单 |
| order_items | status | INDEX | 状态筛选 |
| supplier_payments | (order_id, supplier_id) | UNIQUE | 防止重复记录 |
| supplier_payments | order_id | INDEX | 订单维度查询 |
| supplier_payments | supplier_id | INDEX | 供应商维度查询 |
| supplier_payments | pay_status | INDEX | 付款状态筛选 |
| quotes | valid_until | INDEX | 过期检查定时任务 |
| logistics | tracking_no | INDEX | 物流单号查询 |
| fabric_suppliers | (fabric_id, supplier_id) | UNIQUE | 防止重复关联 |
| customer_pricing | (customer_id, fabric_id) | UNIQUE | 防止重复定价 |

> **JSON 字段查询说明**：material / application / tags 为 JSON 数组字段，Prisma 对 MySQL JSON 字段的 `array_contains` 原生支持有限。多值筛选（如 `?materials=polyester,cotton`）需使用 Prisma `$queryRaw` 配合 MySQL `JSON_CONTAINS()` 函数实现。示例：`WHERE JSON_CONTAINS(material, '"polyester"')`。

### 6.5 数据迁移策略（Prisma Migrate）

```bash
# 创建迁移
npx prisma migrate dev --name <migration_name>

# 应用迁移到生产环境
npx prisma migrate deploy

# 重置开发数据库
npx prisma migrate reset

# 查看迁移状态
npx prisma migrate status
```

**迁移规则**：

1. 每次数据模型变更必须生成迁移文件
2. 迁移文件必须提交到 Git
3. 生产环境迁移前必须在 staging 验证
4. 破坏性迁移（删列、改类型）需提前备份数据

---

## 七、非功能性需求

### 7.1 性能需求

| 指标 | MVP 目标 | 二期目标 |
|------|----------|----------|
| 页面首屏加载 | < 3 秒（3G 网络） | < 2 秒 |
| API 响应时间 (P50) | < 200ms | < 200ms |
| API 响应时间 (P95) | < 500ms | < 500ms |
| API 响应时间 (P99) | < 1000ms | < 800ms |
| 并发用户 | 5-10 人 | 50+ 人 |
| 数据库查询 | 单表 < 50ms | 单表 < 50ms |
| 文件上传 | < 5 秒（5MB 图片） | < 3 秒 |
| Excel 导入 | < 30 秒（1000 行） | < 15 秒 |

### 7.2 可用性需求

| 指标 | 目标 |
|------|------|
| 月度 SLA | 99.5%（约 3.6 小时/月停机） |
| 计划维护窗口 | 工作日 22:00-06:00（北京时间） |
| 无计划停机恢复 | < 4 小时 |

### 7.3 数据备份与恢复

| 指标 | 目标 | 实现方式 |
|------|------|----------|
| RPO（恢复点目标） | ≤ 5 分钟 | CDB binlog 实时备份 + 每日全量备份 |
| RTO（恢复时间目标） | ≤ 4 小时 | 备份恢复到新实例 |
| 备份频率 | 每日一次 | 腾讯云 CDB 自动备份 |
| 备份保留 | 30 天 | 腾讯云 CDB 配置 |
| 异地备份 | 每周一次 | 主站区域 CDB 备份 + 每周同步到异地 COS 桶（成本约 ¥5-10/月） |
| 备份验证 | 每月一次 | 手动恢复到测试环境验证 |

### 7.4 安全需求

| 安全项 | 实现方式 |
|--------|----------|
| 传输加密 | HTTPS 全站（TLS 1.2+），腾讯云免费证书 |
| 认证 | 企业微信 OAuth 2.0 + JWT |
| 静态数据加密 | 腾讯云 CDB 透明数据加密（TDE），应用层不做字段级加密（避免与搜索冲突） |
| SQL 注入防护 | Prisma 参数化查询（ORM 内建防护） |
| XSS 防护 | helmet 设置 CSP 头 + 输入清理 |
| CSRF 防护 | JWT Token（不使用 Cookie 认证，天然防 CSRF） |
| API 限流 | @nestjs/throttler（默认 60 次/分钟） |
| HTTP 安全头 | helmet 中间件（X-Frame-Options, HSTS 等） |
| 文件上传安全 | 限制文件类型（图片/Excel）、大小限制（10MB） |
| 日志脱敏 | 日志中不记录敏感字段完整内容 |
| 个人信息保护法（PIPL） | 客户联系方式收集需告知用途，提供删除能力 |
| PIPL 合规（二期） | 二期小程序上线前重新评估个人信息保护法合规要求 |

### 7.5 可扩展性

| 扩展方向 | 预留方式 | 优先级 |
|----------|----------|--------|
| 国际化 (i18n) | 所有用户可见文本通过 key-value 管理，MVP 只做中文 | 中 |
| 多币种 | 金额字段使用 Decimal，币种字段预留但默认 CNY | 中 |
| AI 功能 | 面料 description 字段存储自由文本，预留向量搜索接口 | 低 |
| 物流 API | LogisticsModule 预留 track() 方法接口 | 低 |
| 消息通知 | 预留 NotificationService 接口 | 低 |
| RBAC 权限 | JWT Payload 预留 roles 字段 | 低 |
| 微服务拆分 | 模块化单体，每个 Module 可独立抽取为微服务 | 低 |

---

## 八、前端技术方案

### 8.1 Web 工作台技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18+ | UI 框架 |
| TypeScript | 5+ (strict) | 类型安全 |
| Vite | 5+ | 构建工具 |
| Ant Design | 5+ | 桌面端企业级 UI 组件库 |
| React Router | v6 | SPA 路由 |
| TanStack Query | v5 | 服务端状态管理 |
| Axios | 1.x | HTTP 客户端 |
| Zustand | 4+ | 轻量客户端状态管理 |

### 8.2 页面规划

| 页面 | 路径 | 功能 |
|------|------|------|
| 登录 | `/login` | 企业微信 OAuth 登录 |
| 首页/工作台 | `/` | 待处理订单、快捷入口 |
| 面料列表 | `/fabrics` | 面料列表、搜索筛选 |
| 面料详情 | `/fabrics/:id` | 面料信息、供应商、图片、定价 |
| 面料编辑 | `/fabrics/:id/edit` | 编辑面料信息 |
| 供应商列表 | `/suppliers` | 供应商列表、搜索 |
| 供应商详情 | `/suppliers/:id` | 供应商信息、可供应面料 |
| 客户列表 | `/customers` | 客户列表、搜索 |
| 客户详情 | `/customers/:id` | 客户信息、特殊定价、历史订单 |
| 订单列表 | `/orders` | 订单列表、筛选（状态/客户/时间） |
| 订单详情 | `/orders/:id` | 订单明细、状态流转、付款、物流、时间线 |
| 报价列表 | `/quotes` | 报价列表、筛选 |
| 报价创建 | `/quotes/new` | 创建新报价 |
| 批量导入 | `/import` | Excel 导入面料/供应商 |

### 8.3 企业微信应用接入

#### 8.3.1 接入流程

1. 在企业微信管理后台创建应用
2. 配置应用主页 URL 为 Web 工作台地址
3. 配置 OAuth 授权回调域名
4. 前端实现 OAuth 登录流程（标准 Web 重定向方式）

#### 8.3.2 企业微信集成范围（MVP）

MVP 阶段仅使用企业微信 OAuth 进行员工身份认证登录，不使用 JSSDK 能力（如分享、扫码等）。

#### 8.3.3 响应式设计

- **桌面优先**：主要在桌面浏览器使用（99% 工作场景）
- **兼容移动端**：移动设备可访问，响应式适配
- 断点策略：
  - 桌面端：>= 992px（主要场景）
  - 平板：768px - 991px
  - 移动端：< 768px（偶尔使用）

### 8.4 微信小程序（二期）

二期开发，本文档仅做架构预留。

- 使用微信原生小程序开发
- 与后端共用同一套 REST API
- 客户通过微信登录（OpenID 关联）
- 支持微信支付

---

## 九、腾讯云服务清单

### 9.1 MVP 阶段使用的云服务

| 服务 | 产品 | 规格 | 月费预估 | 用途 |
|------|------|------|----------|------|
| 计算 | 轻量应用服务器 | 2 核 4G / 60GB SSD | ¥50-80 | 运行 NestJS + Nginx |
| 数据库 | 云数据库 MySQL (CDB) | 基础版 1 核 2G | ¥30-50 | MySQL 数据库 |
| 缓存 | 云数据库 Redis | 256MB | ¥10-20 | 会话缓存、面料目录缓存 |
| 存储 | 对象存储 COS | 按量付费 | ¥5-10 | 面料图片存储 |
| 存储 | 异地 COS 桶 | 按量付费 | ¥5-10 | 跨区域备份存储 |
| 网络 | SSL 证书 | 免费 DV 证书 | ¥0 | HTTPS 加密 |
| 域名 | DNS 解析 | 免费 | ¥0 | 域名解析 |
| **月费总计** | | | **¥100-170** | |

> **注意**：以上为预估费用，实际费用根据腾讯云促销活动可能更低。轻量应用服务器通常有年付优惠。

### 9.2 后期可能使用的云服务

| 服务 | 产品 | 用途 | 阶段 |
|------|------|------|------|
| 消息队列 | 腾讯云 CMQ | 异步任务处理 | 二期 |
| 云函数 | SCF | AI 处理、定时任务 | 后期 |
| CDN | 腾讯云 CDN | 静态资源加速 | 二期 |
| 监控 | 腾讯云监控 | 服务器/数据库监控 | 二期 |
| 短信 | 腾讯云短信 | 通知短信 | 后期 |

---

## 十、部署与运维

### 10.1 环境策略

| 环境 | 部署位置 | 用途 | 访问方式 |
|------|----------|------|----------|
| local | 本地 Docker Compose | 开发调试 | localhost |
| staging | 轻量服务器（端口隔离） | 测试验证 | staging.domain.com |
| production | 轻量服务器 | 生产环境 | app.domain.com |

> **MVP 阶段**：staging 和 production 可共用一台轻量服务器，通过端口隔离（如 production: 80/443, staging: 8080/8443）。
>
> **注意**：此为 MVP 临时方案。staging 容器需设置 Docker `--memory` / `--cpus` 资源限制，且仅在需要时启动。业务增长后应拆分为独立服务器。

### 10.2 Docker 部署架构

```
┌──────────────────────────────────────────────┐
│           腾讯云轻量应用服务器                  │
│                                              │
│  ┌────────────┐                              │
│  │   Nginx    │ ← HTTPS 终止 + 反向代理       │
│  │  (Host)    │                              │
│  └──────┬─────┘                              │
│         │                                    │
│  ┌──────┴──────────────────────────────────┐ │
│  │        Docker Compose                    │ │
│  │  ┌──────────┐  ┌───────┐  ┌──────────┐ │ │
│  │  │ NestJS   │  │ MySQL │  │  Redis   │ │ │
│  │  │ App      │  │ (CDB) │  │          │ │ │
│  │  │ :3000    │  │ :3306 │  │  :6379   │ │ │
│  │  └──────────┘  └───────┘  └──────────┘ │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  静态文件：前端 build 产物由 Nginx 直接服务     │
└──────────────────────────────────────────────┘

注：MySQL 使用腾讯云 CDB 服务（外部），
    不在 Docker 内运行（生产环境）。
    本地开发环境使用 docker-compose 内的 MySQL 容器。
```

### 10.3 CI/CD（GitHub Actions）

```yaml
# 触发条件
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

# Pipeline 步骤
jobs:
  backend:
    steps:
      - Checkout
      - Setup Node.js 20
      - Install dependencies (npm ci)
      - Lint (eslint)
      - Type check (tsc --noEmit)
      - Unit tests (jest --coverage)
      - Integration tests
      - Build (nest build)

  frontend:
    steps:
      - Checkout
      - Setup Node.js 20
      - Install dependencies (npm ci)
      - Lint (eslint)
      - Type check (tsc --noEmit)
      - Build (vite build)

  deploy:
    needs: [backend, frontend]
    if: github.ref == 'refs/heads/main'
    steps:
      - SSH to server
      - Pull latest code
      - Run Prisma migrations
      - Rebuild Docker containers
      - Health check verification
```

### 10.4 监控与日志

| 监控项 | 工具 | 说明 |
|--------|------|------|
| 应用日志 | nestjs-pino | JSON 格式结构化日志，输出到文件 + stdout |
| 服务器监控 | 腾讯云基础监控 | CPU、内存、磁盘、网络（免费） |
| 数据库监控 | CDB 控制台 | 慢查询、连接数、存储使用 |
| 健康检查 | @nestjs/terminus | `/health`（存活）、`/ready`（就绪） |
| 错误告警 | 脚本 + 企业微信通知 | 检测到 ERROR 级别日志时通知（MVP 简单方案） |

**日志级别规范**：

| 级别 | 用途 | 示例 |
|------|------|------|
| DEBUG | 开发调试 | SQL 查询详情、变量值 |
| INFO | 正常业务流程 | 用户登录、订单创建、状态变更 |
| WARN | 异常但可恢复 | 报价已过期、重复请求 |
| ERROR | 需要关注 | 数据库连接失败、COS 上传失败 |
| FATAL | 系统级故障 | 应用启动失败 |

**日志格式**：

```json
{
  "level": "info",
  "time": "2026-01-28T10:30:00.000Z",
  "msg": "Order created",
  "context": "OrderService",
  "orderId": 123,
  "customerId": 45,
  "requestId": "uuid-xxx"
}
```

### 10.5 容器化

**docker-compose.yml（本地开发环境）**：

```yaml
services:
  app:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mysql://root:password@db:3306/borealis
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=borealis
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mysql_data:
```

---

## 十一、数据迁移方案

### 11.1 Excel 导入技术方案

#### 11.1.1 面料批量导入

**导入流程**：

```
用户上传 Excel → 解析文件 → 数据校验 → 预览结果 → 确认导入 → 写入数据库
```

**Excel 模板字段**：

| 列名 | 对应字段 | 必填 | 校验规则 |
|------|----------|------|----------|
| 面料编号 | fabricCode | 是 | 唯一性检查，格式 BF-YYMM-NNNN |
| 面料名称 | name | 是 | 非空，最长 200 字符 |
| 材质/成分 | material | 否 | |
| 成分比例 | composition | 否 | |
| 颜色 | color | 否 | |
| 克重(g/m²) | weight | 否 | 正数，最多两位小数 |
| 幅宽(cm) | width | 否 | 正数，最多两位小数 |
| 厚度等级 | thickness | 否 | thin/medium/thick |
| 默认销售价(元/米) | defaultPrice | 否 | 正数，两位小数 |
| 面料描述 | description | 否 | |
| 备注 | notes | 否 | |

#### 11.1.2 供应商批量导入

**Excel 模板字段**：

| 列名 | 对应字段 | 必填 | 校验规则 |
|------|----------|------|----------|
| 公司名称 | companyName | 是 | 非空，唯一性检查 |
| 联系人 | contactName | 否 | |
| 电话 | phone | 否 | 手机号/座机格式 |
| 微信 | wechat | 否 | |
| 邮箱 | email | 否 | 邮箱格式 |
| 地址 | address | 否 | |
| 结算方式 | settleType | 否 | prepay/credit |
| 账期天数 | creditDays | 否 | 正整数（结算方式为 credit 时必填） |

### 11.2 数据校验规则

| 校验类型 | 说明 |
|----------|------|
| 格式校验 | 编号格式、邮箱格式、电话格式、数值范围 |
| 唯一性校验 | 面料编号、供应商公司名称不允许重复 |
| 完整性校验 | 必填字段不为空 |
| 关联性校验 | 如导入面料-供应商关联时，供应商必须已存在 |

### 11.3 导入错误处理

```json
{
  "code": 200,
  "data": {
    "total": 100,
    "success": 95,
    "failed": 5,
    "errors": [
      { "row": 3, "field": "fabricCode", "message": "面料编号 BF-2026-001 已存在" },
      { "row": 15, "field": "weight", "message": "克重必须为正数（最多两位小数）" },
      { "row": 23, "field": "name", "message": "面料名称不能为空" }
    ]
  }
}
```

**错误处理策略**：部分成功模式——成功的行写入数据库，失败的行返回错误信息，不影响整体导入。

**冲突策略（已确认）**：
- MVP 默认策略：**跳过已存在**（skip）——编号/名称已存在的行跳过不导入，返回提示
- 后期迭代可增加 upsert 选项：允许用户选择"覆盖更新已有记录"模式
- API 参数预留：`POST /api/v1/import/fabrics?onConflict=skip`（MVP 仅实现 skip）

---

## 十二、测试策略

### 12.1 测试类型与工具

| 测试类型 | 工具 | 范围 | 阶段 |
|----------|------|------|------|
| 后端单元测试 | Jest | Service 层业务逻辑 | MVP |
| 后端集成测试 | Jest + SuperTest | API 端点 + 数据库 | MVP |
| 前端单元测试 | Vitest | 核心 hooks、工具函数 | MVP |
| E2E 测试 | Playwright | 关键用户流程 | 后期 |

### 12.2 覆盖率目标

| 层级 | 覆盖率目标 |
|------|-----------|
| 后端 Service 层（业务逻辑） | ≥ 80% |
| 后端 Controller 层（API） | ≥ 70% |
| 后端整体 | ≥ 75% |
| 前端核心 hooks / utils | ≥ 60% |

### 12.3 关键测试场景

| 模块 | 测试场景 |
|------|----------|
| OrderModule | 订单状态机流转（9 个状态的合法/非法转换） |
| OrderModule | 订单取消与恢复 |
| OrderModule | 付款状态更新（客户侧/供应商侧） |
| FabricModule | 面料 CRUD + 多条件搜索 |
| FabricModule | 客户特殊定价逻辑（优先级） |
| QuoteModule | 报价过期自动标记 |
| ImportModule | Excel 导入校验 + 部分成功处理 |
| AuthModule | 企业微信 OAuth 流程 |

### 12.4 测试环境

- 单元测试：mock 数据库（Prisma mock client）
- 集成测试：使用 Docker 中的测试数据库（独立于开发数据库）
- 每次测试前清空测试数据库，确保测试隔离

---

## 十三、风险评估

### 13.1 技术风险

| 风险 | 可能性 | 影响 | 缓解策略 |
|------|--------|------|----------|
| 企业微信 OAuth 接入复杂 | 中 | 高 | 提前阅读企业微信开发文档，搭建测试环境验证 |
| 轻量服务器性能不足 | 低 | 中 | MVP 并发量低；若不足，可升配或迁移到 CVM |
| Prisma 迁移冲突 | 低 | 中 | 严格按迁移流程执行，先 staging 验证 |
| 前端浏览器兼容性 | 低 | 中 | 使用 Ant Design 成熟组件库，桌面端主流浏览器测试 |

### 13.2 数据风险

| 风险 | 可能性 | 影响 | 缓解策略 |
|------|--------|------|----------|
| Excel 导入数据质量差 | 高 | 中 | 严格校验规则 + 预览确认 + 部分成功模式 |
| 数据库数据丢失 | 低 | 极高 | 每日自动备份 + 30 天保留 + 每月恢复验证 |
| 敏感数据泄露 | 低 | 极高 | HTTPS + CDB TDE 静态加密 + 日志脱敏 + API 限流 + OAuth 认证 |

### 13.3 运维风险

| 风险 | 可能性 | 影响 | 缓解策略 |
|------|--------|------|----------|
| 服务器宕机 | 低 | 高 | 腾讯云基础监控告警 + 健康检查 + 快速恢复文档 |
| SSL 证书过期 | 低 | 高 | 使用自动续期证书（腾讯云免费 DV 证书支持） |
| 依赖库安全漏洞 | 中 | 中 | 定期 `npm audit`，CI 中集成安全扫描 |
| Docker 镜像过大 | 低 | 低 | 使用多阶段构建，Alpine 基础镜像 |

### 13.4 业务风险

| 风险 | 可能性 | 影响 | 缓解策略 |
|------|--------|------|----------|
| 员工不愿使用新系统 | 中 | 高 | MVP 功能简单易用，渐进式推广 |
| 面料数据录入缓慢 | 高 | 中 | 提供 Excel 批量导入，减少手动录入工作量 |
| 需求变更频繁 | 中 | 中 | 模块化架构，变更影响范围可控 |

---

## 十四、术语与缩写

（见第一章 1.3 节）

---

## 十五、参考资料与文档修订记录

### 15.1 参考资料

| 资料 | 链接/说明 |
|------|-----------|
| 业务需求文档 | `docs/REQUIREMENTS_BUSINESS.md` (BRD v3.0) |
| NestJS 官方文档 | https://docs.nestjs.com |
| Prisma 官方文档 | https://www.prisma.io/docs |
| 企业微信开发文档 | https://developer.work.weixin.qq.com/document |
| 腾讯云产品文档 | https://cloud.tencent.com/document |
| IEEE/ISO/IEC 29148 | 软件需求规格说明书标准 |
| Ant Design | https://ant.design |

### 15.2 文档修订记录

| 版本 | 日期 | 修订内容 | 修订人 |
|------|------|----------|--------|
| v1.0 | 2026-01-28 | 初稿，基于业务需求文档 v3.0 和多轮技术决策讨论 | - |
| v2.0 | 2026-01-28 | 审查修订：修复供应商付款追踪粒度（拆表）、报价-订单关联、移除 AES 加密、补充异地备份和 RPO 优化、订单收货地址、编号生成规范、JSON 多选字段等 18 项审查问题 | - |
| v2.1 | 2026-01-28 | 第二轮审查修订：报价 converted 状态、供应商名称唯一约束、统一删除策略、报价转订单初始状态、JSON 查询说明、订单创建人字段等 7 项 | - |
| v2.2 | 2026-01-28 | 开发前修正：[C1] 编号序号扩展为4位+Redis故障fallback策略、[C2] 客户地址AddressVO封装说明、[C3] 增加payment_records付款流水表、[M2] 订单明细删除约束(仅INQUIRY/PENDING可删)、[M3] 订单主表增加聚合status字段、[M4] 明确isActive vs status语义分工、[M5] 客户端定价补充PATCH/DELETE端点、[M6] 补充前端Vitest测试策略和覆盖率目标、[M7] Excel导入增加冲突策略说明和upsert预留 | - |
| v2.3 | 2026-01-29 | 平台定位修正：H5移动端优先 → Web桌面端优先（99%工作场景在电脑端），UI组件库从 Ant Design Mobile → Ant Design（桌面版），响应式断点策略调整为桌面优先，企业微信集成范围明确为仅OAuth登录 | - |

---

**下一步行动**：

1. 逐章节审查本技术需求文档
2. 重点讨论：数据库表结构、API 设计、非功能性需求指标
3. 根据反馈修订直到确认
4. 确认后开始项目骨架搭建（阶段 1）
