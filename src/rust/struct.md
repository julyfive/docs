# Struct 结构体

结构体（struct）把一组相关的数据组合成一个自定义类型。Rust 没有类和继承，行为通过 `impl` 块和 trait 附加到结构体上，数据与行为是分开定义的。

- 结构体默认**按值**存在栈上（或内联在父结构中），字段直接内联存储（可能有对齐填充）
- 字段默认私有，模块外访问需要 `pub`
- 方法用 `impl` 定义，关联函数第一个参数不是 `self`
- 移动语义同样适用：非 `Copy` 字段被移走后，原实例不能整体使用
- `#[derive(...)]` 可以自动生成 `Debug`、`Clone`、`PartialEq` 等实现

```text
Rectangle { width: 30, height: 50 }

栈内存:
┌──────────┬──────────┐
│ width:30 │ height:50│
└──────────┴──────────┘
```

## 定义与实例化

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect = Rectangle {
        width: 30,
        height: 50,
    };
    println!("{rect:?}"); // Rectangle { width: 30, height: 50 }

    // 字段简写：变量名与字段名相同时可以省略
    let width = 10;
    let height = 20;
    let rect2 = Rectangle { width, height };
    println!("{} x {}", rect2.width, rect2.height);
}
```

- 所有字段都必须初始化，顺序无所谓
- `#[derive(Debug)]` 之后才能用 `{:?}` 打印，`{}` 需要手动实现 `Display`
- 字段默认私有，同一模块内可以直接访问；跨模块访问需要 `pub struct` + `pub` 字段

## 三种结构体形式

```rust
#[derive(Debug)]
struct Point {
    x: f64,
    y: f64,
} // 具名结构体：字段有名字

#[derive(Debug)]
struct Color(u8, u8, u8); // 元组结构体：字段按位置访问

struct Marker; // 单元结构体：不携带数据

fn main() {
    let p = Point { x: 1.0, y: 2.0 };
    println!("{} {}", p.x, p.y);

    let red = Color(255, 0, 0);
    println!("{} {} {}", red.0, red.1, red.2);

    let _m = Marker; // 大小为 0 的 ZST
}
```

- 具名结构体可读性最好，字段含义一目了然
- 元组结构体适合「轻量包装」：`struct Meters(f64)` 用类型区分单位，避免把米和秒搞混
- 单元结构体不占内存，常用来实现标记 trait 或作为泛型参数
- 元组结构体也能用 `impl` 添加方法，字段通过 `.0`、`.1` 访问

## 方法与关联函数

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    // 关联函数：没有 self，通过 :: 调用
    fn square(size: u32) -> Self {
        Self {
            width: size,
            height: size,
        }
    }

    // &self：只读借用，不获取所有权
    fn area(&self) -> u32 {
        self.width * self.height
    }

    // &mut self：可变借用，可以修改字段
    fn scale(&mut self, factor: u32) {
        self.width *= factor;
        self.height *= factor;
    }

    // self：消费实例，调用后原实例不能再使用
    fn into_tuple(self) -> (u32, u32) {
        (self.width, self.height)
    }

    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}

fn main() {
    let mut rect = Rectangle::square(10);
    println!("{}", rect.area()); // 100
    println!("{}", rect.can_hold(&Rectangle::square(5))); // true

    rect.scale(2);
    println!("{}", rect.area()); // 400

    println!("{:?}", rect.into_tuple()); // (20, 20)
    // println!("{}", rect.area()); // ❌ rect 已被 into_tuple 消费
}
```

- `Self` 是 `impl` 目标类型的简写
- 方法第一个参数必须是 `self`、`&self`、`&mut self` 之一，否则就是关联函数
- 同一个类型可以有多个 `impl` 块，也受孤儿规则约束（trait 实现）
- 值传递的 `self` 方法适合做「消耗式转换」，例如拆解成其他类型

## 结构体更新语法

用 `..` 从另一个实例复制/移动剩余字段：

```rust
#[derive(Debug, Clone)]
struct Config {
    host: String,
    port: u16,
    debug: bool,
}

fn main() {
    let base = Config {
        host: String::from("localhost"),
        port: 8080,
        debug: false,
    };

    // 先 clone，base 之后仍可用
    let prod = Config {
        port: 443,
        ..base.clone()
    };

    // 不 clone：base.host 被移动到 dev 中
    let dev = Config {
        debug: true,
        ..base
    };

    println!("{prod:?}");
    println!("{dev:?}");
    // println!("{base:?}"); // ❌ base.host 已被移动
}
```

- `..base` 必须放在最后，表示「其余字段都从 base 取」
- `Copy` 字段是复制，非 `Copy` 字段是移动，移动后原实例处于部分移动状态
- 只想改一两个字段时，更新语法比逐个列出字段更简洁

## 派生 Trait

`#[derive(...)]` 让编译器自动生成常见 trait 的实现：

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let a = Point { x: 1, y: 2 };
    let b = a; // Copy：按位复制，a 仍然可用

    assert_eq!(a, b); // PartialEq + Eq
    assert_eq!(a.clone(), a); // Clone

    let origin = Point::default(); // Default：所有字段取默认值
    println!("{a:?} {b:?} {origin:?}");
}
```

| 派生 trait | 作用 | 前提 |
| ---------- | ---- | ---- |
| `Debug` | `{:?}` / `{:#?}` 调试输出 | 所有字段实现 `Debug` |
| `Clone` | `.clone()` 深拷贝 | 所有字段实现 `Clone` |
| `Copy` | 赋值/传参时按位复制 | 所有字段实现 `Copy`，且必须同时 `Clone` |
| `PartialEq` / `Eq` | `==`、`!=` 比较 | 所有字段实现对应 trait |
| `PartialOrd` / `Ord` | 大小比较、可排序 | 所有字段实现对应 trait |
| `Hash` | 可作为 `HashMap` / `HashSet` 的键 | 所有字段实现 `Hash` |
| `Default` | `Default::default()` 构造默认值 | 所有字段实现 `Default` |

- `Display`、`Drop`、`From` 等无法派生，必须手写
- `Copy` 与 `Drop` 互斥：实现了 `Drop` 的类型不能是 `Copy`

## 内存布局

- Rust 默认布局**不保证**字段顺序，编译器可以重排字段以减少填充
- 需要与 C 交互时用 `#[repr(C)]`，按声明顺序布局
- `#[repr(transparent)]` 用于单字段包装类型，保证与内部字段布局一致
- 对齐填充也会占用空间，`size_of` 不等于字段大小之和

```rust
use std::mem::size_of;

struct Marker;

#[repr(C)]
struct CExample {
    a: u8,
    b: u32,
}

fn main() {
    println!("{}", size_of::<CExample>()); // 8（u8 + 3 字节填充 + u32）
    println!("{}", size_of::<Marker>()); // 0
}
```

- 默认布局下字段顺序可能变化，不要依赖字段地址做 FFI
- 需要精确控制布局时，优先 `repr(C)`，而不是靠字段声明顺序猜测

## 常见错误

| 错误场景 | 说明 |
| -------- | ---- |
| 用 `{}` 打印结构体 | 只有 `Display` 才能用 `{}`，调试请 `{:?}` 并派生 `Debug` |
| 忘记 `mut` | 调用 `&mut self` 方法要求变量绑定为 `let mut` |
| 移动字段后整体使用 | 非 `Copy` 字段被移动后，原实例只能访问未移动的字段 |
| 结构体更新后继续用原值 | `..base` 会把剩余非 `Copy` 字段移走 |
| 为含 `String` 的结构体派生 `Copy` | 编译错误：`String` 不是 `Copy` |
| 直接实现 `Display` 却忘记导入 `fmt` | 需要 `use std::fmt;` |

```rust
#[derive(Debug)]
struct User {
    name: String,
    age: u8,
}

fn main() {
    let user = User {
        name: String::from("Tom"),
        age: 18,
    };

    let name = user.name; // name 被移出
    println!("{name} {}", user.age); // ✅ 仍可访问未移动的字段
    // println!("{user:?}"); // ❌ user.name 已被移动，不能整体使用
}
```

## 总结

- 结构体把相关字段组合成新类型，字段默认私有，行为通过 `impl` 添加
- 三种形式：具名结构体、元组结构体、单元结构体（ZST）
- `&self` 只读、`&mut self` 可改、`self` 消费实例；关联函数用 `::` 调用
- `..base` 更新语法会复制 `Copy` 字段、移动其余字段
- `#[derive]` 自动生成常用 trait；`Display`、`Drop`、`From` 需要手写
- 默认内存布局不保证字段顺序，FFI 用 `#[repr(C)]` / `#[repr(transparent)]`
