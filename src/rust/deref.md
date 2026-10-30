# Deref trait

## 简介

- `Deref` 用于重载**解引用运算符** `*`
- 智能指针实现了 `Deref` 后，可以像普通引用一样使用
- 配合**解引用强制转换**（Deref Coercion），引用类型之间可以自动转换

## 定义

```rust
pub trait Deref {
    type Target: ?Sized; // 解引用后的目标类型
    fn deref(&self) -> &Self::Target; // 返回引用，不转移所有权
}
```

## 手动实现

以自定义智能指针 `MyBox<T>` 为例：

```rust
use std::ops::Deref;

struct MyBox<T>(T);

impl<T> MyBox<T> {
    fn new(x: T) -> MyBox<T> {
        MyBox(x)
    }
}

impl<T> Deref for MyBox<T> {
    type Target = T;

    fn deref(&self) -> &T {
        &self.0
    }
}

fn main() {
    let x = 5;
    let y = MyBox::new(x);

    assert_eq!(5, x);
    assert_eq!(5, *y); // *y 实际被编译为 *(y.deref())
}
```

- 未实现 `Deref` 时，`*y` 会报错：`type MyBox<i32> cannot be dereferenced`
- `*y` 等价于 `*(y.deref())`：先调用 `deref` 得到 `&T`，再用 `*` 取出值

## Deref 强制转换

- 把实现了 `Deref` 的类型的引用，自动转换为 `Target` 的引用
- 在函数传参、方法调用等场景自动发生

```rust
fn hello(name: &str) {
    println!("Hello, {}!", name);
}

fn main() {
    let m = MyBox::new(String::from("Rust"));
    hello(&m); // &MyBox<String> -> &String -> &str
}
```

转换链（可多次传递）：

1. `&MyBox<String>` 经 `deref` 变为 `&String`
2. `&String` 经标准库的 `Deref<Target = str>` 变为 `&str`

### 转换规则

| 原类型 | 目标类型 | 条件 |
| ------ | -------- | ---- |
| `&T` | `&U` | `T: Deref<Target = U>` |
| `&mut T` | `&mut U` | `T: DerefMut<Target = U>` |
| `&mut T` | `&U` | `T: Deref<Target = U>` |

- 可变引用可以强转为不可变引用，反之不行
- 解引用强制转换在编译期完成，无运行时开销

## DerefMut 可变解引用

```rust
pub trait DerefMut: Deref {
    // 必须先实现 Deref
    fn deref_mut(&mut self) -> &mut Self::Target;
}
```

```rust
use std::ops::DerefMut;

impl<T> DerefMut for MyBox<T> {
    fn deref_mut(&mut self) -> &mut T {
        &mut self.0
    }
}

fn main() {
    let mut b = MyBox::new(String::from("hello"));
    b.push_str(" world"); // &mut MyBox<String> 自动解引用为 &mut String
    println!("{}", b);
}
```

## 常见实现了 Deref 的类型

| 类型 | Target |
| ---- | ------ |
| `Box<T>` | `T` |
| `Rc<T>` / `Arc<T>` | `T` |
| `String` | `str` |
| `Vec<T>` | `[T]` |
| `MutexGuard<T>` / `Ref<T>` | `T` |

## 注意事项

- `deref` 返回 `&Self::Target` 而不是 `Self::Target`：避免所有权的移出
- 实现 `Deref` 不代表自动实现 `Drop`，释放堆数据需要 `Drop` trait（如 `Box<T>` 两者都实现了）
- `Deref` 与 `DerefMut` 仅服务于解引用与自动转换，不要为了模拟继承而滥用
