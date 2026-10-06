# 闭包 Closure

闭包（Closure）是可以**捕获其所在环境**的匿名函数，可以把它保存为变量，或作为参数传递给其他函数。

- 与函数不同，闭包能"记住"定义处作用域中的变量
- 闭包的类型是**唯一的匿名类型**，编译器自动推断，无需手动命名
- 闭包是**零成本抽象**：调用闭包与调用普通函数性能几乎一致

```rust
fn main() {
    let x = 4;
    // 闭包：捕获了外部变量 x
    let equal_to_x = |z| z == x;
    let y = 4;
    println!("{}", equal_to_x(y)); // true
}
```

## 基本语法

闭包的参数用 `|` 包裹，函数体可以省略 `{}`：

```rust
fn  add_one_v1   (x: u32) -> u32 { x + 1 } // 函数
let add_one_v2 = |x: u32| -> u32 { x + 1 }; // 完整写法
let add_one_v3 = |x|             { x + 1 }; // 省略参数类型
let add_one_v4 = |x|               x + 1  ; // 省略花括号（单表达式）
```

闭包与函数的区别：

| 特性         | 函数 `fn`                     | 闭包 `\|...\|`                     |
|--------------|-------------------------------|------------------------------------|
| 捕获环境变量 | ❌ 不可以                     | ✅ 可以                            |
| 类型标注     | 必须标注                      | 可以省略（大多数情况自动推断）     |
| 类型         | 有具名类型（函数指针 `fn`）   | 每个闭包的匿名类型都**各不相同**   |
| 作为参数     | 用 `fn` 指针传递              | 用泛型 + `Fn` 系列 trait bound     |

函数不能访问定义处作用域的变量，而闭包可以：

```rust
fn main() {
    let x = 4;
    fn equal_to_x(z: i32) -> bool { z == x } // ❌ 错误：函数不能捕获环境
}
```

## 类型推断与唯一类型

闭包的参数类型通常由**第一次调用**推断，一旦确定就不能再改变：

```rust
fn main() {
    let example_closure = |x| x;

    let s = example_closure(String::from("hello")); // 此处推断为 String
    let n = example_closure(5); // ❌ 错误：expected String, found integer
}
```

即使两个闭包源码完全相同，它们的类型也**不相同**：

```rust
fn main() {
    let f = |x: i32| x + 1;
    let g = |x: i32| x + 1;

    // f 和 g 是两种不同的匿名类型，虽然行为完全一样
    // let h = if true { f } else { g }; // ❌ 类型不匹配
}
```

结论：闭包类型无法写出，只能用 `impl Fn` 或 `Box<dyn Fn>` 的方式表示。

## 捕获环境的三种方式

编译器会根据闭包体**如何使用**捕获的变量，自动选择**最小权限**的捕获方式：

| 捕获方式   | 条件                            | 对应 trait |
|------------|---------------------------------|------------|
| 不可变借用 | 只读取捕获的变量                | `Fn`       |
| 可变借用   | 修改捕获的变量                  | `FnMut`    |
| 获取所有权 | 消耗（移动/释放）捕获的变量     | `FnOnce`   |

### 不可变借用（Fn）

```rust
fn main() {
    let list = vec![1, 2, 3];
    // 只读取 list，闭包不可变借用它
    let only_borrows = || println!("list: {:?}", list);

    println!("调用前: {:?}", list); // ✅ 闭包只是借用，list 仍可使用
    only_borrows();
}
```

### 可变借用（FnMut）

```rust
fn main() {
    let mut list = vec![1, 2, 3];
    // 修改 list，闭包可变借用它
    let mut borrows_mutably = || list.push(4);

    // println!("{:?}", list); // ❌ 闭包持有可变借用期间，不能再用 list
    borrows_mutably();
    borrows_mutably();
    println!("{:?}", list); // ✅ 闭包最后一次使用后借用结束（NLL）
}

// 修改捕获变量的闭包必须声明为 mut
```

### 获取所有权（FnOnce）

闭包内消费（move/drop）了捕获变量时，调用会消耗环境：

```rust
fn main() {
    let s = String::from("hello");
    // drop 消耗了 s，闭包获取 s 的所有权
    let consume = || drop(s);

    consume(); // ✅ 第一次调用
    // consume(); // ❌ 错误：cannot borrow `consume` as mutable, ... value moved
}
```

捕获优先级的判断口诀：**能借用就不移动，能不可变借用就不可变借用**。

## move 关键字

在参数列表前加 `move`，强制闭包**获取捕获变量的所有权**：

```rust
fn main() {
    let x = vec![1, 2, 3];
    let equal_to_x = move |z| z == x;

    // println!("{:?}", x); // ❌ x 已被移动进闭包
    let y = vec![1, 2, 3];
    println!("{}", equal_to_x(y)); // true
}
```

`move` 的常见场景：

1. 把闭包交给新线程时，必须让它拥有数据（如 `thread::spawn`）
2. 返回闭包时，避免返回对函数内局部变量的引用
3. 结构体存储闭包而无法标注生命周期时

```rust
use std::thread;

fn main() {
    let list = vec![1, 2, 3];
    // 新线程生命周期可能与 main 不同，必须 move
    thread::spawn(move || println!("来自线程: {:?}", list)).join().unwrap();
}
```

注意：`move` 只捕获**闭包中用到**的变量，且对 `Copy` 类型是复制而非移动：

```rust
fn main() {
    let x = 5; // i32 实现 Copy
    let f = move || println!("{}", x);
    f();
    println!("{}", x); // ✅ Copy 类型被复制进闭包，原变量仍可用
}
```

## Fn、FnMut、FnOnce 三个 trait

标准库用三个 trait 描述闭包的调用方式，它们之间存在**包含关系**：

```text
FnOnce   ← 所有闭包至少实现它（最多被调用一次）
  ↑
FnMut    ← 修改捕获变量但不消耗的闭包实现（可多次调用）
  ↑
Fn       ← 只读取捕获变量、不修改不消耗的闭包实现（可多次调用）
```

| trait   | 调用形式               | 对捕获值的操作   | 可调用次数 |
|---------|------------------------|------------------|------------|
| `FnOnce`| `self`                 | 消耗捕获值       | 仅一次     |
| `FnMut` | `&mut self`            | 可变借用捕获值   | 多次       |
| `Fn`    | `&self`                | 不可变借用捕获值 | 多次       |

层级关系：**`Fn` 的闭包也能当 `FnMut` 和 `FnOnce` 用，`FnMut` 也能当 `FnOnce` 用**，反之不成立。

```rust
fn call_once<F: FnOnce()>(f: F) { f(); } // 最宽松，接受所有闭包

fn main() {
    call_once(|| println!("任意闭包都可以传入")); // ✅
}
```

## 闭包作为参数

用泛型 + trait bound 接收闭包：

```rust
// F 可以用 Fn、FnMut 或 FnOnce 限定，按需求选择最小约束
fn call_twice<F: Fn()>(f: F) {
    f();
    f();
}

fn main() {
    call_twice(|| println!("hi")); // hi hi
}
```

需要修改捕获变量的闭包，参数必须实现 `FnMut`：

```rust
fn call_with_one<F>(mut f: F) -> i32
where
    F: FnMut(i32) -> i32,
{
    f(1)
}

fn main() {
    let mut num = 5;
    let result = call_with_one(|x| {
        num += 1; // 修改捕获的 num
        x + num
    });
    println!("{}", result); // 7
}
```

函数指针 `fn` 也满足 `Fn` 系列 bound，可以直接传入：

```rust
fn add_one(x: i32) -> i32 {
    x + 1
}

fn call_with_one<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 {
    f(x)
}

fn main() {
    println!("{}", call_with_one(add_one, 5));          // ✅ 函数指针
    println!("{}", call_with_one(|x| x + 1, 5));        // ✅ 闭包
}
```

## 闭包作为返回值

闭包类型无法写出，返回闭包要用 `impl Fn` 或 `Box<dyn Fn>`：

```rust
// 方式一：impl Trait（要求返回单一具体类型）
fn make_adder(x: i32) -> impl Fn(i32) -> i32 {
    move |y| x + y // move：x 是局部变量，所有权交给闭包
}

fn main() {
    let add_five = make_adder(5);
    println!("{}", add_five(3)); // 8
}
```

返回的闭包捕获了引用的数据时，需要标注生命周期（详见生命周期章节）：

```rust
fn make_adder_ref<'a>(x: &'a i32) -> Box<dyn Fn() -> i32 + 'a> {
    Box::new(move || *x + 1)
}
```

`impl Fn` 只能对应单一类型，需要返回不同闭包时用 `Box<dyn Fn>`：

```rust
fn get_op(is_add: bool) -> Box<dyn Fn(i32, i32) -> i32> {
    if is_add {
        Box::new(|a, b| a + b)
    } else {
        Box::new(|a, b| a - b)
    }
}

fn main() {
    let op = get_op(false);
    println!("{}", op(10, 4)); // 6
}
```

对比：

| 返回方式       | 适用场景                       | 代价                     |
|----------------|--------------------------------|--------------------------|
| `impl Fn`      | 只返回一种闭包                 | 无堆分配，性能最优       |
| `Box<dyn Fn>`  | 返回多种不同的闭包             | 堆分配 + 动态分派        |

## 闭包与线程、Trait 对象结合

作为 trait 对象使用时（如回调、事件处理器），通常配合 `move` 和 `Box`：

```rust
struct Cacher<T>
where
    T: Fn(u32) -> u32,
{
    calculation: T,
    value: Option<u32>,
}

impl<T> Cacher<T>
where
    T: Fn(u32) -> u32,
{
    fn new(calculation: T) -> Cacher<T> {
        Cacher { calculation, value: None }
    }

    fn value(&mut self, arg: u32) -> u32 {
        match self.value {
            Some(v) => v, // 已有缓存，直接返回
            None => {
                let v = (self.calculation)(arg);
                self.value = Some(v);
                v
            }
        }
    }
}

fn main() {
    let mut cacher = Cacher::new(|num| {
        println!("计算中...");
        num * 2
    });
    println!("{}", cacher.value(4)); // 计算中... 8
    println!("{}", cacher.value(4)); // 8（命中缓存）
}
```

## 常见错误一览

| 错误场景                         | 说明                                       |
|----------------------------------|--------------------------------------------|
| 同一闭包传入两种参数类型         | 第一次调用已推断出参数类型，之后不能改变   |
| 闭包调用后在闭包外使用捕获变量   | 闭包仍持有借用，需等闭包最后一次使用之后   |
| 调用 `FnOnce` 闭包两次           | 捕获值已被消耗，只能调用一次               |
| 返回闭包时返回了对局部变量的引用 | 用 `move` 把局部变量所有权交给闭包         |
| 返回闭包未标注 `move` 或生命周期 | 闭包可能引用局部变量，编译期报错           |

```rust
fn main() {
    // 1. 闭包持有可变借用期间，外部不能访问捕获变量
    let mut count = 0;
    let mut inc = || count += 1;
    // println!("{}", count); // ❌ inc 的可变借用仍存活
    inc();
    println!("{}", count); // ✅ inc 最后一次使用后借用结束

    // 2. FnOnce 闭包只能调用一次
    let s = String::from("hi");
    let consume = || drop(s);
    consume();
    // consume(); // ❌ 捕获值已被消耗
}
```

## 总结

- 闭包 = 可以捕获环境的匿名函数，类型由编译器生成且唯一，无法手写
- 捕获方式按最小权限自动选择：`Fn`（不可变借用）→ `FnMut`（可变借用）→ `FnOnce`（获取所有权）
- `move` 强制获取捕获变量所有权，常用于线程、返回闭包、`'static` 场景
- 三个 trait 的层级：`Fn` ⊆ `FnMut` ⊆ `FnOnce`，参数处用**最小的约束**表达需求
- 作为参数用泛型 + `Fn` 系列 bound；作为返回值用 `impl Fn`（单一类型）或 `Box<dyn Fn>`（多类型）
- 结合生命周期使用时，`Box<dyn Fn + 'a>` 表达闭包捕获引用的存活区间
