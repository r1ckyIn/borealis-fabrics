# 模板项目规范

用途：标准化项目启动器

---

## 示例项目

- `project-template` - 新仓库的样板

---

## 要求

### 必需文件

- 包含说明的 TEMPLATE_USAGE.md
- 用于自定义的占位符标记
- 包含所有标准文件

---

## 目录结构

```
project-template/
├── README.md                   # 模板 README
├── TEMPLATE_USAGE.md           # 如何使用此模板
├── LICENSE                     # MIT License
├── .gitignore                  # 通用 .gitignore
├── .github/
│   ├── workflows/              # CI/CD 模板
│   └── ISSUE_TEMPLATE/         # Issue 模板
├── docs/
│   └── REQUIREMENTS.md         # 需求文档模板
└── src/                        # 源代码目录
```

---

## TEMPLATE_USAGE.md 模板

```markdown
# Template Usage Guide

## Getting Started

### 1. Create New Repository

```bash
# Clone template
git clone git@github.com:r1ckyIn/project-template.git my-new-project
cd my-new-project

# Remove template git history
rm -rf .git
git init

# Set up new remote
git remote add origin git@github.com:r1ckyIn/my-new-project.git
```

### 2. Replace Placeholders

Find and replace these placeholders throughout the project:

| Placeholder | Replace With | Files |
|-------------|--------------|-------|
| `{{PROJECT_NAME}}` | Your project name | README.md, package.json |
| `{{DESCRIPTION}}` | Project description | README.md |
| `{{AUTHOR}}` | Your name | LICENSE, package.json |
| `{{YEAR}}` | Current year | LICENSE |

### 3. Customize Configuration

- [ ] Update `README.md` with project details
- [ ] Modify `.gitignore` for your language
- [ ] Configure CI/CD workflows
- [ ] Add project-specific dependencies

### 4. First Commit

```bash
git add .
git commit -m "feat: initialize project from template"
git push -u origin main
```

## Template Features

### Included

- ✅ Standard README format
- ✅ MIT License
- ✅ Basic .gitignore
- ✅ GitHub Actions template
- ✅ Issue templates

### Customization Points

- `src/` - Add your source code
- `tests/` - Add your tests
- `docs/` - Add documentation
- `.github/workflows/` - Modify CI/CD

## Need Help?

See the main template repository for updates and issues.
```

---

## 占位符标记

### 标准占位符

| 占位符 | 用途 |
|--------|------|
| `{{PROJECT_NAME}}` | 项目名称 |
| `{{DESCRIPTION}}` | 项目描述 |
| `{{AUTHOR}}` | 作者名称 |
| `{{YEAR}}` | 当前年份 |
| `{{LICENSE}}` | 许可证类型 |
| `{{REPO_URL}}` | 仓库 URL |

### 在文件中使用

```markdown
# {{PROJECT_NAME}}

{{DESCRIPTION}}

## Author

{{AUTHOR}} - {{YEAR}}

## License

{{LICENSE}}
```

---

## 模板 README 示例

```markdown
# {{PROJECT_NAME}}

<div align="center">

[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**{{DESCRIPTION}}**

[English](#english) | [中文](#中文)

</div>

---

## English

### Overview

[Add project overview]

### Features

- Feature 1
- Feature 2

### Quick Start

```bash
# Clone
git clone {{REPO_URL}}

# Install
cd {{PROJECT_NAME}}
npm install

# Run
npm start
```

---

## 中文

### 项目概述

[添加项目概述]

### 功能特点

- 功能 1
- 功能 2

### 快速开始

```bash
# 克隆
git clone {{REPO_URL}}

# 安装
cd {{PROJECT_NAME}}
npm install

# 运行
npm start
```

---

## License

MIT License - {{YEAR}} {{AUTHOR}}
```
