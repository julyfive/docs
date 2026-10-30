# Enum 枚举

枚举（enum）把一组互斥的变体定义成同一个类型。与只表示「其中一个值」的 C 枚举不同，Rust 的每个变体都可以携带不同类型、不同数量的数据，天然适合表达状态机、消息和可空值。

- 变体通过 `Type::Variant` 访问，所有变体共享同一个类型名
- 变体可以携带数据：元组变体 `Write(String)`、结构体变体 `Move { x, y }`
- `match` 会做**穷尽性检查**，漏掉变体直接编译失败
- `Option<T>`、`Result<T, E>` 都是标准库枚举，分别表示「可能没有值」和「可能失败」
- 值语义与结构体一致：非 `Copy` 的枚举移动后不能继续使用

```text
enum Message {
    Quit,                          // 单元变体
    Move { x: i32, y: i32 },       // 结构体变体
    Write(String),                 // 元组变体
    ChangeColor(i32, i32, i32),    // 元组变体
}
```

## 定义与使用

```rust
#[derive(Debug)]
enum Direction {
    North,
    South,
    East,
    West,
}

fn main() {
    let direction = Direction::North;
    println!("{direction:?}"); // North

    // 枚举也可以作为结构体字段、函数参数、集合元素
    let all = [Direction::North, Direction::South];
    println!("{}", all.len()); // 2
}
```

- 变体名在同一枚举内唯一，不同枚举可以有同名变体
- `#[derive(Debug)]` 后才能 `{:?}` 打印
- 枚举类型的大小足以容纳「最大的变体 + 判别值」

## 带数据的变体

```rust
#[derive(Debug)]
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}

impl Message {
    fn describe(&self) -> String {
        match self {
            Message::Quit => String::from("退出"),
            Message::Move { x, y } => format!("移动到 ({x}, {y})"),
            Message::Write(text) => format!("写入 {text}"),
            Message::ChangeColor(r, g, b) => format!("颜色 ({r}, {g}, {b})"),
        }
    }
}

fn main() {
    let msgs = [
        Message::Quit,
        Message::Move { x: 10, y: 20 },
        Message::Write(String::from("hello")),
        Message::ChangeColor(255, 0, 0),
    ];

    for msg in &msgs {
        println!("{}", msg.describe());
    }
}
```

- 不同变体可以携带不同类型的数据，但都属于同一个 `Message` 类型
- 因此可以把它们放进同一个数组、`Vec`，或用同一个函数处理
- `impl` 可以为枚举定义方法，`match self` 是处理各变体的标准方式
- 匹配引用时字段自动绑定为引用，例如 `text: &String`

## Option 与 Result

```rust
fn main() {
    let some_num = Some(5);
    let some_str = Some("hello");
    let absent: Option<i32> = None; // None 必须标注类型

    println!("{some_num:?} {some_str:?} {absent:?}");

    let ok: Result<i32, &str> = Ok(200);
    let err: Result<i32, &str> = Err("boom");
    println!("{ok:?} {err:?}");
}
```

- `Option<T>` = `Some(T)` | `None`，Rust 用它代替 `null`
- `Result<T, E>` = `Ok(T)` | `Err(E)`，用类型强制处理失败
- 单独写 `None` 时编译器无法推断 `T`，必须标注类型
- `?` 运算符可用在 `Result` / `Option` 上：失败时提前返回，成功时取出内部值

```rust
fn parse_port(text: &str) -> Result<u16, std::num::ParseIntError> {
    let port = text.parse::<u16>()?; // 失败时自动 return Err
    Ok(port)
}

fn main() {
    assert_eq!(parse_port("8080"), Ok(8080));
    assert!(parse_port("abc").is_err());
}
```

## match 穷尽匹配

`match` 是表达式，每个分支的返回值类型必须一致：

```rust
fn main() {
    let n = Some(3);

    let doubled = match n {
        Some(x) => x * 2,
        None => 0,
    };
    println!("{doubled}"); // 6

    // 守卫条件
    let n2 = Some(7);
    match n2 {
        Some(x) if x > 5 => println!("大于 5: {x}"),
        Some(x) => println!("小于等于 5: {x}"),
        None => println!("没有值"),
    }
}
```

- 分支必须覆盖所有可能，否则编译错误（`non-exhaustive patterns`）
- `_` 匹配任何值并忽略；也可用变量名捕获剩余值
- `if` 守卫（`Some(x) if x > 5`）在模式匹配后进一步筛选
- `@` 可以在绑定的同时做判断：`Some(y @ 1..=5) => ...`

```rust
fn main() {
    let n = 3;

    match n {
        x @ 1..=5 => println!("{x} 在 1 到 5 之间"),
        _ => println!("其他"),
    }
}
```

## if let 与 let else

只关心一个变体时，`if let` 比 `match` 更简洁：

```rust
fn main() {
    let config = Some(("localhost", 8080));

    if let Some((host, port)) = config {
        println!("{host}:{port}"); // localhost:8080
    } else {
        println!("没有配置");
    }

    // 链式的 if let
    let direction = Some("north");
    if let Some("north") = direction {
        println!("向北");
    } else if let Some("south") = direction {
        println!("向南");
    } else {
        println!("其他方向");
    }
}
```

`let ... else` 适合「模式不匹配就提前退出」：

```rust
fn get_port(config: Option<u16>) -> u16 {
    let Some(port) = config else {
        return 8080; // 不匹配时执行发散代码
    };

    port
}

fn main() {
    assert_eq!(get_port(Some(3000)), 3000);
    assert_eq!(get_port(None), 8080);
}
```

- `if let` 放弃穷尽检查，只处理关心的变体
- `let ... else` 的 `else` 块必须发散（`return`、`break`、`panic!` 等）
- `matches!(value, pattern)` 返回 `bool`，适合简单判断：

```rust
fn main() {
    assert!(matches!(Some(3), Some(_)));
    assert!(!matches!(Some(3), None));
    assert!(matches!(3, 1..=5));
}
```

## 用枚举实现状态机

枚举让「状态 + 该状态携带的数据」无法分离，编译器会检查每种状态是否都被处理：

```rust
#[derive(Debug)]
enum State {
    Idle,
    Running { pid: u32 },
    Stopped,
}

fn next(state: State) -> State {
    match state {
        State::Idle => State::Running { pid: 1001 },
        State::Running { .. } => State::Stopped,
        State::Stopped => State::Idle,
    }
}

fn main() {
    let mut state = State::Idle;

    for _ in 0..4 {
        println!("{state:?}");
        state = next(state); // 移动旧状态，返回新状态
    }
}
```

- `Running { .. }` 忽略不需要的字段
- 新增一个状态变体时，所有 `match` 都会编译报错，强制补全逻辑
- 比「`status` 字符串 + 一堆可选字段」的结构体更难写出非法状态

## 内存布局

- 枚举是带标签的联合体（tagged union）：判别值 + 最大变体的数据
- 默认布局不保证，跨 FFI 时用 `#[repr(C)]`、`#[repr(u8)]` 等显式指定
- 某些 `Option<T>` 利用内部指针的空值 niche，做到零额外开销：

```rust
use std::mem::size_of;

fn main() {
    println!("{}", size_of::<&u8>()); // 8
    println!("{}", size_of::<Option<&u8>>()); // 8，没有额外标签
}
```

- `Option<Box<T>>`、`Option<&T>` 的大小与内部指针相同
- `Option<i32>` 则需要额外的判别值，通常比 `i32` 大

## 常见错误

| 错误场景 | 说明 |
| -------- | ---- |
| `match` 漏掉变体 | 编译错误，补全分支或用 `_` 兜底 |
| 单独写 `None` | 类型无法推断，需标注 `Option<T>` |
| 分支返回类型不一致 | `match` 是表达式，所有分支必须是同一类型 |
| 匹配后继续使用原值 | 非 `Copy` 枚举在按值匹配时被移动 |
| 用 `==` 比较枚举 | 需要派生 `PartialEq` |
| 想用 `{}` 打印枚举 | 需要手写 `Display`，调试用 `{:?}` |

```rust
#[derive(Debug)]
enum Light {
    On,
    Off,
}

fn main() {
    let light = Light::On;

    match light {
        Light::On => println!("开"),
        Light::Off => println!("关"),
    } // light 在这里已被移动

    // println!("{light:?}"); // ❌ use of moved value
}
```

## 总结

- 枚举的所有变体属于同一类型，每个变体可以携带不同的数据
- `match` 是穷尽匹配的表达式，配合守卫、`@`、`_` 处理各种情况
- `if let` 处理单个变体，`let ... else` 处理「不匹配就提前退出」
- `Option` 表达可空，`Result` 表达可失败，`?` 简化错误传播
- 枚举适合状态机、消息协议等「互斥状态」建模
- 默认内存布局不保证，FFI 需要显式 `repr`；指针类 `Option` 有 niche 优化
