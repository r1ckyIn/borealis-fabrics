# Phase 13: Data Safety & Audit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 13-data-safety-audit
**Areas discussed:** RBAC 角色扩展, 数据导出入口, 审计日志详情展示, 软删除恢复 UI

---

## RBAC 角色扩展

### Q1: "developer" 角色在业务上指的是谁？

| Option | Description | Selected |
|--------|-------------|----------|
| 就是你（开发者） | developer = 系统开发者/维护者，用于调试和监控。和 boss 一样用 DEV_WEWORK_IDS 环境变量配置。 | ✓ |
| 公司内特定员工 | 某些员工被指定为 developer 角色，可以查看审计日志但不能做 boss 级操作。 | |
| 不需要 developer 角色 | 只有 boss 能看审计日志，去掉 developer 需求。 | |

**User's choice:** 就是你（开发者）
**Notes:** None

### Q2: 审计日志页面以外，developer 角色还能做什么额外操作吗？

| Option | Description | Selected |
|--------|-------------|----------|
| 只看审计日志 | developer 和 boss 一样只能查看审计日志，没有额外权限。 | |
| 和 boss 相同权限 | developer 拥有和 boss 一样的所有权限（审计日志 + 软删除恢复 + 其他 boss 操作）。 | ✓ |

**User's choice:** 和 boss 相同权限
**Notes:** None

---

## 数据导出入口

### Q1: 数据导出按钮应该放在哪里？

| Option | Description | Selected |
|--------|-------------|----------|
| 各列表页内 (推荐) | 每个列表页工具栏加"导出 Excel"按钮。导出当前筛选条件下的数据。 | |
| 集中导出页面 | 侧边栏新增"数据导出"页面，选择实体类型和筛选条件后导出。 | ✓ |
| 两者都要 | 列表页内有快捷导出按钮 + 侧边栏有集中导出页面。 | |

**User's choice:** 集中导出页面
**Notes:** None

### Q2: 集中导出页面所有用户都能用，还是只限 boss/developer？

| Option | Description | Selected |
|--------|-------------|----------|
| 所有用户可用 (推荐) | 数据导出是日常业务操作，所有员工都可能需要导出数据做报表。 | ✓ |
| 仅 boss/developer | 数据导出涉及全量数据，应限制为管理员操作。 | |

**User's choice:** 所有用户可用
**Notes:** None

### Q3: 导出字段范围

| Option | Description | Selected |
|--------|-------------|----------|
| 业务关键字段 | 每个实体导出业务相关的字段，不包含系统字段。 | |
| 全量字段 | 导出所有数据库字段，包括系统字段。 | |
| 用户可选 | 提供字段勾选，用户自己选择要导出哪些列。 | ✓ |

**User's choice:** 用户可选
**Notes:** None

---

## 审计日志详情展示

### Q1: 审计日志的变更详情应该怎么展示？

| Option | Description | Selected |
|--------|-------------|----------|
| 变更字段对比 (推荐) | 只显示变更的字段：字段名 + 旧值 → 新值。创建操作显示所有字段，删除操作显示实体摘要。 | ✓ |
| 完整 JSON diff | 显示完整的 before/after JSON 对比。信息最全但对业务人员不友好。 | |

**User's choice:** 变更字段对比
**Notes:** User previewed the table format and confirmed

### Q2: 审计日志列表的筛选条件

| Option | Description | Selected |
|--------|-------------|----------|
| 够了 (推荐) | 操作人 + 动作类型 + 实体类型 + 时间范围。4 个筛选器足够覆盖日常用途。 | |
| 加关键词搜索 | 在 4 个筛选器基础上，增加关键词搜索框。 | ✓ |

**User's choice:** 加关键词搜索
**Notes:** None

---

## 软删除恢复 UI

### Q1: Phase 12 延期的软删除恢复 UI 是否纳入 Phase 13？

| Option | Description | Selected |
|--------|-------------|----------|
| 纳入 Phase 13 (推荐) | Phase 13 主题是"数据安全"，软删除恢复属于数据安全范畴。 | ✓ |
| 继续延期 | 不纳入 Phase 13，等到后续版本再做。 | |

**User's choice:** 纳入 Phase 13
**Notes:** None

### Q2: 软删除恢复在哪些实体的列表页需要？

| Option | Description | Selected |
|--------|-------------|----------|
| 所有 6 个实体 (推荐) | 面料、产品、供应商、客户、订单、报价 — 所有支持软删除的实体都加恢复 UI。 | ✓ |
| 仅核心实体 | 只在面料、产品、供应商、客户 4 个核心实体加恢复 UI。 | |

**User's choice:** 所有 6 个实体
**Notes:** None

---

## Claude's Discretion

- Audit log Prisma model design and indexing strategy
- NestJS interceptor vs decorator implementation approach
- ExcelJS export template and formatting
- Backup script scheduling and retention period
- Frontend component architecture for audit log page
- Keyword search implementation approach

## Deferred Ideas

None — discussion stayed within phase scope
