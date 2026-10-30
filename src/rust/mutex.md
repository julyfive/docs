# Mutex\<T\>

`Mutex<T>`（Mutual Exclusion，互斥锁）是 `std::sync` 提供的同步原语。与 C 语言里「锁和数据分离」不同，Rust 的 `Mutex` **拥有**内部数据：不先拿到锁，就没有任何途径访问数据，因此「忘记加锁」在编译期就不可能发生。

- `lock()` 获取锁，返回守卫 `MutexGuard<T>`，通过 `Deref` / `DerefMut` 读写内部数据
- 守卫离开作用域时自动释放锁，不会忘记 `unlock`
- `Mutex` 不可重入：同一线程重复 `lock` 可能死锁，也可能直接 panic
- 持锁线程 panic 会让锁「中毒」，后续 `lock()` 返回 `Err(PoisonError)`
- 单线程的 `Rc<RefCell<T>>` 对应多线程的 `Arc<Mutex<T>>`

```text
线程 A ──lock()──> MutexGuard ──┐
                               ├──> T（临界区，同一时刻只有一个线程）
线程 B ──lock()──> 阻塞等待 ────┘     A 的守卫 drop 后 B 才能进入
```

## 基本使用

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(5); // Rust 1.63 起是 const fn

    {
        let mut guard = m.lock().unwrap(); // 拿到锁，返回守卫
        *guard += 1; // 通过 DerefMut 修改内部数据
        println!("{}", *guard); // 6
    } // 作用域结束，guard 被 drop，锁自动释放

    println!("{}", *m.lock().unwrap()); // 6
}
```

- `Mutex::new` 是 `const fn`，可直接用于 `static` 初始化
- `Mutex<T>` 在 `T: Send` 时实现 `Sync`，是最典型的跨线程共享可变状态方案
- 锁不保证公平：等待线程的唤醒顺序由操作系统调度决定

常用 API：

| 方法 | 返回类型 | 说明 |
| ---- | -------- | ---- |
| `new(value)` | `Mutex<T>` | 创建锁并接管数据，`const fn` |
| `lock()` | `LockResult<MutexGuard<T>>` | 阻塞直到拿到锁，中毒时返回 `Err` |
| `try_lock()` | `TryLockResult<MutexGuard<T>>` | 不阻塞，拿不到返回 `Err(WouldBlock)` |
| `get_mut()` | `LockResult<&mut T>` | 需要 `&mut Mutex<T>`，不加锁直接访问 |
| `into_inner()` | `LockResult<T>` | 消费 `Mutex`，取回内部数据 |
| `is_poisoned()` | `bool` | 是否处于中毒状态 |
| `clear_poison()` | `()` | 清除中毒标记（Rust 1.77 起） |

## MutexGuard 守卫

- 守卫既是「访问数据的凭证」，也是「锁的持有者」，两者绑定在一起
- 生命周期绑定到 `&Mutex`，守卫存活期间锁一直被占用
- `MutexGuard` 是 `!Send`，不能跨线程传递
- 提前释放可以用 `drop(guard)`，或把临界区放进单独的块作用域

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(String::from("hello"));

    let mut g = m.lock().unwrap();
    g.push_str(" world");
    drop(g); // 显式释放锁，否则下面的 lock 会一直阻塞

    println!("{}", *m.lock().unwrap()); // hello world
}
```

- 临时守卫只存活到语句结束：`m.lock().unwrap().push(1);` 执行完立刻解锁
- 把守卫命名为 `_` 会立即丢弃，写成 `_guard` 才会持有到作用域结束

## try_lock 非阻塞加锁

- `try_lock` 成功返回守卫，锁被占用时立即返回 `Err(TryLockError::WouldBlock)`
- 锁已中毒时返回 `Err(TryLockError::Poisoned(PoisonError))`
- 标准库允许 `try_lock` 虚假失败（spurious failure），重试逻辑要能接受

```rust
use std::sync::{Mutex, TryLockError};

fn main() {
    let m = Mutex::new(1);
    let guard = m.lock().unwrap(); // 本线程先占住锁

    match m.try_lock() {
        Ok(_) => println!("拿到锁"),
        Err(TryLockError::WouldBlock) => println!("锁已被占用，不等待"), // ✅
        Err(TryLockError::Poisoned(_)) => println!("锁已中毒"),
    }

    drop(guard);
    assert!(m.try_lock().is_ok()); // 释放后立刻成功
}
```

- 标准库的锁**没有** `lock_timeout`，需要超时就自己用 `try_lock` + `sleep` 轮询，或改用 `parking_lot`

## 锁毒化 PoisonError

- 「毒化」是标准库对 panic 的补偿：持锁线程 panic 时，数据可能只写到一半
- 毒化标记保存在 `Mutex` 中，之后 `lock()` / `try_lock()` / `get_mut()` 都会返回 `Err`
- `PoisonError::into_inner()` 返回**守卫**（不是数据），拿到后即可继续访问
- `clear_poison()` 清除标记，让锁恢复正常
- 直接 `unwrap()` 会让当前线程跟着 panic，等于把错误扩散出去

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let m = Arc::new(Mutex::new(0));

    let m2 = Arc::clone(&m);
    let _ = thread::spawn(move || {
        let mut g = m2.lock().unwrap();
        *g = 1;
        panic!("持锁时 panic"); // 栈展开时守卫被 drop，同时把锁标记为中毒
    })
    .join(); // 忽略子线程的 panic 结果

    assert!(m.is_poisoned());

    // 方案一：接受毒化，取出守卫继续使用
    let guard = m.lock().unwrap_or_else(|e| e.into_inner());
    println!("{}", *guard); // 1
    drop(guard);

    // 方案二：清除标记，之后 lock() 恢复正常
    m.clear_poison();
    assert!(m.lock().is_ok());
}
```

- `parking_lot::Mutex` 不提供中毒机制，`lock()` 直接返回守卫，用起来更省事

## get_mut 与 into_inner

- `get_mut()` 需要 `&mut Mutex<T>`：既然拿到了独占引用，就不可能有并发，因此无需加锁
- `into_inner()` 消费锁并取回数据，同理无需加锁
- 两者在锁中毒时都返回 `Err`，直接 `unwrap()` 会 panic

```rust
use std::sync::Mutex;

fn main() {
    let mut m = Mutex::new(vec![1, 2, 3]);

    m.get_mut().unwrap().push(4); // 独占引用，直接修改

    let v = m.into_inner().unwrap(); // 拆掉锁，拿回数据
    println!("{:?}", v); // [1, 2, 3, 4]
}
```

## static 中的全局锁

- `Mutex::new` 是 `const fn`，可以直接定义在 `static` 上，不需要 `lazy_static` / `OnceLock`
- 适合计数器、配置表、连接池这类全局可变状态

```rust
use std::sync::Mutex;

static COUNTER: Mutex<u32> = Mutex::new(0);

fn main() {
    *COUNTER.lock().unwrap() += 1;
    println!("{}", *COUNTER.lock().unwrap()); // 1
}
```

- `static` 要求类型实现 `Sync`，`Mutex<T>` 在 `T: Send` 时满足这一要求

## Arc\<Mutex\<T\>\>：多线程共享可变数据

- `Mutex` 不实现 `Clone`，多所有者必须交给 `Arc`
- `Arc` 负责「谁都能持有」，`Mutex` 负责「同一时刻只有一个能改」
- 显式写 `Arc::clone(&x)`，不要写 `x.clone()`，避免误以为克隆了内部数据

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
        })); // 闭包结束，守卫 drop，锁释放
    }

    for h in handles {
        h.join().unwrap();
    }

    println!("{}", *counter.lock().unwrap()); // 10
}
```

用 `thread::scope` 时线程可以借用外部的锁，连 `Arc` 都能省掉：

```rust
use std::sync::Mutex;
use std::thread;

fn main() {
    let counter = Mutex::new(0);

    thread::scope(|s| {
        for _ in 0..10 {
            s.spawn(|| *counter.lock().unwrap() += 1); // 借用外部 Mutex，无需 Arc
        }
    });

    println!("{}", counter.into_inner().unwrap()); // 10
}
```

## 死锁与锁粒度

死锁的三个常见来源：

- 单线程重复加锁：`Mutex` 不可重入
- 多把锁的加锁顺序相反（ABBA 死锁）
- 持锁时执行耗时操作（IO、`sleep`、`join`），把其他线程全部拖住

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(1);

    let _a = m.lock().unwrap();
    let _b = m.lock().unwrap(); // ❌ 不可重入：第二次 lock 永远等不到
}
```

ABBA 场景：

```text
线程 1: lock(A) ──> lock(B) 等待
线程 2: lock(B) ──> lock(A) 等待   ❌ 互相等待，永久阻塞
```

- 解决方式：全局约定固定的加锁顺序（例如按 id 排序后依次加锁）
- 临界区只放真正需要互斥的代码，计算、IO、日志都挪到锁外

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let data = Arc::new(Mutex::new(vec![1, 2, 3]));
    let d = Arc::clone(&data);

    thread::spawn(move || {
        let extra: Vec<i32> = (4..=100).collect(); // 与共享数据无关的计算放在锁外
        d.lock().unwrap().extend(extra); // 临界区只保留必须互斥的部分
    })
    .join()
    .unwrap();

    println!("{}", data.lock().unwrap().len()); // 100
}
```

## Mutex、RwLock 与原子类型

| 方案 | 适用场景 | 说明 |
| ---- | -------- | ---- |
| `Mutex<T>` | 读写都需要，临界区短 | 最简单可靠，任何类型都能保护 |
| `RwLock<T>` | 读多写少 | 多个读者并发，写者独占；开销通常高于 `Mutex` |
| `AtomicUsize` / `AtomicBool` | 单个整数、标志位 | 无锁，最简单场景下最快 |
| `mpsc` 通道 | 消息、任务分发 | 转移所有权而不是共享内存 |

- 单纯计数优先用原子类型，`Arc<Mutex<usize>>` 属于杀鸡用牛刀
- `RwLock` 只在读远多于写时才有优势，读写各半时 `Mutex` 往往更快也更简单
- 选型先看正确性，再看临界区长度，最后才谈性能

## Mutex 与 Condvar

- `Condvar`（条件变量）让线程在「条件不满足」时挂起，而不是循环加锁轮询
- `wait(guard)` 会**原子地**释放锁并休眠，被唤醒后重新加锁，返回新的守卫
- 必须用 `while` 循环重新检查条件：被唤醒不等于条件成立（虚假唤醒、条件可能被其他线程抢先改掉）
- `notify_one` 唤醒一个等待者，`notify_all` 唤醒全部等待者

```rust
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::Duration;

fn main() {
    let pair = Arc::new((Mutex::new(false), Condvar::new()));

    let p = Arc::clone(&pair);
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(50));
        let (lock, cvar) = &*p;
        *lock.lock().unwrap() = true; // 修改条件
        cvar.notify_one(); // 唤醒等待者
    });

    let (lock, cvar) = &*pair;
    let mut ready = lock.lock().unwrap();
    while !*ready {
        ready = cvar.wait(ready).unwrap(); // 释放锁并休眠，醒来后重新加锁
    }

    println!("收到通知"); // 收到通知
}
```

- 把 `while` 写成 `if`，可能在条件不成立时继续往下执行；需要超时就用 `wait_timeout`

## 常见错误一览

| 错误场景 | 说明 |
| -------- | ---- |
| 同一线程重复 `lock` | 不可重入，可能死锁或 panic |
| 守卫作用域过大 | 其他线程全程排队，应尽早 `drop` 或缩小临界区 |
| 跨线程移动 `MutexGuard` | 守卫是 `!Send`，编译期报错 |
| 跨 `.await` 持有标准库守卫 | future 变成 `!Send`，无法 `tokio::spawn`；用 `tokio::sync::Mutex` 或缩短临界区 |
| 持锁期间 panic | 锁中毒，后续 `lock()` 返回 `Err` |
| 试图 `clone` 一个 `Mutex` | 未实现 `Clone`，共享要用 `Arc` |
| 多锁加锁顺序不一致 | ABBA 死锁，应约定全局顺序 |

临时守卫的误解值得单独演示：

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(vec![]);

    // 守卫是临时值，语句结束即释放，并不会一直持锁
    m.lock().unwrap().push(1);
    m.lock().unwrap().push(2);

    println!("{:?}", m.lock().unwrap()); // [1, 2]
}
```

## 总结

- `Mutex<T>` 把数据和锁绑定在一起，`lock()` 成功后才拿到访问权，守卫自动解锁
- 尽量缩小临界区，用块作用域或 `drop` 提前释放，避免持锁做 IO
- 多线程共享可变状态用 `Arc<Mutex<T>>`，`thread::scope` 下可直接借用，无需 `Arc`
- 锁不可重入，panic 会中毒；中毒后可用 `into_inner` / `clear_poison` 处理
- 只读共享用 `Arc`，简单计数用原子类型，读多写少用 `RwLock`，传递消息用通道
- 异步代码不要跨 `.await` 持有标准库守卫，必要时改用异步锁
