# 操作指南 - 铂润面料数字化管理系统

本文档是开发者/运维人员的操作参考手册。

---

## 1. 本地开发环境要求

### 1.1 必需软件

| 软件 | 最低版本 | 验证命令 |
|------|----------|----------|
| Node.js | 20 LTS | `node --version` |
| pnpm | 8+ | `pnpm --version` |
| Docker | 24+ | `docker --version` |
| Docker Compose | v2+ | `docker compose version` |
| Git | 2.30+ | `git --version` |

### 1.2 环境验证脚本

```bash
# 一键验证所有依赖
echo "=== Environment Check ==="
echo "Node.js: $(node --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "pnpm: $(pnpm --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Docker: $(docker --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Docker Compose: $(docker compose version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Git: $(git --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "========================="
```

### 1.3 缺失组件安装

```bash
# macOS (Homebrew)
brew install node@20
npm install -g pnpm
brew install --cask docker   # Docker Desktop

# 或使用 nvm 管理 Node.js 版本
nvm install 20
nvm use 20
```

---

## 2. 项目初始化

```bash
# 1. 克隆仓库
git clone git@github.com:r1ckyIn/borealis-fabrics.git
cd borealis-fabrics

# 2. 启动数据库和 Redis
docker compose -f backend/docker-compose.yml up -d

# 3. 验证容器运行
docker compose -f backend/docker-compose.yml ps

# 4. 后端初始化
cd backend
pnpm install
cp .env.example .env         # 复制环境变量模板
npx prisma migrate dev       # 运行数据库迁移
pnpm start:dev               # 启动开发服务器

# 5. 前端初始化（新终端）
cd frontend
pnpm install
pnpm dev
```

---

## 3. 日常开发命令

### 后端

```bash
cd backend

# 开发
pnpm start:dev            # 启动开发服务器（hot reload）
pnpm build                # 构建

# 测试
pnpm test                 # 运行单元测试
pnpm test:e2e             # 运行集成测试
pnpm test:cov             # 测试覆盖率

# 代码质量
pnpm lint                 # ESLint 检查
pnpm format               # Prettier 格式化

# 数据库
npx prisma migrate dev --name <描述>    # 创建迁移
npx prisma migrate reset               # 重置开发数据库
npx prisma studio                      # 打开 Prisma Studio（GUI）
npx prisma generate                    # 重新生成 Prisma Client
```

### 前端

```bash
cd frontend

# 开发
pnpm dev                  # 启动开发服务器
pnpm build                # 构建
pnpm preview              # 预览构建产物

# 测试
pnpm test                 # 运行 Vitest
pnpm test:cov             # 测试覆盖率

# 代码质量
pnpm lint                 # ESLint 检查
pnpm format               # Prettier 格式化
pnpm typecheck            # TypeScript 类型检查
```

---

## 4. Docker 管理

```bash
# 启动服务
docker compose -f backend/docker-compose.yml up -d

# 停止服务
docker compose -f backend/docker-compose.yml down

# 查看日志
docker compose -f backend/docker-compose.yml logs -f

# 重置数据（清除所有数据）
docker compose -f backend/docker-compose.yml down -v
docker compose -f backend/docker-compose.yml up -d
```

---

## 5. 健康检查

```bash
# 后端服务存活检查
curl http://localhost:3000/health

# 后端服务就绪检查（含数据库连接）
curl http://localhost:3000/ready
```

---

## 6. 故障排除

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| Docker 启动失败 | 检查 Docker Desktop 是否运行：`docker info` |
| 端口 3000 被占用 | `lsof -i :3000` 找到进程并终止 |
| 端口 3306 被占用 | `lsof -i :3306` 或修改 docker-compose.yml 端口映射 |
| Prisma 迁移失败 | `npx prisma migrate reset` 重置后重试 |
| pnpm install 失败 | 删除 `node_modules` 和 `pnpm-lock.yaml` 后重试 |
| Redis 连接失败 | 检查 Redis 容器：`docker compose -f backend/docker-compose.yml ps` |
