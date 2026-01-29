---
paths:
  - "**/*.py"
  - "**/pyproject.toml"
  - "**/requirements*.txt"
---

# Python 语言实践指南

本文件定义了 Python 项目的最佳实践。

---

## 类型系统与类型安全

### 类型提示

```python
from typing import Optional, List, ClassVar, Protocol, TypeGuard
from dataclasses import dataclass
from pydantic import BaseModel, EmailStr

# 使用 Protocol 定义接口
class UserRepository(Protocol):
    def find_by_id(self, user_id: str) -> Optional["User"]: ...
    def save(self, user: "User") -> None: ...

# 使用 dataclass 定义值对象
@dataclass(frozen=True)
class Address:
    street: str
    city: str
    country: str

# 使用 Pydantic 定义 DTO
class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str
```

### TypeGuard 使用

```python
from typing import TypeGuard

def is_admin(user: User) -> TypeGuard[AdminUser]:
    return user.role == "admin"

# 使用
if is_admin(user):
    # user 在这里被推断为 AdminUser
    user.admin_action()
```

---

## 代码注释

### Google Docstrings

```python
def create_user(email: str, name: str) -> User:
    """Create a new user with the given details.

    Args:
        email: The user's email address.
        name: The user's full name.

    Returns:
        The created User object.

    Raises:
        ValidationError: If email format is invalid.
        DuplicateError: If email already exists.

    Example:
        >>> user = create_user("test@example.com", "Test User")
        >>> user.email
        'test@example.com'
    """
    pass
```

### 行内注释

```python
# Check if user already exists before creating
existing_user = repo.find_by_email(email)
if existing_user:
    raise DuplicateError(f"User with email {email} already exists")
```

---

## 架构

### src 布局

```text
project/
├── src/
│   └── app/
│       ├── __init__.py
│       ├── domain/           # 领域模型
│       │   ├── entities/
│       │   ├── value_objects/
│       │   └── repositories/
│       ├── application/      # 用例
│       │   ├── use_cases/
│       │   └── dto/
│       ├── infrastructure/   # 基础设施
│       │   ├── database/
│       │   └── external/
│       └── presentation/     # API
│           ├── api/
│           └── schemas/
├── tests/
│   ├── unit/
│   └── integration/
├── pyproject.toml
└── alembic/
```

---

## OOP 实践

### ABC + dataclass

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

# 抽象基类
class Entity(ABC):
    @abstractmethod
    def validate(self) -> None:
        pass

# 值对象（不可变）
@dataclass(frozen=True)
class Money:
    amount: int  # 以分为单位
    currency: str = "CNY"

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies")
        return Money(self.amount + other.amount, self.currency)
```

### 依赖注入

```python
class UserService:
    def __init__(
        self,
        repo: UserRepository,
        logger: Logger,
    ) -> None:
        self._repo = repo
        self._logger = logger

    def create_user(self, request: CreateUserRequest) -> User:
        self._logger.info("Creating user", email=request.email)
        user = User.create(request.email, request.name)
        self._repo.save(user)
        return user
```

---

## pyright-lsp 集成

### 自动启用

`pyright-lsp` 在处理 Python 文件时自动启用，提供：

- **实时类型检查**：编辑时即时发现类型错误
- **智能补全**：基于类型推断的代码补全
- **跳转到定义**：快速导航到函数/类定义
- **查找引用**：找出所有使用某个符号的位置
- **悬停信息**：显示类型信息和 docstring

### Claude 应主动使用的 LSP 功能

```text
修改代码前：
- 使用 goToDefinition 理解函数/类的实现
- 使用 hover 查看类型签名和参数

重构时：
- 使用 findReferences 评估影响范围
- 使用 documentSymbol 了解模块结构

调试时：
- 使用 hover 检查变量类型
- 使用 incomingCalls 追踪调用链
```

### Pyright 配置

```json
// pyrightconfig.json
{
  "include": ["src"],
  "typeCheckingMode": "strict",
  "reportMissingTypeStubs": false,
  "reportUnknownMemberType": false
}
```

### 文件类型支持

| 扩展名 | 支持 |
|--------|------|
| `.py` | ✅ |
| `.pyi` | ✅ |

---

## 验证命令

```bash
# 类型检查（使用 pyright 或 mypy）
pyright src/
# 或
mypy src/

# 测试验证
pytest

# Lint 验证
ruff check .

# 格式化
ruff format .

# All-in-one
pyright src/ && pytest && ruff check .
```

---

## 快速检查清单

- [ ] 所有函数有类型注解
- [ ] 使用 Protocol 定义接口
- [ ] 使用 dataclass 定义值对象
- [ ] 使用 Pydantic 定义 DTO
- [ ] Google docstrings 完整
- [ ] 代码通过 pyright/mypy 和 ruff
- [ ] pyright-lsp 自动启用并正常工作
