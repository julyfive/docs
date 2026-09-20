# 切片 Slice

slice 是对连续内存区域的引用（借用），它不拥有数据，而是指向某个集合（如数组、Vec）的一部分连续元素

| 类型                 | 本质   | 内存                                         |
|----------------------|--------|----------------------------------------------|
| &[T]、&mut [T]、&str | 胖指针 | 16 字节（64位系统上，指针8字节 + 长度8字节） |

```rust
let arr = [1, 2, 3, 4, 5];
let slice: &[i32] = &arr[1..4];  // 指向 [2, 3, 4]
// 内存布局: [ptr(指针) → arr[1], len(长度) = 3]
```

<br/>

## 创建 Slice

```rust
// 从数组
let arr = [1, 2, 3, 4, 5];
let s1 = &arr[1..4];        // [2, 3, 4]
let s2 = &arr[..3];         // [1, 2, 3]
let s3 = &arr[2..];         // [3, 4, 5]
let s4 = &arr[..];          // [1, 2, 3, 4, 5]

// 从 Vec
let vec = vec![1, 2, 3];
let s5 = &vec[0..2];

// 直接创建
let s6 = &[1, 2, 3];        // 从数组字面量

```

<br/>

## 字符切片

&str 是特殊的 slice，指向 UTF-8 字节序列

```rust
let s = "你好世界";
let slice = &s[0..3];    // "你"（UTF-8 占 3 字节）

// ❌ 危险：按字节切割可能切在字符中间
// let bad = &s[0..2];   // 运行时 panic!
```

字符串切片范围索引必须出现在有效的UTF-8字符边界上。如果你尝试在多字节字符的中间创建字符串切片，程序将会出错并退出

## 常用方法

1. 基本信息

```rust
fn main() {
    let slice = &[1, 2, 3, 4, 5];

    // 长度
    assert_eq!(slice.len(), 5);

    // 是否为空
    assert!(!slice.is_empty());

    // 是否包含某个元素
    assert!(slice.contains(&3));
    assert!(!slice.contains(&10));

    // 首次/最后一次出现的位置
    assert_eq!(slice.iter().position(|&x| x == 3), Some(2));
    assert_eq!(slice.iter().rposition(|&x| x == 3), Some(2));

    // 是否以某个切片开头/结尾
    assert!(slice.starts_with(&[1, 2]));
    assert!(slice.ends_with(&[4, 5]));
} 
```

2. 访问元素

```rust
fn main() {
    let slice = &[10, 20, 30, 40, 50];

    // 索引访问（可能 panic）
    assert_eq!(slice[0], 10);

    // 安全访问（返回 Option）
    assert_eq!(slice.get(0), Some(&10));
    assert_eq!(slice.get(10), None);

    // 首尾元素
    assert_eq!(slice.first(), Some(&10));
    assert_eq!(slice.last(), Some(&50));

    // 获取前 N 个/后 N 个
    assert_eq!(slice.first_chunk::<3>(), Some(&[10, 20, 30]));    // 稳定版 1.77+
    assert_eq!(slice.last_chunk::<2>(), Some(&[40, 50]));

    // 获取第 N 个（从 0 开始）
    assert_eq!(slice.get(2), Some(&30));

    // 获取第 N 个（从末尾开始）
    assert_eq!(slice.get(slice.len() - 1), Some(&50));
}
```

3. 切片与分割

```rust
fn main() {
    let slice = &[1, 2, 3, 4, 5, 6, 7, 8];
    // 1. 基本切片
    let s1 = &slice[0..3];      // [1, 2, 3]
    let s2 = &slice[..3];       // [1, 2, 3]
    let s3 = &slice[2..];       // [3, 4, 5, 6, 7, 8]
    let s4 = &slice[..];        // [1, 2, 3, 4, 5, 6, 7, 8]

    // 2. split_at - 在指定位置分割
    let (left, right) = slice.split_at(3);
    assert_eq!(left, &[1, 2, 3]);
    assert_eq!(right, &[4, 5, 6, 7, 8]);

    // 3. split_at_mut - 可变分割
    let mut arr = [1, 2, 3, 4, 5];
    let (left, right) = arr.split_at_mut(2);
    left[0] = 10;
    right[0] = 20;
    assert_eq!(arr, [10, 2, 20, 4, 5]);

    // 4. split - 按条件分割（返回迭代器）
    let slice = &[1, 2, 3, 4, 5, 6];
    let parts: Vec<&[i32]> = slice.split(|&x| x % 2 == 0).collect();
    // 在偶数处分割: [1], [3], [5], []（注意保留分隔符位置）

    // 5. split_once - 只分割一次（稳定版 1.52+）
    let text = "hello:world:rust";
    if let Some((left, right)) = text.split_once(':') {
        assert_eq!(left, "hello");
        assert_eq!(right, "world:rust");
    }

    // 6. chunks - 固定大小分块
    let slice = &[1, 2, 3, 4, 5, 6, 7];
    let chunks: Vec<&[i32]> = slice.chunks(3).collect();
    assert_eq!(chunks, vec![&[1, 2, 3], &[4, 5, 6], &[7]]);

    // 7. chunks_exact - 大小整除的分块
    let slice = &[1, 2, 3, 4, 5, 6];
    let chunks: Vec<&[i32]> = slice.chunks_exact(3).collect();
    assert_eq!(chunks, vec![&[1, 2, 3], &[4, 5, 6]]);

    // 8. windows - 滑动窗口
    let slice = &[1, 2, 3, 4];
    let windows: Vec<&[i32]> = slice.windows(3).collect();
    assert_eq!(windows, vec![&[1, 2, 3], &[2, 3, 4]]);

    // 9. array_chunks - 数组块（稳定版 1.77+）
    let slice = &[1, 2, 3, 4, 5, 6];
    let chunks: Vec<&[i32; 2]> = slice.array_chunks().collect();
    assert_eq!(chunks, vec![&[1, 2], &[3, 4], &[5, 6]]);
}
```

4. 迭代器方法

```rust
fn main() {
    let slice = &[1, 2, 3, 4, 5];

    // 1. iter() - 不可变迭代器
    for item in slice.iter() {
        println!("{}", *item);
    }

    // 2. iter_mut() - 可变迭代器（需要 &mut [T]）
    let mut arr = [1, 2, 3];
    for item in arr.iter_mut() {
        *item *= 2;
    }
    assert_eq!(arr, [2, 4, 6]);

    // 3. 常用迭代器组合
    let slice = &[1, 2, 3, 4, 5];

    // map, filter, fold
    let sum: i32 = slice.iter().filter(|&&x| x % 2 == 0).map(|x| x * x).sum();
    assert_eq!(sum, 4 + 16); // 20

    // any/all
    assert!(slice.iter().any(|&x| x > 4));
    assert!(!slice.iter().all(|&x| x < 5));

    // find
    assert_eq!(slice.iter().find(|&&x| x > 3), Some(&4));

    // max/min
    assert_eq!(slice.iter().max(), Some(&5));
    assert_eq!(slice.iter().min(), Some(&1));

    // 4. enumerate（带索引）
    for (i, &value) in slice.iter().enumerate() {
        println!("索引 {}: 值 {}", i, value);
    }
}

```

5. 排序与搜索

```rust
fn main() {
}


```

6. 不可变转换

```rust
fn main() {
}

```

7. 可变转换

```rust
fn main() {
}

```