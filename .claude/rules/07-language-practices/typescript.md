---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/tsconfig.json"
  - "**/package.json"
---

# TypeScript/NestJS 语言实践指南

本文件定义了 TypeScript 和 NestJS 项目的最佳实践。

---

## 类型系统与类型安全

### Strict 模式

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 类型定义

```typescript
// 使用 interface 定义对象类型
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// 使用 type 定义联合类型
type UserRole = 'admin' | 'user' | 'guest';

// 使用泛型
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
}

// 使用 Zod 进行运行时验证
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

type CreateUserDto = z.infer<typeof CreateUserSchema>;
```

### 避免 any

```typescript
// ❌ 不要
function process(data: any) {
  return data.value;
}

// ✅ 使用 unknown + 类型守卫
function process(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String((data as { value: unknown }).value);
  }
  throw new Error('Invalid data');
}
```

---

## 代码注释

### JSDoc/TSDoc

```typescript
/**
 * Creates a new user with the given details.
 *
 * @param dto - The user creation data
 * @returns The created user
 * @throws {ValidationError} If email format is invalid
 * @throws {DuplicateError} If email already exists
 *
 * @example
 * ```typescript
 * const user = await userService.create({
 *   email: 'test@example.com',
 *   name: 'Test User',
 * });
 * ```
 */
async create(dto: CreateUserDto): Promise<User> {
  // Implementation
}
```

---

## NestJS 架构

### 模块结构

```text
src/
├── modules/
│   └── user/
│       ├── user.module.ts
│       ├── user.service.ts
│       ├── user.controller.ts
│       ├── user.repository.ts
│       ├── dto/
│       │   ├── create-user.dto.ts
│       │   └── update-user.dto.ts
│       ├── entities/
│       │   └── user.entity.ts
│       └── tests/
│           ├── user.service.spec.ts
│           └── user.controller.spec.ts
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   └── interceptors/
└── config/
```

### DTO 验证

```typescript
import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsOptional()
  phone?: string;
}
```

### 依赖注入

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly repository: UserRepository,
    private readonly logger: Logger,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    this.logger.log(`Creating user: ${dto.email}`);
    const user = this.repository.create(dto);
    return this.repository.save(user);
  }
}
```

---

## React/Next.js 实践

### 组件类型

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({
  variant,
  children,
  onClick,
  disabled = false,
}: ButtonProps) {
  return (
    <button
      className={cn('btn', variant)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

### Hooks 类型

```typescript
function useUser(id: string) {
  const { data, error, isLoading } = useSWR<User, Error>(
    `/api/users/${id}`,
    fetcher,
  );

  return {
    user: data,
    isLoading,
    isError: error,
  };
}
```

---

## typescript-lsp 集成

### 自动启用

`typescript-lsp` 在处理 TypeScript/JavaScript 文件时自动启用，提供：

- **实时错误检测**：编辑时即时发现类型错误
- **智能补全**：基于类型的代码补全
- **跳转到定义**：快速导航到类型/函数定义
- **查找引用**：找出所有使用某个符号的位置
- **悬停信息**：显示类型信息和文档

### Claude 应主动使用的 LSP 功能

```text
修改代码前：
- 使用 goToDefinition 理解函数/类的实现
- 使用 hover 查看类型签名和参数

重构时：
- 使用 findReferences 评估影响范围
- 使用 documentSymbol 了解文件结构

调试时：
- 使用 hover 检查变量类型
- 使用 incomingCalls 追踪调用链
```

### 文件类型支持

| 扩展名 | 支持 |
|--------|------|
| `.ts` | ✅ |
| `.tsx` | ✅ |
| `.js` | ✅ |
| `.jsx` | ✅ |
| `.mts` | ✅ |
| `.cts` | ✅ |

---

## 验证命令

```bash
# 类型检查
pnpm tsc --noEmit

# 测试
pnpm test

# Lint
pnpm lint

# All-in-one
pnpm build && pnpm test && pnpm lint
```

---

## 快速检查清单

- [ ] tsconfig.json 启用 strict 模式
- [ ] 不使用 any（使用 unknown）
- [ ] DTO 使用 class-validator
- [ ] 组件有完整的 Props 类型
- [ ] TSDoc 注释完整
- [ ] 代码通过 eslint
- [ ] typescript-lsp 自动启用并正常工作
