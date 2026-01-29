---
paths:
  - "**/*.java"
  - "**/pom.xml"
  - "**/build.gradle"
---

# Java 语言实践指南

本文件定义了 Java 项目的最佳实践。

---

## 类型系统与类型安全

### Generics + PECS

```java
// Producer Extends, Consumer Super
public class Repository<T extends Entity> {
    public void addAll(Collection<? extends T> items) {
        // Producer - use extends
    }

    public void fillInto(Collection<? super T> destination) {
        // Consumer - use super
    }
}

// 泛型方法
public <T extends Comparable<T>> T findMax(List<T> items) {
    return Collections.max(items);
}
```

### Record 类型（Java 14+）

```java
// 不可变数据类
public record User(
    String id,
    String email,
    String name
) {
    // 紧凑构造函数进行验证
    public User {
        Objects.requireNonNull(id, "id cannot be null");
        Objects.requireNonNull(email, "email cannot be null");
    }
}

// 值对象
public record Money(
    long amount,
    String currency
) {
    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException("Cannot add different currencies");
        }
        return new Money(this.amount + other.amount, this.currency);
    }
}
```

### Sealed 类型（Java 17+）

```java
// 密封类限制子类
public sealed interface Shape permits Circle, Rectangle, Triangle {
    double area();
}

public record Circle(double radius) implements Shape {
    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
}
```

---

## 代码注释

### Javadoc

```java
/**
 * Creates a new user with the given details.
 *
 * @param email the user's email address
 * @param name the user's full name
 * @return the created User object
 * @throws ValidationException if email format is invalid
 * @throws DuplicateException if email already exists
 */
public User createUser(String email, String name) {
    // Implementation
}
```

### 类文档

```java
/**
 * Repository for managing User entities.
 *
 * <p>This class provides CRUD operations for users in the database.
 * It uses JPA for persistence and supports transaction management.
 *
 * <p>Example usage:
 * <pre>{@code
 * UserRepository repo = new UserRepository(entityManager);
 * User user = repo.findById("123");
 * }</pre>
 *
 * @author Ricky
 * @since 1.0
 */
public class UserRepository {
}
```

---

## 架构

### 分层架构

```text
project/
├── src/main/java/com/example/
│   ├── domain/              # 领域层
│   │   ├── model/           # 实体和值对象
│   │   ├── repository/      # 仓储接口
│   │   └── service/         # 领域服务
│   ├── application/         # 应用层
│   │   ├── usecase/         # 用例
│   │   └── dto/             # DTO
│   ├── infrastructure/      # 基础设施层
│   │   ├── persistence/     # JPA 实现
│   │   └── external/        # 外部服务
│   └── presentation/        # 表示层
│       ├── controller/      # REST 控制器
│       └── request/         # 请求/响应对象
├── src/test/java/
└── pom.xml
```

---

## OOP 实践

### Abstract Class vs Interface

```java
// 接口定义契约
public interface UserRepository {
    Optional<User> findById(String id);
    void save(User user);
}

// 抽象类提供部分实现
public abstract class BaseEntity {
    protected String id;
    protected LocalDateTime createdAt;
    protected LocalDateTime updatedAt;

    public abstract void validate();
}

// 使用
public class User extends BaseEntity {
    private String email;
    private String name;

    @Override
    public void validate() {
        // 验证逻辑
    }
}
```

### 依赖注入（Spring）

```java
@Service
public class UserService {
    private final UserRepository repository;
    private final Logger logger;

    public UserService(UserRepository repository, Logger logger) {
        this.repository = repository;
        this.logger = logger;
    }

    public User createUser(CreateUserRequest request) {
        logger.info("Creating user: {}", request.email());
        User user = new User(request.email(), request.name());
        repository.save(user);
        return user;
    }
}
```

---

## jdtls-lsp 集成

### 自动启用

`jdtls-lsp`（Eclipse JDT Language Server）在处理 Java 文件时自动启用，提供：

- **实时错误检测**：编辑时即时发现编译错误
- **智能补全**：基于类型的代码补全
- **跳转到定义**：快速导航到类/方法定义
- **查找引用**：找出所有使用某个符号的位置
- **悬停信息**：显示 Javadoc 和类型信息
- **代码重构**：重命名、提取方法等

### Claude 应主动使用的 LSP 功能

```text
修改代码前：
- 使用 goToDefinition 理解类/方法的实现
- 使用 hover 查看方法签名和 Javadoc

重构时：
- 使用 findReferences 评估影响范围
- 使用 documentSymbol 了解类结构
- 使用 goToImplementation 查找接口实现

调试时：
- 使用 hover 检查变量类型
- 使用 incomingCalls 追踪方法调用链
- 使用 outgoingCalls 查看方法依赖
```

### 文件类型支持

| 扩展名 | 支持 |
|--------|------|
| `.java` | ✅ |

### 项目配置要求

jdtls 需要以下项目配置之一：
- `pom.xml`（Maven）
- `build.gradle`（Gradle）
- `.project`（Eclipse）

---

## 验证命令

```bash
# Maven
mvn compile
mvn test
mvn checkstyle:check

# Gradle
./gradlew build
./gradlew test
./gradlew check
```

---

## 快速检查清单

- [ ] 使用 Generics 增强类型安全
- [ ] 使用 Record 定义不可变数据
- [ ] 使用 Sealed 限制继承
- [ ] Javadoc 完整
- [ ] 遵循 SOLID 原则
- [ ] 代码通过 checkstyle
- [ ] jdtls-lsp 自动启用并正常工作
