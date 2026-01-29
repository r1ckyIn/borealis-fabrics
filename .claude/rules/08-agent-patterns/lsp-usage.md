# LSP 语言服务器使用模式

本文件定义了 LSP 插件的使用模式和最佳实践。

---

## 已安装的 LSP 插件

| 插件 | 语言 | 文件类型 | 触发方式 |
|------|------|---------|---------|
| `typescript-lsp` | TypeScript/JavaScript | `*.ts`, `*.tsx`, `*.js`, `*.jsx` | 自动 |
| `pyright-lsp` | Python | `*.py`, `*.pyi` | 自动 |
| `jdtls-lsp` | Java | `*.java` | 自动 |
| `clangd-lsp` | C/C++ | `*.c`, `*.cpp`, `*.h`, `*.hpp` | 自动 |
| `gopls-lsp` | Go | `*.go` | 自动 |

---

## LSP 提供的功能

### 代码导航

| 操作 | 用途 | 使用场景 |
|------|------|---------|
| `goToDefinition` | 跳转到定义 | 理解函数/类的实现 |
| `findReferences` | 查找引用 | 评估重构影响范围 |
| `goToImplementation` | 跳转到实现 | 查找接口的具体实现 |

### 代码分析

| 操作 | 用途 | 使用场景 |
|------|------|---------|
| `hover` | 悬停信息 | 查看类型、文档 |
| `documentSymbol` | 文档符号 | 了解文件结构 |
| `workspaceSymbol` | 工作区符号 | 全局搜索类/函数 |

### 调用层次

| 操作 | 用途 | 使用场景 |
|------|------|---------|
| `prepareCallHierarchy` | 准备调用层次 | 分析函数调用关系 |
| `incomingCalls` | 传入调用 | 查看谁调用了此函数 |
| `outgoingCalls` | 传出调用 | 查看此函数调用了谁 |

---

## Claude 应主动使用 LSP 的场景

### 修改代码前

```text
修改函数前：
1. 使用 goToDefinition 理解函数的完整实现
2. 使用 hover 查看参数类型和返回值
3. 使用 findReferences 了解函数的使用位置

修改类/接口前：
1. 使用 documentSymbol 了解类的完整结构
2. 使用 goToImplementation 查看接口的所有实现
3. 使用 findReferences 评估修改的影响范围
```

### 重构时

```text
重命名重构：
1. 使用 findReferences 找出所有引用位置
2. 评估影响范围
3. 确保所有引用都会被更新

提取方法重构：
1. 使用 incomingCalls 检查调用关系
2. 使用 outgoingCalls 确定依赖
3. 设计新方法的签名
```

### 调试时

```text
追踪问题：
1. 使用 hover 检查变量类型
2. 使用 goToDefinition 追踪数据来源
3. 使用 incomingCalls/outgoingCalls 追踪调用链
```

### 理解代码库

```text
探索新模块：
1. 使用 documentSymbol 获取文件结构概览
2. 使用 workspaceSymbol 搜索关键类/函数
3. 使用 goToDefinition 深入理解实现
```

---

## LSP 操作示例

### TypeScript 项目

```typescript
// 假设我们有以下代码
class UserService {
  constructor(private repo: UserRepository) {}

  async findUser(id: string): Promise<User | null> {
    return this.repo.findById(id);
  }
}

// 使用 LSP：
// 1. 在 UserRepository 上使用 goToDefinition → 跳转到接口定义
// 2. 在 findById 上使用 goToImplementation → 查看具体实现
// 3. 在 findUser 上使用 findReferences → 找到所有调用位置
```

### Python 项目

```python
# 假设我们有以下代码
class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo

    def find_user(self, user_id: str) -> Optional[User]:
        return self.repo.find_by_id(user_id)

# 使用 LSP：
# 1. 在 UserRepository 上使用 hover → 查看类型信息
# 2. 在 find_by_id 上使用 goToDefinition → 跳转到方法定义
# 3. 在 find_user 上使用 incomingCalls → 查看谁调用了这个方法
```

---

## 配置要求

### TypeScript

需要 `tsconfig.json` 文件。

### Python

pyright 会自动检测，可选配置 `pyrightconfig.json`。

### Java

需要以下之一：
- `pom.xml`（Maven）
- `build.gradle`（Gradle）
- `.project`（Eclipse）

### C/C++

需要 `compile_commands.json`：
```bash
# CMake
cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON ..

# Bear（Makefile 项目）
bear -- make
```

### Go

需要 `go.mod` 文件。

---

## 最佳实践

### 主动使用 LSP

```text
✅ 修改前先用 goToDefinition 理解实现
✅ 重构前用 findReferences 评估影响
✅ 调试时用 hover 检查类型
✅ 探索代码时用 documentSymbol 获取概览

❌ 不要盲目修改不理解的代码
❌ 不要跳过 LSP 直接重构
❌ 不要忽略 LSP 报告的类型错误
```

### 与 feature-dev 配合

```text
code-explorer + LSP：
- code-explorer 提供宏观架构视图
- LSP 提供微观代码细节

code-reviewer + LSP：
- code-reviewer 发现逻辑问题
- LSP 发现类型问题
```

---

## 快速参考

| 场景 | LSP 操作 |
|------|---------|
| 理解函数实现 | `goToDefinition` |
| 评估重构影响 | `findReferences` |
| 查看类型信息 | `hover` |
| 了解文件结构 | `documentSymbol` |
| 追踪调用关系 | `incomingCalls` / `outgoingCalls` |
| 找接口实现 | `goToImplementation` |
| 全局搜索符号 | `workspaceSymbol` |
