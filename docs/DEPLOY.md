[English](#english) | [中文](#中文)

---

# English

# Borealis Fabrics -- Production Deployment Guide

This guide walks you through deploying the Borealis Fabrics system to Tencent Cloud. It covers two phases:

- **Phase A:** IP + HTTP deployment (no domain required)
- **Phase B:** Domain + HTTPS + WeChat Work OAuth (after ICP filing)

---

## 1. Prerequisites

- Tencent Cloud account with access to Lighthouse, CDB, COS, and CCN
- SSH key configured for server access
- Git repository cloned locally
- Node.js 22 + pnpm installed on local machine (for frontend build)
- Docker Engine + Docker Compose v2 plugin on the server

### Memory Budget (4GB Server)

| Service | Memory Limit | Notes |
|---------|-------------|-------|
| OS + Docker | ~600MB | Linux kernel + Docker daemon |
| NestJS | 768MB | Node.js app with Prisma |
| Redis | 192MB | 128MB data + overhead |
| Nginx | 64MB | Static files + reverse proxy |
| Loki | 256MB | Reduced retention (7 days) |
| Prometheus | 128MB | Reduced scrape interval (30s) |
| Grafana | 192MB | Dashboard UI |
| Buffer | ~800MB | Safety margin for spikes |
| **Total** | **~4GB** | |

> **Important:** Start monitoring stack only after the business stack (NestJS + Redis + Nginx) is verified working. If OOM occurs, stop monitoring first: `docker compose -f docker-compose.monitoring.yml down`

---

## 2. Phase A: IP + HTTP Deployment

### 2.1 Provision Lighthouse Server

1. Go to **Tencent Cloud Console > Lighthouse**
2. Create a new instance:
   - **Image:** Ubuntu 22.04 LTS
   - **Spec:** 2C4G (2 vCPU, 4GB RAM)
   - **Bandwidth:** 4Mbps
   - **Storage:** 60GB SSD (default)
3. Note the **public IP address**
4. Configure **firewall rules** (Lighthouse > Instance > Firewall):
   - Port 22 (SSH) -- source: your IP
   - Port 80 (HTTP) -- source: all
   - Port 3001 (Grafana) -- source: your IP (optional, for monitoring)

### 2.2 Install Docker on Server

```bash
# SSH into server
ssh root@<server-ip>

# Install Docker Engine
curl -fsSL https://get.docker.com | sh

# Verify installation
docker --version
docker compose version

# Enable Docker to start on boot
systemctl enable docker
```

### 2.3 Provision CDB MySQL

1. Go to **Tencent Cloud Console > CDB**
2. Create a new instance:
   - **Engine:** MySQL 8.0
   - **Type:** Basic (1C1G)
   - **Storage:** 50GB SSD
   - **Region:** Same as Lighthouse
3. Set the root password
4. Create the database:
   - Connect via CDB Console > Database Management > Create Database
   - Database name: `borealis`
   - Character set: `utf8mb4`

#### Critical: CCN Network Setup

> **Pitfall Warning:** Lighthouse and CDB are on separate VPCs by default. They do NOT auto-connect even in the same region. You MUST set up CCN.

5. Go to **Tencent Cloud Console > Cloud Connect Network (CCN)**
6. Create a new CCN instance
7. Associate the **Lighthouse instance** with the CCN
8. Associate the **CDB's VPC** with the CCN
9. Configure **CDB security group**: allow inbound port 3306 from the Lighthouse private IP range
10. Verify connectivity from the Lighthouse server:

```bash
# SSH into Lighthouse server
mysql -h <cdb-private-ip> -u root -p
# Should connect successfully. Type 'exit' to quit.
```

### 2.4 Provision COS Bucket

1. Go to **Tencent Cloud Console > COS**
2. Create a new bucket:
   - **Name:** choose a name (e.g., `borealis-files`)
   - **Region:** Same as Lighthouse
   - **Access:** Private read/write
3. Configure CORS (COS Console > Bucket > Security Management > CORS):
   - AllowOrigin: `*` (Phase A, restrict to domain in Phase B)
   - AllowMethod: `GET, PUT, POST, DELETE`
   - AllowHeader: `*`
   - MaxAgeSeconds: `3600`
4. Create sub-account with COS-only permissions (Tencent Cloud Console > CAM > Users):
   - Create a sub-user
   - Attach policy: `QcloudCOSFullAccess`
   - Create API key for the sub-user
5. Note these values:
   - `COS_SECRET_ID` -- from CAM > API Keys
   - `COS_SECRET_KEY` -- from CAM > API Keys
   - `COS_BUCKET` -- bucket name with APPID (e.g., `borealis-files-1234567890`)
   - `COS_REGION` -- region code (e.g., `ap-shanghai`)

### 2.5 Clone and Configure

```bash
# On Lighthouse server
cd /opt
git clone git@github.com:r1ckyIn/borealis-fabrics.git
cd borealis-fabrics

# Create production env file
cp backend/.env.production.example backend/.env
chmod 600 backend/.env
```

Edit `backend/.env` with real values:

```bash
# Required edits:
DATABASE_URL="mysql://root:<password>@<cdb-private-ip>:3306/borealis"
REDIS_URL="redis://redis:6379"
JWT_SECRET="<run: openssl rand -base64 48>"
JWT_EXPIRES_IN="7d"

# COS (from step 2.4)
COS_SECRET_ID="<your-cos-secret-id>"
COS_SECRET_KEY="<your-cos-secret-key>"
COS_BUCKET="<bucket-name-appid>"
COS_REGION="ap-shanghai"
STORAGE_MODE=cos

# CORS (use server IP for Phase A)
CORS_ORIGINS="http://<server-ip>"

# Base URL
BASE_URL="http://<server-ip>"

# WeChat Work (set placeholder values for Phase A -- not used with dev login)
WEWORK_CORP_ID="placeholder"
WEWORK_AGENT_ID="placeholder"
WEWORK_SECRET="placeholder"
WEWORK_REDIRECT_URI="http://placeholder/api/v1/auth/wework/callback"

# Phase A: Enable dev login (no domain, no OAuth)
ALLOW_DEV_LOGIN=true

# Phase A: Do NOT set FORCE_HTTPS_COOKIES (HTTP only)
# FORCE_HTTPS_COOKIES=true

# Monitoring
LOKI_HOST=http://loki:3100
SENTRY_DSN=""
SLOW_QUERY_THRESHOLD_MS=200

# Boss role (comma-separated wework user IDs)
BOSS_WEWORK_IDS=""

# Grafana
GRAFANA_ADMIN_PASSWORD="<choose-a-strong-password>"
```

### 2.6 Build Frontend and Deploy

**Option A: Build on server** (requires Node.js + pnpm on server):

```bash
# Install Node.js 22 on server
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
corepack enable

# Build frontend
cd frontend
pnpm install --frozen-lockfile
pnpm build
cd ..
```

**Option B: Build locally and copy** (recommended for 4GB server):

```bash
# On local machine
cd frontend
pnpm install
pnpm build

# Copy dist to server
scp -r dist root@<server-ip>:/opt/borealis-fabrics/frontend/dist
```

### 2.7 Deploy

```bash
# On server, in project root
./deploy/deploy.sh
```

The script will:
1. Pull latest code from git
2. Build frontend (if not using `--skip-build`)
3. Build Docker images for NestJS
4. Stop old containers
5. Start new containers (NestJS + Redis + Nginx)
6. Run Prisma database migrations
7. Run health check with retries

If frontend is already built (Option B), skip the build step:

```bash
./deploy/deploy.sh --skip-build
```

### 2.8 Start Monitoring (Optional)

> Only start monitoring after the business stack is verified working.

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

Access Grafana at `http://<server-ip>:3001` (admin / `<GRAFANA_ADMIN_PASSWORD>`).

If the server runs out of memory, stop monitoring first:

```bash
docker compose -f docker-compose.monitoring.yml down
```

### 2.9 Verify Phase A

| Check | Expected Result |
|-------|----------------|
| `curl http://<server-ip>/health` | `{"status":"ok","info":{"app":{"status":"up"}}}` |
| `curl http://<server-ip>/ready` | `{"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}` |
| `http://<server-ip>/` in browser | Frontend loads |
| WeChat OAuth: Visit `https://<DOMAIN>`, click login | QR scan, cookie set (Phase B only) |

---

## 3. Phase B: Domain + HTTPS + OAuth

> Phase B can only be completed after the domain is purchased and ICP filing is approved (typically 1-4 weeks).

### 3.1 Prerequisites (Phase B)

Before starting Phase B, ensure the following are complete:

- Domain purchased and registered on Tencent Cloud
- ICP filing approved (typically 1-4 weeks after submission)
- Port 443 added to Lighthouse firewall:
  - Tencent Cloud Console > Lighthouse > Instance > Firewall > Add Rule
  - Protocol: TCP, Port: 443, Source: All, Action: Allow
- DNS A record pointing to server IP:
  - Tencent Cloud Console > DNS > Add Record > Type A > Value: `<server-ip>`
- Wait for DNS propagation (usually 5-30 minutes, up to 48 hours)

### 3.2 Replace Domain Placeholder

On the server, replace all `<DOMAIN>` placeholders in the nginx config:

```bash
cd /opt/borealis-fabrics

# Replace placeholder with your actual domain
sed -i 's/<DOMAIN>/your-actual-domain.com/g' nginx/conf.d/default.conf

# Verify the replacement
grep your-actual-domain.com nginx/conf.d/default.conf
# Should show multiple matches (server_name, ssl_certificate paths, redirect target)
```

### 3.3 Install Certbot and Obtain SSL Certificate

Using certbot with webroot plugin for zero-downtime certificate acquisition.

**Step 1: Install certbot on the host** (not in container):

```bash
apt-get update && apt-get install -y certbot
```

**Step 2: Create a temporary self-signed certificate** so Nginx can start with the HTTPS server block:

```bash
DOMAIN="your-actual-domain.com"

mkdir -p /etc/letsencrypt/live/$DOMAIN
openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
  -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
  -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
  -subj '/CN=localhost'
```

**Step 3: Start Nginx with the temporary certificate:**

```bash
cd /opt/borealis-fabrics
docker compose -f docker-compose.prod.yml up -d nginx
```

**Step 4: Find the certbot webroot volume path:**

```bash
WEBROOT=$(docker volume inspect borealis-fabrics_certbot-webroot --format '{{.Mountpoint}}')
echo "Certbot webroot: $WEBROOT"
```

**Step 5: Obtain the real Let's Encrypt certificate:**

```bash
certbot certonly --webroot -w "$WEBROOT" -d $DOMAIN --agree-tos --email your-email@example.com
```

**Step 6: Reload Nginx to use the real certificate:**

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

**Step 7: Verify SSL:**

```bash
# Check HTTPS works
curl -sv https://$DOMAIN/health 2>&1 | grep "SSL certificate verify ok"

# Check HTTP redirects to HTTPS
curl -sv http://$DOMAIN/ 2>&1 | grep "301"
```

### 3.4 Set Up Certbot Auto-Renewal

```bash
# Find the volume path (reuse from above or re-inspect)
WEBROOT=$(docker volume inspect borealis-fabrics_certbot-webroot --format '{{.Mountpoint}}')

# Create cron job for daily renewal check at 3 AM
cat > /etc/cron.d/certbot-renew << 'CRON'
0 3 * * * root certbot renew --webroot -w WEBROOT_PLACEHOLDER --quiet --deploy-hook "cd /opt/borealis-fabrics && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload" >> /var/log/certbot-renew.log 2>&1
CRON

# Replace placeholder with actual volume path
sed -i "s|WEBROOT_PLACEHOLDER|$WEBROOT|" /etc/cron.d/certbot-renew

# Test renewal (dry run)
certbot renew --dry-run
```

### 3.5 Configure WeChat Work OAuth

**Step 1: Download Domain Verification File**

1. Log in to WeChat Work Admin Console: https://work.weixin.qq.com/wework_admin/loginpage_wx
2. Go to: **App Management (应用管理)** > Select your app
3. In the **Web Authorization (网页授权)** section, click **Set Trusted Domain (设置可信域名)**
4. Download the **verification file** (e.g., `WW_verify_xxxxxxxx.txt`)
5. Place it in the frontend dist directory on the server:

```bash
scp WW_verify_xxxxxxxx.txt root@<server-ip>:/opt/borealis-fabrics/frontend/dist/
```

6. Verify it is accessible:

```bash
curl https://<DOMAIN>/WW_verify_xxxxxxxx.txt
# Should return the file contents
```

**Step 2: Set Trusted Domain (设置可信域名)**

1. In the same WeChat Work admin page, enter your domain: `<DOMAIN>` (without `https://`)
2. Click **Confirm (确认)**
3. If verification fails: ensure the domain's ICP filing entity matches the WeChat Work enterprise entity

**Step 3: Configure OAuth Callback URL (OAuth2回调域名)**

1. In the app settings, find **OAuth2 Callback URL (OAuth2回调域名)**
2. Set it to: `<DOMAIN>` (just the domain, no protocol or path)
3. The full redirect URI is handled by the backend env var `WEWORK_REDIRECT_URI`

**Step 4: IP Whitelist (if required)**

1. In app settings, find **Enterprise Trusted IP (企业可信IP)**
2. Add your server's public IP: `119.29.82.146`

### 3.6 Update Environment Variables

```bash
# SSH into server
cd /opt/borealis-fabrics/backend

# Edit .env -- make these changes:

# 1. Update WeChat Work redirect URI
WEWORK_REDIRECT_URI="https://<DOMAIN>/api/v1/auth/wework/callback"

# 2. Update CORS origins
CORS_ORIGINS="https://<DOMAIN>"

# 3. Update base URL
BASE_URL="https://<DOMAIN>"

# 4. Enable HTTPS cookies
FORCE_HTTPS_COOKIES=true

# 5. Remove ALLOW_DEV_LOGIN line (code already removed in Plan 17-01)

# 6. Set real BOSS_WEWORK_IDS (replace dev-user with actual boss weworkId)
BOSS_WEWORK_IDS="<real-boss-wework-id>"
```

Update COS bucket CORS:
- Tencent Cloud Console > COS > Bucket > Security Management > CORS
- Change AllowOrigin from `*` to `https://<DOMAIN>`

### 3.7 Deploy Phase B

```bash
cd /opt/borealis-fabrics

# Pull latest code (includes dev login removal + nginx SSL config)
git pull origin main

# Rebuild frontend (dev login button removed)
cd frontend && pnpm install && pnpm build && cd ..

# Restart services
docker compose -f docker-compose.prod.yml up -d --build

# Verify
curl -sv https://<DOMAIN>/health
curl -sv http://<DOMAIN>/ 2>&1 | grep "301"
curl -sv http://119.29.82.146/ 2>&1 | grep "301"
```

### 3.8 Enable HSTS (After Verification)

> **Warning:** Only enable HSTS after confirming HTTPS works correctly. A misconfigured HSTS header can lock users out of the site.

1. After confirming HTTPS works for at least 1 day
2. SSH into server and edit `nginx/conf.d/default.conf`
3. Uncomment the Phase 1 HSTS line:

```nginx
add_header Strict-Transport-Security "max-age=86400" always;
```

4. Reload Nginx:

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

5. After 1 more day of successful operation, update to production value:

```nginx
add_header Strict-Transport-Security "max-age=63072000" always;
```

6. Reload Nginx again.

### 3.9 Verify Phase B

| Check | Command | Expected |
|-------|---------|----------|
| HTTPS works | `curl -sv https://<DOMAIN>/health` | 200 OK with valid cert |
| HTTP redirects | `curl -sv http://<DOMAIN>/` | 301 to https |
| IP redirects | `curl -sv http://119.29.82.146/` | 301 to https://<DOMAIN> |
| OAuth login | Open browser, click login | QR scan works, redirects back |
| Secure cookies | Check browser DevTools | auth cookie has Secure + HttpOnly |
| COS CORS | Upload a file | No CORS errors |

---

## 4. UAT Checklist

Perform this checklist on the production environment after deployment. All categories must be tested.

### Authentication

| # | Test Item | Pass? |
|---|-----------|-------|
| 1 | WeChat Work OAuth login (QR scan -> callback -> authenticated) | [ ] |
| 2 | Logout clears session (cookie removed) | [ ] |
| 3 | Session persists across page refresh | [ ] |
| 4 | Unauthorized access redirects to login | [ ] |

### Supplier Management

| # | Test Item | Pass? |
|---|-----------|-------|
| 5 | Create supplier with all fields | [ ] |
| 6 | Read supplier list with pagination | [ ] |
| 7 | Update supplier details | [ ] |
| 8 | Delete supplier (soft delete) | [ ] |
| 9 | Status change (active/inactive) | [ ] |
| 10 | Restore soft-deleted supplier | [ ] |
| 11 | Excel import (skip existing records) | [ ] |

### Customer Management

| # | Test Item | Pass? |
|---|-----------|-------|
| 12 | Create customer with all fields | [ ] |
| 13 | CRUD operations work correctly | [ ] |
| 14 | Special pricing management | [ ] |
| 15 | Address management (add/edit/delete JSON addresses) | [ ] |
| 16 | Soft delete + restore | [ ] |

### Fabric Management

| # | Test Item | Pass? |
|---|-----------|-------|
| 17 | Create fabric with specifications | [ ] |
| 18 | CRUD operations work correctly | [ ] |
| 19 | Image upload to COS + preview with signed URL | [ ] |
| 20 | Soft delete + restore | [ ] |
| 21 | Excel import | [ ] |

### Product Management

| # | Test Item | Pass? |
|---|-----------|-------|
| 22 | CRUD for each category (iron frame/motor/hardware/mattress) | [ ] |
| 23 | Category management | [ ] |
| 24 | Soft delete + restore | [ ] |

### Quote Management

| # | Test Item | Pass? |
|---|-----------|-------|
| 25 | Create quote with multiple items | [ ] |
| 26 | Partial conversion (select items to convert to order) | [ ] |
| 27 | Quote expiration (auto-expire after due date) | [ ] |
| 28 | Excel export | [ ] |

### Order Management

| # | Test Item | Pass? |
|---|-----------|-------|
| 29 | Full order lifecycle (all 9 states) | [ ] |
| 30 | Payment recording | [ ] |
| 31 | Status transitions (valid and invalid) | [ ] |

### Payment

| # | Test Item | Pass? |
|---|-----------|-------|
| 32 | Payment voucher upload to COS | [ ] |
| 33 | Payment record CRUD | [ ] |

### Logistics

| # | Test Item | Pass? |
|---|-----------|-------|
| 34 | Logistics record CRUD | [ ] |
| 35 | Tracking information management | [ ] |

### Import / Export

| # | Test Item | Pass? |
|---|-----------|-------|
| 36 | Bulk import: supplier | [ ] |
| 37 | Bulk import: customer | [ ] |
| 38 | Bulk import: fabric | [ ] |
| 39 | Import conflict handling (skip existing) | [ ] |
| 40 | Export all entity types to Excel | [ ] |

### Audit Log

| # | Test Item | Pass? |
|---|-----------|-------|
| 41 | View audit log entries | [ ] |
| 42 | Filter by operator/action/entity/date | [ ] |
| 43 | Detail view of audit entry | [ ] |

### Soft Delete

| # | Test Item | Pass? |
|---|-----------|-------|
| 44 | Toggle visibility (show/hide deleted records) | [ ] |
| 45 | Restore deleted records | [ ] |

### File Management

| # | Test Item | Pass? |
|---|-----------|-------|
| 46 | Upload images via COS | [ ] |
| 47 | Preview files with signed URLs | [ ] |

### Permissions

| # | Test Item | Pass? |
|---|-----------|-------|
| 48 | Boss user can see audit log | [ ] |
| 49 | Normal user cannot see audit log | [ ] |

### System

| # | Test Item | Pass? |
|---|-----------|-------|
| 50 | Enum management (add/edit/delete) | [ ] |
| 51 | Health check endpoint responds | [ ] |
| 52 | Ready endpoint reports DB + Redis status | [ ] |

---

## 5. Troubleshooting

### Container crashes on startup

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs nestjs
docker compose -f docker-compose.prod.yml logs --tail=50 nestjs

# Common causes:
# - Missing or invalid env vars in backend/.env
# - Database unreachable (check CCN setup)
# - Redis unreachable (check container status)
```

### CDB MySQL unreachable

```bash
# Verify CCN association
# Go to Tencent Cloud Console > CCN > check both Lighthouse and CDB VPC are associated

# Test from server
mysql -h <cdb-private-ip> -u root -p

# Check security group allows port 3306
```

### Cookie not set (401 after login)

- **Phase A:** Ensure `FORCE_HTTPS_COOKIES` is NOT set (or commented out) in `backend/.env`
- **Phase B:** Ensure `FORCE_HTTPS_COOKIES=true` is set AND you are accessing via HTTPS

### API returns 404

```bash
# Check Nginx proxy configuration
docker compose -f docker-compose.prod.yml exec nginx cat /etc/nginx/conf.d/default.conf

# Verify NestJS is running
docker compose -f docker-compose.prod.yml exec nestjs curl -s http://localhost:3000/health
```

### COS CORS errors

- Check COS bucket CORS configuration in Tencent Cloud Console
- Phase A: AllowOrigin should be `*` or `http://<server-ip>`
- Phase B: AllowOrigin should be `https://your-domain.com`

### Out of Memory (OOM)

```bash
# Check memory usage
docker stats --no-stream

# If OOM, stop monitoring stack first
docker compose -f docker-compose.monitoring.yml down

# Restart business stack
docker compose -f docker-compose.prod.yml restart
```

### Rollback

If a deployment breaks the system:

```bash
# Rollback to previous commit
./deploy/rollback.sh

# Or rollback to a specific commit
./deploy/rollback.sh <commit-sha>

# Return to latest after fixing
git checkout main
```

---

## 6. Maintenance

### View logs

```bash
# Business stack logs
docker compose -f docker-compose.prod.yml logs -f nestjs
docker compose -f docker-compose.prod.yml logs -f nginx

# Monitoring stack logs
docker compose -f docker-compose.monitoring.yml logs -f grafana
```

### Restart services

```bash
# Restart a single service
docker compose -f docker-compose.prod.yml restart nestjs

# Restart all services
docker compose -f docker-compose.prod.yml restart
```

### Update deployment

```bash
# Pull latest code and redeploy
git pull origin main
./deploy/deploy.sh

# Skip migration if no DB changes
./deploy/deploy.sh --skip-migrate
```

### Database backup

CDB provides automatic daily backup with 7-day retention. Access via:
- Tencent Cloud Console > CDB > Instance > Backup and Restore

For manual backup:

```bash
docker compose -f docker-compose.prod.yml exec nestjs npx prisma db execute --stdin <<< "SELECT 1"
# Use CDB Console for full backup/restore
```

### SSL certificate renewal

If using certbot with cron (Phase B), certificates auto-renew. To manually renew:

```bash
certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

---

## 7. Reference Files

| File | Purpose |
|------|---------|
| `backend/.env.production.example` | Template for all production env vars |
| `docker-compose.prod.yml` | Production compose (NestJS + Redis + Nginx) |
| `docker-compose.monitoring.yml` | Monitoring compose (Loki + Prometheus + Grafana) |
| `backend/Dockerfile` | Multi-stage Docker build for NestJS |
| `nginx/nginx.conf` | Main Nginx configuration |
| `nginx/conf.d/default.conf` | Nginx server block configuration |
| `deploy/deploy.sh` | Automated deployment script |
| `deploy/rollback.sh` | Rollback to previous deployment |

---

---

# 中文

# 铂润面料 -- 生产环境部署指南

本指南引导您将铂润面料系统部署到腾讯云。分为两个阶段：

- **阶段 A：** IP + HTTP 部署（不需要域名）
- **阶段 B：** 域名 + HTTPS + 企业微信 OAuth（ICP 备案完成后）

---

## 1. 前置条件

- 腾讯云账号，需要轻量应用服务器、CDB、COS 和 CCN 权限
- SSH 密钥已配置
- Git 仓库已在本地克隆
- 本地机器已安装 Node.js 22 + pnpm（用于构建前端）
- 服务器已安装 Docker Engine + Docker Compose v2 插件

### 内存预算（4GB 服务器）

| 服务 | 内存限制 | 备注 |
|------|---------|------|
| 操作系统 + Docker | ~600MB | Linux 内核 + Docker 守护进程 |
| NestJS | 768MB | Node.js 应用 + Prisma |
| Redis | 192MB | 128MB 数据 + 开销 |
| Nginx | 64MB | 静态文件 + 反向代理 |
| Loki | 256MB | 减少保留期（7 天） |
| Prometheus | 128MB | 减少采集间隔（30 秒） |
| Grafana | 192MB | 仪表盘 UI |
| 缓冲区 | ~800MB | 峰值安全裕量 |
| **总计** | **~4GB** | |

> **重要：** 监控栈（Loki + Prometheus + Grafana）应在业务栈（NestJS + Redis + Nginx）验证正常后再启动。如果出现 OOM，先停止监控栈：`docker compose -f docker-compose.monitoring.yml down`

---

## 2. 阶段 A：IP + HTTP 部署

### 2.1 创建轻量应用服务器

1. 进入 **腾讯云控制台 > 轻量应用服务器**
2. 创建新实例：
   - **镜像：** Ubuntu 22.04 LTS
   - **配置：** 2C4G（2 核 4GB 内存）
   - **带宽：** 4Mbps
   - **存储：** 60GB SSD（默认）
3. 记录 **公网 IP 地址**
4. 配置 **防火墙规则**（轻量应用服务器 > 实例 > 防火墙）：
   - 端口 22（SSH）-- 来源：您的 IP
   - 端口 80（HTTP）-- 来源：所有
   - 端口 3001（Grafana）-- 来源：您的 IP（可选，用于监控）

### 2.2 在服务器上安装 Docker

```bash
# SSH 登录服务器
ssh root@<server-ip>

# 安装 Docker Engine
curl -fsSL https://get.docker.com | sh

# 验证安装
docker --version
docker compose version

# 设置 Docker 开机启动
systemctl enable docker
```

### 2.3 创建 CDB MySQL 实例

1. 进入 **腾讯云控制台 > 云数据库 CDB**
2. 创建新实例：
   - **引擎：** MySQL 8.0
   - **类型：** 基础版（1C1G）
   - **存储：** 50GB SSD
   - **地域：** 与轻量应用服务器相同
3. 设置 root 密码
4. 创建数据库：
   - 通过 CDB 控制台 > 数据库管理 > 新建数据库
   - 数据库名：`borealis`
   - 字符集：`utf8mb4`

#### 关键：CCN 网络设置

> **踩坑警告：** 轻量应用服务器和 CDB 默认在不同的 VPC 中。即使在同一地域，它们也不会自动连通。您必须设置 CCN。

5. 进入 **腾讯云控制台 > 云联网（CCN）**
6. 创建新的 CCN 实例
7. 将 **轻量应用服务器实例** 关联到 CCN
8. 将 **CDB 的 VPC** 关联到 CCN
9. 配置 **CDB 安全组**：允许来自轻量应用服务器私有 IP 段的 3306 端口入站
10. 从轻量应用服务器验证连通性：

```bash
# SSH 登录轻量应用服务器
mysql -h <cdb-private-ip> -u root -p
# 应该能成功连接。输入 'exit' 退出。
```

### 2.4 创建 COS 存储桶

1. 进入 **腾讯云控制台 > 对象存储 COS**
2. 创建新存储桶：
   - **名称：** 选择一个名称（如 `borealis-files`）
   - **地域：** 与轻量应用服务器相同
   - **访问权限：** 私有读写
3. 配置 CORS（COS 控制台 > 存储桶 > 安全管理 > 跨域访问 CORS）：
   - AllowOrigin：`*`（阶段 A，阶段 B 限制为域名）
   - AllowMethod：`GET, PUT, POST, DELETE`
   - AllowHeader：`*`
   - MaxAgeSeconds：`3600`
4. 创建子账号并分配 COS 权限（腾讯云控制台 > 访问管理 CAM > 用户）：
   - 创建子用户
   - 关联策略：`QcloudCOSFullAccess`
   - 为子用户创建 API 密钥
5. 记录以下值：
   - `COS_SECRET_ID` -- 来自 CAM > API 密钥
   - `COS_SECRET_KEY` -- 来自 CAM > API 密钥
   - `COS_BUCKET` -- 存储桶名称带 APPID（如 `borealis-files-1234567890`）
   - `COS_REGION` -- 地域代码（如 `ap-shanghai`）

### 2.5 克隆并配置

```bash
# 在轻量应用服务器上
cd /opt
git clone git@github.com:r1ckyIn/borealis-fabrics.git
cd borealis-fabrics

# 创建生产环境配置文件
cp backend/.env.production.example backend/.env
chmod 600 backend/.env
```

编辑 `backend/.env`，填入真实值：

```bash
# 必须修改的值：
DATABASE_URL="mysql://root:<密码>@<cdb-private-ip>:3306/borealis"
REDIS_URL="redis://redis:6379"
JWT_SECRET="<运行: openssl rand -base64 48>"
JWT_EXPIRES_IN="7d"

# COS（来自步骤 2.4）
COS_SECRET_ID="<你的 cos-secret-id>"
COS_SECRET_KEY="<你的 cos-secret-key>"
COS_BUCKET="<存储桶名称-appid>"
COS_REGION="ap-shanghai"
STORAGE_MODE=cos

# CORS（阶段 A 使用服务器 IP）
CORS_ORIGINS="http://<server-ip>"

# 基础 URL
BASE_URL="http://<server-ip>"

# 企业微信（阶段 A 使用占位值 -- 不会被使用，因为使用开发登录）
WEWORK_CORP_ID="placeholder"
WEWORK_AGENT_ID="placeholder"
WEWORK_SECRET="placeholder"
WEWORK_REDIRECT_URI="http://placeholder/api/v1/auth/wework/callback"

# 阶段 A：启用开发登录（无域名、无 OAuth）
ALLOW_DEV_LOGIN=true

# 阶段 A：不要设置 FORCE_HTTPS_COOKIES（仅 HTTP）
# FORCE_HTTPS_COOKIES=true

# 监控
LOKI_HOST=http://loki:3100
SENTRY_DSN=""
SLOW_QUERY_THRESHOLD_MS=200

# Boss 角色（逗号分隔的企业微信用户 ID）
BOSS_WEWORK_IDS=""

# Grafana
GRAFANA_ADMIN_PASSWORD="<选择一个强密码>"
```

### 2.6 构建前端并部署

**方案 A：在服务器上构建**（需要服务器上安装 Node.js + pnpm）：

```bash
# 在服务器上安装 Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
corepack enable

# 构建前端
cd frontend
pnpm install --frozen-lockfile
pnpm build
cd ..
```

**方案 B：本地构建后复制**（推荐，适合 4GB 服务器）：

```bash
# 在本地机器上
cd frontend
pnpm install
pnpm build

# 复制 dist 到服务器
scp -r dist root@<server-ip>:/opt/borealis-fabrics/frontend/dist
```

### 2.7 部署

```bash
# 在服务器上，项目根目录
./deploy/deploy.sh
```

脚本将执行：
1. 从 git 拉取最新代码
2. 构建前端（如果不使用 `--skip-build`）
3. 为 NestJS 构建 Docker 镜像
4. 停止旧容器
5. 启动新容器（NestJS + Redis + Nginx）
6. 运行 Prisma 数据库迁移
7. 带重试的健康检查

如果前端已经构建好（方案 B），跳过构建步骤：

```bash
./deploy/deploy.sh --skip-build
```

### 2.8 启动监控（可选）

> 仅在业务栈验证正常后启动监控。

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

通过 `http://<server-ip>:3001` 访问 Grafana（admin / `<GRAFANA_ADMIN_PASSWORD>`）。

如果服务器内存不足，先停止监控：

```bash
docker compose -f docker-compose.monitoring.yml down
```

### 2.9 验证阶段 A

| 检查项 | 预期结果 |
|--------|---------|
| `curl http://<server-ip>/health` | `{"status":"ok","info":{"app":{"status":"up"}}}` |
| `curl http://<server-ip>/ready` | `{"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}` |
| 浏览器访问 `http://<server-ip>/` | 前端正常加载 |
| 企业微信 OAuth：访问 `https://<DOMAIN>`，点击登录 | 扫码登录，cookie 已设置（仅阶段 B） |

---

## 3. 阶段 B：域名 + HTTPS + OAuth

> 阶段 B 只能在域名购买和 ICP 备案通过后完成（通常需要 1-4 周）。

### 3.1 前置条件（阶段 B）

开始阶段 B 前，确保以下条件已满足：

- 域名已在腾讯云购买并注册
- ICP 备案已通过（提交后通常需要 1-4 周）
- 端口 443 已添加到轻量应用服务器防火墙：
  - 腾讯云控制台 > 轻量应用服务器 > 实例 > 防火墙 > 添加规则
  - 协议：TCP，端口：443，来源：所有，操作：允许
- DNS A 记录已指向服务器 IP：
  - 腾讯云控制台 > DNS 解析 > 添加记录 > 类型 A > 值：`<server-ip>`
- 等待 DNS 生效（通常 5-30 分钟，最长 48 小时）

### 3.2 替换域名占位符

在服务器上，将 nginx 配置中的所有 `<DOMAIN>` 占位符替换为实际域名：

```bash
cd /opt/borealis-fabrics

# 替换占位符为实际域名
sed -i 's/<DOMAIN>/your-actual-domain.com/g' nginx/conf.d/default.conf

# 验证替换结果
grep your-actual-domain.com nginx/conf.d/default.conf
# 应显示多个匹配项（server_name、ssl_certificate 路径、重定向目标）
```

### 3.3 安装 Certbot 并获取 SSL 证书

使用 certbot webroot 插件实现零停机证书获取。

**步骤 1：在宿主机上安装 certbot**（不是在容器内）：

```bash
apt-get update && apt-get install -y certbot
```

**步骤 2：创建临时自签名证书**，使 Nginx 的 HTTPS 服务器块能够启动：

```bash
DOMAIN="your-actual-domain.com"

mkdir -p /etc/letsencrypt/live/$DOMAIN
openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
  -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
  -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
  -subj '/CN=localhost'
```

**步骤 3：使用临时证书启动 Nginx：**

```bash
cd /opt/borealis-fabrics
docker compose -f docker-compose.prod.yml up -d nginx
```

**步骤 4：查找 certbot webroot 卷路径：**

```bash
WEBROOT=$(docker volume inspect borealis-fabrics_certbot-webroot --format '{{.Mountpoint}}')
echo "Certbot webroot: $WEBROOT"
```

**步骤 5：获取真正的 Let's Encrypt 证书：**

```bash
certbot certonly --webroot -w "$WEBROOT" -d $DOMAIN --agree-tos --email your-email@example.com
```

**步骤 6：重新加载 Nginx 以使用真实证书：**

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

**步骤 7：验证 SSL：**

```bash
# 检查 HTTPS 是否正常
curl -sv https://$DOMAIN/health 2>&1 | grep "SSL certificate verify ok"

# 检查 HTTP 是否重定向到 HTTPS
curl -sv http://$DOMAIN/ 2>&1 | grep "301"
```

### 3.4 设置 Certbot 自动续期

```bash
# 查找卷路径（复用上面的或重新查询）
WEBROOT=$(docker volume inspect borealis-fabrics_certbot-webroot --format '{{.Mountpoint}}')

# 创建每天凌晨 3 点检查续期的 cron 任务
cat > /etc/cron.d/certbot-renew << 'CRON'
0 3 * * * root certbot renew --webroot -w WEBROOT_PLACEHOLDER --quiet --deploy-hook "cd /opt/borealis-fabrics && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload" >> /var/log/certbot-renew.log 2>&1
CRON

# 用实际路径替换占位符
sed -i "s|WEBROOT_PLACEHOLDER|$WEBROOT|" /etc/cron.d/certbot-renew

# 测试续期（干运行）
certbot renew --dry-run
```

### 3.5 配置企业微信 OAuth

**步骤 1：下载域名验证文件**

1. 登录企业微信管理后台：https://work.weixin.qq.com/wework_admin/loginpage_wx
2. 进入：**应用管理** > 选择你的应用
3. 在 **网页授权** 部分，点击 **设置可信域名**
4. 下载 **验证文件**（如 `WW_verify_xxxxxxxx.txt`）
5. 将验证文件放到服务器的前端 dist 目录：

```bash
scp WW_verify_xxxxxxxx.txt root@<server-ip>:/opt/borealis-fabrics/frontend/dist/
```

6. 验证文件是否可访问：

```bash
curl https://<DOMAIN>/WW_verify_xxxxxxxx.txt
# 应返回文件内容
```

**步骤 2：设置可信域名**

1. 在同一企业微信管理页面，输入你的域名：`<DOMAIN>`（不带 `https://`）
2. 点击 **确认**
3. 如果验证失败：确保域名的 ICP 备案主体与企业微信认证主体一致

**步骤 3：配置 OAuth2 回调域名**

1. 在应用设置中，找到 **OAuth2回调域名**
2. 设置为：`<DOMAIN>`（只填域名，不带协议或路径）
3. 完整的重定向 URI 由后端环境变量 `WEWORK_REDIRECT_URI` 控制

**步骤 4：IP 白名单（如需要）**

1. 在应用设置中，找到 **企业可信IP**
2. 添加服务器公网 IP：`119.29.82.146`

### 3.6 更新环境变量

```bash
# SSH 登录服务器
cd /opt/borealis-fabrics/backend

# 编辑 .env -- 做以下更改：

# 1. 更新企业微信重定向 URI
WEWORK_REDIRECT_URI="https://<DOMAIN>/api/v1/auth/wework/callback"

# 2. 更新 CORS 来源
CORS_ORIGINS="https://<DOMAIN>"

# 3. 更新基础 URL
BASE_URL="https://<DOMAIN>"

# 4. 启用 HTTPS Cookies
FORCE_HTTPS_COOKIES=true

# 5. 删除 ALLOW_DEV_LOGIN 行（代码已在 Plan 17-01 中移除）

# 6. 设置真实的 BOSS_WEWORK_IDS（将 dev-user 替换为实际的 boss weworkId）
BOSS_WEWORK_IDS="<real-boss-wework-id>"
```

更新 COS 存储桶 CORS：
- 腾讯云控制台 > COS > 存储桶 > 安全管理 > 跨域访问 CORS
- 将 AllowOrigin 从 `*` 改为 `https://<DOMAIN>`

### 3.7 部署阶段 B

```bash
cd /opt/borealis-fabrics

# 拉取最新代码（包含开发登录移除 + nginx SSL 配置）
git pull origin main

# 重新构建前端（开发登录按钮已移除）
cd frontend && pnpm install && pnpm build && cd ..

# 重启服务
docker compose -f docker-compose.prod.yml up -d --build

# 验证
curl -sv https://<DOMAIN>/health
curl -sv http://<DOMAIN>/ 2>&1 | grep "301"
curl -sv http://119.29.82.146/ 2>&1 | grep "301"
```

### 3.8 启用 HSTS（验证后）

> **警告：** 只有在确认 HTTPS 正常工作后才启用 HSTS。错误配置的 HSTS 头可能导致用户无法访问网站。

1. 确认 HTTPS 正常工作至少 1 天后
2. SSH 登录服务器，编辑 `nginx/conf.d/default.conf`
3. 取消注释阶段 1 的 HSTS 行：

```nginx
add_header Strict-Transport-Security "max-age=86400" always;
```

4. 重新加载 Nginx：

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

5. 再运行 1 天正常后，更新为生产值：

```nginx
add_header Strict-Transport-Security "max-age=63072000" always;
```

6. 再次重新加载 Nginx。

### 3.9 验证阶段 B

| 检查项 | 命令 | 预期结果 |
|--------|------|---------|
| HTTPS 正常 | `curl -sv https://<DOMAIN>/health` | 200 OK，证书有效 |
| HTTP 重定向 | `curl -sv http://<DOMAIN>/` | 301 到 https |
| IP 重定向 | `curl -sv http://119.29.82.146/` | 301 到 https://<DOMAIN> |
| OAuth 登录 | 打开浏览器，点击登录 | 扫码成功，正常跳转 |
| 安全 Cookie | 检查浏览器开发者工具 | auth cookie 有 Secure + HttpOnly |
| COS CORS | 上传一个文件 | 无 CORS 错误 |

---

## 4. UAT 检查清单

部署后在生产环境上执行此检查清单。所有类别都必须测试。

### 认证

| # | 测试项 | 通过？ |
|---|--------|--------|
| 1 | 企业微信 OAuth 登录（扫码 -> 回调 -> 认证成功） | [ ] |
| 2 | 登出清除会话（cookie 已删除） | [ ] |
| 3 | 刷新页面后会话保持 | [ ] |
| 4 | 未授权访问重定向到登录页 | [ ] |

### 供应商管理

| # | 测试项 | 通过？ |
|---|--------|--------|
| 5 | 创建供应商（填写所有字段） | [ ] |
| 6 | 供应商列表（分页） | [ ] |
| 7 | 更新供应商信息 | [ ] |
| 8 | 删除供应商（软删除） | [ ] |
| 9 | 状态变更（启用/停用） | [ ] |
| 10 | 恢复已删除的供应商 | [ ] |
| 11 | Excel 导入（跳过已存在记录） | [ ] |

### 客户管理

| # | 测试项 | 通过？ |
|---|--------|--------|
| 12 | 创建客户（填写所有字段） | [ ] |
| 13 | CRUD 操作正常 | [ ] |
| 14 | 特殊定价管理 | [ ] |
| 15 | 地址管理（增删改 JSON 地址） | [ ] |
| 16 | 软删除 + 恢复 | [ ] |

### 面料管理

| # | 测试项 | 通过？ |
|---|--------|--------|
| 17 | 创建面料（含规格） | [ ] |
| 18 | CRUD 操作正常 | [ ] |
| 19 | 图片上传到 COS + 签名 URL 预览 | [ ] |
| 20 | 软删除 + 恢复 | [ ] |
| 21 | Excel 导入 | [ ] |

### 产品管理

| # | 测试项 | 通过？ |
|---|--------|--------|
| 22 | 各类别 CRUD（铁架/电机/五金/床垫） | [ ] |
| 23 | 分类管理 | [ ] |
| 24 | 软删除 + 恢复 | [ ] |

### 报价管理

| # | 测试项 | 通过？ |
|---|--------|--------|
| 25 | 创建多项报价 | [ ] |
| 26 | 部分转换（选择项目转为订单） | [ ] |
| 27 | 报价过期（到期后自动过期） | [ ] |
| 28 | Excel 导出 | [ ] |

### 订单管理

| # | 测试项 | 通过？ |
|---|--------|--------|
| 29 | 完整订单生命周期（9 种状态） | [ ] |
| 30 | 付款记录 | [ ] |
| 31 | 状态流转（合法和非法） | [ ] |

### 付款

| # | 测试项 | 通过？ |
|---|--------|--------|
| 32 | 付款凭证上传到 COS | [ ] |
| 33 | 付款记录 CRUD | [ ] |

### 物流

| # | 测试项 | 通过？ |
|---|--------|--------|
| 34 | 物流记录 CRUD | [ ] |
| 35 | 物流追踪信息管理 | [ ] |

### 导入 / 导出

| # | 测试项 | 通过？ |
|---|--------|--------|
| 36 | 批量导入：供应商 | [ ] |
| 37 | 批量导入：客户 | [ ] |
| 38 | 批量导入：面料 | [ ] |
| 39 | 导入冲突处理（跳过已存在） | [ ] |
| 40 | 导出所有实体类型为 Excel | [ ] |

### 审计日志

| # | 测试项 | 通过？ |
|---|--------|--------|
| 41 | 查看审计日志条目 | [ ] |
| 42 | 按操作者/操作/实体/日期筛选 | [ ] |
| 43 | 审计详情查看 | [ ] |

### 软删除

| # | 测试项 | 通过？ |
|---|--------|--------|
| 44 | 切换可见性（显示/隐藏已删除记录） | [ ] |
| 45 | 恢复已删除记录 | [ ] |

### 文件管理

| # | 测试项 | 通过？ |
|---|--------|--------|
| 46 | 通过 COS 上传图片 | [ ] |
| 47 | 签名 URL 预览文件 | [ ] |

### 权限

| # | 测试项 | 通过？ |
|---|--------|--------|
| 48 | Boss 用户可以查看审计日志 | [ ] |
| 49 | 普通用户不能查看审计日志 | [ ] |

### 系统

| # | 测试项 | 通过？ |
|---|--------|--------|
| 50 | 枚举值管理（增删改） | [ ] |
| 51 | 健康检查端点响应正常 | [ ] |
| 52 | 就绪端点报告 DB + Redis 状态 | [ ] |

---

## 5. 故障排除

### 容器启动时崩溃

```bash
# 查看日志
docker compose -f docker-compose.prod.yml logs nestjs
docker compose -f docker-compose.prod.yml logs --tail=50 nestjs

# 常见原因：
# - backend/.env 中缺少或无效的环境变量
# - 数据库不可达（检查 CCN 设置）
# - Redis 不可达（检查容器状态）
```

### CDB MySQL 不可达

```bash
# 验证 CCN 关联
# 进入腾讯云控制台 > 云联网 > 检查轻量应用服务器和 CDB 的 VPC 是否都已关联

# 从服务器测试
mysql -h <cdb-private-ip> -u root -p

# 检查安全组是否允许 3306 端口
```

### Cookie 未设置（登录后 401）

- **阶段 A：** 确保 `backend/.env` 中没有设置 `FORCE_HTTPS_COOKIES`（或已注释掉）
- **阶段 B：** 确保已设置 `FORCE_HTTPS_COOKIES=true` 且通过 HTTPS 访问

### API 返回 404

```bash
# 检查 Nginx 代理配置
docker compose -f docker-compose.prod.yml exec nginx cat /etc/nginx/conf.d/default.conf

# 验证 NestJS 是否在运行
docker compose -f docker-compose.prod.yml exec nestjs curl -s http://localhost:3000/health
```

### COS CORS 错误

- 检查腾讯云控制台中 COS 存储桶的 CORS 配置
- 阶段 A：AllowOrigin 应为 `*` 或 `http://<server-ip>`
- 阶段 B：AllowOrigin 应为 `https://your-domain.com`

### 内存不足（OOM）

```bash
# 检查内存使用
docker stats --no-stream

# 如果 OOM，先停止监控栈
docker compose -f docker-compose.monitoring.yml down

# 重启业务栈
docker compose -f docker-compose.prod.yml restart
```

### 回滚

如果部署导致系统故障：

```bash
# 回滚到上一个 commit
./deploy/rollback.sh

# 或回滚到指定 commit
./deploy/rollback.sh <commit-sha>

# 修复后返回最新版本
git checkout main
```

---

## 6. 日常维护

### 查看日志

```bash
# 业务栈日志
docker compose -f docker-compose.prod.yml logs -f nestjs
docker compose -f docker-compose.prod.yml logs -f nginx

# 监控栈日志
docker compose -f docker-compose.monitoring.yml logs -f grafana
```

### 重启服务

```bash
# 重启单个服务
docker compose -f docker-compose.prod.yml restart nestjs

# 重启所有服务
docker compose -f docker-compose.prod.yml restart
```

### 更新部署

```bash
# 拉取最新代码并重新部署
git pull origin main
./deploy/deploy.sh

# 如果没有数据库变更，跳过迁移
./deploy/deploy.sh --skip-migrate
```

### 数据库备份

CDB 提供自动每日备份，保留 7 天。通过以下路径访问：
- 腾讯云控制台 > CDB > 实例 > 备份与恢复

### SSL 证书续期

如果使用 certbot + cron（阶段 B），证书会自动续期。手动续期：

```bash
certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

---

## 7. 参考文件

| 文件 | 用途 |
|------|------|
| `backend/.env.production.example` | 所有生产环境变量的模板 |
| `docker-compose.prod.yml` | 生产 compose（NestJS + Redis + Nginx） |
| `docker-compose.monitoring.yml` | 监控 compose（Loki + Prometheus + Grafana） |
| `backend/Dockerfile` | NestJS 多阶段 Docker 构建 |
| `nginx/nginx.conf` | Nginx 主配置 |
| `nginx/conf.d/default.conf` | Nginx 服务器块配置 |
| `deploy/deploy.sh` | 自动化部署脚本 |
| `deploy/rollback.sh` | 回滚到上一次部署 |

---

## License

MIT License
