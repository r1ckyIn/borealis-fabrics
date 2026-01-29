# 工具/实用项目规范

用途：日常使用的实用工具

---

## 示例项目

- `canvas-ed-mcp` - 用于 Canvas/Ed 集成的 MCP 服务器
- `healthcheck-cli` - HTTP 端点健康检查工具

---

## 要求

### 必需文件

- 全面的安装说明
- 凭据安全警告
- 故障排除部分
- 环境变量配置示例

### README 结构

```markdown
# Tool Name

## Overview
Brief description of what the tool does.

## Installation

### Prerequisites
- Required software/dependencies

### Steps
1. Clone the repository
2. Install dependencies
3. Configure environment

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEY` | Your API key | Yes |
| `DEBUG` | Enable debug mode | No |

### Configuration File

```yaml
# config.yaml example
server:
  port: 8080
  host: localhost
```

## Usage

### Basic Usage
```bash
tool-name --option value
```

### Examples
[Provide common usage examples]

## Security

### Credentials

⚠️ **Never commit credentials to version control**

- Store API keys in environment variables
- Use `.env` files (add to `.gitignore`)
- Use credential managers when possible

### Sensitive Data
- This tool may access sensitive data
- Ensure proper access controls
- Review data handling practices

## Troubleshooting

### Common Issues

#### Issue: Connection failed
**Cause**: Network or authentication problem
**Solution**: Check API key and network settings

#### Issue: Permission denied
**Cause**: Insufficient permissions
**Solution**: Verify access rights

## Contributing
[Link to CONTRIBUTING.md]

## License
MIT
```

---

## 安全警告模板

```markdown
## ⚠️ Security Notice

### API Keys and Credentials

This tool requires authentication credentials. Please follow these security practices:

1. **Never hardcode credentials** in source code
2. **Use environment variables** for sensitive data
3. **Add `.env` to `.gitignore`** before committing
4. **Rotate credentials** regularly
5. **Use least privilege** principle

### Example `.env` file

```bash
# .env (DO NOT COMMIT)
API_KEY=your-api-key-here
SECRET_TOKEN=your-secret-token
```

### Credential Storage

| Platform | Recommended Method |
|----------|-------------------|
| macOS | Keychain |
| Linux | Secret Service API |
| Windows | Credential Manager |
```

---

## 故障排除部分模板

```markdown
## Troubleshooting

### Diagnostic Commands

```bash
# Check version
tool-name --version

# Test connection
tool-name test-connection

# Enable debug mode
DEBUG=true tool-name run
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection timeout | Network issue | Check firewall settings |
| Authentication failed | Invalid credentials | Verify API key |
| Rate limited | Too many requests | Implement backoff |
| Invalid config | Malformed config file | Validate YAML/JSON |

### Getting Help

- Check [FAQ](./docs/FAQ.md)
- Search [existing issues](link)
- Create a [new issue](link)
```
