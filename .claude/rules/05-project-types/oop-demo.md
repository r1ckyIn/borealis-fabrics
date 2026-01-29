# OOP 演示项目规范

用途：展示设计模式和原则

---

## 示例项目

- `aws_cost_calculator` - 继承、多态、工厂模式
- `hogwarts-archive` - 封装、三层架构

---

## 要求

### 必需文件

- 清晰的 DESIGN_REPORT.md 解释使用的模式
- 注释良好的代码展示概念
- 文档以教育为重点

### 代码质量

- 每个设计模式都有独立的示例
- 代码注释解释模式的应用
- 包含 UML 图或架构图

---

## DESIGN_REPORT.md 模板

```markdown
# Design Report

## Overview

Brief description of the project and its purpose.

## Design Patterns Used

### 1. Factory Pattern

**Location**: `src/factories/`

**Purpose**: Create objects without specifying exact class.

**Implementation**:
- `UserFactory` creates different types of users
- `ProductFactory` creates different product variants

### 2. Strategy Pattern

**Location**: `src/strategies/`

**Purpose**: Define family of algorithms, encapsulate each one.

**Implementation**:
- `PricingStrategy` interface
- `RegularPricing`, `DiscountPricing` implementations

## Architecture

### Layer Structure

```
├── domain/          # Business logic
├── application/     # Use cases
├── infrastructure/  # External dependencies
└── presentation/    # UI/API
```

## Class Diagrams

[Include UML diagrams]

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Use Factory | Centralize object creation |
| Use Strategy | Allow runtime algorithm switching |
```

---

## 代码注释风格

```python
class UserFactory:
    """Factory for creating User objects.

    This class demonstrates the Factory Pattern, which provides an
    interface for creating objects without specifying the exact class.

    Design Pattern: Factory Method

    Example:
        factory = UserFactory()
        admin = factory.create_user("admin")
        guest = factory.create_user("guest")
    """

    def create_user(self, user_type: str) -> User:
        """Create a user based on the specified type.

        Args:
            user_type: The type of user to create ("admin", "guest", etc.)

        Returns:
            A User object of the specified type.

        Raises:
            ValueError: If user_type is not recognized.
        """
        pass
```

---

## 文档重点

- 解释为什么选择特定模式
- 展示模式如何解决实际问题
- 提供清晰的代码示例
- 包含学习资源链接
