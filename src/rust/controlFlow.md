# 控制流

Rust 的控制流结构都是**表达式**：`if` 和 `loop` 可以产生值，`while`、`for` 的值是 `()`。条件表达式必须是 `bool`，没有 JavaScript 那样的 truthy 隐式转换。

| 语法 | 用途 | 结果值 |
| ---- | ---- | ------ |
| `if` / `else if` / `else` | 条件分支 | 分支表达式的值（没有 `else` 时为 `()`） |
| `loop` | 无限循环 | `break` 携带的值 |
| `while` | 条件循环 | `()` |
| `for` | 迭代循环 | `()` |

## if 条件分支

```rust
fn main() {
    // 条件必须是 bool，Rust 不会自动转换
    let count = 10;

    if count < 5 {
        println!("count 小于 5");
    } else if count == 5 {
        println!("count 等于 5");
    } else {
        println!("count 大于 5");
    }
}
```

- 条件不需要括号，`if (x > 0)` 虽然合法，但编译器会提示多余的括号
- 条件只能是 `bool`，`if 1 {}`、`if "true" {}` 都会编译失败
- `if let` 用于模式匹配式分支（见 Enum 章节）

### 作为表达式

`if` 可以作为表达式产生一个值，此时**所有分支必须返回同一类型**：

```rust
fn main() {
    let count = 8;
    let level: &str = if count > 8 {
        "优"
    } else if count < 7 {
        "差"
    } else {
        "良"
    };

    println!("等级是 {level}"); // 等级是 良
}
```

- 没有 `else` 的 `if` 返回 `()`，所以 `let x = if true { 1 };` 是类型错误
- 分支类型不一致会报错：`if true { 1 } else { "a" }` → `if and else have incompatible types`
- 如果某个分支是 `panic!()`、`return` 这类 `!`（never type）表达式，它可以转换成任意类型，不参与类型统一

## loop 循环

`loop` 会一直执行循环体，直到遇到 `break`。`break` 可以携带一个值，作为整个 `loop` 表达式的值：

```rust
fn main() {
    let mut counter = 0;

    let result = loop {
        counter += 1;
        if counter == 10 {
            break counter * 2; // break 的值成为 loop 表达式的值
        }
    };

    println!("result = {result}"); // result = 20
}
```

- `loop` 是**唯一**支持 `break` 带值的循环，`while`、`for` 中 `break value` 会报错 `E0571`
- 多个 `break` 携带的值类型必须一致
- 没有 `break` 时循环永不结束，整个表达式的类型是 `!`（never type）
- 需要无限循环时用 `loop`，不要写 `while true`：编译器知道 `loop` 一定会再次执行，优化更充分

## 循环标签

标签（label）用于跳出**指定层**的循环，语法是把 `'label:` 放在循环前面：

- `break 'label`：结束标签指定的循环
- `continue 'label`：跳过标签指定循环的本次迭代
- `break 'label value`：仅当标签指向 `loop` 时可以携带值
- 标签名以单引号开头，通常用小写字母加下划线

```rust
fn main() {
    let mut count = 0;

    'counting_up: loop {
        println!("count: {count}");
        let mut remaining = 10;

        loop {
            println!("remaining: {remaining}");

            if remaining == 9 {
                break; // 只跳出内层循环
            }
            if count == 2 {
                break 'counting_up; // 直接结束外层循环
            }

            remaining -= 1;
        }

        count += 1;
    }
}
```

```text
count: 0
remaining: 10
remaining: 9
count: 1
remaining: 10
remaining: 9
count: 2
remaining: 10
```

`continue` 也可以带标签，跳过外层循环的剩余部分：

```rust
fn main() {
    'outer: for i in 1..=3 {
        for j in 1..=3 {
            if j == 2 {
                continue 'outer; // 直接进入外层下一次迭代
            }
            println!("i = {i}, j = {j}");
        }
    }
    // i = 1, j = 1
    // i = 2, j = 1
    // i = 3, j = 1
}
```

从 Rust 1.65 起，普通块也可以加标签，用 `break 'block value` 提前返回：

```rust
fn main() {
    let value = 'block: {
        let x = 10;
        if x > 5 {
            break 'block x * 2; // 跳出块并返回 20
        }
        break 'block 0;
    };

    println!("{value}"); // 20
}
```

## while 循环

`while` 在条件为 `true` 时反复执行循环体，**每次迭代前都会重新求值条件**：

```rust
fn main() {
    let mut number = 3;

    while number != 0 {
        println!("{number}");
        number -= 1;
    }

    println!("发射！");
    // 3
    // 2
    // 1
    // 发射！
}
```

- 忘记修改条件变量会导致死循环
- `while` 是表达式，但值固定为 `()`，不能接收 `break` 的值

### while let

`while let` 在模式匹配成功时继续循环，常用于不断取出 `Option` 中的值：

```rust
fn main() {
    let mut stack = vec![1, 2, 3];

    while let Some(top) = stack.pop() {
        println!("{top}"); // 3 2 1
    }
}
```

- `stack.pop()` 返回 `Option<i32>`，`Some` 时继续，`None` 时退出
- 与 `loop { match ... }` 相比，`while let` 更简洁
- 更多模式匹配语法见 Enum 章节

## for 循环

`for` 用于遍历实现了 `IntoIterator` 的类型，是最常用的循环：

```rust
fn main() {
    let list = [1, 2, 3, 4, 5];

    for ele in list {
        println!("{ele}"); // 1 2 3 4 5
    }
}
```

`for` 本质是迭代器语法糖，等价于反复调用 `next` 直到 `None`（详见迭代器章节）。

### 遍历范围

```rust
fn main() {
    // 左闭右开：1、2、3
    for number in 1..4 {
        println!("{number}");
    }

    // 闭区间：1、2、3、4
    for number in 1..=4 {
        println!("{number}");
    }

    // 反向遍历：3、2、1
    for number in (1..4).rev() {
        println!("{number}");
    }

    // 步长：0、2、4、6、8
    for i in (0..10).step_by(2) {
        println!("{i}");
    }
}
```

### 索引与所有权

需要下标时用 `enumerate`，不要手写 `for i in 0..v.len()`：

```rust
fn main() {
    for (i, ele) in ["a", "b", "c"].iter().enumerate() {
        println!("{i}: {ele}");
    }
    // 0: a
    // 1: b
    // 2: c
}
```

`for` 循环变量默认是不可变绑定，且集合的迭代方式决定所有权：

```rust
fn main() {
    let v = vec![String::from("a"), String::from("b")];

    // 借用：迭代 &String，v 之后仍可使用
    for s in &v {
        println!("{s}");
    }
    println!("{:?}", v); // ["a", "b"] ✅

    // 按值：元素所有权被移入循环，v 被消耗
    for s in v {
        println!("{s}");
    }
    // println!("{:?}", v); // ❌ v 已被移动
}
```

- `for s in &mut v` 可以拿到 `&mut T`，原地修改元素
- 需要修改循环变量本身时，在循环体内重新绑定，如 `let mut s = s;`

## break / continue / return

| 关键字 | 作用 | 能否带值 |
| ------ | ---- | -------- |
| `break` | 结束当前（或标签指定的）循环 | 仅 `loop` 可以带值 |
| `continue` | 跳过本次迭代的剩余代码 | 否 |
| `return` | 立即结束整个函数 | 可以带返回值 |

```rust
fn find_first_even(numbers: &[i32]) -> Option<i32> {
    for &n in numbers {
        if n % 2 != 0 {
            continue; // 跳过奇数
        }
        return Some(n); // 直接返回函数
    }
    None
}

fn main() {
    println!("{:?}", find_first_even(&[1, 3, 4, 6])); // Some(4)
}
```

`break` 与 `continue` 的区别：

```rust
fn main() {
    let mut count = 0;

    loop {
        count += 1;
        if count == 5 {
            break; // 结束整个循环
        }
    }

    for number in 1..=10 {
        if number % 2 == 0 {
            continue; // 跳过偶数，继续下一次迭代
        }
        println!("{number}"); // 1 3 5 7 9
    }
}
```

## 常见错误一览

| 错误写法 | 原因 | 解决方式 |
| -------- | ---- | -------- |
| `if 1 { }` | 条件必须是 `bool` | 写成明确的比较，如 `if x != 0` |
| `if true { 1 } else { "a" }` | 分支返回类型不一致 | 统一各分支类型 |
| `let x = if true { 1 };` | 缺少 `else`，整体返回 `()` | 补全 `else` 或忽略返回值 |
| `while true { break 1; }` | `while` 不支持 `break` 带值 | 改用 `loop` |
| `loop {}` 忘记 `break` | 死循环 | 设置明确的退出条件 |
| `break 'outer` 但标签不存在 | 标签未声明 | 检查标签拼写，标签以 `'` 开头 |
| `1..4` 以为包含 4 | 范围左闭右开 | 需要包含右边界时写 `1..=4` |
| `for i in 0..v.len()` | 手动索引易出错、不地道 | 用 `enumerate()` 或迭代器 |
| `for x in v` 后继续用 `v` | 所有权已移入循环 | 改为 `for x in &v` |

```rust
fn main() {
    // 1. 条件必须是 bool
    // if 1 { } // ❌ expected `bool`, found integer

    // 2. 分支类型必须一致
    // let x = if true { 1 } else { "a" }; // ❌ incompatible types

    // 3. loop 才能 break 带值
    let x = loop {
        break 1; // ✅
    };

    // 4. 用 enumerate 代替手写下标
    for (i, ele) in [10, 20, 30].iter().enumerate() {
        println!("{i}: {ele}");
    }

    println!("{x}"); // 1
}
```

## 总结

- 控制流都是表达式；`if` 和 `loop` 可以产生值，`while` / `for` 的值是 `()`
- `if` 条件必须是 `bool`，作为表达式时所有分支类型必须一致，没有 `else` 时返回 `()`
- `loop` 是唯一支持 `break` 带值的循环，无限循环优先用 `loop` 而不是 `while true`
- `'label` 配合 `break 'label` / `continue 'label` 控制嵌套循环，Rust 1.65+ 还支持带标签的块
- `while` 每次迭代前重新求值条件，`while let` 用于模式匹配式的循环
- `for` 是迭代器语法糖：范围 `1..4` 左闭右开，常用 `rev()`、`step_by()`、`enumerate()`
- 循环所有权：`for x in v` 消耗集合，`for x in &v` 借用，`&mut v` 可原地修改
- `break` 结束循环，`continue` 跳过本次迭代，`return` 结束函数
