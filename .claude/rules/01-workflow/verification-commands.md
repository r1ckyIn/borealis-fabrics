# 验证循环命令

每次代码变更后必须执行完整的验证循环。

---

## 后端验证

```bash
# 进入后端目录
cd backend

# 构建验证
pnpm build

# 测试验证
pnpm test

# Lint 验证
pnpm lint

# All-in-one
pnpm build && pnpm test && pnpm lint
```

---

## 前端验证

```bash
# 进入前端目录
cd frontend

# 构建验证
pnpm build

# 测试验证
pnpm test

# Lint 验证
pnpm lint

# 类型验证
pnpm typecheck

# All-in-one
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

---

## E2E 测试

```bash
# 后端 E2E 测试
cd backend && pnpm test:e2e

# 特定模块 E2E 测试
cd backend && pnpm test:e2e -- --testPathPattern=supplier
cd backend && pnpm test:e2e -- --testPathPattern=customer
```

---

## 数据库迁移

```bash
# 生成迁移
cd backend && npx prisma migrate dev --name <migration-name>

# 应用迁移
cd backend && npx prisma migrate deploy

# 重置数据库（开发环境）
cd backend && npx prisma migrate reset

# 生成 Prisma Client
cd backend && npx prisma generate
```

---

## 验证结果记录

每个功能完成后，在 CLAUDE.md 中更新状态：

| 功能 | 状态 | 测试 | Build | Lint | 备注 |
|------|------|------|-------|------|------|
| 功能名称 | ⏳/🔄/✅ | ⏳/✅ | ⏳/✅ | ⏳/✅ | 备注 |

### 状态图例

- ⏳ 待开始
- 🔄 进行中
- ✅ 已完成
- ❌ 失败待修复
