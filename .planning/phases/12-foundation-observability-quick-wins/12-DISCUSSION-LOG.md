# Phase 12: Foundation & Observability Quick Wins - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 12-foundation-observability-quick-wins
**Areas discussed:** isActive 语义分类, 软删除后的数据恢复, DEBT-03 销售合同格式, OrderForm 验证范围

**User directive:** 技术决策选最佳实践，只问业务相关内容

---

## isActive 语义分类

| Option | Description | Selected |
|--------|-------------|----------|
| 全部是软删除 | 所有实体的 isActive 都是"删了就隐藏"，没有"停用后再启用"的场景 | |
| 大部分软删除，部分有开关 | 大多数实体是软删除，但某些实体有"暂停合作/暂停销售"的启用/停用需求 | |
| 需要逐个确认 | 用户逐个告诉每个实体的 isActive 含义 | |
| 自行研究确定 | Claude 研究代码库后用最佳实践确定 | ✓ |

**User's choice:** 自行研究确定
**Notes:** Claude 分析了 6 个有 isActive 的实体（User, Fabric, Supplier, Customer, Product, ProductBundle），所有实体的 isActive 仅在 delete() 方法中 set false，无 toggle API，全部为纯软删除语义。决定统一迁移为 deletedAt。

---

## 软删除后的数据恢复

| Option | Description | Selected |
|--------|-------------|----------|
| 不需要恢复功能（推荐） | 仅防止物理删除数据丢失，DBA 手动恢复即可 | |
| 管理员可以恢复 | boss 角色可以在列表页查看已删除数据并恢复 | ✓ |

**User's choice:** 管理员可以恢复

### Follow-up: 恢复入口位置

| Option | Description | Selected |
|--------|-------------|----------|
| 列表页筛选器（推荐） | 每个实体列表页增加"显示已删除"筛选开关（仅 boss 可见） | ✓ |
| 统一回收站 | 侧边栏新增"回收站"页面，集中管理所有已删除数据 | |

**User's choice:** 列表页筛选器
**Notes:** 后端恢复 API 在 Phase 12 实现，前端 UI（列表页筛选器）推迟到 Phase 13

---

## DEBT-03 销售合同格式

| Option | Description | Selected |
|--------|-------------|----------|
| 列顺序/名称不同 | 实际文件的列头名称或顺序与代码定义不匹配 | |
| 元数据行位置不同 | 合同号、日期、客户名等不在预期的行/单元格位置 | |
| 我还没测试过 | 还没有用真实文件测试过导入功能 | ✓ |

**User's choice:** 还没测试过
**Notes:** 决定在 Phase 12 增强导入策略的 resilience（灵活列头匹配、RichText 清理），但不改核心逻辑。等实际测试时再修具体问题。

---

## OrderForm 验证范围

| Option | Description | Selected |
|--------|-------------|----------|
| 全部字段都要 inline 验证 | 所有 class-validator 返回的字段错误都映射到表单字段旁边显示 | ✓ |
| 只做关键字段 | 只对最容易出错的字段做 inline 验证，其他保持 toast | |

**User's choice:** 全部字段都要 inline 验证
**Notes:** 创建可复用的 mapApiErrorsToFormFields() 工具函数，用 Ant Design form.setFields() 实现

---

## Claude's Discretion

- Sentry DSN 配置和环境区分
- Prisma 迁移命名和执行顺序
- nestjs-cls 实现细节
- PII 清洗规则
- 导入策略 header 匹配容差

## Deferred Ideas

- 前端软删除恢复 UI → Phase 13
- SalesContractImportStrategy 真实文件格式调整 → 等用户实测后再调
