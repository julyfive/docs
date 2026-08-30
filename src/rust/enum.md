### 枚举：简单的分类

```rust
enum Direction { //最基础的形式是定义一组命名的常量
    North,
    South,
    East,
    West,
}

enum Message { //带有属性的枚举
    Quit,                       // 无数据
    Move { x: i32, y: i32 },    // 匿名结构体
    Write(String),              // 元组结构体
    ChangeColor(i32, i32, i32), // 元组
}
```

### 标准库双雄：Option 和 Result

```rust
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

### 模式匹配

* 当要使用枚举里面的值的时候，需要先进行解包

+ match 是表达式，所以match返回一个值

- 枚举必须穷尽！
- 可以用`_`通配符来匹配任何情况，即忽略
- other (或任意变量名) 你想把那些不匹配的情况收集起来，并在接下来的逻辑里用到这个值
    - others匹配的仍然是枚举，如果要取值，需要解包

```rust
let msg = Message::Write(String::from("hello"));
match msg {
    Message::Quit => {},
    Message::Move { x, y } => {},
    Message::Write(text) => {},
    Message::ChangeColor(r, g, b) => {},
    _ => {},    
   others => {}, //移动了所有权
   ref others => {}, //引用
   ref mut others => {}, //可变引用
}
 ```

### If let 语法

```rust
if let Message::Write(text) = msg { //只是匹配，不进行解包
    println!("消息内容: {}", text);
}

if let Message::Write(text) = msg {
text
}else{
""
}

```