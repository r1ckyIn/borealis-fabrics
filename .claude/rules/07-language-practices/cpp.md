---
paths:
  - "**/*.c"
  - "**/*.cpp"
  - "**/*.cc"
  - "**/*.cxx"
  - "**/*.h"
  - "**/*.hpp"
  - "**/*.hxx"
  - "**/CMakeLists.txt"
  - "**/Makefile"
---

# C/C++ 语言实践指南

本文件定义了 C/C++ 项目的最佳实践。

---

## 类型系统与类型安全

### Modern C++ (C++17/20)

```cpp
// 使用 auto 进行类型推断
auto result = calculate_value();

// 使用 constexpr 进行编译时计算
constexpr int BUFFER_SIZE = 1024;

// 使用 std::optional 处理可能不存在的值
std::optional<User> find_user(const std::string& id);

// 使用 std::variant 替代 union
std::variant<int, std::string, double> value;

// 使用智能指针管理内存
std::unique_ptr<Resource> resource = std::make_unique<Resource>();
std::shared_ptr<Cache> cache = std::make_shared<Cache>();
```

### 避免原始指针

```cpp
// ❌ 不要
int* create_array(size_t size) {
    return new int[size];  // 谁负责释放？
}

// ✅ 使用智能指针
std::unique_ptr<int[]> create_array(size_t size) {
    return std::make_unique<int[]>(size);
}

// ✅ 或者使用容器
std::vector<int> create_array(size_t size) {
    return std::vector<int>(size);
}
```

### RAII 模式

```cpp
class FileHandle {
public:
    explicit FileHandle(const std::string& path)
        : handle_(fopen(path.c_str(), "r")) {
        if (!handle_) {
            throw std::runtime_error("Failed to open file");
        }
    }

    ~FileHandle() {
        if (handle_) {
            fclose(handle_);
        }
    }

    // 禁止拷贝
    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;

    // 允许移动
    FileHandle(FileHandle&& other) noexcept
        : handle_(std::exchange(other.handle_, nullptr)) {}

private:
    FILE* handle_;
};
```

---

## 代码注释

### Doxygen 风格

```cpp
/**
 * @brief Creates a new user with the given details.
 *
 * @param email The user's email address
 * @param name The user's full name
 * @return The created User object
 * @throws ValidationException if email format is invalid
 * @throws DuplicateException if email already exists
 *
 * @example
 * @code
 * User user = create_user("test@example.com", "Test User");
 * @endcode
 */
User create_user(const std::string& email, const std::string& name);
```

### 文件头注释

```cpp
/**
 * @file user_service.cpp
 * @brief User management service implementation
 * @author Ricky
 * @date 2025-01-01
 *
 * This file contains the implementation of user CRUD operations.
 */
```

### 行内注释

```cpp
// Check if user already exists before creating
auto existing_user = repo.find_by_email(email);
if (existing_user) {
    throw DuplicateException("User with email already exists");
}
```

---

## 架构

### 项目结构

```text
project/
├── include/              # 公共头文件
│   └── project/
│       ├── user.hpp
│       └── service.hpp
├── src/                  # 源文件
│   ├── user.cpp
│   └── service.cpp
├── tests/                # 测试文件
│   ├── user_test.cpp
│   └── service_test.cpp
├── third_party/          # 第三方依赖
├── CMakeLists.txt
└── README.md
```

### CMake 配置

```cmake
cmake_minimum_required(VERSION 3.16)
project(MyProject VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 启用警告
add_compile_options(-Wall -Wextra -Wpedantic -Werror)

# 添加库
add_library(mylib
    src/user.cpp
    src/service.cpp
)

target_include_directories(mylib PUBLIC include)

# 添加测试
enable_testing()
add_executable(tests tests/user_test.cpp)
target_link_libraries(tests mylib GTest::gtest_main)
```

---

## OOP 实践

### 接口与实现分离

```cpp
// user_repository.hpp - 接口
class UserRepository {
public:
    virtual ~UserRepository() = default;
    virtual std::optional<User> find_by_id(const std::string& id) = 0;
    virtual void save(const User& user) = 0;
};

// sql_user_repository.hpp - 实现
class SqlUserRepository : public UserRepository {
public:
    explicit SqlUserRepository(Database& db);
    std::optional<User> find_by_id(const std::string& id) override;
    void save(const User& user) override;

private:
    Database& db_;
};
```

### 依赖注入

```cpp
class UserService {
public:
    UserService(std::unique_ptr<UserRepository> repo,
                std::shared_ptr<Logger> logger)
        : repo_(std::move(repo))
        , logger_(std::move(logger)) {}

    User create_user(const CreateUserRequest& request) {
        logger_->info("Creating user: {}", request.email);
        User user(request.email, request.name);
        repo_->save(user);
        return user;
    }

private:
    std::unique_ptr<UserRepository> repo_;
    std::shared_ptr<Logger> logger_;
};
```

---

## clangd-lsp 集成

### 自动启用

`clangd-lsp` 在处理 C/C++ 文件时自动启用，提供：

- **实时错误检测**：编辑时即时发现编译错误和警告
- **智能补全**：基于语义的代码补全
- **跳转到定义**：快速导航到函数/类定义
- **查找引用**：找出所有使用某个符号的位置
- **悬停信息**：显示类型信息和文档
- **代码格式化**：集成 clang-format

### Claude 应主动使用的 LSP 功能

```text
修改代码前：
- 使用 goToDefinition 理解函数/类的实现
- 使用 hover 查看函数签名和参数类型

重构时：
- 使用 findReferences 评估影响范围
- 使用 documentSymbol 了解文件结构
- 使用 goToImplementation 查找虚函数实现

调试时：
- 使用 hover 检查变量类型
- 使用 incomingCalls 追踪函数调用链
- 使用 outgoingCalls 查看函数依赖
```

### 文件类型支持

| 扩展名 | 支持 |
|--------|------|
| `.c` | ✅ |
| `.cpp`, `.cc`, `.cxx` | ✅ |
| `.h` | ✅ |
| `.hpp`, `.hxx` | ✅ |

### compile_commands.json

clangd 需要 `compile_commands.json` 来理解项目结构：

```bash
# CMake 生成
cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON ..

# 或使用 Bear（对于 Makefile 项目）
bear -- make
```

### .clangd 配置

```yaml
# .clangd
CompileFlags:
  Add: [-Wall, -Wextra, -std=c++17]
  Remove: [-W*]

Diagnostics:
  ClangTidy:
    Add: [modernize-*, readability-*]
    Remove: [modernize-use-trailing-return-type]

Index:
  Background: Build
```

---

## 验证命令

```bash
# CMake 构建
mkdir -p build && cd build
cmake ..
make

# 运行测试
ctest --output-on-failure

# 静态分析
clang-tidy src/*.cpp -- -std=c++17

# 格式检查
clang-format --dry-run -Werror src/*.cpp include/*.hpp

# All-in-one
cmake --build build && ctest --test-dir build && clang-tidy src/*.cpp
```

---

## 快速检查清单

- [ ] 使用 Modern C++ (C++17/20) 特性
- [ ] 使用智能指针管理内存
- [ ] 遵循 RAII 模式
- [ ] Doxygen 注释完整
- [ ] 代码通过 clang-tidy
- [ ] 代码格式符合 clang-format
- [ ] clangd-lsp 自动启用并正常工作
- [ ] compile_commands.json 已生成
