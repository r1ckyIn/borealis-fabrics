# Technology Stack

**Analysis Date:** 2026-03-17

## Languages

**Primary:**
- TypeScript 5.7.3 (strict mode) - Used in both backend and frontend
- Node.js - Runtime environment for backend

**Secondary:**
- JavaScript - Utility scripts and configuration files

## Runtime

**Environment:**
- Node.js (no specific version pinned in package.json, uses system version)

**Package Manager:**
- pnpm - Primary package manager for both backend and frontend
- Lockfile: `pnpm-lock.yaml` (present in repository)

## Frameworks

**Backend:**
- NestJS 11.0.1 - Full-stack framework for REST API
  - `@nestjs/common` - Core framework
  - `@nestjs/core` - Core module management
  - `@nestjs/platform-express` - Express adapter
  - `@nestjs/config` - Configuration management
  - `@nestjs/swagger` - API documentation (dev only)
  - `@nestjs/terminus` - Health check module
  - `@nestjs/schedule` - Scheduled task module
  - `@nestjs/throttler` - Rate limiting
  - `@nestjs/jwt` - JWT token handling
  - `@nestjs/passport` - Authentication strategies
  - `@nestjs/cache-manager` - Caching layer
  - `@nestjs/cli` - Development CLI tools
  - `@nestjs/testing` - Testing utilities

**Frontend:**
- React 18.3.1 - UI framework
- React Router 7.13.0 - Client-side routing
- Vite 7.2.4 - Build tool and dev server
  - `@vitejs/plugin-react` - React support

**Testing (Backend):**
- Jest 30.0.0 - Test runner and framework
- Supertest 7.0.0 - HTTP assertion library for E2E tests
- `@nestjs/testing` - NestJS-specific testing module
- `ts-jest` - TypeScript support in Jest

**Testing (Frontend):**
- Vitest 4.0.18 - Vite-native test runner
- `@testing-library/react` - React component testing
- `@testing-library/user-event` - User interaction simulation
- `@testing-library/jest-dom` - DOM matchers
- jsdom 27.4.0 - DOM environment simulation

**Build/Dev:**
- ts-node 10.9.2 - TypeScript execution in Node.js
- ts-loader 9.5.2 - Webpack loader for TypeScript
- Prettier 3.4.2 - Code formatter (backend), 3.8.1 (frontend)
- ESLint 9.18.0 - Linter (backend), 9.39.1 (frontend)
- `typescript-eslint` - TypeScript ESLint support

## Key Dependencies

**Backend - Critical:**
- `@prisma/client` 6.19.2 - ORM for database operations
- `prisma` 6.19.2 - CLI and schema management
- `ioredis` 5.9.2 - Redis client for caching and sessions
- `helmet` 8.1.0 - Security headers middleware
- `cookie-parser` 1.4.7 - HTTP cookie parsing
- `class-validator` 0.14.3 - DTO validation
- `class-transformer` 0.5.1 - Object transformation (DTO serialization)
- `passport` 0.7.0 - Authentication middleware
- `passport-jwt` 4.0.1 - JWT strategy for Passport
- `passport-oauth2` 1.8.0 - OAuth2 base strategy (for WeChat Work)

**Backend - Infrastructure:**
- `nestjs-pino` 4.5.0 - Structured logging with pino
- `pino-http` 11.0.0 - HTTP logger
- `pino-pretty` 13.1.3 - Pretty-printed logs (dev only)
- `cache-manager` 7.2.8 - Caching abstraction
- `dotenv` 17.2.3 - Environment variable loading
- `exceljs` 4.4.0 - Excel file parsing for imports
- `multer` 2.0.2 - File upload middleware
- `reflect-metadata` 0.2.2 - Metadata reflection for decorators
- `rxjs` 7.8.1 - Reactive programming library

**Frontend - UI:**
- `antd` 6.2.2 - Ant Design component library
- `@ant-design/icons` 6.1.0 - Ant Design icon set
- `dayjs` 1.11.19 - Lightweight date library

**Frontend - Data & State:**
- `@tanstack/react-query` 5.90.20 - Server state management
- `zustand` 5.0.10 - Lightweight client state management
- `axios` 1.13.4 - HTTP client

## Configuration

**Environment:**

Backend environment variables (see `backend/.env.example`):
- `NODE_ENV` - Application environment (development/production)
- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - MySQL connection string
- `REDIS_URL` - Redis connection URL
- `JWT_SECRET` - JWT signing secret (minimum 32 chars in production)
- `JWT_EXPIRES_IN` - JWT token expiration time (default: 7d)
- `WEWORK_CORP_ID` - WeChat Work enterprise ID
- `WEWORK_AGENT_ID` - WeChat Work agent ID
- `WEWORK_SECRET` - WeChat Work agent secret
- `WEWORK_REDIRECT_URI` - OAuth callback URL
- `COS_SECRET_ID` - Tencent Cloud COS secret ID
- `COS_SECRET_KEY` - Tencent Cloud COS secret key
- `COS_BUCKET` - COS bucket name with appid
- `COS_REGION` - COS region (default: ap-shanghai)
- `CORS_ORIGINS` - Comma-separated frontend origins
- `UPLOAD_DIR` - File upload directory (MVP uses local storage)
- `BASE_URL` - Backend base URL for file serving

Frontend environment variables (see `frontend/.env.example`):
- `VITE_API_BASE_URL` - Backend API base URL (e.g., http://localhost:3000/api/v1)

**Build:**

Backend:
- TypeScript configuration: `backend/tsconfig.json`
  - Target: ES2023
  - Module: nodenext
  - Strict mode enabled
  - Source maps enabled
  - Output directory: `dist/`

Frontend:
- TypeScript configuration: `frontend/tsconfig.app.json` (via `tsconfig.json` references)
- Vite configuration: `frontend/vite.config.ts`
  - Dev server port: 5173
  - Proxy: `/api/*` → http://localhost:3000
  - Build output: Optimized chunks with manual vendor splitting
  - Test environment: jsdom
  - Test timeout: 15000ms

## Platform Requirements

**Development:**
- Node.js runtime
- pnpm package manager
- Docker & Docker Compose (for MySQL 8.0 and Redis 7-alpine)
- MySQL 8.0 client tools (for development)
- Redis CLI (for development)

**Production:**
- Node.js runtime (latest LTS or better)
- Tencent Cloud CDB (MySQL 8.0)
- Tencent Cloud Redis
- Tencent Cloud COS (for file storage)
- HTTPS certificate (required for CSP headers)

**Deployment Target:**
- Tencent Cloud lightweight server (backend)
- Tencent Cloud CDB for MySQL
- Tencent Cloud Redis
- Frontend likely deployed to Tencent COS or CDN

---

*Stack analysis: 2026-03-17*
