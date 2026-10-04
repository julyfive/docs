# Vector

- 数据在内存中（堆）连续存储（相邻）
- Vec\<T\> 是标准库提供的动态数组
- 在单一数据结构存储多个值
- 元素必须同类型

```text
Vec<T> 结构体（通常在栈上）:
+------+------+------+
| ptr  | len  | cap  |
+------+------+------+
   |
   v
堆上连续内存:
[ T0 ][ T1 ][ T2 ][ 未初始化容量... ]
  ^ len 个元素已初始化
  ^ capacity 个元素可容纳
```

### 定义

```rust
#[derive(Debug, Copy, Clone)]
struct Map {
    position: (i32, i32),
}
fn main() {
    //必须手动表明类型
    let v1: Vec<i32> = Vec::new(); //必须手动表明类型
    let v2 = vec![1, 2, 3];
    let v3: Vec<Map> = vec![Map { position: (0, 0) }; 5]; //Map必须实现Clone
    let v4: Vec<i32> = Vec::with_capacity(10); //必须手动表明类型，容量为10
    let v5: Vec<i32> = (0..5).collect(); //必须手动表明类型
    let v6 = Vec::from([1, 2, 3]);
    let v7 = [1, 2, 3].to_vec();
}

```

### 常用方法

```rust
Vce::new();
vec![];
pop();
push();
is_empty();
len();
with_capacity();
get();
[];
iter();
mut_iter()
```

### 练习

```rust
fn main() {
    // 需求：读入一组数字，过滤掉负数，去重，排序，求和
    let mut total: i32 = 0;
    let mut nums = vec![3, -1, 2, -1, 5, 3];
    nums.retain(|x| x > &0);
    nums.sort();
    nums.dedup();
    for num in nums {
        total += num;
    }
    println!("{:?}", total)
}
```