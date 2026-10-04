# HashMap<K,V>

从键 K 映射到值 V 的集合

### 定义

```rust
use std::collections::HashMap;
fn main() {
    let mut scores: HashMap<String, i8> = HashMap::new();
    scores.insert(String::from("Blue"), 10);
    scores.insert(String::from("Yellow"), 50);
}
```

### 方法

```rust
use std::collections::HashMap;
fn main() {
    let mut scores: HashMap<String, i8> = HashMap::new();
    scores.insert(String::from("Blue"), 10);
    scores.insert(String::from("Yellow"), 50);
    let key = String::from("Blue");
    let blue_score = scores.get(&key).unwrap_or(&0);
    println!("The score for {} is {}", key, blue_score);
    for (key, value) in &scores {
        println!("{}: {}", key, value);
    }
    //更新
    scores.insert(String::from("Blue"), 25);
    let a = scores.entry(String::from("Blue")).or_insert(50);
    println!("{}", a);

    //基于原有的值进行更新
    let text = "hello world wonderful world";
    let mut map = HashMap::new();
    for word in text.split_whitespace() {
        let count = map.entry(word).or_insert(0);
        *count += 1;
    }
    println!("{:?}", map);
}

```