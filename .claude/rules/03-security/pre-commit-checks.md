# 提交前安全检查

本文件定义了提交代码前必须执行的安全检查。

---

## 安全检查点（强制）

### 每次提交前

- □ 无硬编码密钥（API keys, passwords, tokens）
- □ 无 SQL 注入漏洞
- □ 无命令注入漏洞
- □ 无 XSS 漏洞
- □ 所有外部输入都有输入验证
- □ 错误消息不暴露敏感信息

### 每次 PR 前

- □ /code-review 已完成
- □ 所有 confidence >= 80 的发现已处理
- □ 已提交文件中无密钥
- □ 正确的目标分支（不强制推送到 main）

---

## 必须检查项

| 检查项 | 说明 |
|--------|------|
| 无暴露的密钥 | API keys, passwords, tokens |
| 文件权限和访问控制 | 确保敏感文件不可公开访问 |
| 正确的环境目标 | dev/staging/prod |
| 操作可逆性 | 尽可能的操作可逆性 |
| 备份存在 | 关键操作的备份存在 |

---

## 敏感文件检查

### 不应提交的文件

```gitignore
# 环境变量
.env
.env.local
.env.staging
.env.production

# 密钥和证书
*.pem
*.key
*.crt
credentials.json
service-account.json

# Claude Code 配置
CLAUDE.md
```

### 验证工作流

```text
GITIGNORE 验证工作流：
1. 在任何提交前，检查 .gitignore 是否存在且配置正确
2. CLAUDE.md 必须始终在 .gitignore 中 - 绝不应推送到 GitHub
3. 验证不会提交敏感或仅本地的文件
4. 运行 `git status` 确认排除的文件未被暂存
```

---

## 常见安全漏洞检查

### SQL 注入

```text
检查项：
- 是否使用参数化查询
- 是否有字符串拼接 SQL
- ORM 是否正确使用
```

### 命令注入

```text
检查项：
- 是否有用户输入直接拼接到命令
- 是否正确转义 shell 参数
- 是否使用安全的命令执行方法
```

### XSS（跨站脚本）

```text
检查项：
- 是否转义用户输入的 HTML
- 是否使用安全的模板引擎
- 是否正确设置 Content-Security-Policy
```

### 硬编码密钥

```text
检查项：
- 搜索代码中的 "password", "secret", "key", "token"
- 检查配置文件中的敏感值
- 确保使用环境变量管理密钥
```

---

## 自动化检查工具

### Go

```bash
# 安全扫描
gosec ./...

# 依赖漏洞
go list -m all | nancy sleuth
```

### Python

```bash
# 安全扫描
bandit -r src/

# 依赖漏洞
safety check
```

### Node.js

```bash
# 依赖漏洞
npm audit
pnpm audit

# 代码安全扫描
npx eslint . --ext .ts,.tsx
```

---

## security-guidance 插件

`security-guidance` 插件会在每次 Edit/Write 时自动进行安全检查。

**自动检查项：**
- 硬编码密钥检测
- SQL 注入模式检测
- 命令注入模式检测
- 不安全的函数调用

**使用时机：**
- 自动启用（hook）
- 每次代码编辑时触发
