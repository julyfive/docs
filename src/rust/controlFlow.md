# 控制流-循环

## if

```rust
fn main() {
    // if后跟的表达式是必须是bool类型，不会自动转换
    let count = 10;
    if count < 5 {
        println!("count小于5");
    } else if count == 5 {
        println!("count等于5");
    } else {
        println!("count大于5");
    }
}
```

作为表达式

```rust
fn main() {
    // if可以作为表达式使用 且 返回类型必须一致
    let count = 8;
    let level: &str = if count > 8 {
        "优"
    } else if count < 7 {
        "差"
    } else {
        "良"
    };
    println!("等级是{}", level);
}
```

<br/>

## loop

```rust
fn main() {
    let mut counter = 0;
        counter += 1;
        if counter == 10 {
            break counter * 2;  // break可以返回值
        }
    };
    println!("result = {}", result); // 输出: result = 20
}

```

##### loop多层循环

```rust
fn main() {
    let mut count = 0;
    'counting_up: loop { // 外层循环标签
        println!("count:{}", count);
        let mut remaining = 10;
        loop {
            println!("remaining: {}", remaining);
            if (remaining == 9) {
                break;
            };
            if (count == 2) {
                break 'counting_up; // 终止外层循环
            }
            remaining -= 1;
        }
        count += 1;
    }
    // count:0
    // remaining: 10
    // remaining: 9
    // count:1
    // remaining: 10
    // remaining: 9
    // count:2
    // remaining: 10
}
```

<br/>

## while

```rust
fn main() {
    let mut number = 3;
    while number != 0 {  //当条件为true时会一直执行
        println!("{}", number);
        number -= 1;
    }
    println!("发射！");
    // 3
    // 2
    // 1
    // 发射！
}
```

<br/>

## for

遍历集合里面的元素

```rust
fn main() {
    //for 元素 in 集合\{...\}

    let list = [1, 2, 3, 4, 5];
    for ele in list {
        println!("{}", ele)
    }
    // 1
    // 2
    // 3
    // 4
    // 5
}
```

```rust
// 遍历范围 (左闭右开)

for number in 1..4 {
    println!("{}", number); // 输出: 1, 2, 3
}

// 遍历范围 (包含右边界)
for number in 1..=4 {
    println!("{}", number); // 输出: 1, 2, 3, 4
}

// 反向遍历
for number in (1..4).rev() {
    println!("{}", number); // 输出: 3, 2, 1
}
```

<br/>

## 循环控制关键字

##### break

跳出循环

```rust
let mut count = 0;

loop {
    count += 1;
    if count == 5 {
        break;  // 退出循环
    }
}
```

##### continue

跳过本次迭代

```rust
for number in 1..=10 {
    if number % 2 == 0 {
        continue;  // 跳过偶数
    }
    println!("{}", number); // 只输出奇数
}
```

##### 'label

rust允许为循环命名，以便跳出指定循环

```rust
fn main() {
    'outer: for out_num in 1..=3 {
        println!("外层循环: {}", out_num);
        for in_num in 1..=3 {
            println!("内层循环: {}", in_num);
            if out_num == 2 && in_num == 2 {
                break 'outer;
            }
        }
    }
    // 外层循环: 1
    // 内层循环: 1
    // 内层循环: 2
    // 内层循环: 3
    // 外层循环: 2
    // 内层循环: 1
    // 内层循环: 2
}
```