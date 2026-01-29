# feature-dev 功能开发工作流模式

本文件定义了 feature-dev 插件的使用模式和最佳实践。

---

## 概述

`feature-dev` 是一个功能开发工作流插件，包含三个专业子代理：

| 子代理 | 用途 | 触发场景 |
|--------|------|---------|
| `feature-dev:code-explorer` | 深度分析代码库 | 不熟悉的代码库、复杂模块 |
| `feature-dev:code-architect` | 设计功能架构 | 新功能设计、重构规划 |
| `feature-dev:code-reviewer` | 高置信度代码审查 | 代码完成后、PR 前 |

---

## 触发条件

### 何时使用 feature-dev:code-explorer

- 进入不熟悉的代码库
- 需要理解复杂模块的架构
- 追踪执行路径和数据流
- 分析模块间的依赖关系

### 何时使用 feature-dev:code-architect

- 设计新功能的架构
- 规划重构方案
- 需要具体的实现蓝图
- 评估多种实现方案

### 何时使用 feature-dev:code-reviewer

- 功能实现完成后
- 准备提交 PR 前
- 需要高置信度的问题检测
- 关注 bugs、安全、代码质量

---

## 调用方式

### 引导式工作流

```bash
/feature-dev
```

使用 `/feature-dev` 会启动完整的引导式功能开发工作流。

### 单独调用子代理

通过 Task tool 调用特定子代理：

```text
使用 Task(feature-dev:code-explorer) 探索模块 X
使用 Task(feature-dev:code-architect) 设计功能 Y
使用 Task(feature-dev:code-reviewer) 审查文件 Z
```

---

## code-explorer 使用指南

### Prompt 模板

```text
探索 backend/src/<module> 模块：

1. 分析模块的整体架构
2. 追踪关键功能的执行路径
3. 理解与其他模块的依赖关系
4. 识别使用的设计模式
5. 总结模块的核心抽象和接口
```

### 输出期望

- 模块架构概述
- 关键类/函数清单
- 依赖关系图
- 设计模式识别
- 潜在的扩展点

---

## code-architect 使用指南

### Prompt 模板

```text
为以下功能设计实现架构：

功能描述：<功能描述>
相关模块：<已存在的相关模块>
约束条件：<技术约束或业务约束>

请提供：
1. 需要创建/修改的文件清单
2. 组件设计和职责划分
3. 数据流设计
4. 与现有代码的集成点
5. 实现顺序建议
```

### 输出期望

- 文件清单（创建/修改）
- 组件/类设计
- 接口定义
- 数据流图
- 构建/实现顺序

---

## code-reviewer 使用指南

### Prompt 模板

```text
审查以下文件的代码质量：

文件列表：
- path/to/file1.ts
- path/to/file2.ts

重点关注：
1. 逻辑错误和潜在 bugs
2. 安全漏洞
3. 代码质量问题
4. 是否符合项目规范

仅报告 confidence >= 80 的问题。
```

### 输出期望

- 问题列表（按置信度排序）
- 每个问题的：
  - 文件位置
  - 问题描述
  - 严重程度
  - 修复建议

### 置信度阈值

| Confidence | 处理方式 |
|------------|---------|
| >= 80 | 必须修复 |
| 50-79 | 评估后决定 |
| < 50 | 通常忽略 |

---

## 与其他插件的配合

### 完整工作流

```text
┌─────────────────────────────────────────────────────────────────┐
│                    feature-dev 完整工作流                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  阶段 1：探索                                                    │
│  └── feature-dev:code-explorer 分析代码库                        │
│                                                                 │
│  阶段 2：设计                                                    │
│  └── feature-dev:code-architect 生成实现蓝图                     │
│                                                                 │
│  阶段 3：实现                                                    │
│  ├── 编写测试（TDD）                                             │
│  ├── 实现功能                                                   │
│  │   └── LSP 插件提供智能支持（typescript-lsp/pyright-lsp/etc）  │
│  └── security-guidance 自动安全检查                              │
│                                                                 │
│  阶段 4：验证                                                    │
│  ├── Build → Test → Lint                                       │
│  └── feature-dev:code-reviewer 代码审查                          │
│                                                                 │
│  阶段 5：提交                                                    │
│  └── /commit 提交代码                                           │
│                                                                 │
│  阶段 6：PR 审查                                                 │
│  ├── /commit-push-pr 创建 PR                                    │
│  └── /code-review 自动化 PR 审查                                 │
│                                                                 │
│  阶段 7：清理                                                    │
│  └── /clean_gone 清理已合并分支                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 与 LSP 插件配合

```text
在实现阶段：
- typescript-lsp：TypeScript/JavaScript 项目
- pyright-lsp：Python 项目
- jdtls-lsp：Java 项目
- clangd-lsp：C/C++ 项目
- gopls-lsp：Go 项目

LSP 插件自动提供：
- 代码补全
- 跳转到定义
- 查找引用
- 实时错误检测
```

---

## 最佳实践

### 何时使用完整工作流

- 开发复杂的新功能
- 进入不熟悉的代码库
- 需要系统性的架构设计

### 何时单独使用子代理

- `code-explorer`：快速了解某个模块
- `code-architect`：设计特定功能
- `code-reviewer`：审查已完成的代码

### 避免的反模式

```text
❌ 不要：跳过探索直接编码
❌ 不要：忽略 code-reviewer 的高置信度问题
❌ 不要：在简单任务上过度使用 feature-dev

✅ 要做：复杂功能使用完整工作流
✅ 要做：修复所有 confidence >= 80 的问题
✅ 要做：简单修改直接编码，不需要 feature-dev
```

---

## 快速参考

```bash
# 完整工作流
/feature-dev

# 探索代码库
Task(feature-dev:code-explorer) "探索 src/modules/user"

# 设计功能
Task(feature-dev:code-architect) "设计用户认证功能"

# 代码审查
Task(feature-dev:code-reviewer) "审查 src/auth/*.ts"
```
