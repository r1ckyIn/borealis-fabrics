# 项目概述

## Borealis Fabrics - 铂润面料数字化管理系统

面料贸易中间商的供应链自动化系统。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | NestJS |
| 前端框架 | React |
| 语言 | TypeScript (strict) |
| UI 组件 | Ant Design 5 |
| 数据库 | MySQL 8.0 |
| 缓存 | Redis |
| ORM | Prisma |
| 日志 | nestjs-pino |
| 前端状态 | Zustand |
| 数据请求 | TanStack Query |
| 前端构建 | Vite |
| 前端测试 | Vitest |
| 后端测试 | Jest + SuperTest |

---

## 架构

**模块化单体 (Modular Monolith)**

---

## 部署环境

腾讯云：
- 轻量服务器
- CDB (云数据库)
- COS (对象存储)

---

## 模块依赖顺序

```
CommonModule → PrismaModule → AuthModule
SupplierModule → CustomerModule → FabricModule → FileModule
QuoteModule → OrderModule → LogisticsModule → ImportModule
```

---

## 开发阶段

| 阶段 | 内容 | 状态 |
|------|------|------|
| 阶段 1 | 项目骨架搭建 | ✅ 已完成 |
| 阶段 2 | 核心数据模块 | 🔄 进行中 |
| 阶段 3 | 业务流程模块 | ⏳ 待开始 |
| 阶段 4 | 前端开发 | ⏳ 待开始 |
| 阶段 5 | 集成测试与安全加固 | ⏳ 待开始 |
| 阶段 6 | 部署上线 | ⏳ 待开始 |
