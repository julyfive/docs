# Send 与 Sync

`Send` 和 `Sync` 是 `std::marker` 中的两个 `unsafe` **标记 trait**（marker trait），没有方法、没有运行时开销，由编译器自动推导。它们定义了类型能否安全地跨线程使用，是 Rust 在没有 GC、没有运行时的情况下防止数据竞争的基石。

- `Send`：值的**所有权**可以安全地转移到另一个线程
- `Sync`：值的**共享引用** `&T` 可以安全地交给多个线程，等价于 `&T: Send`
- 两者都是 **auto trait**：所有字段都满足时自动实现，否则自动不实现
- 两者都是 `unsafe trait`：手动实现等于向编译器做安全保证，写错会导致未定义行为
- 不符合约束的跨线程代码会在**编译期**报错，而不是运行时检测

| trait | 含义 | 等价说法 |
| ----- | ---- | -------- |
| `Send` | 值可以 move 到其他线程 | `T: Send` |
| `Sync` | `&T` 可以共享给其他线程 | `&T: Send` |

```text
Send：转移所有权
线程 A ──move──> [ T ] ──> 线程 B

Sync：共享引用
线程 A ──&T──┐
             ├──> [ T ]   多个线程同时持有 &T
线程 B ──&T──┘
```

## 为什么需要 Send 与 Sync

数据竞争（data race）需要同时满足三个条件：多个线程、访问同一份数据、至少一个是写操作且没有同步。Rust 无法在运行时追踪所有访问，于是把「能否转移」「能否共享」编码进类型系统：

- `thread::spawn` 要求闭包 `F: Send + 'static`，返回值 `T: Send`
- 跨线程共享 `&T` 要求 `T: Sync`
- `Rc<T>`、`RefCell<T>`、裸指针等单线程类型会被自动排除在外

```text
编译期：类型检查 Send / Sync ──通过──> 生成代码
                              └─不通过──> error[E0277]
```

- `Send` / `Sync` 是**自动**实现的，正常写代码不需要手动声明
- 它们与 `'static` 是两个独立维度：`Send` 不代表活得够久，`'static` 也不代表线程安全

## Send：跨线程转移所有权

`String`、`Vec<T>`、`Box<T>`、`i32` 等类型都实现了 `Send`，可以安全地 move 到新线程：

```rust
use std::thread;

fn main() {
    let data = String::from("hello");

    let handle = thread::spawn(move || {
        println!("{data}"); // String: Send，所有权安全转移
    });

    handle.join().unwrap();
    // println!("{data}"); // ❌ data 已被移入线程
}
```

`Rc<T>` 的引用计数是普通整数，多线程同时 clone/drop 会竞争，因此它是 `!Send`：

```rust
use std::rc::Rc;
use std::thread;

fn main() {
    let rc = Rc::new(5);

    // thread::spawn(move || println!("{rc}"));
    // ❌ error[E0277]: `Rc<i32>` cannot be sent between threads safely
    //    note: required by a bound in `spawn`

    println!("{rc}");
}
```

- `thread::spawn` 的完整约束是 `F: FnOnce() -> T + Send + 'static`、`T: Send + 'static`
- 闭包捕获的所有变量也必须满足 `Send`，否则整个闭包不是 `Send`
- 需要跨线程共享所有权时，把 `Rc` 换成原子计数的 `Arc`
- `Send` 只回答「能不能转移」，不回答「能不能同时访问」

## Sync：跨线程共享引用

`T: Sync` 表示 `&T` 可以安全地同时存在于多个线程中。`Vec<i32>`、`String`、`i32` 都是 `Sync`，所以可以借用给作用域线程：

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3];

    thread::scope(|s| {
        // 多个线程同时借用 &Vec<i32>，因为 Vec<i32>: Sync
        s.spawn(|| println!("{}", data.len())); // 3
        s.spawn(|| println!("{}", data.iter().sum::<i32>())); // 6
    });
}
```

`RefCell<T>` 是「可以转移、但不能共享」的典型：借用计数不是原子操作，多个线程同时 `borrow_mut` 会破坏运行时检查：

```rust
use std::cell::RefCell;
use std::thread;

fn main() {
    let cell = RefCell::new(0);

    // RefCell<i32>: Send，可以整体移动到线程中
    thread::scope(|s| {
        s.spawn(move || {
            *cell.borrow_mut() += 1;
        });
    });

    // ❌ RefCell<i32> 不是 Sync，&RefCell 不能同时共享给多个线程
    // let cell = RefCell::new(0);
    // thread::scope(|s| {
    //     let shared = &cell;
    //     s.spawn(|| *shared.borrow_mut() += 1);
    //     s.spawn(|| *shared.borrow_mut() += 1);
    // });
}
```

- `Cell<T>`、`RefCell<T>` 都是 `Send + !Sync`：整个值可以搬到另一个线程，但引用不能共享
- `Rc<T>` 是 `!Send + !Sync`：连转移都不允许
- `Arc<T>` 只有 `T: Send + Sync` 时才是 `Send + Sync`，`Arc` 本身不提供可变性

## 自动推导规则

`Send` / `Sync` 是 auto trait，编译器按结构自动推导：

- 结构体：所有字段都 `Send` 才是 `Send`，所有字段都 `Sync` 才是 `Sync`
- 枚举：所有变体的数据都满足才算满足
- 元组、数组、`Vec`、`Option`、`Result`：跟随内部元素
- `PhantomData<T>`：跟随 `T`，常用来显式标记

```rust
use std::rc::Rc;

struct Job {
    id: u32,
    data: Rc<String>,
}

impl Job {
    fn run(&self) {
        println!("job {}: {}", self.id, self.data);
    }
}

fn main() {
    let job = Job {
        id: 1,
        data: Rc::new(String::from("payload")),
    };

    // thread::spawn(move || job.run());
    // ❌ Rc<String> 不是 Send，导致整个 Job 不是 Send

    job.run(); // job 1: payload
}
```

`PhantomData` 可以把「不拥有但需要标记」的类型参数带进结构体，也可以故意让类型变成 `!Send`：

```rust
use std::marker::PhantomData;
use std::rc::Rc;

struct NotSend {
    value: u32,
    _marker: PhantomData<Rc<()>>, // 显式标记为 !Send + !Sync
}

impl NotSend {
    fn show(&self) {
        println!("{}", self.value);
    }
}

fn main() {
    let v = NotSend {
        value: 1,
        _marker: PhantomData,
    };

    // thread::spawn(move || v.show());
    // ❌ NotSend 不是 Send

    v.show(); // 1
}
```

- 只要有一个字段是 `!Send`，整个类型就是 `!Send`，即使代码从不使用该字段
- 稳定版不能手写 `impl !Send for T`，negative impl 仍是不稳定特性
- newtype 包装、加入 `Rc` 缓存、持有裸指针，都可能意外破坏自动推导

## 常见类型速查

| 类型 | `Send` | `Sync` | 说明 |
| ---- | ------ | ------ | ---- |
| `i32`、`bool`、`String` | ✅ | ✅ | 普通拥有型数据 |
| `Vec<T>`、`Option<T>`、`Box<T>` | `T: Send` | `T: Sync` | 跟随内部类型 |
| `&T` | `T: Sync` | `T: Sync` | 共享引用 |
| `&mut T` | `T: Send` | `T: Sync` | 独占引用 |
| `*const T` / `*mut T` | ❌ | ❌ | 裸指针不做安全保证 |
| `Rc<T>` | ❌ | ❌ | 计数非原子 |
| `Arc<T>` | `T: Send + Sync` | `T: Send + Sync` | 原子计数，只读共享 |
| `Cell<T>` / `RefCell<T>` | `T: Send` | ❌ | 内部可变，借用检查非线程安全 |
| `Mutex<T>` | `T: Send` | `T: Send` | 锁保证互斥访问 |
| `RwLock<T>` | `T: Send` | `T: Send + Sync` | 读共享、写独占 |
| `MutexGuard<'_, T>` | ❌ | `T: Sync` | 守卫不能转移，但引用可以共享 |
| `mpsc::Sender<T>` | `T: Send` | ✅ | 多生产者，可 clone |
| `mpsc::Receiver<T>` | `T: Send` | ❌ | 单消费者 |
| `thread::JoinHandle<T>` | `T: Send` | `T: Send` | 等待线程结束 |

- `Send` 不蕴含 `Sync`：`Cell`、`RefCell` 可以转移但不能共享
- `Sync` 不蕴含 `Send`：`MutexGuard` 可以共享引用，但不能转移到其他线程
- `Arc<RefCell<T>>` 两者都不满足：`RefCell` 不是 `Sync`，`Arc` 也就不是 `Send`

## 组合规则与线程约束

记住几条推导规则，比逐个背表更实用：

- `T: Sync` ⇔ `&T: Send`
- `T: Send` ⇔ `&mut T: Send`
- `Mutex<T>: Sync` 只要求 `T: Send`（锁把并发访问变成串行）
- `RwLock<T>: Sync` 要求 `T: Send + Sync`
- `Arc<T>: Send + Sync` 要求 `T: Send + Sync`
- `Vec<T>`、`Option<T>`、`Result<T, E>`、元组：所有组成部分都满足才算满足
- `Box<dyn Trait>` 默认不是 `Send`，需要写成 `Box<dyn Trait + Send>`
- `thread::spawn` 要求 `F: Send + 'static`、`T: Send`
- `thread::scope` 不要求 `'static`，但仍然要求 `Send`；被借用的数据还需要 `Sync`

写泛型的线程工具函数时，把约束写清楚：

```rust
use std::thread;

fn run_in_thread<F, T>(f: F) -> T
where
    F: FnOnce() -> T + Send + 'static,
    T: Send + 'static,
{
    thread::spawn(f).join().unwrap()
}

fn main() {
    println!("{}", run_in_thread(|| 1 + 2)); // 3
}
```

trait object 需要显式加上 `Send` / `Sync`：

```rust
trait Task {
    fn run(&self);
}

struct PrintTask(&'static str);

impl Task for PrintTask {
    fn run(&self) {
        println!("{}", self.0);
    }
}

fn main() {
    let task: Box<dyn Task + Send> = Box::new(PrintTask("hello"));
    std::thread::spawn(move || task.run()).join().unwrap(); // hello
}
```

## 手写 unsafe impl 的前提

标准库里的 `Arc`、`Mutex`、`JoinHandle` 都通过 `unsafe impl Send/Sync` 向编译器做保证。普通代码不应手动实现：

- `unsafe impl Send for MyType {}` 表示「这个类型可以安全转移」，编译器无法验证
- 只有类型内部用 `UnsafeCell`、裸指针等实现了自己的同步协议时，才可能成立
- 错误的手写实现会让编译器放行数据竞争，导致未定义行为
- 需要「禁止」跨线程时，用 `PhantomData<Rc<()>>` 之类的标记，而不是手写负向实现

```rust
struct MyWrapper {
    ptr: *mut u8,
}

// ⚠️ 只有能证明「转移后不会有两个线程同时访问」时才允许这样写
// unsafe impl Send for MyWrapper {}
```

- 标准库中的 `Rc`、`Cell` 都刻意不实现 `Send` / `Sync`
- 第三方库若手写实现，应能在文档中说明其安全前提

## 异步代码中的 Send

`tokio::spawn` 等运行时要求 future 是 `Send + 'static`，因为任务可能被调度到任意工作线程：

- future 内部跨 `.await` 保存的变量都会成为 future 的一部分，因此必须 `Send`
- 持有 `Rc`、`RefCell`、标准库 `MutexGuard` 跨 `.await`，会让 future 变成 `!Send`
- 解决方式：把非 `Send` 值的作用域压缩到 `.await` 之前，或使用 `tokio::sync::Mutex`

```rust
use std::rc::Rc;

async fn bad() {
    let rc = Rc::new(1);
    async {}.await; // 等待期间 rc 仍被 future 持有
    println!("{rc}");
}

fn require_send<T: Send>(_: T) {}

fn main() {
    // require_send(bad());
    // ❌ future cannot be sent between threads safely
    //    because `Rc<i32>` is not `Send`
}
```

- `async` 本身不改变 `Send`，取决于 future 捕获和跨 `.await` 持有的值
- 标准库 `MutexGuard` 是 `!Send`，跨 `.await` 持有会导致同样的问题
- 单线程运行时（如 `LocalSet`）不要求 future `Send`，但跨线程调度仍然需要

## 常见错误

| 错误场景 | 说明 |
| -------- | ---- |
| 把 `Rc<T>` move 进线程 | `Rc` 不是 `Send`，改用 `Arc` |
| 共享 `&RefCell<T>` | `RefCell` 不是 `Sync`，改用 `Mutex` / `RwLock` |
| `Arc<RefCell<T>>` 跨线程 | `Arc` 不会让内部类型变安全，用 `Arc<Mutex<T>>` |
| 以为 `Arc<T>` 一定线程安全 | 需要 `T: Send + Sync` |
| 跨 `.await` 持有 `MutexGuard` | 标准库守卫 `!Send`，future 无法 `tokio::spawn` |
| `Box<dyn Trait>` 跨线程 | 需要 `Box<dyn Trait + Send>` |
| 手写 `unsafe impl Send` | 编译器不再检查，安全责任完全在自己 |
| 用 `'static` 代替 `Send` | 两者维度不同，`'static` 不代表线程安全 |

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // ✅ 正确的跨线程共享可变状态：Arc 提供所有权，Mutex 提供互斥
    let counter = Arc::new(Mutex::new(0));
    let c = Arc::clone(&counter);

    let handle = thread::spawn(move || {
        *c.lock().unwrap() += 1;
    });

    handle.join().unwrap();
    println!("{}", *counter.lock().unwrap()); // 1
}
```

## 总结

- `Send` 管「能否转移」，`Sync` 管「能否共享引用」，二者都是自动推导的 unsafe marker trait
- `T: Sync` 等价于 `&T: Send`；`Send` 与 `Sync` 互不蕴含
- `Rc`、`RefCell`、裸指针是单线程类型，跨线程需要 `Arc`、`Mutex` / `RwLock`
- `Mutex<T>: Sync` 只要求 `T: Send`，`Arc<T>: Send + Sync` 要求 `T: Send + Sync`
- `thread::spawn` 要求 `Send + 'static`，`thread::scope` 去掉 `'static` 但仍要求 `Send`
- 异步任务跨 `.await` 持有的值会进入 future，非 `Send` 值会让 future 无法跨线程调度
- 不要手写 `unsafe impl Send/Sync`，除非能证明类型自身的同步协议
