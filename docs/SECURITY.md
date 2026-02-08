[English](#english) | [中文](#中文)

---

## English

# Security Documentation - Borealis Fabrics

This document describes the security measures implemented in the Borealis Fabrics digital management system.

## 1. Authentication

### Cookie-Based Auth Flow

- JWT tokens are stored in **HttpOnly cookies** (`bf_auth_token`), preventing XSS access
- Cookie options: `httpOnly: true`, `sameSite: lax`, `secure: true` (production), `maxAge: 7 days`
- Frontend never handles or stores JWT tokens directly
- All API requests use `withCredentials: true` for automatic cookie transmission

### WeWork OAuth Flow

1. Frontend redirects to backend `/api/v1/auth/wework/login`
2. Backend redirects to WeWork authorization page
3. WeWork redirects back to backend `/api/v1/auth/wework/callback?code=xxx&state=yyy`
4. Backend validates OAuth state (stored in Redis, 5-minute TTL), exchanges code for user info
5. Backend sets HttpOnly cookie and redirects to frontend `/auth/callback?success=true`
6. Frontend calls `GET /auth/me` to fetch user info (cookie sent automatically)

### Token Blacklisting

- On logout, tokens are blacklisted in Redis using SHA256 hash
- `JwtAuthGuard` checks blacklist before accepting any token
- Blacklist entries expire after token's remaining TTL

### Dev Login

- Only available when `NODE_ENV=development`
- Returns `403 Forbidden` in production

## 2. Security Headers (Helmet)

### Content Security Policy (CSP)

| Directive | Production | Development |
|-----------|-----------|-------------|
| default-src | 'self' | 'self' |
| script-src | 'self' | 'self' 'unsafe-inline' 'unsafe-eval' |
| style-src | 'self' 'unsafe-inline' | 'self' 'unsafe-inline' |
| img-src | 'self' data: | 'self' data: |
| connect-src | 'self' | 'self' ws://localhost:* |
| font-src | 'self' | 'self' |
| object-src | 'none' | 'none' |
| frame-ancestors | 'none' | 'none' |
| base-uri | 'self' | 'self' |
| form-action | 'self' | 'self' |

### Other Headers

- **Strict-Transport-Security**: `max-age=31536000; includeSubDomains`
- **X-Content-Type-Options**: `nosniff`
- **X-Frame-Options**: `SAMEORIGIN`
- **X-Powered-By**: removed

## 3. Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Global (all endpoints) | 60 requests | 1 minute |
| Auth endpoints (login, callback) | 5 requests | 1 minute |

Implemented via `@nestjs/throttler` with `ThrottlerGuard` applied globally and `@Throttle` decorator on auth endpoints.

## 4. Input Validation

- All request bodies validated via `class-validator` DTOs
- `ValidationPipe` configured with `whitelist: true` and `forbidNonWhitelisted: true`
- Implicit type conversion enabled (`transform: true`)
- Pagination parameters validated (page >= 1, pageSize 1-100)

## 5. CORS

- Configured origins via `CORS_ORIGINS` environment variable
- `credentials: true` for cookie transmission
- Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Default development origin: `http://localhost:5173`

## 6. File Upload Security

- Max file size: 10MB
- Accepted types: JPEG, PNG, WebP
- Files stored in Tencent Cloud COS (not local filesystem)
- Signed URLs for uploads

## 7. Error Handling

- `AllExceptionsFilter` catches unhandled errors
- Production error messages are generic (no stack traces, no internal details)
- Validation errors return structured field-level messages

## 8. Production Environment Validation

Required environment variables (validated at startup):

- `JWT_SECRET` (min 32 characters, must not be 'dev-secret')
- `DATABASE_URL`, `REDIS_URL`
- `COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`, `COS_REGION`
- `WEWORK_CORP_ID`, `WEWORK_SECRET`, `WEWORK_REDIRECT_URI`
- `CORS_ORIGINS`

See `backend/.env.production.example` for a complete template.

## 9. Database Security

- Prisma ORM prevents SQL injection via parameterized queries
- Soft delete pattern (`isActive` flag) preserves audit trail
- No raw SQL queries in codebase

## 10. Swagger / API Documentation

- Swagger UI is **disabled in production** (`NODE_ENV=production`)
- Only available in development mode at `/api/docs`

---

## 中文

# 安全文档 - 铂润面料管理系统

本文档描述铂润面料数字化管理系统中实施的安全措施。

## 1. 认证

### 基于 Cookie 的认证流程

- JWT 令牌存储在 **HttpOnly Cookie**（`bf_auth_token`）中，防止 XSS 访问
- Cookie 选项：`httpOnly: true`、`sameSite: lax`、`secure: true`（生产环境）、`maxAge: 7 天`
- 前端从不直接处理或存储 JWT 令牌
- 所有 API 请求使用 `withCredentials: true` 自动传输 Cookie

### 企业微信 OAuth 流程

1. 前端重定向到后端 `/api/v1/auth/wework/login`
2. 后端重定向到企业微信授权页面
3. 企业微信回调到后端 `/api/v1/auth/wework/callback?code=xxx&state=yyy`
4. 后端验证 OAuth state（存储在 Redis 中，5 分钟 TTL），交换 code 获取用户信息
5. 后端设置 HttpOnly Cookie 并重定向到前端 `/auth/callback?success=true`
6. 前端调用 `GET /auth/me` 获取用户信息（Cookie 自动发送）

### 令牌黑名单

- 注销时，令牌通过 SHA256 哈希添加到 Redis 黑名单
- `JwtAuthGuard` 在接受任何令牌前检查黑名单
- 黑名单条目在令牌剩余 TTL 后过期

### 开发登录

- 仅在 `NODE_ENV=development` 时可用
- 生产环境返回 `403 Forbidden`

## 2. 安全头（Helmet）

### 内容安全策略（CSP）

| 指令 | 生产环境 | 开发环境 |
|------|---------|---------|
| default-src | 'self' | 'self' |
| script-src | 'self' | 'self' 'unsafe-inline' 'unsafe-eval' |
| style-src | 'self' 'unsafe-inline' | 'self' 'unsafe-inline' |
| img-src | 'self' data: | 'self' data: |
| connect-src | 'self' | 'self' ws://localhost:* |
| font-src | 'self' | 'self' |
| object-src | 'none' | 'none' |
| frame-ancestors | 'none' | 'none' |
| base-uri | 'self' | 'self' |
| form-action | 'self' | 'self' |

### 其他头

- **Strict-Transport-Security**：`max-age=31536000; includeSubDomains`
- **X-Content-Type-Options**：`nosniff`
- **X-Frame-Options**：`SAMEORIGIN`
- **X-Powered-By**：已移除

## 3. 速率限制

| 范围 | 限制 | 时间窗口 |
|------|------|---------|
| 全局（所有端点） | 60 次请求 | 1 分钟 |
| 认证端点（登录、回调） | 5 次请求 | 1 分钟 |

通过 `@nestjs/throttler` 的 `ThrottlerGuard` 全局应用，认证端点使用 `@Throttle` 装饰器。

## 4. 输入验证

- 所有请求体通过 `class-validator` DTO 验证
- `ValidationPipe` 配置 `whitelist: true` 和 `forbidNonWhitelisted: true`
- 启用隐式类型转换（`transform: true`）
- 分页参数验证（page >= 1，pageSize 1-100）

## 5. CORS

- 通过 `CORS_ORIGINS` 环境变量配置允许的源
- `credentials: true` 用于 Cookie 传输
- 允许方法：GET、POST、PUT、PATCH、DELETE、OPTIONS
- 默认开发源：`http://localhost:5173`

## 6. 文件上传安全

- 最大文件大小：10MB
- 接受类型：JPEG、PNG、WebP
- 文件存储在腾讯云 COS（非本地文件系统）
- 使用签名 URL 上传

## 7. 错误处理

- `AllExceptionsFilter` 捕获未处理的异常
- 生产环境错误消息通用化（无堆栈跟踪，无内部细节）
- 验证错误返回结构化的字段级消息

## 8. 生产环境变量验证

必需的环境变量（启动时验证）：

- `JWT_SECRET`（最少 32 字符，不能是 'dev-secret'）
- `DATABASE_URL`、`REDIS_URL`
- `COS_SECRET_ID`、`COS_SECRET_KEY`、`COS_BUCKET`、`COS_REGION`
- `WEWORK_CORP_ID`、`WEWORK_SECRET`、`WEWORK_REDIRECT_URI`
- `CORS_ORIGINS`

完整模板参见 `backend/.env.production.example`。

## 9. 数据库安全

- Prisma ORM 通过参数化查询防止 SQL 注入
- 软删除模式（`isActive` 标志）保留审计记录
- 代码库中无原始 SQL 查询

## 10. Swagger / API 文档

- Swagger UI 在**生产环境禁用**（`NODE_ENV=production`）
- 仅在开发模式下可访问 `/api/docs`
