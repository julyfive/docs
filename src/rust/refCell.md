# RefCell\<T\>

## 简介

- `RefCell<T>`（Reference Cell）是**内部可变性**（Interior Mutability）智能指针
- 允许在持有**不可变引用**时修改内部数据，突破编译期借用检查的限制
- 借用规则改为在**运行时**检查：同一时刻要么多个不可变借用，要么一个可变借用
- 违反借用规则时会 **panic**，而不是编译错误
- 数据存放在堆上，`RefCell` 存放在栈上，内部维护当前的借用状态
- 仅适用于**单线程**场景，多线程共享可变数据需使用 `Mutex<T>`

```text
cell: RefCell<T> ──> 堆: [借用状态 | value: T]
```

## 内部可变性

- 编译期借用检查有局限：编译器无法证明某些场景下借用是安全的，即使代码本身没有问题
- `RefCell<T>` 在内部用 `unsafe` 封装，把借用检查从编译期推迟到运行时
- 对外只暴露 `&self` 方法（`borrow`、`borrow_mut`），因此可以穿过不可变引用修改内部数据

```rust
use std::cell::RefCell;

fn main() {
    // value 本身是不可变的
    let value = RefCell::new(5);

    *value.borrow_mut() += 1; // 仍然可以修改内部数据
    println!("{}", value.borrow()); // 6
}
```

## 基本使用

| 方法 | 返回类型 | 说明 |
| ---- | -------- | ---- |
| `borrow()` | `Ref<T>` | 取得不可变借用 |
| `borrow_mut()` | `RefMut<T>` | 取得可变借用 |
| `try_borrow()` | `Result<Ref<T>, BorrowError>` | 借用失败返回 `Err`，不 panic |
| `try_borrow_mut()` | `Result<RefMut<T>, BorrowMutError>` | 借用失败返回 `Err`，不 panic |
| `into_inner()` | `T` | 消费 `RefCell`，取出内部数据 |
| `replace(value)` | `T` | 替换内部数据并返回旧值 |
| `swap(other)` | `()` | 与另一个 `RefCell` 交换内部数据 |

- `Ref<T>` 与 `RefMut<T>` 分别通过 `Deref` / `DerefMut` 提供对内部数据的访问
- 两者离开作用域时自动释放借用

```rust
use std::cell::RefCell;

fn main() {
    let value = RefCell::new(String::from("hello"));

    let r = value.borrow(); // 不可变借用
    println!("{}", r.len()); // 5，通过 Deref 调用 str 的方法
    drop(r); // 显式释放借用，否则后续 borrow_mut 会 panic

    let mut w = value.borrow_mut(); // 可变借用
    w.push_str(" world"); // 通过 DerefMut 修改数据
    drop(w);

    println!("{}", value.into_inner()); // hello world
}
```

## 运行时借用检查

- 规则与编译期借用检查一致：同一时刻要么多个 `Ref`，要么一个 `RefMut`
- 借用计数在 `Ref` / `RefMut` 创建时加一、释放时减一

```rust
use std::cell::RefCell;

fn main() {
    let value = RefCell::new(5);

    let a = value.borrow(); // 不可变借用 1
    let b = value.borrow(); // 不可变借用 2，可以共存
    println!("{} {}", a, b);
    drop(a);
    drop(b);

    let c = value.borrow_mut(); // 所有不可变借用释放后，可变借用成功
    println!("{}", c); // 5
}
```

可变借用与不可变借用同时存在时，运行时 panic：

```rust
use std::cell::RefCell;

fn main() {
    let value = RefCell::new(5);

    let _a = value.borrow();
    let _b = value.borrow_mut(); // panic: RefCell already borrowed
}
```

```text
borrow_mut() 冲突 -> RefCell already borrowed
borrow() 冲突 -> RefCell already mutably borrowed
```

- 用 `try_borrow` / `try_borrow_mut` 替代可返回 `Result`，避免 panic：

```rust
use std::cell::RefCell;

fn main() {
    let value = RefCell::new(5);

    let _a = value.borrow();
    assert!(value.try_borrow_mut().is_err()); // 返回 Err，不会 panic
}
```

## RefCell 与 Rc 组合

- `Rc<T>` 提供多个所有者，但只能共享**不可变**数据
- `Rc<RefCell<T>>`：多个所有者 + 可修改共享数据，是单线程下的常见组合

```rust
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let value = Rc::new(RefCell::new(5));

    let a = Rc::clone(&value);
    let b = Rc::clone(&value);

    *a.borrow_mut() += 10; // 通过 a 修改共享数据
    *b.borrow_mut() *= 2; // 通过 b 修改同一份数据

    println!("{}", value.borrow()); // 30
    println!("{}", Rc::strong_count(&value)); // 3
}
```

- 数据被修改后，所有持有者都能观察到新值
- 典型场景：多所有者共享的配置、图结构中的节点、回调中修改外部状态

## Cell 与 RefCell 对比

两者都属于 `std::cell`，都提供内部可变性：

| 特性 | `Cell<T>` | `RefCell<T>` |
| ---- | --------- | ------------ |
| 取值方式 | `get` 返回**副本**（要求 `T: Copy`） | `borrow` 返回 `Ref<T>`，不复制数据 |
| 修改方式 | `set` 整体替换 | `borrow_mut` 原地修改 |
| 借用计数 | 无 | 有，运行时检查 |
| 违反规则 | 不会 panic | 运行时 panic |
| 适用类型 | 简单 `Copy` 类型 | 任意类型（`String`、`Vec` 等） |

## 注意事项

- 借用冲突的 panic 无法在编译期发现，可用 `try_borrow` / `try_borrow_mut` 优雅处理
- 运行时借用计数有轻微性能开销，错误从编译期推迟到运行时，非必要优先使用编译期借用检查
- 一个借用只要**未释放**（即使之后不再使用）就会参与计数，与其他借用冲突导致 panic，可用 `drop` 或缩小作用域避免
- `RefCell<T>` 未实现 `Sync`，不是线程安全的，多线程共享可变数据用 `Mutex<T>` / `RwLock<T>`
- `Rc<RefCell<T>>` 同样不能跨线程，多线程对应组合是 `Arc<Mutex<T>>`
