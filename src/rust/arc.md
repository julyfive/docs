# Arc\<T\>

`Arc<T>`（Atomic Reference Counting）是 `std::sync` 提供的**原子引用计数**智能指针，可以看作 `Rc<T>` 的多线程版本。多个所有者共享同一份堆上数据，计数的增减使用原子操作，因此 `clone` 可以安全地跨线程进行。

- 引用计数存放在堆上的控制块中，`clone` 只让计数加一，不复制数据
- 只能共享**不可变**数据，要修改需配合 `Mutex` / `RwLock`
- `Arc<T>` 在 `T: Send + Sync` 时才实现 `Send` / `Sync`，才能跨线程
- 原子操作比普通整数略慢，单线程场景应使用 `Rc`
- 与 `Rc` 一样，强引用成环会导致内存泄漏，用 `Weak` 打破

```text
线程 A: Arc<T> ─┐
                ├──> 堆: [strong: AtomicUsize = 2 | weak | value: T]
线程 B: Arc<T> ─┘
```

## 基本使用

```rust
use std::sync::Arc;

fn main() {
    let a = Arc::new(String::from("hello")); // 堆上数据，强引用计数为 1
    let b = Arc::clone(&a); // 计数加一
    let c = Arc::clone(&a); // 计数再加一

    println!("计数: {}", Arc::strong_count(&a)); // 3
    println!("{} {} {}", a, b, c); // 三个指针访问同一份数据
}
```

常用 API：

| 方法 | 返回类型 | 说明 |
| ---- | -------- | ---- |
| `new(value)` | `Arc<T>` | 堆上分配，强引用计数初始为 1 |
| `clone(&arc)` | `Arc<T>` | 计数加一，不复制数据 |
| `strong_count(&arc)` | `usize` | 当前强引用数量 |
| `weak_count(&arc)` | `usize` | 当前弱引用数量 |
| `downgrade(&arc)` | `Weak<T>` | 创建弱引用 |
| `ptr_eq(&a, &b)` | `bool` | 是否指向同一份分配 |
| `get_mut(&mut arc)` | `Option<&mut T>` | 唯一所有者时取得可变引用 |
| `try_unwrap(arc)` | `Result<T, Arc<T>>` | 唯一所有者时取出内部数据 |
| `make_mut(&mut arc)` | `&mut T` | 存在共享时先克隆再修改（写时复制） |

## Arc::clone 与 .clone()

- `Arc::clone(&a)` 与 `a.clone()` 完全等价，都只增加引用计数，不复制堆上的数据
- 推荐使用 `Arc::clone`：让人明确知道这是引用计数的克隆，而不是数据的深拷贝
- 两者都不是零成本：每次 clone 都是一次原子操作

```rust
use std::sync::Arc;

fn main() {
    let a = Arc::new(vec![1, 2, 3]);
    let b = Arc::clone(&a); // ✅ 明确表达「共享同一份数据」

    assert!(Arc::ptr_eq(&a, &b)); // 指向同一份分配
    println!("{}", Arc::strong_count(&a)); // 2
}
```

## 引用计数与自动释放

- `Arc::strong_count(&arc)`：强引用数量，归零时释放数据
- `Arc::weak_count(&arc)`：弱引用数量，不影响数据寿命
- 最后一个 `Arc` 被丢弃时，内部执行 `drop(T)`，控制块留给仍存活的 `Weak`

```rust
use std::sync::Arc;

fn main() {
    let a = Arc::new(5);
    println!("{}", Arc::strong_count(&a)); // 1

    {
        let b = Arc::clone(&a);
        println!("{}", Arc::strong_count(&a)); // 2
    } // b 离开作用域，计数减一

    println!("{}", Arc::strong_count(&a)); // 1
} // 计数归零，堆上数据被释放
```

- 计数是**瞬时快照**，其他线程随时可能 `clone` 或 `drop`，不能用它判断「是否唯一」，这种场景应该用 `get_mut` / `try_unwrap`

## 跨线程共享所有权

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    let data = Arc::new(vec![1, 2, 3]);
    let mut handles = Vec::new();

    for _ in 0..3 {
        let data = Arc::clone(&data);
        handles.push(thread::spawn(move || data.iter().sum::<i32>()));
    }

    let total: i32 = handles.into_iter().map(|h| h.join().unwrap()).sum();
    println!("{total}"); // 18
    println!("{}", data.len()); // 3，主线程的 Arc 仍然有效
}
```

- 每个线程持有一个 `Arc` 副本，最后一个副本被丢弃时数据才释放
- 只读共享不需要加锁，这是 `Arc` 最典型的用途
- `move` 闭包捕获的是 `Arc` 的副本；若直接移走原变量，主线程之后就不能再用了

`thread::scope` 创建的线程可以直接借用外部的 `Arc`，连 `clone` 都省了：

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    let data = Arc::new(vec![1, 2, 3]);

    thread::scope(|s| {
        s.spawn(|| println!("{}", data.len())); // 3
        s.spawn(|| println!("{}", data.iter().sum::<i32>())); // 6
    });
}
```

## Arc 与内部可变性

- `Arc<T>` 与 `Rc<T>` 一样只提供 `&T`，无法直接修改共享数据
- 需要修改时组合 `Mutex` / `RwLock`，写成 `Arc<Mutex<T>>`、`Arc<RwLock<T>>`
- `Arc<RefCell<T>>` 不能跨线程：`RefCell<T>` 未实现 `Sync`，`Arc<RefCell<T>>` 也就不是 `Send`

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = Vec::new();

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            *counter.lock().unwrap() += 1;
        }));
    }

    for h in handles {
        h.join().unwrap();
    }

    println!("{}", *counter.lock().unwrap()); // 10
}
```

- `Arc` 负责「多所有者」，`Mutex` 负责「互斥修改」，锁的细节见 Mutex 章节
- 只读为主、偶尔写入时用 `Arc<RwLock<T>>` 并发度更高

## Weak：弱引用与循环引用

- `Arc::downgrade(&arc)` 生成 `Weak<T>`，**不增加**强引用计数，不会延长数据寿命
- `Weak::upgrade()` 尝试升级为 `Arc<T>`，数据已被释放时返回 `None`
- 适合表达「单向的、非拥有关系」，例如子节点指向父节点
- 强引用互相指向会形成环，计数永远不为 0，内存泄漏

```rust
use std::sync::{Arc, Mutex, Weak};

struct Node {
    name: &'static str,
    parent: Mutex<Weak<Node>>, // 指向父节点：弱引用
    children: Mutex<Vec<Arc<Node>>>, // 持有子节点：强引用
}

fn main() {
    let parent = Arc::new(Node {
        name: "parent",
        parent: Mutex::new(Weak::new()),
        children: Mutex::new(Vec::new()),
    });

    let child = Arc::new(Node {
        name: "child",
        parent: Mutex::new(Arc::downgrade(&parent)),
        children: Mutex::new(Vec::new()),
    });

    parent.children.lock().unwrap().push(Arc::clone(&child));

    println!("parent 计数: {}", Arc::strong_count(&parent)); // 1
    println!("child 计数: {}", Arc::strong_count(&child)); // 2

    drop(parent); // parent 归零被释放，其 children 中的 child 也随之释放

    println!("child 计数: {}", Arc::strong_count(&child)); // 1
    let p = child.parent.lock().unwrap().upgrade();
    println!("父节点还在吗: {}", p.is_some()); // false
    println!("{}", child.name); // child
}
```

- 若把 `parent` 字段改成 `Arc<Node>`，`drop(parent)` 之后两个节点的计数都不会归零，两份数据永远不会释放
- `Weak::new()` 创建一个空弱引用，`upgrade` 永远返回 `None`

## 唯一所有权：get_mut、try_unwrap 与 make_mut

- `get_mut(&mut arc)`：只有**没有**其他 `Arc` / `Weak` 引用时才返回 `Some(&mut T)`
- `try_unwrap(arc)`：强引用计数为 1 时取出 `T`，否则原样返回 `Err(arc)`
- `make_mut(&mut arc)`：需要 `T: Clone`，存在共享时先克隆一份再修改（写时复制）

```rust
use std::sync::Arc;

fn main() {
    let mut a = Arc::new(String::from("hello"));

    // 唯一所有者，直接原地修改，不发生克隆
    Arc::make_mut(&mut a).push_str(" world");
    println!("{}", a); // hello world

    let b = Arc::clone(&a); // 出现第二个所有者
    Arc::make_mut(&mut a).push('!'); // 写时复制：a 指向新数据，b 保持原值

    println!("a = {}", a); // a = hello world!
    println!("b = {}", b); // b = hello world

    // b 是旧数据的唯一强引用，可以取回内部数据
    match Arc::try_unwrap(b) {
        Ok(s) => println!("取回: {s}"), // 取回: hello world
        Err(_) => println!("还有其他持有者"),
    }
}
```

`get_mut` 只在独占时可用：

```rust
use std::sync::Arc;

fn main() {
    let mut a = Arc::new(vec![1, 2, 3]);
    assert!(Arc::get_mut(&mut a).is_some()); // 唯一所有者

    let b = Arc::clone(&a);
    assert!(Arc::get_mut(&mut a).is_none()); // 有共享，拿不到 &mut

    drop(b);
    assert!(Arc::get_mut(&mut a).is_some()); // 共享消失后恢复
}
```

- `try_unwrap` 只检查强引用计数，即使存在 `Weak` 也能成功，但旧分配之后无法再升级

## 与 Rc、Box 对比

| 特性 | `Box<T>` | `Rc<T>` | `Arc<T>` |
| ---- | -------- | ------- | -------- |
| 所有者数量 | 仅 1 个 | 多个 | 多个 |
| 引用计数 | 无 | 普通整数 | 原子整数 |
| 跨线程 | `T: Send` 时可 | 不可（`!Send`） | `T: Send + Sync` 时可 |
| 共享可变性 | 独占时可 `&mut` | `Rc<RefCell<T>>` | `Arc<Mutex<T>>` |
| 性能开销 | 最小 | 计数略快 | 原子操作略慢 |

- `Box` 是独占所有权，没有计数开销
- `Rc` 与 `Arc` 的 API 几乎一一对应，主要差别就在线程安全与原子开销

## 常见错误

| 错误场景 | 说明 |
| -------- | ---- |
| 用 `Arc` 直接修改数据 | 只能得到 `&T`，修改需 `Mutex` / `RwLock` |
| `Arc<RefCell<T>>` 跨线程 | `RefCell<T>` 不是 `Sync`，`Arc` 也不是 `Send` |
| 以为 `a.clone()` 是深拷贝 | 只是计数加一，两者指向同一份数据 |
| 用 `strong_count` 判断唯一 | 多线程下计数随时变化，应用 `get_mut` / `try_unwrap` |
| 强引用成环 | 计数永不为 0，用 `Weak` 打破 |
| 单线程使用 `Arc` | 白付原子开销，应使用 `Rc` |

```rust
use std::sync::Arc;

fn main() {
    let a = Arc::new(vec![1, 2, 3]);
    let b = a.clone(); // 不是深拷贝

    // a.push(4); // ❌ 编译错误：cannot borrow data in an `Arc` as mutable
    println!("{:?}", b); // b 与 a 共享同一份数据
}
```

## 注意事项

- `Arc` 只解决「多所有者」，不解决「可变」，两者要分开思考：`Arc` + `Mutex` / `RwLock` / 原子类型
- 原子计数的开销只有在高频 `clone` / `drop` 时才明显，不要为了省它写出难以维护的代码
- `Weak` 适合缓存、父子结构、观察者等「不拥有」的关系
- 循环引用在 `Arc<Mutex<...>>` 组合下更隐蔽，设计数据结构时先想清楚谁拥有谁

## 总结

- `Arc<T>` 是原子引用计数智能指针，多个所有者共享同一份堆上数据，可跨线程
- `Arc::clone` 只增加计数；最后一个强引用被丢弃时数据释放，`Weak` 不影响寿命
- 共享可变状态用 `Arc<Mutex<T>>`，读多写少用 `Arc<RwLock<T>>`
- 父子等双向关系用 `Weak` 打破循环，避免内存泄漏
- 独占时可以 `get_mut` / `try_unwrap` 免拷贝访问，`make_mut` 提供写时复制
- 单线程优先 `Rc`，独占优先 `Box`，`Arc` 只用在真正需要跨线程共享的场景
