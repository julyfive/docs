# String 与 &str

Rust 的字符串分为两种：拥有所有权的 `String` 和借用的字符串切片 `&str`。两者都保证内容是合法的 UTF-8，底层都是字节序列，长度与字符数并不等价。

- `String`：堆上分配、可增长、拥有所有权，结构是 `ptr + len + cap`
- `&str`：对 UTF-8 字节序列的借用（胖指针：地址 + 长度），字符串字面量就是 `&'static str`
- 不能用整数下标取字符：UTF-8 是变长编码，无法 O(1) 定位第 n 个字符
- 切片、`insert`、`truncate` 都按**字节**定位，必须落在字符边界
- 函数参数优先写 `&str`，需要所有权或修改时再使用 `String`

| 特性 | `String` | `&str` |
| ---- | -------- | ------ |
| 所有权 | 拥有 | 借用 |
| 可增长 | 是 | 否 |
| 内存 | 堆（ptr + len + cap） | 指向任意 UTF-8 数据 |
| 常见来源 | `String::from`、`format!`、`to_string` | 字面量、字符串切片 |
| 典型用途 | 需要修改 / 返回字符串 | 只读参数、视图 |

```text
栈上的 String：                堆上的字节数据：
┌──────┬──────┬──────┐       ┌───┬───┬───┬───┬───┬────┬────┐
│ ptr  │ len  │ cap  │──────>│ h │ e │ l │ l │ o │    │    │
└──────┴──────┴──────┘       └───┴───┴───┴───┴───┴────┴────┘
                               len = 5，cap = 7
```

- `ptr`：指向堆上字符数据的指针
- `len`：当前使用的字节数
- `cap`：已分配的字节数，`len <= cap`

## 创建

```rust
fn main() {
    let s1 = String::new(); // 空字符串
    let s2 = String::from("hello"); // 从字面量创建
    let s3 = "hello".to_string(); // 等价写法
    let s4 = String::with_capacity(10); // 预分配 10 字节
    let s5 = format!("{}-{}", 1, 2); // 格式化生成

    println!("{s1:?} {s2} {s3} {s4:?} {s5}"); // "" hello hello "" 1-2
}
```

- `String::new()` 不分配内存，首次写入时才分配
- `String::with_capacity(n)` 适合已知长度的拼接，减少扩容
- `format!` 是最常用的构造方式，返回 `String` 且不消耗参数
- 字符串字面量是 `&'static str`，存放在二进制只读区

## 修改

```rust
fn main() {
    let mut s = String::from("hello");

    s.push('!'); // 追加一个字符
    s.push_str(" world"); // 追加字符串切片
    s += "!"; // 等价于 push_str
    println!("{s}"); // hello! world!

    s.insert(0, '>'); // 按字节位置插入字符
    s.insert_str(1, " "); // 按字节位置插入字符串
    println!("{s}"); // > hello! world!

    s.replace_range(0..1, "["); // 按字节范围替换
    println!("{s}"); // [ hello! world!

    let last = s.pop(); // 移除并返回最后一个字符
    println!("{last:?} {s}"); // Some('!') [ hello! world

    s.truncate(5); // 截断到 5 字节，必须在字符边界
    s.clear(); // 清空内容，保留容量
    assert!(s.is_empty());
}
```

- `push` 接收 `char`，`push_str` 接收 `&str`
- `+=` 的左侧必须是 `String`，右侧是 `&str`
- `insert` / `insert_str` / `truncate` / `replace_range` 都按字节操作，位置不在字符边界会 panic
- `clear()` 只清空内容，容量保留

## 读取与遍历

```rust
fn main() {
    let s = String::from("hello 世界");

    println!("字节数: {}", s.len()); // 12
    println!("字符数: {}", s.chars().count()); // 8

    for c in s.chars() {
        print!("{c}|"); // 按 Unicode 字符遍历
    }
    println!();

    for b in s.bytes() {
        print!("{b} "); // 按字节遍历
    }
    println!();

    for (i, c) in s.char_indices() {
        println!("字节位置 {i}: {c}");
    }

    println!("{:?}", &s.as_bytes()[0..5]); // [104, 101, 108, 108, 111]
}
```

- `len()` 返回**字节数**，不是字符数
- `chars()` 按 Unicode 标量值遍历，`bytes()` 按字节遍历
- `char_indices()` 同时给出字节位置，是做安全切片的依据
- `as_bytes()` 得到字节视图，适合协议解析、哈希等场景

## 字符串切片

`&str` 的索引单位是字节：

```rust
fn main() {
    let s = "你好世界";

    assert_eq!(&s[0..3], "你"); // "你" 占 3 字节
    assert_eq!(&s[3..6], "好");

    // ❌ 切在字符中间会 panic
    // let bad = &s[0..2];

    // 安全版本：返回 Option<&str>
    assert_eq!(s.get(0..3), Some("你"));
    assert_eq!(s.get(0..2), None);
}
```

- 只有落在 UTF-8 字符边界上的字节位置才能切片
- 不确定边界时用 `get(range)`，它返回 `Option<&str>`
- 需要按字符切分时，先用 `char_indices()` 找到边界，或使用 `split` / `splitn`

```rust
fn main() {
    let s = "hello,world,rust";

    let parts: Vec<&str> = s.split(',').collect();
    assert_eq!(parts, ["hello", "world", "rust"]);

    let first_two: Vec<&str> = s.splitn(2, ',').collect();
    assert_eq!(first_two, ["hello", "world,rust"]);

    let words: Vec<&str> = "  a  b  c ".split_whitespace().collect();
    assert_eq!(words, ["a", "b", "c"]);
}
```

## 拼接与格式化

```rust
fn main() {
    let a = String::from("hello");
    let b = String::from("world");

    let c = a + " " + &b; // a 被移动，之后不能再用
    println!("{c}"); // hello world

    let d = format!("{} {}", c, b); // 不移动任何参数
    println!("{d}"); // hello world world

    let joined = ["a", "b", "c"].join("-");
    println!("{joined}"); // a-b-c

    let concat = ["a", "b", "c"].concat();
    println!("{concat}"); // abc
}
```

- `String + &str` 会**移动**左侧的 `String`，右侧只能借字符串
- `format!` 返回新 `String`，不会移动参数，是最推荐的拼接方式
- `join` 在元素间插入分隔符，`concat` 直接相连
- 大量拼接时可以先 `with_capacity` 计算好容量

## 转换

```rust
fn main() {
    // String -> &str
    let owned = String::from("42");
    let borrowed: &str = &owned; // 自动解引用
    assert_eq!(owned.as_str(), "42");

    // &str -> String
    let owned2 = borrowed.to_string();
    let owned3 = String::from(borrowed);
    assert_eq!(owned2, owned3);

    // String -> 数字
    let n: i32 = borrowed.parse().unwrap();
    assert_eq!(n, 42);

    // 数字 -> String
    assert_eq!(n.to_string(), "42");

    // 字节 -> String，要求合法 UTF-8
    let s = String::from_utf8(vec![b'h', b'i']).unwrap();
    assert_eq!(s, "hi");

    // 非法字节用 � 替换
    let lossy = String::from_utf8_lossy(&[0xff, b'h', b'i']);
    println!("{lossy}"); // �hi
}
```

- 传参时 `&String` 会自动解引用为 `&str`
- `parse()` 依赖 `FromStr` trait，返回 `Result`
- `String::from_utf8` 校验 UTF-8，失败返回 `FromUtf8Error`
- `from_utf8_lossy` 用替换字符处理非法序列，适合容错场景

## 查找与替换

```rust
fn main() {
    let s = "hello world";

    assert!(s.contains("world"));
    assert!(s.starts_with("hello"));
    assert!(s.ends_with("world"));

    assert_eq!(s.find("world"), Some(6)); // 返回字节偏移
    assert_eq!(s.rfind('o'), Some(7)); // 从右往左找

    assert_eq!(s.trim(), "hello world");
    assert_eq!("  hi  ".trim(), "hi");

    let upper = s.to_uppercase();
    println!("{upper}"); // HELLO WORLD

    let replaced = s.replace("world", "rust");
    println!("{replaced}"); // hello rust

    let lines: Vec<&str> = "a\nb\nc".lines().collect();
    assert_eq!(lines, ["a", "b", "c"]);
}
```

- `find` / `rfind` 返回**字节位置**，不是字符下标
- `replace` 返回新 `String`，原字符串不变
- `trim` / `trim_start` / `trim_end` 去掉空白
- `lines()` 按行切分，自动处理 `\n` 和 `\r\n`

## 作为函数参数

```rust
fn greet(name: &str) {
    println!("hello, {name}");
}

fn main() {
    let owned = String::from("Tom");

    greet(&owned); // &String 自动解引用为 &str
    greet("Jerry"); // &str 直接使用
}
```

- 参数写 `&str` 可以同时接受 `String`、`&String`、字面量和切片
- 参数写 `&String` 会限制调用方，且没有额外能力
- 需要返回新字符串时返回 `String`，只返回视图时返回 `&str`（注意生命周期）

```rust
fn first_word(text: &str) -> &str {
    text.split_whitespace().next().unwrap_or("")
}

fn main() {
    let s = String::from("hello rust");
    println!("{}", first_word(&s)); // hello
}
```

## 常见错误

| 错误场景 | 说明 |
| -------- | ---- |
| `s[0]` 取字符 | `String` 不能用 `usize` 索引，改用 `chars().nth(0)` |
| `&s[0..2]` 切在字符中间 | 运行时 panic，改用 `get` 或按 `char_indices` 切 |
| 把 `len()` 当字符数 | `len()` 是字节数，字符数用 `chars().count()` |
| 函数参数写 `&String` | 限制调用方，应写 `&str` |
| `let c = a + &b` 后继续用 `a` | `+` 会移动左侧 `String`，改用 `format!` |
| 遍历 `chars()` 时修改 `String` | 借用冲突，先收集再修改 |

```rust
fn main() {
    let s = String::from("hi");

    // let c = s[0]; // ❌ the type `String` cannot be indexed by `usize`
    let c = s.chars().next().unwrap();
    println!("{c}"); // h

    // 取第 n 个字符是 O(n)，频繁按下标访问应改用 Vec<char>
    let chars: Vec<char> = s.chars().collect();
    println!("{}", chars[1]); // i
}
```

## 总结

- `String` 拥有所有权、可增长；`&str` 是 UTF-8 字节切片的借用
- `len()` 是字节数，字符数用 `chars().count()`；不能用整数下标取字符
- 切片、插入、截断都按字节定位，必须落在字符边界，`get()` 是安全版本
- 拼接优先 `format!`；`String + &str` 会移动左侧值
- 函数参数优先 `&str`，需要返回新字符串时用 `String`
- 遍历用 `chars()` / `char_indices()`，字节操作用 `bytes()` / `as_bytes()`
