# Borealis Fabrics

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**Digital management system for fabric trading operations**

[English](#english) | [中文](#中文)

</div>

---

## English

### Overview

Borealis Fabrics is a digital management system designed for fabric trading intermediaries. It streamlines the entire supply chain workflow from fabric catalog management to order tracking, supplier coordination, and payment reconciliation.

### Features

- **Fabric Management**: Centralized fabric catalog with multi-condition search, supplier associations, and customer-specific pricing
- **Supplier Management**: Comprehensive supplier profiles with status tracking and settlement configurations
- **Customer Management**: B2B customer profiles with credit terms and special pricing
- **Order Management**: Full order lifecycle with 9-state machine, multi-item tracking, and dual-side payment management
- **Quote Management**: Quote creation with validity management and one-click order conversion
- **Logistics Tracking**: Per-item logistics recording with split shipment support
- **Batch Import**: Excel bulk import for fabrics and suppliers

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + NestJS + TypeScript (strict) |
| Frontend | React + TypeScript + Ant Design |
| Database | MySQL (Tencent Cloud CDB) |
| ORM | Prisma |
| Cache | Redis |
| File Storage | Tencent Cloud COS |
| CI/CD | GitHub Actions |
| Auth | WeChat Work OAuth 2.0 |

### Quick Start

```bash
# Clone the repository
git clone git@github.com:r1ckyIn/borealis-fabrics.git
cd borealis-fabrics

# Start local development environment
docker compose -f backend/docker-compose.yml up -d

# Backend setup
cd backend
pnpm install
npx prisma migrate dev
pnpm start:dev

# Frontend setup (new terminal)
cd frontend
pnpm install
pnpm dev
```

### Project Structure

```
borealis-fabrics/
├── docs/                  # Requirements and documentation
├── backend/               # NestJS backend (Modular Monolith)
│   ├── src/               # Source code
│   ├── prisma/            # Database schema and migrations
│   └── test/              # Tests (unit + integration)
├── frontend/              # React Web frontend (desktop-first)
│   └── src/               # Source code
└── .github/workflows/     # CI/CD pipeline
```

---

## 中文

### 项目概述

铂润面料（Borealis Fabrics）是为面料贸易中间商设计的数字化管理系统。系统覆盖从面料目录管理到订单跟踪、供应商协调、付款对账的完整供应链流程。

### 功能特性

- **面料管理**：统一面料目录，支持多条件检索、供应商关联和客户专属定价
- **供应商管理**：完整的供应商信息管理，含合作状态跟踪和结算方式配置
- **客户管理**：B端客户信息管理，支持账期和特殊定价
- **订单管理**：完整的订单生命周期管理，9状态流转、多面料独立跟踪、双向付款管理
- **报价管理**：报价创建与有效期管理，支持一键转订单
- **物流跟踪**：按面料记录物流信息，支持分批发货
- **批量导入**：支持Excel批量导入面料和供应商数据

### 快速开始

```bash
# 克隆仓库
git clone git@github.com:r1ckyIn/borealis-fabrics.git
cd borealis-fabrics

# 启动本地开发环境
docker compose -f backend/docker-compose.yml up -d

# 后端启动
cd backend
pnpm install
npx prisma migrate dev
pnpm start:dev

# 前端启动（新终端）
cd frontend
pnpm install
pnpm dev
```

---

## License

MIT License

## Author

**Ricky** - CS Student @ University of Sydney

[![GitHub](https://img.shields.io/badge/GitHub-r1ckyIn-181717?style=flat-square&logo=github)](https://github.com/r1ckyIn)
