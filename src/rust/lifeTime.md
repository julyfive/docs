# 生命周期 Lifetime

生命周期（Lifetime）是 Rust 用于追踪**引用有效范围**的机制，核心目的是防止悬垂引用（dangling reference）——即引用指向了已经被释放的数据。

- 生命周期是**编译期**概念，运行时不存在，没有任何性能开销
- 生命周期标注**不会改变**引用的实际存活时间，只是向编译器描述多个引用之间的约束关系
- 编译器能自动推断的场合无需标注，只有跨函数边界（签名）无法推断时才需要手动标注

```rust
fn main() {
    let r;
    {
        let x = 5;
        r = &x; // ❌ 错误：`x` does not live long enough
    } // x 在这里被释放，r 将成为悬垂引用
    println!("{}", r);
}
```

## 借用检查器

借用检查器（Borrow Checker）是编译器的一部分，负责在编译期比较引用的作用域：

- 引用的存活时间不能超过被借用的数据
- 编译期直接拒绝悬垂引用，无需运行时检查开销

```rust
fn main() {
    let x = 5;
    let r = &x; // r 借用 x
    println!("{}", r); // ✅ x 的生命周期覆盖 r 的使用点
}
```

## 生命周期标注语法

标注写在 `&` 之后、类型之前：

```rust
&i32        // 一个引用
&'a i32     // 一个带有显式生命周期 'a 的引用
&'a mut i32 // 一个带有显式生命周期 'a 的可变引用
```

| 写法      | 含义                                   |
|-----------|----------------------------------------|
| `'a`/`'b` | 常规生命周期参数，通常用小写字母命名   |
| `'static` | 特殊生命周期，代表引用在整个程序运行期有效 |

关键理解：`'a` 不是"恰好等于某段时间"，而是"至少活到 `'a` 这段区域"。

## 函数中的生命周期标注

### 基本示例

当函数参数或返回值是引用时，可能需要标注生命周期。先看一个无法通过编译的例子：

```rust
// ❌ 编译错误 E0106：missing lifetime specifier
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() { x } else { y }
}
```

报错原因：编译器无法知道返回的引用指向 `x` 还是 `y`，也就无法为返回值确定生命周期。

```rust
// ✅ 标注生命周期后
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

解读：

- `<'a>` 是生命周期参数声明，位置与其他泛型参数一致
- `'a` 的实际长度由**调用时** `x`、`y` 中**较短**的那个决定
- 函数返回的引用保证在 `'a` 内有效
- 标注不影响实际存活时间，只提供约束关系

```rust
fn main() {
    let s1 = String::from("hello");
    let result;
    {
        let s2 = String::from("hi");
        result = longest(s1.as_str(), s2.as_str());
        println!("{}", result); // ✅ s2 还未释放
    }
    // println!("{}", result); // ❌ s2 已释放，'a 受 s2 限制已失效
}
```

### 多个生命周期参数

参数之间的关系不同时，使用不同的生命周期参数：

```rust
// 返回值只与 x 有关，与 y 无关
fn first<'a, 'b>(x: &'a str, y: &'b str) -> &'a str {
    x
}

fn main() {
    let s1 = String::from("hello");
    let result;
    {
        let s2 = String::from("hi");
        result = first(&s1, &s2);
    }
    println!("{}", result); // ✅ 只依赖 s1，s2 释放后仍可使用
}
```

返回值不是引用时，则不需要生命周期标注：

```rust
fn combine(x: &str, y: &str) -> String {
    format!("{}{}", x, y)
}
```

### 错误场景：返回局部变量的引用

返回的引用如果不与任何参数关联（非 `'static`），必然是悬垂引用：

```rust
// ❌ 编译错误 E0515：cannot return value referencing local variable
fn invalid(x: &str) -> &str {
    let s = String::from("hello");
    &s // s 在函数结束时被释放
}
```

## 结构体中的生命周期

结构体字段持有引用时，结构体必须声明生命周期，用于保证"结构体实例的存活时间不超过它引用的数据"：

```rust
struct Excerpt<'a> {
    part: &'a str,
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let e = Excerpt {
        part: &novel[..5], // "Call "
    };
    println!("{}", e.part); // ✅ novel 比 e 活得久
}
```

实例比引用的数据活得久时会报错：

```rust
fn main() {
    let e;
    {
        let novel = String::from("Call me Ishmael.");
        e = Excerpt { part: &novel[..5] };
    } // ❌ E0597：novel 被释放，e 不能比它活得久
    println!("{}", e.part);
}
```

枚举同理，也可以与泛型组合使用：

```rust
// 枚举持有引用
enum Either<'a> {
    Left(&'a str),
    Right(&'a str),
}

// 生命周期 + 泛型组合
struct Ref<'a, T> {
    r: &'a T,
}
```

## 方法中的生命周期（impl 块）

含引用的结构体，impl 块中也要声明生命周期（不可省略）：

```rust
struct Excerpt<'a> {
    part: &'a str,
}

impl<'a> Excerpt<'a> {
    // 省略规则 3：返回的引用默认与 &self 关联
    // 等价于 fn part<'b>(&'b self) -> &'b str
    fn part(&self) -> &str {
        self.part
    }
}
```

当返回的引用同时依赖 `self` 和参数时，需要显式标注：

```rust
impl<'a> Excerpt<'a> {
    // ❌ 省略规则会把返回值绑定到 &self，但实际返回了 other，生命周期不匹配
    // fn pick(&self, other: &str) -> &str {
    //     if other.len() > self.part.len() { other } else { self.part }
    // }

    // ✅ 显式标注：返回值与 self、other 的生命周期都相关
    fn pick<'b>(&'b self, other: &'b str) -> &'b str {
        if other.len() > self.part.len() { other } else { self.part }
    }
}
```

## 生命周期省略规则

为了减少标注负担，编译器内置三条省略规则（Lifetime Elision Rules）。**省略规则只适用于函数/方法签名，不适用于结构体、枚举字段**。

1. 每个引用参数都会获得自己独立的生命周期参数
2. 只有一个输入生命周期时，该生命周期会赋给所有输出
3. 有多个输入生命周期、但包含 `&self` 或 `&mut self` 时，`self` 的生命周期会赋给所有输出

```rust
// 规则 1：
fn f(x: &str, y: &str)
// 展开为 fn f<'a, 'b>(x: &'a str, y: &'b str)

// 规则 1 + 2：
fn first_word(s: &str) -> &str
// 展开为 fn first_word<'a>(s: &'a str) -> &'a str

// 规则 1 + 3：
impl<'a> Excerpt<'a> {
    fn part(&self) -> &str
    // 展开为 fn part<'b>(&'b self) -> &'b str
}
```

应用三条规则后输出生命周期仍无法确定时，就必须手动标注：

```rust
// 三条规则都无法确定返回值来自 x 还是 y，必须手动标注
fn longest(x: &str, y: &str) -> &str { ... } // ❌ E0106
```

## 'static 生命周期

`'static` 表示引用在整个程序运行期间都有效。

```rust
// 字符串字面量的类型就是 &'static str，数据存放在二进制文件中
let s: &'static str = "hello";

// 函数返回字面量
fn text() -> &'static str {
    "hello"
}

// 静态变量
static NAME: &str = "qoder"; // 等价于 &'static str
```

### &'static T 与 T: 'static 的区别

- `&'static T`：一个在程序运行期一直有效的引用
- `T: 'static`：类型 `T` 内部不包含任何短于 `'static` 的引用

```rust
fn store<T: 'static>(x: T) {
    // 存储 x
}

fn main() {
    store(String::from("hello")); // ✅ String 拥有所有权，无引用，满足 T: 'static
    store(42);                    // ✅

    let local = 5;
    // store(&local);             // ❌ &local 不是 'static
}
```

注意：`T: 'static` 不代表值一定活到程序结束，只是说明类型中不包含短期引用。

## 非词法生命周期（NLL）

Rust 2018（1.31）之后，引用的生命周期由**最后一次使用的位置**决定（Non-Lexical Lifetimes），而不是词法作用域。

```rust
fn main() {
    let mut s = String::from("hello");

    let r = &s;
    println!("{}", r); // r 最后一次使用，借用在此结束

    let r2 = &mut s; // ✅ NLL：r 的不可变借用已经结束
    r2.push_str(" world");
    println!("{}", r2);
}
```

NLL 之前，借用会持续整个词法作用域：

```rust
let mut s = String::from("hello");
let r = &s;
println!("{}", r);
s.push_str(" world"); // ❌ 旧版报错：r 的作用域尚未结束，不能可变借用
```

## 生命周期与泛型、Trait Bound 组合

生命周期参数与其他泛型参数一样，可以配合 trait bound 使用：

```rust
use std::fmt::Display;

fn longest_with_an_announcement<'a, T>(
    x: &'a str,
    y: &'a str,
    ann: T,
) -> &'a str
where
    T: Display,
{
    println!("Announcement! {}", ann);
    if x.len() > y.len() { x } else { y }
}

fn main() {
    let s1 = String::from("abcd");
    let s2 = "xyz";
    let result = longest_with_an_announcement(s1.as_str(), s2, "今天是个好日子");
    println!("The longest string is {}", result); // abcd
}
```

生命周期参数之间也可以加约束，`'a: 'b` 表示 `'a` 至少与 `'b` 一样长：

```rust
fn outlives<'a: 'b, 'b>(x: &'a str, y: &'b str) -> &'b str {
    x // x 活得比 'b 更长，可以作为 'b 返回
}
```

## Trait 对象中的生命周期

`Box<dyn Trait>` 默认隐含 `+ 'static`，需要捕获短生命周期数据时要显式标注：

```rust
// 闭包捕获了引用，生命周期随 'a
fn make_adder<'a>(x: &'a i32) -> Box<dyn Fn() -> i32 + 'a> {
    Box::new(move || *x + 1)
}

fn main() {
    // 默认等价于 Box<dyn Fn() + 'static>
    let f: Box<dyn Fn()> = Box::new(|| println!("hi"));
    f();

    let n = 10;
    let adder = make_adder(&n);
    println!("{}", adder()); // 11
}
```

## 常见错误一览

| 错误码 | 场景                               | 说明                                   |
|--------|------------------------------------|----------------------------------------|
| E0106  | 函数签名缺少生命周期标注           | 编译器无法推断返回引用的来源           |
| E0515  | 返回函数内部局部变量的引用         | 产生悬垂引用                           |
| E0597  | 被引用的值没有活得足够久           | 结构体实例/变量比其引用的数据活得久    |

```rust
// 1. E0106：缺少生命周期标注
fn longest(x: &str, y: &str) -> &str { ... } // ❌

// 2. E0515：返回局部变量的引用
fn dangle(x: &str) -> &str { // ❌
    let s = String::from("hello");
    &s
}

// 3. E0597：被引用的数据提前释放
fn main() {
    let e;
    {
        let novel = String::from("Call me Ishmael.");
        e = Excerpt { part: &novel[..5] };
    } // ❌ novel 在这里释放
    println!("{}", e.part);
}
```

## 变型：协变与不变（进阶）

Rust 中类型的子类型关系跟随生命周期：

- `&'a T` 对 `'a` **协变**：长生命周期引用可以当作短生命周期使用（可以"缩短"）
- `&'a mut T` 对 `'a` 协变，但对 `T` **不变**（`&mut T` 不能把 `T` 换成子类型）
- 函数参数类型**逆变**（了解即可）

```rust
fn takes_short<'x>(s: &'x str) {}

fn main() {
    let s: &'static str = "hello";
    takes_short(s); // ✅ &'static str 被"缩短"为临时生命周期传入（协变）
}
```

## 总结

- 生命周期用于防止悬垂引用，是编译期概念，无运行时开销
- 标注只是描述引用之间的约束关系，不改变实际存活时间
- 跨函数/结构体边界的引用需要标注，函数内部编译器自动推断
- 三条省略规则让大多数常见签名无需标注
- `&'static` 表示整个程序运行期有效；`T: 'static` 表示类型不含短期引用
- NLL 让借用的结束点跟随最后一次使用，而不是词法作用域
