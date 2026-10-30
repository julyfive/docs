# Box\<T\>

## 简介

- `Box<T>` 是最简单的智能指针
- 将数据存储在堆上，栈上只保留一个固定大小的指针
- 除了数据存放位置改变，行为与普通值一致，无额外性能开销
- 离开作用域时自动释放堆上的数据

```text
Box<T>（通常在栈上）:         堆上:
+------+                    +------+
| ptr  |------------------->|  T   |
+------+                    +------+
```

## 基本使用

```rust
fn main() {
    let b = Box::new(5); // 值 5 存储在堆上
    println!("b = {}", b); // 可以像普通值一样使用
    println!("*b = {}", *b); // 解引用取值
    let c = b; // 转移所有权时只拷贝指针，不拷贝堆上的数据
    println!("c = {}", c);
}
```

## 使用场景

### 递归类型

- 编译时需要知道类型的确切大小，而递归类型会无限嵌套，无法确定大小
- 用 `Box` 提供间接存储，将无限大小变为固定的指针大小

```rust
#[derive(Debug)]
enum List {
    Cons(i32, Box<List>), // Box 的大小 = 指针大小，固定
    Nil,
}

fn main() {
    use List::{Cons, Nil};
    let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));
    println!("{:?}", list);
}
```

### 大数据转移所有权

- 转移大量数据时，只移动指针，避免数据在栈上拷贝

```rust
fn main() {
    let data = Box::new([0u8; 1024 * 1024]); // 堆上 1MB 数据
    let moved = data; // 只移动指针，不拷贝 1MB 数据
    println!("{}", moved.len());
}
```

### Trait 对象

- 只关心值实现了某个 trait，而不关心具体类型时使用 `Box<dyn Trait>`

```rust
trait Draw {
    fn draw(&self);
}

struct Button;
struct Checkbox;

impl Draw for Button {
    fn draw(&self) {
        println!("绘制按钮");
    }
}

impl Draw for Checkbox {
    fn draw(&self) {
        println!("绘制复选框");
    }
}

fn main() {
    // 不同类型存入同一个 Vec
    let components: Vec<Box<dyn Draw>> = vec![Box::new(Button), Box::new(Checkbox)];
    for c in &components {
        c.draw();
    }
}
```

## 解引用 Deref

- `Box<T>` 实现了 `Deref`，可以像引用一样使用
- 函数参数接收 `&T` 时，传入 `&Box<T>` 会自动解引用

```rust
fn add(x: &i32) -> i32 {
    *x + 1
}

fn main() {
    let b = Box::new(5);
    println!("{}", add(&b)); // &Box<i32> 自动解引用为 &i32
}
```

## 释放 Drop

- `Box` 离开作用域时自动调用 `drop`，释放堆上的数据

```rust
fn main() {
    let b = Box::new(String::from("hello"));
    println!("{}", b);
} // b 离开作用域，堆上的 String 自动释放
```