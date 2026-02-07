---
paths:
  - "**/backend/**"
  - "**/frontend/**"
---

# 项目安全配置

> 通用安全检查清单（硬编码密钥、SQL 注入、XSS、PR 前检查等）请参考父级 `mandatory-checklist.md`。
> 本文件仅定义**项目特定**的安全配置。

---

## 环境变量声明（必须通过环境变量管理）

DATABASE_URL, REDIS_URL, JWT_SECRET, COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, COS_REGION

---

## 业务逻辑审查清单

- [ ] 编号生成唯一性（Redis INCR + DB UNIQUE）
- [ ] Excel 导入冲突处理（跳过已存在，不覆盖）
- [ ] 客户地址 JSON 结构正确（AddressVO）
- [ ] 分页查询使用 cursor 或 offset+limit，不查全表
