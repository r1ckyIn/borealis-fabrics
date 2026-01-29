---
paths:
  - "**/backend/**"
  - "**/frontend/**"
---

# 日志与监控规范

本文件定义了生产级项目的日志和监控标准。

---

## 日志格式

### 结构化日志（JSON）

使用 `structlog` (Python) 或类似工具生成 JSON 格式日志。

```json
{
  "timestamp": "2025-01-15T10:00:00.000Z",
  "level": "INFO",
  "logger": "app.services.user",
  "message": "User created",
  "user_id": "12345",
  "email": "user@example.com",
  "request_id": "abc-123"
}
```

---

## 日志级别使用规范

| 级别 | 用途 | 示例 |
|------|------|------|
| DEBUG | 开发调试信息 | 变量值、函数入参 |
| INFO | 正常业务流程记录 | 用户登录、订单创建 |
| WARNING | 异常但可恢复的情况 | 重试、降级 |
| ERROR | 需要关注的错误 | 请求失败、数据库错误 |
| CRITICAL | 系统级故障 | 服务不可用、数据损坏 |

---

## Python 日志配置

```python
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

# 使用
logger.info("user_created", user_id=user.id, email=user.email)
logger.error("payment_failed", order_id=order.id, error=str(e))
```

---

## 错误追踪（Sentry）

### 配置

```python
import sentry_sdk

sentry_sdk.init(
    dsn=settings.sentry_dsn,
    environment=settings.environment,
    traces_sample_rate=0.1,
)
```

### 使用

```python
try:
    process_payment(order)
except PaymentError as e:
    sentry_sdk.capture_exception(e)
    raise
```

---

## 健康检查端点

### /health（存活检查）

```python
@app.get("/health")
async def health():
    return {"status": "healthy"}
```

### /ready（就绪检查）

```python
@app.get("/ready")
async def ready():
    # 检查依赖服务
    db_ok = await check_database()
    redis_ok = await check_redis()

    if db_ok and redis_ok:
        return {"status": "ready"}
    else:
        raise HTTPException(503, "Service not ready")
```

---

## 监控指标

### 必须监控

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| API 响应时间 | P95 响应时间 | > 500ms |
| 错误率 | 5xx 错误比例 | > 1% |
| 数据库连接 | 活跃连接数 | > 80% |
| 内存使用 | 容器内存 | > 85% |
| CPU 使用 | 容器 CPU | > 80% |

---

## 告警配置

### 告警级别

| 级别 | 响应时间 | 通知方式 |
|------|---------|---------|
| P0 - Critical | 立即 | 电话 + 短信 |
| P1 - High | 15 分钟 | 短信 + Slack |
| P2 - Medium | 1 小时 | Slack |
| P3 - Low | 24 小时 | Email |

### 告警规则示例

```yaml
# 错误率告警
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High error rate detected"

# 响应时间告警
- alert: SlowResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Slow response time detected"
```

---

## 数据库备份策略

### 备份计划

| 类型 | 频率 | 保留时间 |
|------|------|---------|
| 全量备份 | 每日 | 30 天 |
| 增量备份 | 每小时 | 7 天 |
| WAL 归档 | 实时 | 7 天 |

### 恢复测试

- 每月进行一次恢复测试
- 验证备份数据完整性
- 记录恢复时间
