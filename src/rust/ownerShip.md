# 所有权 OwnerShip

所有权（ownership）是 Rust 最核心的语言机制。它让 Rust 既不需要垃圾回收器，也不要求手动 `free`
：每个值都有唯一的所有者，编译器在编译期追踪所有权的转移，所有者离开作用域时自动释放资源。

**要么多个可读 要么唯一可写**

- 每个值都有一个 **所有者**（owner）
- 同一时刻只能有 **一个**所有者
- 所有者离开作用域时，值被自动 `drop`
- 规则由借用检查器（borrow checker）在编译期验证，运行时零开销

```rust
fn main() {
    {
        let s = String::from("hello");
        println!("{s}");
    } // s 离开作用域，堆内存自动释放
}
```

- 所有者可以是变量、结构体字段、集合元素等持有值的位置
- 释放时调用 `Drop::drop`，`String` 会释放它持有的堆缓冲区
- 所有权规则同时消灭了 double free、悬垂指针和数据竞争

## 栈、堆与 String 的内存布局

| 位置 | 存储内容                   | 生命周期         | 复制成本               |
|------|----------------------------|------------------|------------------------|
| 栈   | 大小固定、编译期已知的数据 | 随作用域自动回收 | 按位复制，很便宜       |
| 堆   | 大小动态变化的数据         | 由所有者控制     | 需要分配和释放，较昂贵 |

`String` 是理解所有权的最佳例子：变量本身在栈上，字符数据在堆上。

```text
栈（变量 s）                    堆（字符缓冲区）
+------+------+------+         +---+---+---+---+---+
| ptr  | len  | cap  | ──────> | h | e | l | l | o |
+------+------+------+         +---+---+---+---+---+
 8 字节  8 字节  8 字节
```

- `ptr` 指向堆缓冲区，`len` 是已用长度，`cap` 是容量
- `String` 变量本身是 24 字节（64 位平台），move 时只复制这三个字段
- 堆数据不会被复制，旧变量随即失效，避免两个变量同时释放同一块内存
- 栈上的 `i32`、`bool` 等固定大小类型可以直接按位复制，没有堆资源归属问题

## 移动（Move）

把 `String` 赋值给另一个变量时，发生的是 **移动**而不是复制：

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // 所有权从 s1 转移到 s2

    println!("{s2}");
    // println!("{s1}"); // ❌ error[E0382]: borrow of moved value: `s1`
}
```

移动只复制栈上的 `ptr/len/cap`，然后把 `s1` 标记为失效。如果两个变量都认为自己拥有堆缓冲区，离开作用域时就会 double
free，因此编译器直接禁止继续使用 `s1`。

所有权会在这些时机转移：

- 赋值：`let b = a;`
- 传参：`take(a);`
- 返回：`return s;`
- 放入集合：`v.push(s);`、`map.insert(k, v);`
- 结构体字段初始化：`Person { name: s }`
- `for x in collection`（`IntoIterator` 按值迭代）
- `move` 闭包捕获外部变量

函数传参和返回同样遵循移动语义：

```rust
fn take(s: String) {
    println!("take: {s}");
}

fn give() -> String {
    String::from("world")
}

fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // 移动
    take(s2); // 所有权移入函数
    // println!("{s2}"); // ❌ s2 已被移走

    let s3 = give(); // 返回值把所有权交给调用者
    println!("{s3}"); // world
}
```

- 移动后原变量立即失效，不能读取、修改或再次移动
- 函数返回堆数据时，所有权从函数内部转移给调用者，不会发生拷贝
- 如果确实需要保留原值，使用 `.clone()` 或改为借用

## 克隆（Clone）与复制（Copy）

`Clone` 需要显式调用，适合堆数据：

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone(); // 深拷贝堆上的字符数据

    println!("{s1} {s2}"); // hello hello
}
```

- `.clone()` 可能分配内存、复制大量数据，成本由实现决定
- `Clone` 的语义不是固定的：`Rc::clone` 只增加引用计数，不复制内部数据
- 不要为了绕过借用检查而无脑 `clone`，优先考虑借用

`Copy` 类型在赋值时按位复制，原变量仍然有效：

```rust
fn main() {
    let x = 5;
    let y = x; // i32: Copy
    println!("{x} {y}"); // 5 5

    let pair = (1, true, 'a');
    let copied = pair; // 元组元素都 Copy，因此元组也 Copy
    println!("{:?} {:?}", pair, copied); // (1, true, 'a') (1, true, 'a')
}
```

|          | `Copy`                                     | `Clone`                |
|----------|--------------------------------------------|------------------------|
| 触发方式 | 赋值、传参时隐式发生                       | 显式调用 `.clone()`    |
| 语义     | 按位复制                                   | 由实现决定，通常深拷贝 |
| 成本     | 便宜，通常在栈上                           | 可能分配堆内存         |
| 约束     | 所有字段必须 `Copy`，且类型不能实现 `Drop` | 无特殊约束             |

- 常见 `Copy` 类型：所有整数、浮点数、`bool`、`char`、共享引用 `&T`
- 由 `Copy` 类型组成的元组、数组、`Option<T>` 也是 `Copy`
- 非 `Copy` 类型：`String`、`Vec<T>`、`Box<T>`、`&mut T`、任何实现 `Drop` 的类型
- `Copy: Clone`，实现 `Copy` 必须同时实现 `Clone`
- `&mut T` 刻意不实现 `Copy`，否则可以复制出多个可变引用，破坏别名规则

## 借用（Borrow）

借用是「不取得所有权，只临时使用」：`&T` 是不可变借用，`&mut T` 是可变借用。引用在离开作用域时不会释放原值。

借用检查器保证两条规则：

- 任意时刻，要么有 **多个** `&T`，要么有 **唯一一个** `&mut T`，二者不能同时存在
- 引用必须始终有效，不能比它指向的数据活得更久

```rust
fn main() {
    let mut s = String::from("hello");

    let r1 = &s;
    let r2 = &s;
    println!("{r1} {r2}"); // 多个不可变借用可以共存

    let r3 = &mut s; // r1/r2 最后一次使用已结束，允许可变借用
    r3.push_str(" world");
    println!("{r3}"); // hello world
}
```

- 不可变借用期间不能修改被借用的值
- 可变借用期间，不能通过原变量再次借用、移动或修改它；所有修改都必须经过这个 `&mut`
- 借用结束的位置由 **NLL**（Non-Lexical Lifetimes）决定：最后一次使用之后，借用即告结束，不必等到作用域末尾

```rust
fn main() {
    let mut s = String::from("hello");

    let r = &s;
    println!("{r}"); // r 最后一次使用，不可变借用在此结束
    s.push_str(" world"); // ✅ NLL 允许
    println!("{s}"); // hello world
}
```

违反借用规则会直接编译失败：

```rust
fn main() {
    let mut s = String::from("hello");

    let r = &s;
    // s.push_str(" world"); // ❌ E0502: 可变借用与不可变借用冲突
    println!("{r}");

    let r1 = &mut s;
    // let r2 = &mut s; // ❌ E0499: 不能同时存在两个可变借用
    r1.push('!');
    println!("{r1}");
}
```

借用期间也不能移动原值：

```rust
fn main() {
    let s = String::from("hello");
    let r = &s;

    // let t = s; // ❌ E0505: cannot move out of `s` because it is borrowed
    println!("{r}");
}
```

- `&T` 本身是 `Copy`，可以随意复制引用
- `&mut T` 不是 `Copy`，但可以显式重借用：`&mut *r`
- 借用不会改变所有权，原值仍由原所有者负责释放

## 所有权与函数

函数参数默认按值传递：传入非 `Copy` 类型就是移动，传入引用才是借用。

```rust
fn print_len(s: &str) {
    println!("{}", s.len());
}

fn add_world(s: &mut String) {
    s.push_str(" world");
}

fn main() {
    let s = String::from("hello");

    print_len(&s);
    print_len(&s); // 借用可以重复使用
    println!("{s}"); // 所有权仍在 main 中

    let mut owned = String::from("hello");
    add_world(&mut owned);
    println!("{owned}"); // hello world
}
```

- 只读参数优先用 `&T` 或 `&str`，避免调用者失去所有权
- 需要修改但不接管所有权时用 `&mut T`
- 需要保存、返回或跨线程转移时，才按值传入 `T`
- 返回引用时，返回值必须与某个输入参数存在生命周期关系，不能指向函数内部的局部变量

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

fn main() {
    let a = String::from("longer");
    let b = String::from("short");
    println!("{}", longest(&a, &b)); // longer
}
```

生命周期标注只是描述引用之间的有效关系，不会延长任何值的寿命，详见[生命周期](/rust/lifeTime.md)。

## 部分移动与 Drop

结构体的字段可以单独移动，这叫 **部分移动**（partial move）：

```rust
struct Person {
    name: String,
    age: u8,
}

fn main() {
    let p = Person {
        name: String::from("Alice"),
        age: 30,
    };

    let name = p.name; // 只移动 name 字段
    println!("{name}, {}", p.age); // ✅ 未移动的字段仍可使用

    // println!("{}", p.name); // ❌ name 已被移走
    // let q = p; // ❌ p 已被部分移动，不能再整体使用
}
```

- 部分移动后，未移动的字段仍然可用，但整个结构体不能再被使用
- 可以重新给被移走的字段赋值，结构体才恢复完整
- 实现 `Drop` 的类型禁止部分移动，因为析构函数需要访问完整对象

```rust
struct Guard {
    data: String,
}

impl Drop for Guard {
    fn drop(&mut self) {
        println!("drop: {}", self.data);
    }
}

fn main() {
    let g = Guard {
        data: String::from("x"),
    };

    // let d = g.data; // ❌ E0509: cannot move out of type `Guard`, which implements `Drop`
    println!("{}", g.data); // x
} // drop: x
```

需要从 `Drop` 类型中取出字段时，用 `mem::take` 或 `Option::take` 留下一个可用的默认值：

```rust
use std::mem;

fn main() {
    let mut s = String::from("hello");
    let taken = mem::take(&mut s); // 用 String::default() 替换，取得原值
    println!("{taken} / {s}"); // hello /
}
```

`drop` 函数可以提前释放一个值：

```rust
fn main() {
    let s = String::from("hello");
    drop(s); // 立即释放，所有权被消耗
    // println!("{s}"); // ❌ s 已被移动进 drop
}
```

- 同一个作用域内，变量按声明的 **逆序**释放
- 结构体字段按声明的 **正序**释放
- `drop(&s)` 只会丢弃一个引用，不会释放 `s` 本身

## 所有权与集合

集合元素由集合拥有。把值放进 `Vec`、`HashMap` 就是把所有权交给集合：

```rust
fn main() {
    let mut v = Vec::new();
    v.push(String::from("a")); // String 的所有权进入 Vec

    for s in &v {
        println!("{s}"); // 借用元素
    }

    for s in v {
        println!("{s}"); // 按值迭代，v 的所有权被消耗
    }

    // println!("{:?}", v); // ❌ v 已被移走
}
```

- `for x in &v`：借用，循环后 `v` 仍可用
- `for x in &mut v`：可变借用，可修改元素
- `for x in v`：移动，循环后 `v` 不可再用
- `v[0]` 通过 `Index` 返回引用，不能直接从索引处移出元素

```rust
fn main() {
    let v = vec![String::from("a")];
    let first = &v[0]; // 借用
    println!("{first}");

    // let moved = v[0]; // ❌ E0507: cannot move out of index of `Vec<String>`
}
```

`HashMap::insert` 会接管键和值的所有权，`get` 只返回借用：

```rust
use std::collections::HashMap;

fn main() {
    let key = String::from("name");
    let value = String::from("Alice");
    let mut map = HashMap::new();

    map.insert(key, value); // key/value 的所有权进入 HashMap
    // println!("{key}"); // ❌ key 已被移动
    println!("{:?}", map.get("name")); // Some("Alice")
}
```

## 所有权与多线程

`thread::spawn` 的 `move` 闭包会把捕获变量的所有权转移到新线程：

```rust
use std::thread;

fn main() {
    let s = String::from("hello");

    let handle = thread::spawn(move || {
        println!("{s}"); // s 的所有权进入新线程
    });

    handle.join().unwrap();
    // println!("{s}"); // ❌ s 已被移入线程
}
```

- 线程可能比创建它的函数活得更久，因此闭包必须取得所有权
- 需要多个线程共享所有权时使用 `Arc<T>`，需要修改时用 `Arc<Mutex<T>>`
- `Send` 决定值能否转移，`Sync` 决定引用能否共享，详见 [Send 与 Sync](/rust/sync%26send.md)

## 常见错误

| 错误码        | 含义                           | 典型修复                                      |
|---------------|--------------------------------|-----------------------------------------------|
| E0382         | 使用了已经移动的值             | 调整顺序、借用或 `.clone()`                   |
| E0502         | 可变借用与不可变借用冲突       | 缩短借用范围，或先结束不可变借用              |
| E0499         | 同时存在两个可变借用           | 一次只保留一个 `&mut`                         |
| E0505         | 借用期间移动了值               | 先结束借用再移动                              |
| E0506         | 给借用中的值赋值               | 等借用结束后再赋值                            |
| E0507         | 从索引或引用中移出值           | 使用 `.clone()`、`mem::take` 或改成按引用访问 |
| E0509         | 从实现 `Drop` 的类型中移出字段 | 使用 `mem::take` / `Option::take`             |
| E0106 / E0515 | 返回局部变量的引用             | 返回拥有所有权的值，或引入正确的生命周期      |

```rust
fn main() {
    let names = vec![String::from("a"), String::from("b")];

    for name in &names {
        println!("{name}");
    }

    // for name in names { ... } // 第一个循环如果写成 names，这里就不能再用
}
```

- 移动发生在赋值、传参、返回、集合插入、闭包捕获等时刻
- 编译器报 `borrow of moved value` 时，先找到是哪一步移走了所有权
- 不要用 `.clone()` 掩盖所有权设计问题，优先考虑借用或调整数据流
- `Copy` 类型不会有移动问题，但它只适用于没有堆资源的简单数据

## 总结

- 每个值只有一个所有者，所有者离开作用域时自动 `drop`
- 赋值、传参、返回默认是 **移动**，移动后原变量失效
- `Copy` 类型按位复制，`Clone` 需要显式调用，两者语义和成本不同
- 借用不转移所有权：多个 `&T` 或一个 `&mut T`，不能同时存在
- NLL 让借用最后一次使用后结束，而不是等到作用域末尾
- 部分移动后整个值不可再用；实现 `Drop` 的类型不能部分移动
- 生命周期描述引用的有效范围，保证引用不会悬垂
- 线程间转移所有权用 `move`，共享所有权用 `Arc`，修改共享数据用 `Mutex`
- 所有权把 double free、悬垂引用、数据竞争挡在编译期
