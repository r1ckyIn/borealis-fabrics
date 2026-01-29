# Continuous Learning 机制

**Claude 必须在发现非平凡知识时主动记录。**

---

## 触发条件

当 Claude 在 session 中发现以下任何一项时，必须提议记录：

| 发现类型 | 示例 |
|----------|------|
| 调试技巧 | "NestJS circular dependency 需要 forwardRef" |
| Workaround | "Prisma 不支持 JSON 数组索引，需要用 raw query" |
| 项目特定模式 | "本项目的 DTO 命名规范是 XxxRequestDto/XxxResponseDto" |
| 配置陷阱 | "TypeScript isolatedModules 需要 export type" |
| 性能发现 | "批量插入时 createMany 比循环 create 快 10x" |

---

## 记录格式

```markdown
## 已学习模式

### [YYYY-MM-DD] <模式名称>

**问题**：<遇到了什么问题>
**解决方案**：<如何解决>
**适用场景**：<什么时候应用此模式>
```

---

## Claude 行为

```text
发现非平凡知识时：
1. 在回复末尾添加："💡 发现可记录模式：[简述]"
2. 提议具体的 CLAUDE.md 更新内容
3. 等待用户确认后执行更新
4. 如果用户说"记录"或"学习"，立即更新
```

---

## 知识分类

### 通用知识（记录到 r1ckyIn_GitHub/CLAUDE.md）

- 适用于多个项目的技巧
- 语言/框架的通用最佳实践
- 工具使用技巧

### 项目特定知识（记录到项目 CLAUDE.md）

- 项目特定的约定
- 项目特定的架构决策
- 项目特定的配置

---

## 💡 标记使用

### 何时使用

- 发现可复用的调试技巧
- 发现项目特定的模式
- 发现配置陷阱
- 发现性能优化方法
- 发现 workaround

### 格式

```text
💡 发现可记录模式：[模式名称]

问题：[问题描述]
解决方案：[解决方案]
适用场景：[何时使用]

是否需要记录到 CLAUDE.md？
```

---

## 记录优先级

| 优先级 | 类型 | 说明 |
|--------|------|------|
| 高 | 踩坑记录 | 花费时间调试的问题 |
| 高 | 项目约定 | 重复使用的模式 |
| 中 | 性能优化 | 明显的性能提升 |
| 中 | 工具技巧 | 提高效率的技巧 |
| 低 | 一般知识 | 容易找到的信息 |

---

## 示例记录

### 调试技巧

```markdown
### [2025-01-15] NestJS 循环依赖解决

**问题**：两个 Service 相互依赖导致启动失败
**解决方案**：使用 `forwardRef(() => XxxService)` 延迟加载
**适用场景**：NestJS 模块间存在循环依赖时
```

### Workaround

```markdown
### [2025-01-16] Prisma JSON 数组查询

**问题**：Prisma 不支持 JSON 数组内的索引查询
**解决方案**：使用 `$queryRaw` 执行原生 SQL
**适用场景**：需要查询 JSON 数组内特定元素时
```

### 配置陷阱

```markdown
### [2025-01-17] TypeScript isolatedModules 配置

**问题**：使用 `export { Type }` 导致编译错误
**解决方案**：改用 `export type { Type }`
**适用场景**：tsconfig 开启 isolatedModules 时
```

---

## Session 结束时的知识检查

```text
Session 结束前，检查：
□ 本次 session 是否有 💡 标记的发现？
□ 是否有值得记录的调试技巧？
□ 是否有项目特定的模式需要记录？
□ 是否需要更新 CLAUDE.md？
```
