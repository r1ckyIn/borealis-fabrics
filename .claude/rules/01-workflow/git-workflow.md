# Git 工作流

## ⚠️ 强制规则

**开始任何功能开发前，必须先创建 feature 分支，绝不在 main 上直接开发。**

```
错误做法：main 上直接 commit → 违反工作流
正确做法：git checkout -b feature/xxx → 开发 → PR → 合并
```

---

## 分支策略

- `main` 分支：生产就绪代码，禁止直接 push
- `feature/<module-name>` 分支：每个模块一个分支

---

## 开发流程

```
0. 模块开始前（强制）
   └── git checkout -b feature/<module-name>
       ⚠️ 必须先执行这一步，不可跳过

1. 模块开始时
   └── 创建 feature/<module-name> 分支
       例：feature/supplier-module

2. 每个功能完成后
   └── /commit（提交到 feature 分支）

3. 模块所有功能完成后
   ├── push feature 分支到远程
   ├── 创建 PR（/commit-push-pr）
   ├── 运行 /code-review
   ├── 修复 review 发现的问题
   └── 合并到 main

4. 合并后
   └── /clean_gone（清理已合并的分支）
```

---

## PR 创建时机

| 时机 | 操作 |
|------|------|
| SupplierModule 完成 | 创建 PR：feature/supplier-module → main |
| CustomerModule 完成 | 创建 PR：feature/customer-module → main |
| FabricModule 完成 | 创建 PR：feature/fabric-module → main |
| FileModule 完成 | 创建 PR：feature/file-module → main |
| 每个后续模块完成 | 同上 |

---

## 命令速查

```bash
# 创建 feature 分支
git checkout -b feature/supplier-module

# 功能完成后提交
/commit

# 模块完成后创建 PR
/commit-push-pr

# PR 代码审查
/code-review

# 合并后清理分支
/clean_gone
```

---

## 禁止事项

- ❌ 直接 push 到 main
- ❌ 跳过 /code-review
- ❌ force push 到 main
- ❌ 提交包含密钥的代码

---

## Claude 必须遵守的提交规则

**这是 Claude 的自我约束规则，违反即为工作流失败。**

| 规则 | 说明 |
|------|------|
| 规则 1 | 永远不要直接在 main 分支提交 |
| 规则 2 | 使用 /commit 技能，不是 git commit 命令 |
| 规则 3 | 功能/修复完成后使用 /commit-push-pr |
| 规则 4 | PR 创建后必须运行 /code-review |
| 规则 5 | 合并后运行 /clean_gone |

**违规自检**：如果 Claude 发现自己违反了上述规则，必须立即停止并向用户报告。

---

## 工作流速查

```
git checkout -b fix/xxx → 修改代码 → build/test/lint → /commit → /commit-push-pr → /code-review → 修复问题 → 合并 → /clean_gone
```
