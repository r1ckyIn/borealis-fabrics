# Phase 16: Production Deployment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 16-production-deployment
**Areas discussed:** 服务器与域名, 数据迁移策略, SSL 与安全, UAT 验收流程

---

## 服务器与域名

| Option | Description | Selected |
|--------|-------------|----------|
| 2C4G (推荐) | 2核 CPU、4G 内存、4Mbps。对 2-5 人团队充足 | ✓ |
| 2C2G (最低) | 2核 CPU、2G 内存。价格最低但内存紧张 | |
| 4C8G (宽裕) | 4核 CPU、8G 内存。包含监控栈更安心 | |

**User's choice:** 2C4G (推荐)
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| 已有域名已备案 | 域名和备案都就绪 | |
| 有域名未备案 | 已购买域名但还没备案 | |
| 还没有域名 | 需要购买域名 + 备案，可以先用 IP 访问测试 | ✓ |

**User's choice:** 还没有域名
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| 已开通 | CDB 实例已存在 | |
| 未开通 | 需要在腾讯云控制台新建 CDB 实例 | ✓ |
| Claude 决定 | 不确定细节 | |

**User's choice:** 未开通
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| 生产也要跑 | 监控栈和业务服务同台服务器 | ✓ |
| 只在开发时用 | 生产环境不跑监控栈 | |
| Claude 决定 | 根据服务器规格来决定 | |

**User's choice:** 生产也要跑
**Notes:** 2C4G + monitoring stack 内存会比较紧张，需注意 Loki 保留天数限制

---

## 数据迁移策略

| Option | Description | Selected |
|--------|-------------|----------|
| 全新启动 | 空数据库，用户第一次登录后手动录入或 Excel 导入 | ✓ |
| 导入开发环境数据 | 把开发/测试环境的真实数据迁移到生产库 | |
| 导入 Excel 数据 | 用现有的 Excel 导入功能批量导入基础数据 | |

**User's choice:** 全新启动
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| 有真实数据 | 之前测试时已经录入了真实数据 | |
| 只有测试数据 | 开发环境里都是模拟���据 | ✓ |
| 没有数据 | 开发环境数据库是空的 | |

**User's choice:** 只有测试数据
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| 有文件需要迁移 | 开发环境 uploads/ 有真实文件 | |
| 没有文件 | 没有需要迁移的文件，直接从 COS 模式启动 | ✓ |
| Claude 决定 | 迁移脚本已存在，到时候根据情况决定 | |

**User's choice:** 没有文件
**Notes:** 不需要运行 migrate-to-cos.ts 脚本

---

## SSL 与安全

| Option | Description | Selected |
|--------|-------------|----------|
| Let's Encrypt (推荐) | 免费、自动续期（certbot）、社区成熟 | ✓ |
| 腾讯云免费 SSL | 腾讯云提供 1 年免费 DV 证书，需要手动续期 | |
| Claude 决定 | 根据实际情况选择 | |

**User's choice:** Let's Encrypt (推荐)
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| 先用 IP + 开发账号 | 无域名期先用 IP 访问，用开发环境的企微配置测试 | ✓ |
| 等域名备案后再部署 | 全部就绪后一次性部署 | |
| Claude 决定 | 根据部署进度灵活处理 | |

**User's choice:** 先用 IP + 开发账号
**Notes:** 企业微信 OAuth 回调需要域名，无域名时 OAuth 无法工作

---

## UAT 验收流程

| Option | Description | Selected |
|--------|-------------|----------|
| 你自己（开发者） | 自己过一遍核心流程 | |
| 铂��团队成员 | 实际业务人员用真实场景测试 | |
| 两者都有 (推荐) | 先自己过一遍，再让团队成员实际使用验证 | ✓ |

**User's choice:** 两者都有 (推荐)
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| 就地修复 | 直接在生产环境修复，重新部署 | |
| 回滚到上一版本 | Docker 镜像 tag 回滚，恢复数据库备份 | |
| Claude 决定 | 根据问题严重程度灵活处理 | ✓ |

**User's choice:** Claude 决定
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| 核心流程走通即可 | 供应商/客户 CRUD、面料管理、报价→订单、Excel 导入导出能用就行 | |
| 每个功能都要测 | 全量功能测试，包括边缘场景和错误处理 | ✓ |
| 核心 + 重点场景 | 核心流程 + 权限控制 + 文件上传 + 审计日志等重点功能 | |

**User's choice:** 每个功能都要测
**Notes:** None

---

## Claude's Discretion

- Rollback strategy (Docker image rollback vs fix-forward based on severity)
- Loki retention days and Prometheus memory tuning
- Docker image registry choice
- CDB instance tier selection
- Redis instance configuration

## Deferred Ideas

None — discussion stayed within phase scope
