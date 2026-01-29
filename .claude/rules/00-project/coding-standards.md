# 项目编码规范

## 后端（NestJS）

- TypeScript strict 模式
- ESLint + Prettier
- class-validator 做 DTO 验证
- Prisma 做数据库访问
- nestjs-pino 做结构化日志
- **所有代码注释使用纯英文**

---

## 前端（React）

- TypeScript strict 模式
- Vite 构建
- Ant Design 5（桌面端为主，响应式兼顾移动端）
- TanStack Query 数据请求
- Zustand 客户端状态
- **所有代码注释使用纯英文**

---

## 数据库

- MySQL 8.0
- Prisma Migrate 管理迁移
- 编号生成：Redis INCR + DB UNIQUE 兜底

---

## 命名规范

### 文件命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| Module | `<name>.module.ts` | `supplier.module.ts` |
| Service | `<name>.service.ts` | `supplier.service.ts` |
| Controller | `<name>.controller.ts` | `supplier.controller.ts` |
| DTO | `<action>-<name>.dto.ts` | `create-supplier.dto.ts` |
| Entity | `<name>.entity.ts` | `supplier.entity.ts` |
| Test | `<name>.<type>.spec.ts` | `supplier.service.spec.ts` |

### 变量命名

| 类型 | 规则 | 示例 |
|------|------|------|
| 类 | PascalCase | `SupplierService` |
| 方法/变量 | camelCase | `findById` |
| 常量 | SCREAMING_SNAKE_CASE | `MAX_PAGE_SIZE` |
| DTO 属性 | camelCase | `supplierName` |

---

## DTO 规范

```typescript
// CreateXxxDto - 创建时的输入
export class CreateSupplierDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

// UpdateXxxDto - 更新时的输入（所有字段可选）
export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

// XxxResponseDto - API 响应
export class SupplierResponseDto {
  id: string;
  name: string;
  createdAt: Date;
}
```

---

## 错误处理

```typescript
// 使用 NestJS 内置异常
throw new NotFoundException('Supplier not found');
throw new BadRequestException('Invalid input');
throw new ConflictException('Supplier already exists');

// 自定义业务异常
throw new BusinessException('SUPPLIER_CREDIT_EXCEEDED', 'Credit limit exceeded');
```
