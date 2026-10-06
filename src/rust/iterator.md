# 迭代器 Iterator

迭代器（Iterator）负责按顺序产生一系列值，是 Rust 遍历集合的统一抽象。Rust 的迭代器是**惰性的（lazy）**：创建迭代器本身不执行任何操作，只有调用**消费方法**（如 `collect`、`sum`）时才真正开始工作。

- 所有迭代器都实现 `Iterator` trait，核心方法只有一个：`next`
- 适配器（`map`、`filter` 等）返回新迭代器，可以链式组合
- 迭代器是**零成本抽象**：编译优化后与手写循环性能相当
- 可以统一处理 `Vec`、`HashMap`、字符串、范围等各种数据源

```rust
fn main() {
    let v = vec![1, 2, 3];
    let total: i32 = v.iter().sum(); // 链式调用：iter 产生迭代器，sum 消费它
    println!("{}", total); // 6
}
```

## Iterator trait 与 next

`Iterator` trait 的定义非常简洁：

```rust
pub trait Iterator {
    type Item; // 关联类型：迭代器产出的元素类型
    fn next(&mut self) -> Option<Self::Item>; // 每次返回一个元素，结束后返回 None
}
```

手动调用 `next` 观察迭代过程（迭代器变量必须声明为 `mut`）：

```rust
fn main() {
    let v = vec![1, 2, 3];
    let mut iter = v.iter(); // 需要 mut：next 会修改迭代器的内部状态

    assert_eq!(iter.next(), Some(&1));
    assert_eq!(iter.next(), Some(&2));
    assert_eq!(iter.next(), Some(&3));
    assert_eq!(iter.next(), None); // 没有更多元素了
}
```

`for` 循环就是迭代器的语法糖，等价于反复调用 `next` 直到返回 `None`：

```rust
// 下面两种写法等价
for x in vec![1, 2, 3] {
    println!("{x}");
}

let mut iter = vec![1, 2, 3].into_iter();
while let Some(x) = iter.next() {
    println!("{x}");
}
```

## 三种获取迭代器的方式

| 方法           | 产出元素类型 | 所有权     | 使用场景               |
|----------------|--------------|------------|------------------------|
| `iter()`       | `&T`         | 不可变借用 | 只读遍历，集合仍可再用 |
| `iter_mut()`   | `&mut T`     | 可变借用   | 原地修改元素           |
| `into_iter()`  | `T`          | 获取所有权 | 消耗集合，元素被移出   |

```rust
fn main() {
    let mut v = vec![1, 2, 3];

    // iter()：不可变借用，v 之后仍可用
    for x in v.iter() {
        println!("{x}");
    }
    println!("{:?}", v); // ✅ v 仍然可用

    // iter_mut()：可变借用，可以原地修改
    for x in v.iter_mut() {
        *x *= 10;
    }
    println!("{:?}", v); // [10, 20, 30]

    // into_iter()：获取所有权，v 被消耗
    for x in v.into_iter() {
        println!("{x}");
    }
    // println!("{:?}", v); // ❌ v 已被消耗
}
```

不同于 `for x in &v`（等价 `iter()`）和 `for x in &mut v`（等价 `iter_mut()`）：

```rust
let mut v = vec![1, 2, 3];
for x in &v {}       // 等价于 v.iter()
for x in &mut v {}   // 等价于 v.iter_mut()
for x in v {}        // 等价于 v.into_iter()
```

`HashMap` 的迭代产出键值对元组：

```rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    scores.insert("蓝队", 10);
    scores.insert("黄队", 50);

    for (key, value) in &scores {
        println!("{key}: {value}");
    }
}
```

## 消费适配器

消费适配器（Consuming Adapters）接收迭代器，返回一个**值**，调用后迭代器被消耗。

### collect

把迭代器收集为集合，通常需要类型标注或 turbofish：

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    let doubled: Vec<i32> = v.iter().map(|x| x * 2).collect();
    let doubled = v.iter().map(|x| x * 2).collect::<Vec<_>>(); // 等价写法

    // 也可以收集为 HashMap、String 等
    let s: String = vec!['h', 'i'].into_iter().collect();
    println!("{:?}, {}, {:?}", doubled, s, v); // [2, 4, 6, 8, 10], hi, [1, 2, 3, 4, 5]
}
```

### sum / product / count

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    let total: i32 = v.iter().sum();      // 15
    let product: i32 = v.iter().product(); // 120
    let len = v.iter().count();            // 5

    println!("{total} {product} {len}");
}
```

### fold：通用聚合

`fold` 接收初始值和一个闭包，把迭代器折叠为单个值：

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    // 累加：等价于 sum
    let total = v.iter().fold(0, |acc, x| acc + x); // 15

    // 手动实现 map
    let doubled: Vec<i32> = v.iter().fold(Vec::new(), |mut acc, x| {
        acc.push(x * 2);
        acc
    }); // [2, 4, 6, 8, 10]

    println!("{total} {doubled:?}");
}
```

### 查找与判断

| 方法             | 说明                                     | 返回类型    |
|------------------|------------------------------------------|-------------|
| `any(\|x\| ...)` | 存在任意元素满足条件（短路）             | `bool`      |
| `all(\|x\| ...)` | 所有元素满足条件（短路）                 | `bool`      |
| `find(\|x\| ...)`| 第一个满足条件的元素                     | `Option<T>` |
| `position(\|x\| ...)` | 第一个满足条件元素的索引             | `Option<usize>` |
| `max()` / `min()`| 最大 / 最小元素                          | `Option<T>` |
| `last()`         | 最后一个元素                             | `Option<T>` |

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    assert!(v.iter().any(|x| *x > 4));
    assert!(v.iter().all(|x| *x > 0));
    assert_eq!(v.iter().find(|x| **x % 2 == 0), Some(&2));
    assert_eq!(v.iter().position(|x| *x == 3), Some(2));
    assert_eq!(v.iter().max(), Some(&5));
    assert_eq!(v.iter().min(), Some(&1));
}
```

### for_each

不产生返回值，替代简单的 `for` 循环：

```rust
fn main() {
    vec![1, 2, 3].iter().for_each(|x| println!("{x}"));
}
```

## 迭代器适配器

迭代器适配器（Iterator Adapters）接收迭代器，返回**新迭代器**，本身不产生任何执行。多个适配器可以链式调用，形成"流水线"。

### map：元素变换

```rust
fn main() {
    let v = vec![1, 2, 3];
    let doubled: Vec<i32> = v.iter().map(|x| x * 2).collect();
    println!("{:?}", doubled); // [2, 4, 6]
}
```

### filter：条件过滤

注意：`iter()` 产出 `&i32`，所以过滤闭包的参数是 `&&i32`，需要解引用：

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5];
    // filter 闭包收到 &&i32，用 **x 或 *x（自动解引用）取值
    let evens: Vec<&i32> = v.iter().filter(|x| **x % 2 == 0).collect();
    println!("{:?}", evens); // [2, 4]

    // map 与 filter 组合：取偶数并翻倍
    let result: Vec<i32> = v.iter().filter(|x| **x % 2 == 0).map(|x| x * 10).collect();
    println!("{:?}", result); // [20, 40]
}
```

### enumerate / zip：索引与配对

```rust
fn main() {
    let names = vec!["Alice", "Bob"];

    // enumerate：产出 (索引, 元素)
    for (i, name) in names.iter().enumerate() {
        println!("{i}: {name}");
    }

    // zip：两个迭代器配对，长度按短的截断
    let scores = vec![90, 85];
    let pairs: Vec<(&str, &i32)> = names.iter().zip(scores.iter()).collect();
    println!("{:?}", pairs); // [("Alice", 90), ("Bob", 85)]
}
```

### take / skip / take_while / skip_while

```rust
fn main() {
    let v: Vec<i32> = (1..).take(3).collect(); // 无限迭代器 + take = 取前 3 个
    println!("{:?}", v); // [1, 2, 3]

    let v: Vec<i32> = (1..=10).skip(5).collect();
    println!("{:?}", v); // [6, 7, 8, 9, 10]

    let v: Vec<i32> = (1..).take_while(|x| *x < 4).collect();
    println!("{:?}", v); // [1, 2, 3]（条件不满足即停止）

    let v: Vec<i32> = (1..=10).skip_while(|x| *x < 6).collect();
    println!("{:?}", v); // [6, 7, 8, 9, 10]
}
```

### chain / rev

```rust
fn main() {
    let a = vec![1, 2];
    let b = vec![3, 4];

    // chain：顺序拼接两个迭代器
    let c: Vec<i32> = a.iter().chain(b.iter()).copied().collect();
    println!("{:?}", c); // [1, 2, 3, 4]

    // rev：反转（要求迭代器实现 DoubleEndedIterator）
    let r: Vec<i32> = a.iter().rev().collect();
    println!("{:?}", r); // [2, 1]
}
```

### flat_map / flatten：展平嵌套结构

```rust
fn main() {
    let words = vec!["hello world", "hi there"];

    // flat_map = map + flatten，把每段切分后的结果拼接在一起
    let all: Vec<&str> = words.iter().flat_map(|s| s.split(' ')).collect();
    println!("{:?}", all); // ["hello", "world", "hi", "there"]

    // flatten：直接展平嵌套迭代器
    let nested = vec![vec![1, 2], vec![3, 4]];
    let flat: Vec<i32> = nested.into_iter().flatten().collect();
    println!("{:?}", flat); // [1, 2, 3, 4]
}
```

### peekable：预看下一个元素

```rust
fn main() {
    let mut iter = vec![1, 2, 3].iter().peekable();

    // peek 查看下一个元素但不消耗
    while let Some(&x) = iter.peek() {
        println!("下一个是: {x}");
        iter.next(); // 真正取出
    }
}
```

## 惰性的证明

适配器不调用消费方法就什么都不执行：

```rust
fn main() {
    let v = vec![1, 2, 3];

    let iter = v.iter().map(|x| {
        println!("map 执行：{x}"); // 注意：这里不会立即打印
        x * 2
    });

    println!("此处先打印（map 尚未执行）");
    let doubled: Vec<i32> = iter.collect(); // 只有被消费时才逐个执行
    println!("{:?}", doubled); // [2, 4, 6]
}

// 输出顺序：
// 此处先打印（map 尚未执行）
// map 执行：1
// map 执行：2
// map 执行：3
// [2, 4, 6]
```

## 迭代器与闭包结合

适配器接收闭包，因此闭包可以捕获环境变量（详见闭包章节）：

```rust
fn main() {
    let factor = 10;

    // 闭包捕获外部变量 factor
    let scaled: Vec<i32> = vec![1, 2, 3].iter().map(|x| x * factor).collect();
    println!("{:?}", scaled); // [10, 20, 30]
}
```

带状态的闭包配合 `for_each` 或 `fold` 使用：

```rust
fn main() {
    let mut sum = 0;
    vec![1, 2, 3].iter().for_each(|x| sum += x); // 可变借用捕获
    println!("{sum}"); // 6
}
```

## 自定义迭代器

只要实现 `Iterator` trait 的 `next` 方法，就能获得全部适配器方法：

```rust
struct Counter {
    count: u32,
}

impl Counter {
    fn new() -> Counter {
        Counter { count: 0 }
    }
}

impl Iterator for Counter {
    type Item = u32;

    fn next(&mut self) -> Option<Self::Item> {
        if self.count < 5 {
            self.count += 1;
            Some(self.count)
        } else {
            None
        }
    }
}

fn main() {
    let counter = Counter::new();
    // 自定义迭代器可以直接使用所有标准适配器
    let v: Vec<u32> = counter.collect();
    println!("{:?}", v); // [1, 2, 3, 4, 5]
}
```

## 性能：零成本抽象

Rust 编译器会把迭代器链优化成与手写循环等价的机器码：

```rust
// 迭代器写法
let total: u64 = (1..=100).filter(|x| x % 2 == 0).map(|x| x * x).sum();

// 手写循环写法
let mut total = 0u64;
for x in 1..=100 {
    if x % 2 == 0 {
        total += x * x;
    }
}
```

## 常见错误一览

| 错误场景                       | 说明                                             |
|--------------------------------|--------------------------------------------------|
| 忘记给迭代器声明 `mut`         | `next` 会修改内部状态，迭代器变量必须是 `mut`    |
| 迭代器被消耗后再次使用         | `collect`、`sum` 等消费后，原迭代器不能再使用    |
| 适配器链没有调用消费方法       | 迭代器是惰性的，不消费就不会执行                 |
| `collect` 忘记标注目标类型     | 编译器无法推断要收集成什么类型                   |
| `into_iter` 后原集合仍被使用   | 所有权已被移动，原集合失效                       |

```rust
fn main() {
    let v = vec![1, 2, 3];

    // 1. 消费后迭代器不能再使用
    let mut iter = v.iter();
    let first = iter.next();
    println!("{:?}", first); // Some(1)
    let total: i32 = iter.sum(); // ✅ 继续用剩余部分 [2, 3]
    // let x = iter.next(); // ❌ 已消耗，不能再调用

    // 2. 惰性：不消费不执行
    v.iter().map(|x| println!("{x}")); // ⚠️ 什么也不会发生，缺少消费方法

    // 3. collect 需要类型信息
    // let doubled = v.iter().map(|x| x * 2).collect(); // ❌ 无法推断类型
    let doubled = v.iter().map(|x| x * 2).collect::<Vec<i32>>(); // ✅
    println!("{total} {doubled:?}");
}
```

## 总结

- 迭代器是惰性的：适配器只描述"要做什么"，消费方法才真正触发执行
- 核心是 `Iterator::next`，`for` 循环只是它的语法糖
- 三种获取方式：`iter()`（不可变借用）、`iter_mut()`（可变借用）、`into_iter()`（获取所有权）
- 消费适配器返回值：`collect`、`sum`、`fold`、`any`、`find` 等
- 迭代器适配器返回新迭代器：`map`、`filter`、`enumerate`、`zip`、`take`、`chain` 等，可任意链式组合
- 实现 `next` 即可自定义迭代器，自动获得所有适配器能力
- 迭代器是零成本抽象，优化后与手写循环性能相当
