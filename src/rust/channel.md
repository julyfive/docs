# channel 通道

`std::sync::mpsc` 是 Rust 标准库提供的线程间消息传递工具。名字含义是 **m**ulti-**p**roducer, **s**ingle-**c**onsumer——多个生产者、单个消费者。相比共享内存，通道把「数据的所有权」直接交给另一个线程，天然避免了数据竞争。

- 发送端 `Sender<T>` 可以 `clone`，接收端 `Receiver<T>` 全局唯一
- 发送消息会**转移所有权**，原线程不能再使用该值
- 通道有两种：无界的 `channel()` 与有界的 `sync_channel(n)`
- 所有发送端被丢弃后通道关闭，接收端收到 `Err` 表示不会再有消息

```text
        ┌──> tx1 ──┐
        │          ▼
主线程 ─┼──> tx2 ──> [ 队列 ] ──> rx ──> 消费线程
        │          ▲
        └──> tx3 ──┘
```

## 两种通道：channel 与 sync_channel

| 构造 | 发送端类型 | 缓冲 | 发送行为 |
| ---- | ---------- | ---- | -------- |
| `mpsc::channel()` | `Sender<T>` | 无界 | 永不阻塞，只会在接收端关闭时失败 |
| `mpsc::sync_channel(n)` | `SyncSender<T>` | 容量 `n` | 缓冲满时阻塞，直到有空位 |

- 无界通道发送快、内存占用不受控；消费速度跟不上时消息会无限堆积
- 有界通道会反压（backpressure）生产者，适合做任务队列限流
- `sync_channel(0)` 是**汇合通道**（rendezvous）：发送方必须等到接收方接走消息才能继续

## 基本使用

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        tx.send(String::from("hello")).unwrap();
        // tx 随闭包结束被丢弃，通道关闭
    });

    // recv 阻塞，直到收到消息或所有发送端关闭
    let msg = rx.recv().unwrap();
    println!("{msg}"); // hello
}
```

- `send(v)` 把 `v` 的所有权移入通道，返回 `Result<(), SendError<T>>`
- `recv()` 阻塞等待，返回 `Result<T, RecvError>`
- `Sender<T>: Send + Sync`，可以放进 `Arc` 或 clone 后分发给任意线程
- `Receiver<T>: Send` 但**不是** `Sync`，因此接收端通常只留在一个线程里

## 通道的关闭

关闭不是显式调用，而是由**所有权**决定的：

- 所有 `Sender` 都 `drop` 后，通道进入关闭状态
- 关闭前已发送的消息仍可正常接收，取完后 `recv` 返回 `Err(RecvError)`
- 反过来，`Receiver` 被丢弃后，`send` 返回 `Err(SendError)`，失败的值还能取回

```rust
use std::sync::mpsc::{self, RecvError};
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        tx.send(1).unwrap();
        tx.send(2).unwrap();
        // 闭包结束，tx 被 drop，通道关闭
    });

    assert_eq!(rx.recv(), Ok(1));
    assert_eq!(rx.recv(), Ok(2));
    assert_eq!(rx.recv(), Err(RecvError)); // 已关闭且没有剩余消息
}
```

发送失败时可以用 `SendError.0` 取回未发送的值：

```rust
use std::sync::mpsc;

fn main() {
    let (tx, rx) = mpsc::channel();
    drop(rx); // 接收端先消失

    let err = tx.send(42).unwrap_err();
    println!("未发送的值: {}", err.0); // 42
}
```

## 多生产者

`Sender::clone` 让多个线程向同一个通道发送消息，这是 mpsc 名字里「多生产者」的体现：

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();
    let mut handles = Vec::new();

    for id in 0..3 {
        let tx = tx.clone(); // 每个线程一个发送端
        handles.push(thread::spawn(move || {
            tx.send(format!("worker-{id}")).unwrap();
        }));
    }

    drop(tx); // ✅ 主线程必须丢弃自己的 Sender，否则接收端永远等不到关闭

    let mut msgs: Vec<String> = rx.iter().collect(); // 所有 Sender 关闭后迭代结束
    msgs.sort();
    println!("{:?}", msgs); // ["worker-0", "worker-1", "worker-2"]

    for h in handles {
        h.join().unwrap();
    }
}
```

- 多个生产者之间的到达顺序取决于线程调度，不保证与发送调用顺序一致
- 忘记 `drop(tx)` 是初学者最常见的阻塞原因

## 非阻塞接收与超时

| 方法 | 行为 | 返回类型 |
| ---- | ---- | -------- |
| `recv()` | 阻塞直到收到消息或通道关闭 | `Result<T, RecvError>` |
| `try_recv()` | 立即返回，不等待 | `Result<T, TryRecvError>` |
| `recv_timeout(d)` | 最多等待 `d` | `Result<T, RecvTimeoutError>` |

```rust
use std::sync::mpsc::{self, RecvTimeoutError, TryRecvError};
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel::<i32>();

    // 通道打开但暂无消息
    assert_eq!(rx.try_recv(), Err(TryRecvError::Empty));

    tx.send(7).unwrap();
    assert_eq!(rx.try_recv(), Ok(7));
    assert_eq!(rx.try_recv(), Err(TryRecvError::Empty));

    // 最多等待 100ms，超时返回 Timeout 而不是永久阻塞
    match rx.recv_timeout(Duration::from_millis(100)) {
        Ok(v) => println!("收到 {v}"),
        Err(RecvTimeoutError::Timeout) => println!("超时"),
        Err(RecvTimeoutError::Disconnected) => println!("通道已关闭"),
    } // 超时

    drop(tx);
    assert_eq!(rx.try_recv(), Err(TryRecvError::Disconnected));
}
```

- `TryRecvError::Empty` 表示「暂时没有」，通道仍然可用
- `TryRecvError::Disconnected` 表示「永远不会有」，所有发送端都已消失
- 用 `try_recv` 轮询时记得配 `sleep`，空转轮询会白白消耗 CPU

## 有界通道 sync_channel

```rust
use std::sync::mpsc::{self, TrySendError};

fn main() {
    let (tx, rx) = mpsc::sync_channel(1); // 缓冲最多 1 条消息

    tx.try_send(1).unwrap(); // 缓冲未满，发送成功

    match tx.try_send(2) {
        Ok(()) => println!("发送成功"),
        Err(TrySendError::Full(v)) => println!("缓冲已满，未发送 {v}"), // 缓冲已满，未发送 2
        Err(TrySendError::Disconnected(v)) => println!("接收端已关闭，未发送 {v}"),
    }

    println!("{}", rx.recv().unwrap()); // 1
}
```

阻塞式发送适合生产者-消费者流水线：消费慢时自动反压，不会把内存撑爆。

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::sync_channel(2); // 容量 2

    let producer = thread::spawn(move || {
        for i in 0..5 {
            tx.send(i).unwrap(); // 缓冲满时阻塞在这里
            println!("已发送 {i}");
        }
    });

    thread::sleep(Duration::from_millis(50)); // 演示：生产者先把缓冲填满

    for v in rx {
        println!("已接收 {v}");
    }

    producer.join().unwrap();
}
```

- `SyncSender` 也实现了 `Clone`，同样支持多生产者
- `send` 在缓冲满时阻塞；`try_send` 立即返回 `Full`，适合不想等待的场景
- 容量为 `0` 时没有缓冲，发送和接收必须同步完成：

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::sync_channel(0); // 汇合通道

    thread::spawn(move || {
        for i in 1..=3 {
            tx.send(i).unwrap(); // 直到主线程调用 recv 才返回
        }
    });

    for v in rx {
        println!("收到 {v}");
    }
}
```

## 接收端迭代

`Receiver` 实现了 `IntoIterator`，`for msg in rx` 等价于反复 `recv` 直到通道关闭：

```rust
use std::sync::mpsc;

let (tx, rx) = mpsc::channel();

std::thread::spawn(move || {
    for i in 0..3 {
        tx.send(i).unwrap();
    }
});

for msg in rx {
    println!("{msg}"); // 0 1 2，通道关闭后循环自动结束
}
```

- 迭代期间会一直阻塞等待新消息，直到所有 `Sender` 被丢弃
- 只想处理「当前已有消息」时用 `while let Ok(msg) = rx.try_recv()`，但要注意退出条件

## 通道与共享状态对比

Rust 官方文档建议优先考虑消息传递，但两种模型各有适用场景：

| 维度 | `mpsc` 通道 | `Arc<Mutex<T>>` |
| ---- | ----------- | --------------- |
| 通信方向 | 单向：生产者 → 消费者 | 任意线程读写同一份数据 |
| 所有权 | 消息的所有权随发送转移 | 数据位置固定，只共享引用 |
| 耦合程度 | 松，线程只需持有发送端 | 紧，所有线程依赖同一把锁 |
| 常见问题 | 忘记关闭、无界堆积 | 死锁、锁毒化、锁粒度 |
| 适用场景 | 任务分发、事件流、流水线 | 共享配置、计数器、缓存 |

- 通道是**移动**数据；共享状态是**原地修改**数据
- 需要请求-响应双向通信时，用两条通道（请求一条、响应一条）

## 典型模式：工作队列

多个 worker 竞争消费同一批任务。`Receiver` 不能 clone，所以用 `Arc<Mutex<Receiver<T>>>` 让 worker 们共享：

```rust
use std::sync::{mpsc, Arc, Mutex};
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel::<u32>();
    let rx = Arc::new(Mutex::new(rx));
    let mut handles = Vec::new();

    for _ in 0..3 {
        let rx = Arc::clone(&rx);
        handles.push(thread::spawn(move || {
            loop {
                // 只在「取任务」的瞬间持锁，取到后立刻释放，处理任务时不持锁
                let task = {
                    let guard = rx.lock().unwrap();
                    guard.recv()
                };

                match task {
                    Ok(task) => println!("处理任务 {task}"),
                    Err(_) => break, // 所有发送端关闭，worker 退出
                }
            }
        }));
    }

    for task in 0..10 {
        tx.send(task).unwrap();
    }
    drop(tx); // 关闭通道，worker 会依次退出

    for h in handles {
        h.join().unwrap();
    }
}
```

- 同一时刻只有一个 worker 阻塞在 `recv`，但任务处理是并行的
- 若需要「每个 worker 各有一条专属通道」，就为每个 worker 建通道、分别分发
- 生产级线程池通常用 `crossbeam-channel`（支持多消费者、`select`）或 async 运行时自带的通道

## 常见陷阱

| 陷阱 | 后果 | 解决方式 |
| ---- | ---- | -------- |
| 忘记丢弃主线程的 `Sender` | `recv` / `for msg in rx` 永久阻塞 | `drop(tx)` 或缩小作用域 |
| 无界通道生产快于消费 | 消息堆积，内存持续增长 | 改用 `sync_channel(n)` 反压 |
| 同一线程先 `send` 再 `recv`（容量 0） | 自己等自己，死锁 | 发送与接收放到不同线程 |
| 持锁状态处理任务 | worker 全部串行，甚至死锁 | 取到任务后立即释放锁 |
| `send` 后继续使用原值 | 编译错误：所有权已转移 | 发送前 `clone` 或发送后不再使用 |
| 用 `try_recv` 忙轮询 | CPU 占满 | 改用 `recv` / `recv_timeout` |

```rust
use std::sync::mpsc;

fn main() {
    // ❌ 容量 0 的通道在同一线程先 send：没有接收者，立即死锁
    let (tx, rx) = mpsc::sync_channel(0);
    // tx.send(1).unwrap();
    // println!("{}", rx.recv().unwrap());

    // ✅ 后台线程接收，主线程发送
    let (tx2, rx2) = mpsc::sync_channel(0);
    std::thread::spawn(move || println!("{}", rx2.recv().unwrap()));
    tx2.send(1).unwrap();
}
```

## 错误类型一览

| 类型 | 产生方法 | 变体 / 字段 | 含义 |
| ---- | -------- | ----------- | ---- |
| `SendError<T>` | `send` | `.0: T` | 接收端已关闭，可取回未发送的值 |
| `TrySendError<T>` | `try_send` | `Full(T)` / `Disconnected(T)` | 缓冲满 / 接收端已关闭 |
| `RecvError` | `recv` | 无字段 | 所有发送端已关闭且无剩余消息 |
| `TryRecvError` | `try_recv` | `Empty` / `Disconnected` | 暂无消息 / 通道已关闭 |
| `RecvTimeoutError` | `recv_timeout` | `Timeout` / `Disconnected` | 等待超时 / 通道已关闭 |

## 总结

- `mpsc::channel()` 无界，`send` 不阻塞；`sync_channel(n)` 有界，满时阻塞以反压生产者
- `Sender` 可 `clone`、可跨线程；`Receiver` 唯一且非 `Sync`，通常固定在消费线程
- 消息发送转移所有权；所有 `Sender` 被丢弃后通道关闭，`recv` 返回 `Err`
- `try_recv` 非阻塞，`recv_timeout` 限时等待，`for msg in rx` 迭代到通道关闭
- 多 worker 消费同一通道用 `Arc<Mutex<Receiver<T>>>`，取任务后应立即释放锁
- 无界通道要警惕内存堆积；容量 0 的通道要保证发送与接收在不同线程
