---
paths:
  - "**/backend/**"
  - "**/frontend/**"
---

# 验证命令

本文件定义每次代码变更后必须执行的验证命令。

---

## 后端验证命令

```bash
cd backend

pnpm build
pnpm test
pnpm lint

# All-in-one
pnpm build && pnpm test && pnpm lint
```

---

## 前端验证命令

```bash
cd frontend

pnpm build
pnpm test
pnpm lint
pnpm typecheck

# All-in-one
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

---

## E2E 测试

```bash
cd backend && pnpm test:e2e

# 特定模块
cd backend && pnpm test:e2e -- --testPathPattern=supplier
```

---

## 数据库迁移

```bash
cd backend && npx prisma migrate dev --name <migration-name>
cd backend && npx prisma migrate deploy
cd backend && npx prisma migrate reset
cd backend && npx prisma generate
```

---

## 失败处理规则

如果任何验证步骤失败：

1. **立即停止** - 不要继续下一步
2. **分析错误原因** - 阅读错误信息
3. **修复问题** - 做最小改动
4. **重新运行所有验证步骤** - 确保修复没有引入新问题
5. **全部通过后才能继续** - 不可跳过

---

## 验证结果记录格式

| 功能 | 状态 | 测试 | Build | Lint | 备注 |
|------|------|------|-------|------|------|
| 功能名称 | ⏳/🔄/✅ | ⏳/✅ | ⏳/✅ | ⏳/✅ | |

状态图例：⏳ 待开始 | 🔄 进行中 | ✅ 已完成 | ❌ 失败待修复
