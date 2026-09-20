# Enum 枚举

### 定义

```rust
fn main() {
    #[derive(Debug)]
    enum Direction {
        North,
        South,
        East,
        West,
    }
    let direction: Direction = Direction::North;
    println!("{:?}", direction);
}
```

### Option

```rust
// 表示某个值存在或者不存在
enum Option<T> {
    Some(T),
    None,
}
```

```rust 
fn main() {
    let some_num = Option::Some(5);
    let some_str = Option::Some("hello");

    //使用None时，必须标注类型
    let absent_num: Option<i32> = None;
}
```

### Match表达式

* 当要使用枚举里面的值的时候，需要先进行解包

+ match 是表达式，所以match返回一个值

- 枚举必须穷尽！
- 可以用`_`通配符来匹配任何情况，即忽略
- others (或任意变量名) 你想把那些不匹配的情况收集起来，并在接下来的逻辑里用到这个值


```rust
fn main() {
    #[derive(Debug)]
    enum Direction {
        North,
        South,
        East,
        West,
    }
    let direction: Direction = Direction::West;
    match &direction {
        Direction::North => println!("math_north"),
        Direction::South => println!("match_south"),
        _ => println!("Other"),
        // others => println!("{:?}", others),
    };
    print!("{:?}", direction);
}

 ```

### If let 

```rust
fn main() {
    #[derive(Debug)]
    enum Direction {
        North,
        South,
        East,
        West,
    }
    let direction: Direction = Direction::West;
    if let Direction::North = direction {
        println!("北方");
    } else if let Direction::South = direction {
        println!("南方");
    } else {
        println!("东方或西方(其他方向)");
    }
    print!("{:?}", direction);
}

```