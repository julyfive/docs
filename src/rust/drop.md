# Drop Trait

## 简介

- `Drop` trait 用于在值**离开作用域时**自动执行清理代码
- 是 RAII（资源获取即初始化）模式的核心：资源在创建时获取、在销毁时自动释放
- 编译器自动插入析构调用，无需手动管理内存或资源
- `Box<T>`、`Vec<T>`、`String`、`File` 等标准库类型都实现了 `Drop`

## 定义

```rust
pub trait Drop {
    fn drop(&mut self); // 接收 &mut self
}
```

## 手动实现

以自定义智能指针 `CustomSmartPointer` 为例：

```rust
struct CustomSmartPointer {
    data: String,
}

impl Drop for CustomSmartPointer {
    fn drop(&mut self) {
        println!("Dropping CustomSmartPointer with data `{}`!", self.data);
    }
}

fn main() {
    let c = CustomSmartPointer {
        data: String::from("my stuff"),
    };
    let d = CustomSmartPointer {
        data: String::from("other stuff"),
    };
    println!("CustomSmartPointers created.");
} // c、d 离开作用域时自动析构
```

输出：

```text
CustomSmartPointers created.
Dropping CustomSmartPointer with data `other stuff`!
Dropping CustomSmartPointer with data `my stuff`!
```

- `d` 比 `c` 后声明，先被析构，输出顺序为 `d` → `c`

## 调用时机

- 局部变量在所在作用域结束时触发
- 临时值在所在语句结束时触发
- 结构体的字段随结构体整体析构时触发

析构顺序：

- 同一作用域内的局部变量按声明顺序**逆序**析构（LIFO）
- 结构体、元组的字段按**声明顺序**依次析构

## 提前释放

- 不允许显式调用 `x.drop()`，编译错误：`error[E0040]: explicit destructor calls not allowed`
- 原因：值离开作用域时还会再自动调用一次 `drop`，显式调用会导致**双重释放**
- 用 `std::mem::drop`（已在 prelude 中）提前释放：

```rust
fn main() {
    let c = CustomSmartPointer {
        data: String::from("some data"),
    };
    println!("CustomSmartPointer created.");
    drop(c); // c 立即析构，之后不可再使用
    println!("CustomSmartPointer dropped before the end of main.");
}
```

输出：

```text
CustomSmartPointer created.
Dropping CustomSmartPointer with data `some data`!
CustomSmartPointer dropped before the end of main.
```

- `std::mem::drop` 接收所有权（移动语义），调用后原变量失效

## 与 Copy 互斥

- 实现了 `Drop` 的类型不能实现 `Copy`，否则编译错误 E0184

```rust
#[derive(Copy, Clone)] // error[E0184]: the trait `Copy` cannot be implemented for this type; the type has a destructor
struct Foo;

impl Drop for Foo {
    fn drop(&mut self) {}
}
```

- 原因：`Copy` 会隐式按位复制值，复制出的两个副本都会尝试释放同一份资源，导致**双重释放**

## 部分移动限制

- 类型**自身实现了 `Drop`** 时，禁止移出它的字段，编译错误 E0509

```rust
struct Guard;

impl Drop for Guard {
    fn drop(&mut self) {}
}

struct Pair {
    a: Guard,
    b: Guard,
}

fn main() {
    let p = Pair { a: Guard, b: Guard };
    let a = p.a; // error[E0509]: cannot move out of type `Pair`, which implements the Drop trait
}
```

- 类型自身未实现 `Drop`、仅字段类型实现了 `Drop` 时，可以部分移动，剩余字段在离开作用域时正常析构

```rust
struct Pair {
    name: String, // String 实现了 Drop
    value: String,
}

fn main() {
    let p = Pair {
        name: String::from("key"),
        value: String::from("value"),
    };
    let name = p.name; // 部分移动：p.name 的所有权被移出
    println!("{}", p.value); // 未移动的字段仍可使用
} // 仅剩余的 p.value 被自动 drop
```

## 跳过析构

- `std::mem::forget` 可以阻止 `drop` 被调用，是 safe 函数但会造成资源泄漏

```rust
fn main() {
    let s = String::from("hello");
    std::mem::forget(s); // s 的 drop 不会执行，堆内存泄漏
}
```

- 适用场景：所有权被移交给外部系统（如 FFI）管理时，避免重复释放
- `Rc`/`Arc` 循环引用导致引用计数无法归零，`drop` 同样不会触发，需用 `Weak` 打破循环

## 常见实现了 Drop 的类型

| 类型 | 释放的资源 |
| ---- | ---------- |
| `Box<T>` | 堆上存放的 `T` |
| `Vec<T>` | 堆上的元素缓冲 |
| `String` | 堆上的字符串数据 |
| `File` | 操作系统文件句柄 |
| `Rc<T>` / `Arc<T>` | 引用计数减一，归零时释放内部数据 |
| `MutexGuard<T>` | 解锁互斥锁 |

## 注意事项

- `drop` 中应避免 panic：若在栈展开（unwinding）期间发生二次 panic，进程会直接 abort
- `std::process::exit` 会直接终止进程，不会触发任何 `drop`
- 内存泄漏（如 `mem::forget`）在 Rust 中是 safe 的，但会持续占用资源，应避免使用
- `Drop` 与 `Deref` 相互独立，实现了 `Deref` 不代表会自动释放资源
