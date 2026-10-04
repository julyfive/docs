# String

- 字节的集合
- 来自标准库
- 可变、可增长
- 拥有所有权
- UTF-8编码的字符串类型

String 是一个胖指针 + 长度 + 容量的三元组，存在栈上

```text
栈（Stack） String变量
┌───────────────────────────┐
│  ┌───────┬───────┬───────┐│ 
│  │  ptr  │  len  │  cap  ││
│  └───┬───┴───────┴───────┘│
└──────┼────────────────────┘
       │
       ▼
堆（Heap）
┌───┬───┬───┬───┬───┬───┬───┐
│ h │ e │ l │ l │ o │   │   │
└───┴───┴───┴───┴───┴───┴───┘
 0   1   2   3   4   5   6
```

- ptr：指向堆上实际字符数据的指针（8 字节）
- len：当前用了多少字节（8 字节）
- cap：堆上总共分配了多少字节（8 字节）

### 定义

```rust
fn main() {
    let mut str1 = String::new();
    str1.push('I');
    str1.push_str(" love rust");
    println!("{}", str1);
    let str2 = String::from("Hello World");
    let str3 = String::with_capacity(10);
    let str4 = "Hello World".to_string();
}
```

### 方法

```rust
String::new();
String::from();
"".to_string();
push();
push_str();
with_capacity();
len();
chars();
bytes();
```