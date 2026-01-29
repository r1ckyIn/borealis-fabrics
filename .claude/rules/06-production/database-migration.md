---
paths:
  - "**/backend/**"
  - "**/alembic/**"
  - "**/prisma/**"
---

# 数据库迁移规范

本文件定义了数据库迁移的标准和流程。

---

## 核心规则

1. **永远不手动修改数据库结构**——使用迁移工具
2. 每次数据模型变更都必须生成迁移文件
3. 迁移文件必须提交到 Git
4. 上线前必须在 staging 环境验证迁移

---

## Alembic 迁移（Python/FastAPI）

### 常用命令

```bash
# 生成迁移文件
alembic revision --autogenerate -m "add payment_status to orders"

# 应用迁移
alembic upgrade head

# 回滚一步
alembic downgrade -1

# 查看迁移历史
alembic history

# 查看当前版本
alembic current

# 生成 SQL（不执行）
alembic upgrade head --sql
```

### 迁移文件命名

```text
格式：<revision>_<description>.py

示例：
- a1b2c3d4_create_users_table.py
- e5f6g7h8_add_email_to_users.py
- i9j0k1l2_add_payment_status_to_orders.py
```

### 迁移文件模板

```python
"""add payment_status to orders

Revision ID: a1b2c3d4
Revises: previous_revision_id
Create Date: 2025-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'a1b2c3d4'
down_revision = 'previous_revision_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('orders',
        sa.Column('payment_status', sa.String(50), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('orders', 'payment_status')
```

---

## Prisma 迁移（Node.js/NestJS）

### 常用命令

```bash
# 生成迁移文件
npx prisma migrate dev --name add_payment_status

# 应用迁移（生产环境）
npx prisma migrate deploy

# 重置数据库（开发环境）
npx prisma migrate reset

# 查看迁移状态
npx prisma migrate status

# 生成客户端
npx prisma generate
```

### 迁移文件目录结构

```text
prisma/
├── schema.prisma
└── migrations/
    ├── 20250115100000_initial/
    │   └── migration.sql
    ├── 20250116100000_add_users/
    │   └── migration.sql
    └── migration_lock.toml
```

---

## 迁移最佳实践

### 做

- ✅ 每个迁移只做一件事
- ✅ 迁移可以回滚
- ✅ 先在开发环境测试
- ✅ 在 staging 验证后再上生产
- ✅ 备份数据后再执行

### 不做

- ❌ 手动修改数据库
- ❌ 删除已应用的迁移文件
- ❌ 修改已提交的迁移文件
- ❌ 跳过 staging 验证

---

## 数据迁移安全检查

### 迁移前检查

- [ ] 迁移是否可回滚
- [ ] 是否影响现有数据
- [ ] 是否需要数据备份
- [ ] 预计执行时间

### 危险操作

| 操作 | 风险 | 处理 |
|------|------|------|
| DROP TABLE | 数据丢失 | 需要备份 |
| DROP COLUMN | 数据丢失 | 需要备份 |
| ALTER COLUMN (缩小) | 数据截断 | 验证数据 |
| TRUNCATE | 数据丢失 | 需要备份 |

---

## 环境迁移策略

```text
开发环境 (local):
└── 可以使用 migrate reset
└── 可以快速迭代

测试环境 (staging):
└── 必须使用 migrate deploy
└── 验证迁移脚本

生产环境 (production):
└── 必须先备份
└── 必须使用 migrate deploy
└── 监控执行时间
└── 准备回滚计划
```
