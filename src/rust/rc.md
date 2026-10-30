# Rc\<T\>

## 简介

- `Rc<T>`（Reference Counting）是**引用计数**智能指针
- 让同一个值拥有**多个所有者**，通过共享不可变引用来访问数据
- 数据存放在堆上，`Rc` 指针存放在栈上，同时维护一份引用计数
- 每次 `clone` 只增加计数，值离开作用域时计数减一，归零时自动释放数据
- 仅适用于**单线程**场景，多线程共享数据需使用 `Arc<T>`

```text
a: Rc<T> ─┐
           ├──> 堆: [strong = 2 | value: T]
b: Rc<T> ─┘
```

## 基本使用

```rust
use std::rc::Rc;

fn main() {
    let a = Rc::new(String::from("hello")); // 堆上数据，引用计数为 1
    let b = Rc::clone(&a); // 引用计数加一
    let c = Rc::clone(&a); // 引用计数再加一

    println!("计数: {}", Rc::strong_count(&a)); // 3
    println!("{}", a); // a、b、c 访问的是同一份数据
    println!("{}", b);
    println!("{}", c);
}
```

## 共享所有权

多个列表共享同一段尾部数据（链表、图结构等场景）：

```rust
use std::rc::Rc;

#[derive(Debug)]
enum List {
    Cons(i32, Rc<List>),
    Nil,
}

fn main() {
    use List::{Cons, Nil};

    // 被共享的尾部：5 -> 10
    let a = Rc::new(Cons(5, Rc::new(Cons(10, Rc::new(Nil)))));
    println!("a 的引用计数: {}", Rc::strong_count(&a)); // 1

    let b = Cons(3, Rc::clone(&a)); // b 共享 a
    let c = Cons(4, Rc::clone(&a)); // c 也共享 a
    println!("a 的引用计数: {}", Rc::strong_count(&a)); // 3
}
```

```text
b: 3 ─┐
       ├──> a: 5 -> 10 -> Nil
c: 4 ─┘
```

- `Rc<List>` 代替 `Box<List>` 后，`a` 可以被 `b`、`c` 同时持有，而不是被移动

## Rc::clone 与 .clone()

- `Rc::clone(&a)` 与 `a.clone()` 完全等价，都只增加引用计数，不复制堆上的数据
- 推荐使用 `Rc::clone`：让人明确知道这是引用计数的克隆，而不是数据的深拷贝

## 引用计数与自动释放

- `Rc::strong_count(&rc)`：查看强引用计数
- `Rc::weak_count(&rc)`：查看弱引用计数
- `Rc` 实现了 `Drop`：强引用计数归零时自动释放堆上的数据

```rust
use std::rc::Rc;

fn main() {
    let a = Rc::new(5);
    println!("{}", Rc::strong_count(&a)); // 1

    {
        let b = Rc::clone(&a);
        println!("{}", Rc::strong_count(&a)); // 2
    } // b 离开作用域，计数减一

    println!("{}", Rc::strong_count(&a)); // 1
} // a 离开作用域，计数归零，数据被释放
```

## 不可变共享

- `Rc<T>` 只允许共享**不可变**引用，无法通过 `Rc` 获得 `&mut T`
- 这一限制在编译期杜绝了数据竞争，也是 `Rc` 只适用于单线程的原因之一
- 需要修改共享数据时，配合 `RefCell<T>` 使用内部可变性：

```rust
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let value = Rc::new(RefCell::new(5));
    let a = Rc::clone(&value);
    let b = Rc::clone(&value);

    *a.borrow_mut() += 1; // 通过 RefCell 修改共享数据
    println!("{}", b.borrow()); // 6
    println!("{}", Rc::strong_count(&value)); // 3
}
```

## 与 Box 对比

| 特性 | `Box<T>` | `Rc<T>` |
| ---- | -------- | ------- |
| 所有者数量 | 仅 1 个 | 多个 |
| 引用计数 | 无 | 有 |
| 克隆行为 | 转移所有权 | 增加引用计数 |
| 共享可变性 | 独享时可 `&mut` | 只能共享不可变引用 |
| 跨线程 | 可（`T: Send`） | 不可 |

## 注意事项

- `Rc<T>` 不是线程安全的，不能跨线程传递，多线程场景使用 `Arc<T>`
- 循环引用会让引用计数无法归零，导致内存泄漏，用 `Weak<T>`（`Rc::downgrade`）打破循环
- `Rc::clone` 不会深拷贝数据，克隆成本极低
- 若确定只剩一个强引用，可以用 `Rc::try_unwrap` 取回内部数据的所有权