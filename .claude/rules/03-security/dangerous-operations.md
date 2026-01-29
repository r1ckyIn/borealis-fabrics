# 危险操作禁令

本文件定义了未经明确确认禁止执行的操作。

---

## 禁止操作清单

**未经明确确认禁止执行：**

| 操作类型 | 具体操作 | 风险等级 |
|---------|---------|---------|
| 文件操作 | 批量文件删除（`rm -rf`、批量删除） | 🔴 高 |
| 数据库操作 | `DROP` | 🔴 高 |
| 数据库操作 | 不带 WHERE 的 `DELETE` | 🔴 高 |
| 数据库操作 | `TRUNCATE` | 🔴 高 |
| Git 操作 | 强制推送到远程仓库（`git push --force`） | 🔴 高 |
| 环境操作 | 生产环境修改 | 🔴 高 |
| 安全操作 | 代码中的凭据或密钥暴露 | 🔴 高 |
| 系统操作 | 不可逆的系统更改 | 🔴 高 |

---

## Git 危险操作

### 绝对禁止

```bash
# 强制推送到 main（数据丢失风险）
git push --force origin main
git push -f origin main

# 重置远程分支
git reset --hard origin/main
git push --force

# 删除远程分支
git push origin --delete main
```

### 需要确认

```bash
# 强制推送到 feature 分支（需要用户确认）
git push --force origin feature/xxx

# 硬重置（会丢失本地更改）
git reset --hard HEAD~1

# 清理未跟踪文件
git clean -fd
```

---

## 数据库危险操作

### 绝对禁止（无 WHERE 子句）

```sql
-- 删除所有数据
DELETE FROM users;
DELETE FROM orders;

-- 清空表
TRUNCATE TABLE users;
TRUNCATE TABLE orders;

-- 删除表
DROP TABLE users;
DROP TABLE orders;

-- 删除数据库
DROP DATABASE production;
```

### 需要确认

```sql
-- 带 WHERE 的批量删除（需要确认数据量）
DELETE FROM users WHERE created_at < '2020-01-01';

-- 修改表结构
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users MODIFY COLUMN name VARCHAR(50);
```

---

## 文件系统危险操作

### 绝对禁止

```bash
# 递归删除（数据丢失风险）
rm -rf /
rm -rf ~
rm -rf /home
rm -rf /var
rm -rf ./*

# 批量删除（无确认）
find . -name "*.log" -delete
```

### 需要确认

```bash
# 删除特定目录（需要确认路径）
rm -rf ./node_modules
rm -rf ./dist
rm -rf ./build

# 批量移动/重命名
mv *.txt /archive/
```

---

## 生产环境操作

### 绝对禁止（未经批准）

```bash
# 部署到生产
./deploy.sh production
kubectl apply -f production/

# 修改生产数据库
mysql -h production-db -e "UPDATE users..."

# 修改生产配置
ssh production-server "vim /etc/nginx/nginx.conf"
```

### 需要确认

```bash
# 重启服务
systemctl restart nginx
pm2 restart all

# 查看生产日志
kubectl logs -f production-pod
```

---

## 安全操作

### 绝对禁止

```text
# 在代码中硬编码密钥
password = "my-secret-password"
api_key = "sk-1234567890"

# 提交敏感文件
git add .env
git add credentials.json
git add *.pem
```

### 需要确认

```text
# 修改权限
chmod 777 sensitive_file
chown root:root important_file

# 开放网络端口
ufw allow 22
iptables -A INPUT -p tcp --dport 3306 -j ACCEPT
```

---

## Claude 行为规则

### 检测到危险操作时

```text
1. 立即停止执行
2. 向用户说明风险
3. 请求明确确认
4. 只有在用户明确同意后才执行
```

### 确认格式

```text
⚠️ 检测到危险操作：[操作描述]

风险：[具体风险说明]

如果确认要执行，请输入 "确认执行"
```

---

## 可逆性检查

### 执行前必须确认

| 检查项 | 说明 |
|--------|------|
| 备份存在 | 关键数据有备份 |
| 可回滚 | 操作可以回滚 |
| 影响范围 | 明确影响范围 |
| 恢复计划 | 有恢复计划 |

### 不可逆操作清单

- 删除文件（无备份）
- DROP 数据库对象
- 强制推送覆盖提交历史
- 删除远程分支
- 清空表数据
