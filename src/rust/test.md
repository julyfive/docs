# 测试 Test

Rust 内置测试框架，无需引入额外依赖，通过 `#[test]` 标记测试函数，用 `cargo test` 运行。

- 测试代码只在 `cargo test` 时编译执行，不影响正式构建产物的体积
- 测试失败时会 panic，测试框架捕获 panic 并报告失败
- 测试分为单元测试（与代码同文件）与集成测试（`tests` 目录）

## 编写测试

```rust
pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*; // 引入父模块，才能调用被测试的函数

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
```

- `#[cfg(test)]`：只在 `cargo test` 时编译该模块，正式构建时被剔除
- `#[test]`：标记测试函数，一个函数就是一个测试用例

运行 `cargo test`：

```text
running 1 test
test tests::it_works ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

## 断言宏

| 宏                    | 说明                                                     |
|-----------------------|----------------------------------------------------------|
| `assert!(expr)`       | `expr` 为 false 时 panic                                 |
| `assert_eq!(a, b)`    | `a != b` 时 panic，要求类型实现 `PartialEq` 和 `Debug`   |
| `assert_ne!(a, b)`    | `a == b` 时 panic，要求类型实现 `PartialEq` 和 `Debug`   |

断言失败时可以附带自定义信息（支持格式化参数）：

```rust
fn main() {
    let s = "Hello World";
    assert!(
        s.contains("Qoder"),
        "s 中不包含 Qoder，实际值为 `{s}`" // 自定义失败信息
    );

    let a = 2;
    let b = 3;
    assert_eq!(a, b, "a 和 b 不相等"); // assert_eq! 也支持自定义信息
}
```

失败输出（来自自定义信息）：

```text
---- it_works stdout ----
thread 'tests::it_works' panicked at src/lib.rs:4:5:
s 中不包含 Qoder，实际值为 `Hello World`
```

## 测试 panic：should_panic

`#[should_panic]` 让测试在代码 panic 时通过，panic 反而是期望行为：

```rust
pub struct Guess {
    value: i32,
}

impl Guess {
    pub fn new(value: i32) -> Guess {
        if !(1..=100).contains(&value) {
            panic!("猜测值必须在 1 到 100 之间，实际为 {value}");
        }
        Guess { value }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[should_panic]
    fn greater_than_100() {
        Guess::new(200); // 只要 panic 就通过
    }
}
```

使用 `expected` 参数对 panic 消息做**子串匹配**，避免"因错误的 panic 而通过"：

```rust
#[test]
#[should_panic(expected = "必须在 1 到 100 之间")]
fn greater_than_100() {
    Guess::new(200);
}
```

注意：未通过 `expected` 检查的 panic（比如代码里其他 bug 引发的 panic）会让测试失败。

## 使用 Result 返回测试

测试函数可以返回 `Result<(), E>`，`Ok(())` 表示通过，`Err` 表示失败：

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn it_works() -> Result<(), String> {
        if 2 + 2 == 4 {
            Ok(())
        } else {
            Err(String::from("two plus two does not equal four"))
        }
    }
}
```

- 好处是可以在测试中使用 `?` 运算符
- 不能对返回 `Result` 的测试使用 `#[should_panic]`，二者不能混用

## 控制测试运行

### 并行与串行

`cargo test` 默认多线程并行运行测试，测试之间互相独立时速度最快；测试共享状态（如同一文件、环境变量）时用单线程串行：

```text
cargo test -- --test-threads=1
```

> `cargo test` 后的 `--` 用于把参数传给测试二进制程序

### 显示打印输出

默认情况下测试通过时会捕获 `println!` 的输出，只有失败才显示；`--nocapture` 可强制显示：

```text
cargo test -- --nocapture
```

### 按名称运行部分测试

```text
cargo test add               # 运行所有名称中包含 add 的测试
cargo test tests::it         # 运行 tests 模块下名称中包含 it 的测试
cargo test -- --exact test1  # 精确匹配名为 test1 的测试
```

### 忽略测试

耗时较长的测试可加 `#[ignore]` 标记跳过：

```rust
#[test]
#[ignore = "运行时间太长"]
fn expensive_test() {
    // ...
}
```

```text
cargo test -- --ignored          # 只运行被忽略的测试
cargo test -- --include-ignored  # 运行包括被忽略在内的所有测试
```

## 测试的组织

### 单元测试

- 与代码写在同一个文件中，通常放在 `#[cfg(test)] mod tests` 模块里
- 可以测试**私有函数**，因为子模块可以访问父模块的私有项
- 不需要标记 `#[cfg(test)]` 之外的额外配置

```rust
fn internal_adder(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn internal() {
        assert_eq!(4, internal_adder(2, 2)); // ✅ 可以测试私有函数
    }
}
```

### 集成测试

- 放在与 `src` 平级的 `tests` 目录下，每个文件都是一个独立 crate
- 只能调用库的**公共 API**，不需要 `#[cfg(test)]`
- 依赖库 crate 的二进制程序无法被集成测试直接测试，逻辑应拆到 `lib.rs`，`main.rs` 只保留入口

```text
tests/
└── integration_test.rs
```

```rust
// tests/integration_test.rs
use adder; // 引入被测的库 crate（crate 名即 Cargo.toml 中的包名）

#[test]
fn it_adds_two() {
    assert_eq!(4, adder::add_two(2));
}
```

多个集成测试文件共享辅助代码时，放入 `tests/common/mod.rs`：

```rust
// tests/common/mod.rs
pub fn setup() {
    // 测试准备代码
}
```

```rust
// tests/integration_test.rs
mod common;

#[test]
fn it_adds_two() {
    common::setup();
    assert_eq!(4, adder::add_two(2));
}
```

> `tests` 目录下每个 `.rs` 文件都会被当作独立测试 crate，而子目录中的文件不会；因此公共模块要写成 `tests/common/mod.rs` 而不是 `tests/common.rs`

### 文档测试

文档注释中的代码块会被 `cargo test` 编译并运行，这就是文档测试（Doc Test）：

````rust
/// 两数相加
///
/// # 示例
///
/// ```
/// let result = adder::add(2, 2);
/// assert_eq!(result, 4);
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
````

```text
cargo test --doc  # 只运行文档测试
```

## 常用命令

| 命令                              | 说明                         |
|-----------------------------------|------------------------------|
| `cargo test`                      | 运行所有测试                 |
| `cargo test -- --test-threads=1`  | 单线程串行运行               |
| `cargo test -- --nocapture`       | 显示测试中的打印输出         |
| `cargo test 名称`                 | 按名称过滤运行               |
| `cargo test -- --ignored`         | 只运行被忽略的测试           |
| `cargo test --doc`                | 只运行文档测试               |

## 总结

- `#[cfg(test)]` 标记测试模块，`#[test]` 标记测试函数，`cargo test` 运行
- `assert!` / `assert_eq!` / `assert_ne!` 三个断言宏，均可附带自定义失败信息
- `#[should_panic(expected = "...")]` 测试 panic，`expected` 为子串匹配
- 测试可返回 `Result<(), E>` 以使用 `?`，但不能与 `#[should_panic]` 混用
- 单元测试放模块内可测私有代码；集成测试放 `tests/` 只能测公共 API
- 文档注释中的代码块会被作为文档测试自动运行
