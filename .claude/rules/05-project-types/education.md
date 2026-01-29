# 教育资源项目规范

用途：学习材料和参考资料

---

## 示例项目

- `usyd-cs-cheatsheets` - 考试学习材料

---

## 要求

### 必需内容

- 学术诚信声明
- 开放贡献指南
- 课程/主题组织
- 版本跟踪（学期/年份）

---

## 学术诚信声明模板

```markdown
## Academic Integrity

This repository contains study materials and reference notes. Please use responsibly:

### Usage Guidelines

✅ **Allowed Uses:**
- Personal study and review
- Understanding concepts
- Reference for problem-solving approaches
- Learning programming patterns

❌ **Not Allowed:**
- Direct copying for assignments
- Submitting as your own work
- Sharing during exams
- Violating course policies

### Disclaimer

These materials are provided for educational purposes only. The author(s) are not responsible for any misuse that violates academic integrity policies.

### Course Policies

Always follow your institution's academic integrity policies. When in doubt, ask your instructor.
```

---

## 贡献指南模板

```markdown
## Contributing

We welcome contributions to improve these study materials!

### How to Contribute

1. **Fix errors**: Spot a mistake? Open a PR!
2. **Add examples**: More examples help everyone
3. **Improve explanations**: Clearer is better
4. **Update for new semesters**: Keep content current

### Contribution Guidelines

- Maintain consistent formatting
- Use clear, concise language
- Include source references where applicable
- Respect copyright of original materials

### Review Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
5. Wait for review

### Attribution

Contributors will be acknowledged in the README.
```

---

## 目录结构模板

```
education-repo/
├── README.md
├── CONTRIBUTING.md
├── LICENSE
├── 2024-S1/                    # Semester/Year
│   ├── COMP2123/               # Course code
│   │   ├── README.md           # Course overview
│   │   ├── week01/             # Weekly materials
│   │   ├── week02/
│   │   ├── cheatsheet.md       # Quick reference
│   │   └── exam-prep/          # Exam materials
│   └── INFO1113/
│       └── ...
└── 2024-S2/
    └── ...
```

---

## README 模板

```markdown
# Course Name Cheatsheets

Study materials for [Course Code] at [University].

## Academic Integrity

[Include academic integrity statement]

## Contents

### 2024 Semester 1

| Course | Topics | Status |
|--------|--------|--------|
| COMP2123 | Data Structures | ✅ Complete |
| INFO1113 | OOP | 🔄 In Progress |

### Available Materials

- 📝 Lecture notes summaries
- 💡 Key concepts explained
- 🧮 Formula sheets
- 📚 Example problems

## How to Use

1. Navigate to your course folder
2. Find the topic you need
3. Use for study reference only

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## Disclaimer

These notes are student-created and may contain errors. Always verify with official course materials.

## License

[Choose appropriate license]
```

---

## 版本跟踪

### 命名约定

```
YYYY-SX/  # Year and Semester (e.g., 2024-S1)
```

### 更新日志

```markdown
## Changelog

### 2024-S1
- Added COMP2123 materials
- Updated INFO1113 week 1-5

### 2023-S2
- Initial release
- Added COMP2022 materials
```
