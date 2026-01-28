# Git 检查点与回滚工作流

本文档定义了 Vibe Coding（AI 辅助开发）模式下的 Git 检查点和回滚策略。

---

## 1. 标准工作流（每个功能）

```
1. 在 feature/<name> 分支上开发（不在 main 上直接工作）
2. 每个功能开始前：checkpoint commit
3. Claude 执行 TDD 循环
4. 验证通过 → feat commit
5. 验证失败 → git reset --hard HEAD（回到 checkpoint）
6. 功能完成 → PR → code review → merge
```

---

## 2. 检查点命名规范

```bash
# 功能开始前创建检查点
git commit -m "checkpoint: before implementing <操作描述>"

# 示例
git commit -m "checkpoint: before implementing order state machine"
git commit -m "checkpoint: before refactoring fabric search"
git commit -m "checkpoint: before adding payment records table"
```

---

## 3. 回滚操作

### 3.1 回滚到最近的检查点

```bash
# 在 feature 分支上回滚（丢弃未提交的更改）
git reset --hard HEAD

# 回滚到上一个 commit（即检查点）
git reset --hard HEAD~1
```

### 3.2 回滚后的恢复操作

```bash
# 1. 同步依赖（代码回滚可能改变了 package.json）
cd backend && pnpm install
cd ../frontend && pnpm install

# 2. 如果涉及 DB schema 变更：重置数据库
cd backend && npx prisma migrate reset

# 3. 清理 Claude 创建但未提交的文件
git clean -fd
```

---

## 4. 分支策略

```
main              ← 生产就绪代码（保护分支，只能通过 PR 合并）
├── feature/xxx   ← 功能开发分支
├── fix/xxx       ← Bug 修复分支
└── docs/xxx      ← 文档更新分支
```

### 创建功能分支

```bash
git checkout main
git pull origin main
git checkout -b feature/<功能名称>
```

### 功能完成后合并

```bash
# 1. 确保所有测试通过
pnpm test && pnpm lint && pnpm build

# 2. 推送到远程
git push -u origin feature/<功能名称>

# 3. 创建 PR（使用 /commit-push-pr）

# 4. Code Review（使用 /code-review）

# 5. 合并后清理（使用 /clean_gone）
```

---

## 5. 安全规则（强制）

```
❌ 禁止在 main 分支上使用 git reset --hard
❌ 禁止使用 git push --force（尤其是 main）
❌ 禁止使用 git add -A（改用 git add <specific files>）
❌ 禁止提交 .env 文件
❌ 禁止提交 CLAUDE.md

✅ 破坏性操作（reset --hard, clean -fd）仅限 feature 分支
✅ 每次 reset 后执行恢复操作（见 3.2）
✅ 提交前检查 git diff 确认变更内容
✅ PR 前确保 CI 通过
```

---

## 6. 提交消息规范

```
<type>: <description>

类型：
- feat: 新功能
- fix: Bug 修复
- docs: 文档更改
- style: 代码风格
- refactor: 代码重构
- test: 测试
- chore: 维护任务
- checkpoint: 检查点（开始新功能前）

示例：
feat: add supplier CRUD endpoints
fix: correct order total calculation
test: add state machine transition tests
checkpoint: before implementing payment records
```

---

## 7. 紧急修复流程

```bash
# 1. 从 main 创建热修复分支
git checkout main
git pull
git checkout -b fix/<问题描述>

# 2. 修复并测试
# ...

# 3. 提交
git commit -m "fix: <具体描述>"

# 4. 创建 PR，优先审查合并
```
