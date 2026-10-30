# Trait 特性

Trait 定义一组「类型必须提供的能力」，是 Rust 实现抽象与多态的核心。它类似其他语言的接口，但支持默认实现、关联类型、泛型约束和 trait object，并且不需要继承体系。

- `trait` 只描述行为，`impl Trait for Type` 为具体类型实现
- 方法可以有默认实现，实现者只补必须的部分
- 作为**泛型约束**（`T: Summary`、`impl Summary`）时是静态分发，零运行时开销
- 作为 **trait object**（`dyn Summary`）时是动态分发，可以在同一集合存放不同类型
- 孤儿规则：trait 或类型至少有一个定义在当前 crate

```text
trait Summary
   ├── impl for NewsArticle
   └── impl for Tweet

fn notify(item: &impl Summary)      // 静态分发：编译期确定类型
fn print_all(items: &[Box<dyn Summary>]) // 动态分发：运行期查虚表
```

## 定义与实现 Trait

```rust
trait Summary {
    // 必须由实现者提供
    fn summarize(&self) -> String;

    // 默认实现，可以调用其他方法
    fn preview(&self) -> String {
        format!("Read more: {}", self.summarize())
    }
}

struct NewsArticle {
    headline: String,
    author: String,
}

struct Tweet {
    username: String,
    content: String,
}

impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {}", self.headline, self.author)
    }
}

impl Summary for Tweet {
    fn summarize(&self) -> String {
        format!("{}: {}", self.username, self.content)
    }
}

fn main() {
    let article = NewsArticle {
        headline: String::from("Rust 发布"),
        author: String::from("硕"),
    };
    let tweet = Tweet {
        username: String::from("rustlang"),
        content: String::from("hello"),
    };

    println!("{}", article.summarize());
    println!("{}", tweet.summarize());
    println!("{}", tweet.preview()); // 默认实现
}
```

- 以 `;` 结尾的方法是必需的，带方法体的方法是默认实现
- trait 不包含字段，默认方法也不知道实现者的结构
- 实现 trait 后，方法可以像固有方法一样用 `.` 调用
- 一个类型可以有多个 `impl` 块，trait 实现和固有方法分开写也合法

## 默认方法

默认方法可以调用 trait 中的其他方法，实现者也可以覆盖它：

```rust
trait Greet {
    fn name(&self) -> String;

    fn hello(&self) -> String {
        format!("hello, {}", self.name())
    }
}

struct Dog;

impl Greet for Dog {
    fn name(&self) -> String {
        String::from("dog")
    }

    // 覆盖默认实现
    fn hello(&self) -> String {
        format!("woof, {}", self.name())
    }
}

fn main() {
    println!("{}", Dog.hello()); // woof, dog
}
```

- 默认方法适合提供通用逻辑，减少重复实现
- 覆盖时方法签名必须与 trait 声明一致
- 默认方法不能访问字段，需要数据时通过 trait 中的其他方法间接获取

## Trait 作为参数：静态分发

```rust
trait Summary {
    fn summarize(&self) -> String;
}

struct Tweet {
    content: String,
}

impl Summary for Tweet {
    fn summarize(&self) -> String {
        self.content.clone()
    }
}

// impl Trait 语法
fn notify(item: &impl Summary) {
    println!("Breaking: {}", item.summarize());
}

// 等价的泛型写法
fn notify_generic<T: Summary>(item: &T) {
    println!("Breaking: {}", item.summarize());
}

fn main() {
    let tweet = Tweet {
        content: String::from("hello"),
    };

    notify(&tweet);
    notify_generic(&tweet);
}
```

- `&impl Summary` 是泛型参数的语法糖，二者都做单态化，为每个具体类型生成一份代码
- 多个约束用 `+` 连接：`T: Summary + std::fmt::Display`
- 约束较多时用 `where` 子句提升可读性：
  `fn show<T>(item: &T) where T: Summary + std::fmt::Display { ... }`

- 参数类型不同时的区别：
  - `fn f(a: &impl Summary, b: &impl Summary)`：允许两个参数是**不同**类型
  - `fn f<T: Summary>(a: &T, b: &T)`：强制两个参数是**同一**类型

## 返回 impl Trait

```rust
trait Summary {
    fn summarize(&self) -> String;
}

struct Tweet {
    content: String,
}

impl Summary for Tweet {
    fn summarize(&self) -> String {
        self.content.clone()
    }
}

fn make_tweet() -> impl Summary {
    Tweet {
        content: String::from("hello"),
    }
}

fn main() {
    println!("{}", make_tweet().summarize());
}
```

- 调用方只知道返回值实现了 `Summary`，具体类型被隐藏
- 一个函数只能返回同一种具体类型，不能按分支返回不同实现
- 适合返回迭代器、闭包等「类型名无法写出」的场景

```rust
// ❌ 两个分支返回不同类型，即使都实现了 Summary
// fn make(flag: bool) -> impl Summary {
//     if flag {
//         Tweet { content: String::from("a") }
//     } else {
//         OtherType { .. }
//     }
// }
```

## Trait Object：动态分发

```rust
trait Summary {
    fn summarize(&self) -> String;
}

struct Tweet {
    username: String,
}

struct NewsArticle {
    headline: String,
}

impl Summary for Tweet {
    fn summarize(&self) -> String {
        format!("@{}", self.username)
    }
}

impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        self.headline.clone()
    }
}

fn print_all(items: &[Box<dyn Summary>]) {
    for item in items {
        println!("{}", item.summarize()); // 运行时通过虚表调用
    }
}

fn main() {
    let items: Vec<Box<dyn Summary>> = vec![
        Box::new(Tweet {
            username: String::from("rustlang"),
        }),
        Box::new(NewsArticle {
            headline: String::from("news"),
        }),
    ];

    print_all(&items);
}
```

- `dyn Summary` 是 trait object，大小不定，必须放在 `Box`、`&` 等指针后面
- 虚表（vtable）保存具体类型的方法指针，调用有一次间接跳转开销
- 同一个集合可以混合存放不同具体类型，这是泛型做不到的
- 静态分发性能更好，动态分发更灵活，按需选择

## 对象安全（Object Safety）

不是所有 trait 都能作为 `dyn Trait` 使用，需要满足对象安全：

- 方法不能返回 `Self`（按值），因此 `Clone` 不能对象安全
- 方法不能带泛型参数，虚表无法为无限多类型生成条目
- 关联类型必须指定具体类型，例如 `dyn Iterator<Item = i32>`
- `where Self: Sized` 的方法不进入虚表，允许出现在对象安全 trait 中

```rust
fn main() {
    // ❌ Clone::clone 返回 Self，Clone 不是对象安全的
    // let items: Vec<Box<dyn Clone>> = Vec::new();

    // ✅ Iterator 是对象安全的，但要指定关联类型 Item
    let it: Box<dyn Iterator<Item = i32>> = Box::new(vec![1, 2, 3].into_iter());
    let sum: i32 = it.sum();
    assert_eq!(sum, 6);
}
```

## 关联类型

关联类型让 trait 的「输出类型」由每个实现唯一确定：

```rust
trait Container {
    type Item;

    fn first(&self) -> Option<&Self::Item>;
}

struct Numbers(Vec<i32>);

impl Container for Numbers {
    type Item = i32;

    fn first(&self) -> Option<&Self::Item> {
        self.0.first()
    }
}

fn main() {
    let numbers = Numbers(vec![1, 2, 3]);
    assert_eq!(numbers.first(), Some(&1));
}
```

- 调用方通过 `Self::Item` / `<T as Container>::Item` 引用关联类型
- 与 `trait Container<T>` 的区别：泛型参数允许一个类型实现多次，关联类型每个实现只能指定一次
- 标准库的 `Iterator::Item`、`Add::Output` 都是关联类型

## 孤儿规则与 newtype

实现 trait 时，trait 或类型至少有一个必须在当前 crate 中定义，这就是孤儿规则：

- 可以为本地类型实现外部 trait：`impl Display for MyType`
- 也可以为外部类型实现本地 trait：`impl MyTrait for Vec<i32>`
- 不能为外部类型实现外部 trait：`impl Display for Vec<i32>` ❌

需要给外部类型添加外部 trait 的能力时，用 newtype 包装：

```rust
use std::fmt;

struct Wrapper(Vec<i32>);

impl fmt::Display for Wrapper {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self.0)
    }
}

fn main() {
    println!("{}", Wrapper(vec![1, 2, 3])); // [1, 2, 3]
}
```

- newtype 用本地类型包住外部类型，既满足孤儿规则，又保留内部行为
- 一致性（coherence）保证同一类型对同一 trait 只有一个实现，避免冲突

## 常用标准库 Trait

| trait | 作用 | 能否 `derive` |
| ----- | ---- | ------------- |
| `Debug` | `{:?}` 调试输出 | ✅ |
| `Display` | `{}` 展示输出 | ❌ 手写 |
| `Clone` / `Copy` | 复制 | ✅ |
| `PartialEq` / `Eq` | 相等比较 | ✅ |
| `PartialOrd` / `Ord` | 排序比较 | ✅ |
| `Hash` | 作为 `HashMap` / `HashSet` 键 | ✅ |
| `Default` | 默认值 | ✅ |
| `From` / `Into` | 类型转换 | ❌ 手写 |
| `Drop` | 析构逻辑 | ❌ 手写 |
| `Iterator` | 迭代器 | ❌ 手写 |

- `From` 与 `Into` 成对：实现了 `From<A> for B`，就自动获得 `Into<B> for A`
- `Display` 用于面向用户的输出，`Debug` 用于调试，二者不要混用
- `Copy` 与 `Drop` 互斥：实现了 `Drop` 的类型不能是 `Copy`

```rust
use std::fmt;

struct Celsius(f64);

impl fmt::Display for Celsius {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}°C", self.0)
    }
}

impl From<f64> for Celsius {
    fn from(value: f64) -> Self {
        Celsius(value)
    }
}

fn main() {
    let a = Celsius::from(25.0);
    let b: Celsius = 30.0.into(); // From 自动带来 Into

    println!("{a} {b}"); // 25°C 30°C
}
```

## 常见错误

| 错误场景 | 说明 |
| -------- | ---- |
| 调用 trait 方法提示找不到 | trait 未在当前作用域导入，需要 `use` |
| 未实现 trait 就调用方法 | 编译器报 `the trait bound ... is not satisfied` |
| `impl Trait` 返回不同类型 | 只能返回同一种具体类型，改用 `Box<dyn Trait>` |
| 把 `dyn Trait` 直接作为字段 | 大小不定，必须写成 `Box<dyn Trait>` / `&dyn Trait` |
| 为外部类型实现外部 trait | 违反孤儿规则，用 newtype 包装 |
| 默认方法访问 `self.field` | trait 不知道字段，编译错误 |
| 给非对象安全 trait 加 `dyn` | 例如 `dyn Clone`，方法返回了 `Self` |

## 总结

- trait 定义共享行为，`impl Trait for Type` 为类型实现，支持默认方法
- 泛型 / `impl Trait` 是静态分发，`dyn Trait` 是动态分发
- 返回 `impl Trait` 只能对应一种具体类型；需要混合类型时用 `Box<dyn Trait>`
- 关联类型表达「每个实现唯一确定的输出类型」，比泛型参数更精确
- 孤儿规则限制实现位置，newtype 可以合法地为外部类型扩展 trait
- `derive` 只适合机械实现，`Display`、`Drop`、`From` 等需要手写
