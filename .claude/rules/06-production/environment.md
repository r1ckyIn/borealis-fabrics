---
paths:
  - "**/backend/**"
  - "**/frontend/**"
  - "**/.env*"
  - "**/docker*"
---

# 环境隔离规范

本文件定义了环境隔离和配置管理标准。

---

## 环境类型

| 环境 | 用途 |
|------|------|
| local | Docker Compose 本地开发，热重载 |
| staging | 与生产一致的测试环境，自动部署 |
| prod | 生产环境，手动批准部署 |

---

## 配置管理（pydantic-settings）

### 文件结构

```text
.env.example     → 提交到 Git（模板，无真实值）
.env             → 不提交（.gitignore 中排除）
.env.staging     → 不提交
.env.production  → 不提交
```

### .env.example 模板

```bash
# .env.example - 配置模板（提交到 Git）
# 复制为 .env 并填入实际值

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30

# AWS
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-southeast-2

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx

# App
DEBUG=false
LOG_LEVEL=INFO
```

---

## .gitignore 配置

```gitignore
# 环境变量（绝不提交）
.env
.env.local
.env.staging
.env.production

# Docker volumes
docker-data/

# 日志文件
*.log
logs/

# 密钥和证书
*.pem
*.key
*.crt

# 数据库文件
*.db
*.sqlite3
```

---

## Docker Compose 配置

### 开发环境

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - .:/app
    environment:
      - DEBUG=true
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## 环境变量验证

### Python (pydantic-settings)

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    jwt_secret: str
    debug: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
```

### TypeScript

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string(),
  DEBUG: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);
```

---

## 环境切换

### 本地开发

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

### Staging

```bash
# 部署到 staging
./deploy.sh staging
```

### Production

```bash
# 部署到生产（需要审批）
./deploy.sh production
```

---

## 安全检查

### 环境变量安全

- [ ] 敏感值不在代码中
- [ ] .env 文件在 .gitignore 中
- [ ] 使用 .env.example 作为模板
- [ ] 生产环境使用密钥管理服务

### 访问控制

- [ ] 生产数据库只能从生产服务器访问
- [ ] staging 和生产使用不同的凭据
- [ ] 定期轮换密钥
