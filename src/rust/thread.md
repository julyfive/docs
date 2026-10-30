# Thread 线程

Rust 标准库通过 `std::thread` 提供操作系统级线程，每个线程拥有独立的栈和执行上下文，可以真正并行地运行代码。Rust 的线程安全不依赖运行时 GC 或锁框架，而是由**所有权**和 **`Send` / `Sync`** 在编译期保证。

- `thread::spawn` 创建新线程，返回 `JoinHandle<T>`，`join` 等待结束并获取返回值
- 线程的生命周期不确定，闭包必须满足 `'static`，通常用 `move` 把数据所有权移入线程
- 线程间传递数据用消息通道 `mpsc`，共享可变状态用 `Arc<Mutex<T>>` / `Arc<RwLock<T>>`
- 编译器在编译期拦截数据竞争：`Rc`、`RefCell` 等单线程类型无法跨线程使用

```text
主线程 ──spawn──> 子线程 A ──┐
      ──spawn──> 子线程 B ──┴──> join 汇合
```

## 创建线程与 join

- `spawn` 立即返回，不阻塞当前线程
- `join()` 阻塞当前线程，直到目标线程执行结束
- 返回类型是 `thread::Result<T>`，即 `Result<T, Box<dyn Any + Send>>`，子线程 panic 时得到 `Err`
- 闭包的返回值就是 `join` 成功后得到的 `T`

```rust
use std::thread;

fn main() {
    let handle = thread::spawn(|| {
        let mut sum = 0;
        for i in 1..=100 {
            sum += i;
        }
        sum // 闭包的返回值会作为 join 的结果
    });

    let result = handle.join().unwrap();
    println!("子线程计算结果: {result}"); // 5050
}
```

批量创建线程时，用 `Vec` 收集句柄再统一 `join`：

```rust
use std::thread;

fn main() {
    let mut handles = Vec::new();

    for i in 0..5 {
        handles.push(thread::spawn(move || i * i)); // move 把 i 移入线程
    }

    let results: Vec<i32> = handles.into_iter().map(|h| h.join().unwrap()).collect();
    println!("{:?}", results); // [0, 1, 4, 9, 16]
}
```

> `main` 返回后进程立即退出，尚未执行完的子线程会被强制终止，因此需要 `join` 等待。

## move 闭包：转移所有权

编译器无法知道子线程会活多久，所以 `spawn` 要求闭包满足 `'static`，不能借用局部变量。用 `move` 把变量的所有权移入线程：

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3];

    let handle = thread::spawn(move || {
        println!("{:?}", data); // data 的所有权已移入子线程
    });

    // println!("{:?}", data); // ❌ data 已被移动，不能再使用
    handle.join().unwrap();
}
```

不加 `move` 会得到编译错误：

```text
error[E0373]: closure may outlive the current function, but it borrows `data`,
              which is owned by the current function
help: to force the closure to take ownership of `data` (and any other referenced
      variables), use the `move` keyword
```

- `move` 之后原变量失效，若还需要使用，应先 `clone` 一份再移入

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3];
    let data_clone = data.clone();

    let handle = thread::spawn(move || println!("{:?}", data_clone));

    println!("主线程仍可使用: {:?}", data); // [1, 2, 3]
    handle.join().unwrap();
}
```

## 作用域线程 thread::scope

`move` 只能转移数据，若多个线程只想**借用**同一份局部数据，可以改用 `thread::scope`（Rust 1.63 起）：

- 在作用域内创建的线程可以安全借用作用域外的变量
- `scope` 返回前会等待所有线程结束，编译器因此确认借用不会悬垂

```rust
use std::thread;

fn main() {
    let v = vec![1, 2, 3, 4];

    let total = thread::scope(|s| {
        let h1 = s.spawn(|| v.iter().take(2).sum::<i32>());
        let h2 = s.spawn(|| v.iter().skip(2).sum::<i32>());

        h1.join().unwrap() + h2.join().unwrap()
    });

    println!("{total}"); // 10
    println!("{:?}", v); // v 没有被移动，仍可使用
}
```

互不重叠的可变借用也能分给不同线程（`split_at_mut` 把切片拆成两段）：

```rust
use std::thread;

fn main() {
    let mut v = vec![1, 2, 3, 4, 5, 6];
    let (left, right) = v.split_at_mut(3);

    thread::scope(|s| {
        s.spawn(|| left[0] += 10); // 只修改前半段
        s.spawn(|| right[0] += 100); // 只修改后半段
    }); // scope 结束时所有线程都已结束

    println!("{:?}", v); // [11, 2, 3, 104, 5, 6]
}
```

## 线程构建器 Builder

`thread::Builder` 可以在创建线程前设置名称、栈大小等属性，`spawn` 失败时返回 `io::Result`：

```rust
use std::thread;

fn main() {
    let handle = thread::Builder::new()
        .name(String::from("worker"))
        .stack_size(1024 * 1024) // 1 MiB 栈空间
        .spawn(|| {
            println!("运行在: {:?}", thread::current().name()); // Some("worker")
        })
        .unwrap();

    handle.join().unwrap();
}
```

## 消息传递：mpsc 通道

Rust 标准库通过消息通道实现线程间通信，官方文档提倡「不要通过共享内存来通信，而要通过通信来共享内存」。`std::sync::mpsc` 是**多生产者、单消费者**（multi-producer, single-consumer）通道（更完整的用法见 channel 章节）：

| 方法 | 说明 | 返回类型 |
| ---- | ---- | -------- |
| `send(v)` | 发送消息，转移元素所有权 | `Result<(), SendError<T>>` |
| `recv()` | 阻塞等待一条消息 | `Result<T, RecvError>` |
| `try_recv()` | 非阻塞，立即尝试接收 | `Result<T, TryRecvError>` |
| `recv_timeout(d)` | 最多等待指定时长 | `Result<T, RecvTimeoutError>` |

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let val = String::from("hi");
        tx.send(val).unwrap();
        // println!("{val}"); // ❌ 所有权已随消息转移
    }); // tx 在这里被 drop，通道随之关闭

    let received = rx.recv().unwrap();
    println!("收到: {received}"); // 收到: hi
}
```

`Receiver` 可以直接迭代，等到**所有** `Sender` 被丢弃后自动结束：

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();
    let mut handles = Vec::new();

    for i in 0..3 {
        let tx = tx.clone(); // Sender 实现 Clone，可多生产者
        handles.push(thread::spawn(move || {
            tx.send(i * 10).unwrap();
        }));
    }

    drop(tx); // ✅ 主线程必须丢弃自己的 Sender，否则下面的循环永不结束

    for msg in rx {
        println!("{msg}"); // 0、10、20（顺序取决于调度）
    }

    for h in handles {
        h.join().unwrap();
    }
}
```

- `Receiver` **没有**实现 `Clone`，这是「单消费者」的含义
- 不调用 `drop(tx)` 时通道始终有存活的发送端，`for msg in rx` 会一直阻塞

### 非阻塞与超时

```rust
use std::sync::mpsc::{self, RecvTimeoutError};
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel::<&str>();

    // 通道打开但暂无消息
    assert_eq!(rx.try_recv(), Err(mpsc::TryRecvError::Empty));

    tx.send("hello").unwrap();
    assert_eq!(rx.try_recv(), Ok("hello"));

    drop(tx); // 丢弃所有发送端
    assert_eq!(rx.try_recv(), Err(mpsc::TryRecvError::Disconnected));

    // 通道已关闭，recv_timeout 立即返回 Disconnected，而不是等满 1 秒
    assert_eq!(
        rx.recv_timeout(Duration::from_secs(1)),
        Err(RecvTimeoutError::Disconnected)
    );
}
```

### 同步通道 sync_channel

`mpsc::sync_channel(n)` 是带**有界缓冲区**的通道，缓冲满时 `send` 会阻塞，可起到限流作用：

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::sync_channel(1); // 缓冲区最多 1 条消息

    thread::spawn(move || {
        for i in 0..5 {
            tx.send(i).unwrap(); // 缓冲满时阻塞，不会被无限堆积
        }
    });

    for i in rx {
        println!("{i}");
    }
}
```

- `sync_channel(0)` 是**汇合通道**：发送者必须等接收者取走消息才能继续

## 共享状态：Mutex\<T\>

`Mutex<T>`（互斥锁）保证同一时刻只有一个线程能访问内部数据：

- `lock()` 获取锁，返回 `MutexGuard<T>` 智能指针，通过 `Deref` / `DerefMut` 访问数据
- `MutexGuard` 离开作用域时自动 `drop` 解锁，不会忘记解锁
- `try_lock()` 不阻塞，拿不到锁立刻返回 `Err`

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(5);

    {
        let mut num = m.lock().unwrap(); // 获取锁
        *num = 6; // 通过 DerefMut 修改内部数据
        println!("{}", *num); // 6
    } // 作用域结束，MutexGuard 被 drop，锁自动释放

    println!("{:?}", m.lock().unwrap()); // 6
}
```

### 锁毒化 PoisonError

- 某个线程**持锁期间 panic**，锁会被标记为「中毒」（poisoned）
- 之后其他线程调用 `lock()` 得到 `Err(PoisonError)`，防止读到可能不一致的数据
- 用 `into_inner()` 可以取出数据继续使用，也可以直接 `unwrap()` 让当前线程 panic

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let m = Arc::new(Mutex::new(0));

    let m2 = Arc::clone(&m);
    thread::spawn(move || {
        let _guard = m2.lock().unwrap();
        panic!("持锁时出错"); // panic 后锁被标记为中毒
    })
    .join()
    .ok(); // 忽略子线程的 panic 结果

    // 用 into_inner 取出中毒锁里的数据
    let guard = m.lock().unwrap_or_else(|e| e.into_inner());
    println!("{}", *guard); // 0
}
```

### 死锁

- 同一线程对**不可重入**的 `Mutex` 连续加锁会永久等待
- 多个锁的场景应约定全局一致的加锁顺序

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(1);

    let _a = m.lock().unwrap();
    let _b = m.lock().unwrap(); // ❌ 死锁：锁不可重入，第二次 lock 永远等不到
}
```

## Arc\<T\>：跨线程共享所有权

`Rc<T>` 的引用计数使用普通整数，不是原子操作，并发修改会出错，因此它没有实现 `Send`。跨线程共享所有权要用 `Arc<T>`（Atomic Reference Counting）：

- `Arc` 用原子操作维护引用计数，可安全地在多线程间 `clone`
- 原子操作比普通计数略慢，没有共享需求时不要用 `Arc` 替代 `Rc`
- 只能共享**不可变**数据，要修改需配合 `Mutex` / `RwLock`

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    let data = Arc::new(vec![1, 2, 3]);

    let mut handles = Vec::new();
    for _ in 0..3 {
        let data = Arc::clone(&data); // 计数加一，共享同一份数据
        handles.push(thread::spawn(move || data.iter().sum::<i32>()));
    }

    let total: i32 = handles.into_iter().map(|h| h.join().unwrap()).sum();
    println!("{total}"); // 18
}
```

`Rc` 与 `Arc` 的对应关系：

| 特性 | `Rc<T>` | `Arc<T>` |
| ---- | ------- | -------- |
| 引用计数 | 普通整数 | 原子操作 |
| 跨线程 | 不可（非 `Send`） | 可（`T: Send + Sync`） |
| 性能 | 略高 | 原子操作开销 |
| 典型组合 | `Rc<RefCell<T>>` | `Arc<Mutex<T>>` |

### Arc\<Mutex\<T\>\>：跨线程共享可变数据

这是多线程计数的标准写法：`Arc` 负责多所有者，`Mutex` 负责互斥修改。

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = Vec::new();

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        })); // 锁在这里释放
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("结果: {}", *counter.lock().unwrap()); // 结果: 10
}
```

- `Rc<RefCell<T>>` 是单线程「多所有者 + 可变」，`Arc<Mutex<T>>` 是对应的多线程版本

## RwLock\<T\>：读写锁

读多写少的场景，`RwLock<T>` 比 `Mutex<T>` 并发度更高：

- 同一时刻允许多个**读者**，或一个**写者**，两者互斥
- `read()` 返回 `RwLockReadGuard`，`write()` 返回 `RwLockWriteGuard`，同样离开作用域自动释放

```rust
use std::sync::RwLock;
use std::thread;

fn main() {
    let lock = RwLock::new(5);

    // 多个读者可以同时持有读锁
    thread::scope(|s| {
        s.spawn(|| println!("读者 1: {}", *lock.read().unwrap()));
        s.spawn(|| println!("读者 2: {}", *lock.read().unwrap()));
    });

    // 写者独占
    {
        let mut w = lock.write().unwrap();
        *w += 1;
    }

    println!("{}", *lock.read().unwrap()); // 6
}
```

- 与 `Mutex` 一样，持锁线程 panic 会让锁中毒，后续 `read` / `write` 返回 `Err`
- 不要在同一线程嵌套获取读锁，`RwLock` 不保证可重入，可能死锁
- 写操作频繁时 `Mutex` 往往更简单也更快

## Send 与 Sync

这两个 `unsafe` 标记 trait 是 Rust 线程安全的基石，由编译器自动推导（auto trait），无需手动实现：

| trait | 含义 | 不再满足的典型类型 |
| ----- | ---- | ------------------ |
| `Send` | 所有权可以在线程间**转移** | `Rc<T>`、裸指针 `*const T` |
| `Sync` | `&T` 可以在线程间**共享** | `Rc<T>`、`RefCell<T>`、`Cell<T>` |

常用组合规则：

- `T: Send` 时，`Mutex<T>: Sync`，可被多个线程共享
- `T: Send + Sync` 时，`Arc<T>: Send + Sync`
- `thread::spawn` 要求闭包 `F: Send + 'static`，返回值 `T: Send`
- `Rc<T>` 计数非原子，`RefCell<T>` 借用检查非线程安全，两者都不能跨线程

```rust
use std::rc::Rc;
use std::thread;

fn main() {
    let rc = Rc::new(5);
    // thread::spawn(move || println!("{}", rc));
    // ❌ error[E0277]: `Rc<i32>` cannot be sent between threads safely
}
```

## 子线程 panic 与 join

子线程 panic 不会连累主线程（共享锁除外），`join` 会返回 `Err`，可以从中取出 panic 信息：

```rust
use std::thread;

fn main() {
    let handle = thread::spawn(|| {
        panic!("子线程出错");
    });

    match handle.join() {
        Ok(_) => println!("正常结束"),
        Err(e) => {
            let msg = e
                .downcast_ref::<&str>()
                .copied()
                .or_else(|| e.downcast_ref::<String>().map(|s| s.as_str()))
                .unwrap_or("未知错误");
            println!("子线程 panic: {msg}"); // 子线程 panic: 子线程出错
        }
    }

    println!("主线程继续运行");
}
```

## 常见错误一览

| 错误场景 | 说明 |
| -------- | ---- |
| 闭包借用局部变量 | `spawn` 要求 `'static`，需用 `move` 转移所有权或用 `thread::scope` |
| 忘记 `join` | 主线程结束进程即退出，子线程可能只执行了一半 |
| 忘记丢弃原 `Sender` | `for msg in rx` 永不结束，因为通道始终有存活的发送端 |
| `send` 后继续使用原值 | 消息传递会转移元素所有权 |
| 同一线程重复 `lock` | `Mutex` 不可重入，直接死锁 |
| 用 `Rc` / `RefCell` 跨线程 | 未实现 `Send` / `Sync`，编译期报错 |
| 持锁期间做耗时操作 | 锁粒度太大，其他线程全部排队等待 |

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // 1. 需要共享修改时，用 Arc<Mutex<T>> 而不是 Rc<RefCell<T>>
    let counter = Arc::new(Mutex::new(0));
    let c = Arc::clone(&counter);
    let handle = thread::spawn(move || {
        *c.lock().unwrap() += 1;
    });
    handle.join().unwrap();
    println!("{}", *counter.lock().unwrap()); // 1

    // 2. 锁守卫要及时释放：用块作用域缩小持锁范围
    {
        let mut guard = counter.lock().unwrap();
        *guard += 1;
    } // 锁在此释放
    println!("{}", *counter.lock().unwrap()); // 2

    // 3. 只读共享用 Arc，无需加锁
    let data = Arc::new(vec![1, 2, 3]);
    let d = Arc::clone(&data);
    let h = thread::spawn(move || d.len());
    println!("{}", h.join().unwrap()); // 3
}
```

## 总结

- `thread::spawn` 创建线程，`JoinHandle::join` 等待结束并取得闭包返回值
- 闭包需满足 `Send + 'static`，用 `move` 转移所有权；需要借用局部变量时用 `thread::scope`
- 消息传递用 `mpsc::channel`：`Sender` 可 `clone` 实现多生产者，`Receiver` 单消费者，所有发送端丢弃后通道关闭
- 共享可变状态用 `Arc<Mutex<T>>`，读多写少可用 `Arc<RwLock<T>>`，守卫离开作用域自动解锁
- `Send` 管「能否转移」，`Sync` 管「能否共享」，`Rc`、`RefCell` 只属于单线程世界
- 警惕锁中毒、不可重入导致的死锁，以及过大的锁粒度
