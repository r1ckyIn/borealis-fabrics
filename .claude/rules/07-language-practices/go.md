---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---

# Go 语言实践指南

本文件定义了 Go 项目的最佳实践。

---

## 类型系统与类型安全

### 类型定义

```go
// 使用自定义类型增强类型安全
type UserID string
type Email string
type Money int64  // 以分为单位存储

// 使用接口定义行为
type UserRepository interface {
    FindByID(ctx context.Context, id UserID) (*User, error)
    Save(ctx context.Context, user *User) error
}
```

### 错误处理

```go
// 定义错误类型
var (
    ErrUserNotFound = errors.New("user not found")
    ErrInvalidEmail = errors.New("invalid email format")
)

// 返回错误而不是 panic
func FindUser(id UserID) (*User, error) {
    user, err := repo.FindByID(id)
    if err != nil {
        return nil, fmt.Errorf("find user %s: %w", id, err)
    }
    return user, nil
}
```

---

## 代码注释

### Godoc 格式

```go
// Package user provides user management functionality.
// It includes CRUD operations and authentication.
package user

// User represents a registered user in the system.
type User struct {
    ID    UserID
    Email Email
    Name  string
}

// NewUser creates a new user with the given email and name.
// It validates the email format and returns an error if invalid.
func NewUser(email Email, name string) (*User, error) {
    // Implementation
}
```

### 行内注释

```go
// Check if user already exists before creating
existingUser, err := repo.FindByEmail(email)
if err != nil && !errors.Is(err, ErrUserNotFound) {
    return nil, err
}
```

---

## 架构

### 项目结构

```text
project/
├── cmd/                    # 入口点
│   └── server/
│       └── main.go
├── internal/               # 私有代码
│   ├── domain/             # 领域模型
│   ├── service/            # 业务逻辑
│   ├── repository/         # 数据访问
│   └── handler/            # HTTP 处理器
├── pkg/                    # 公共代码
│   └── validator/
├── api/                    # API 定义（OpenAPI）
├── configs/                # 配置文件
├── go.mod
└── go.sum
```

### 依赖注入

```go
// 使用构造函数注入依赖
type UserService struct {
    repo   UserRepository
    logger *slog.Logger
}

func NewUserService(repo UserRepository, logger *slog.Logger) *UserService {
    return &UserService{
        repo:   repo,
        logger: logger,
    }
}
```

---

## OOP 实践

### 组合优于继承

```go
// 使用嵌入实现组合
type BaseEntity struct {
    ID        string
    CreatedAt time.Time
    UpdatedAt time.Time
}

type User struct {
    BaseEntity  // 嵌入
    Email string
    Name  string
}
```

### 接口设计

```go
// 小接口，单一职责
type Reader interface {
    Read(ctx context.Context, id string) (*Entity, error)
}

type Writer interface {
    Write(ctx context.Context, entity *Entity) error
}

// 组合接口
type Repository interface {
    Reader
    Writer
}
```

---

## 验证命令

```bash
# 构建验证
go build ./...

# 测试验证
go test ./...

# Lint 验证
golangci-lint run

# All-in-one
go build ./... && go test ./... && golangci-lint run
```

---

## 快速检查清单

- [ ] 使用自定义类型增强类型安全
- [ ] 错误用 `%w` 包装
- [ ] 接口定义小而专一
- [ ] 使用组合而非继承
- [ ] Godoc 注释完整
- [ ] 代码通过 golangci-lint
