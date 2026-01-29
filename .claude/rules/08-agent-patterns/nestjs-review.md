# NestJS 模块审查模式

本文件定义了 NestJS 模块审查的标准 agent 调用模式。

---

## 触发条件

- 审查 NestJS 模块完整性
- 检查模块是否符合规范
- 验证模块功能

---

## 调用方式

使用 `Task(Explore)` agent

---

## Prompt 模板

```text
审查 backend/src/<module> 模块：

1. 检查 module/service/controller 是否完整
   - module.ts 是否正确导入和导出
   - service.ts 是否实现所有业务逻辑
   - controller.ts 是否定义所有 API 端点

2. 检查 DTO 验证是否完整
   - 所有请求体是否有 DTO
   - DTO 是否使用 class-validator
   - 验证规则是否合理

3. 检查 Prisma 调用是否正确
   - 是否正确使用 PrismaService
   - 查询是否优化（避免 N+1）
   - 事务是否正确处理

4. 检查错误处理是否完整
   - 是否有自定义异常
   - 是否正确使用 HttpException
   - 错误消息是否有意义

5. 报告发现的问题
   - 列出所有问题
   - 按严重程度排序
   - 提供修复建议
```

---

## 审查检查清单

### Module

- [ ] 正确使用 `@Module()` 装饰器
- [ ] imports 包含所有依赖模块
- [ ] providers 包含所有服务
- [ ] controllers 包含所有控制器
- [ ] exports 导出需要共享的服务

### Service

- [ ] 使用 `@Injectable()` 装饰器
- [ ] 正确注入依赖（PrismaService 等）
- [ ] 业务逻辑完整
- [ ] 错误处理完整
- [ ] 返回类型正确

### Controller

- [ ] 使用 `@Controller()` 装饰器
- [ ] 路由定义正确
- [ ] 使用正确的 HTTP 方法装饰器
- [ ] 参数验证使用 DTO
- [ ] 响应类型正确

### DTO

- [ ] 使用 class-validator 装饰器
- [ ] 字段类型正确
- [ ] 可选字段使用 `@IsOptional()`
- [ ] 嵌套对象使用 `@ValidateNested()`

---

## 常见问题模式

### 循环依赖

```typescript
// 问题：两个模块相互导入

// 解决：使用 forwardRef
@Module({
  imports: [forwardRef(() => OtherModule)],
})
export class MyModule {}
```

### N+1 查询

```typescript
// 问题：循环中查询
for (const user of users) {
  const orders = await this.prisma.order.findMany({
    where: { userId: user.id },
  });
}

// 解决：一次查询
const orders = await this.prisma.order.findMany({
  where: { userId: { in: users.map(u => u.id) } },
});
```

### 缺少事务

```typescript
// 问题：多个操作没有事务
await this.prisma.user.create({ data: userData });
await this.prisma.profile.create({ data: profileData });

// 解决：使用事务
await this.prisma.$transaction([
  this.prisma.user.create({ data: userData }),
  this.prisma.profile.create({ data: profileData }),
]);
```
