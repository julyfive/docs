# 切片 Slice

`[T]` 是 Rust 的**切片类型**，表示一段连续内存中的元素序列。它本身是**动态大小类型**（DST），不能直接作为变量类型使用，实际拿到的是它的引用 `&[T]` / `&mut [T]`（字符串切片则是 `&str`）。

- 切片不拥有数据，只是对数组、`Vec`、`String` 等连续存储的**借用**
- `&[T]` 是胖指针：地址 + 长度，64 位系统上占 16 字节
- 可变切片遵循借用规则：同一时刻只能存在一个 `&mut [T]`
- 索引越界会 panic，安全替代是 `get()` / `get_mut()`
- 字符串切片按**字节**索引，必须落在 UTF-8 字符边界上

| 类型 | 说明 |
| ---- | ---- |
| `[T]` | 切片本身，DST，只能通过引用使用 |
| `&[T]` | 不可变切片引用（ptr + len） |
| `&mut [T]` | 可变切片引用 |
| `&str` | UTF-8 字节切片，字符串字面量的类型 |

```text
s: &[i32]                     arr: [i32; 5]
┌──────────┬────────┐        ┌────┬────┬────┬────┬────┐
│ ptr ─────┼──┐     │        │ 1  │ 2  │ 3  │ 4  │ 5  │
├──────────┼──┼─────┤        └────┴────┴────┴────┴────┘
│ len = 3  │  │     │              ▲
└──────────┴──┼─────┘              │
              └────────────────────┘  指向 arr[1]，长度 3 → [2, 3, 4]
```

## 创建切片

```rust
fn main() {
    let arr = [1, 2, 3, 4, 5];

    let s1 = &arr[1..4]; // [2, 3, 4]
    let s2 = &arr[..3]; // [1, 2, 3]
    let s3 = &arr[2..]; // [3, 4, 5]
    let s4 = &arr[..]; // 整个数组
    let s5 = &arr[..=2]; // [1, 2, 3]
    println!("{s1:?} {s2:?} {s3:?} {s4:?} {s5:?}");

    let vec = vec![10, 20, 30];
    let s6 = &vec[1..]; // 从 Vec 借用
    println!("{s6:?}");

    let s7: &[i32] = &[1, 2, 3]; // 从数组字面量借用
    println!("{s7:?}");
}
```

- 范围语法：`a..b`、`a..=b`、`..b`、`a..`、`..`
- `&arr[..]` 与 `arr.as_slice()` 等价，都得到整个数组的切片
- `&vec[..]` 不会复制元素，只是借用 `Vec` 的缓冲区

越界访问是运行时错误，安全的写法是 `get`：

```rust
fn main() {
    let arr = [1, 2, 3];

    assert_eq!(arr.get(0..2), Some(&[1, 2][..]));
    assert_eq!(arr.get(0..9), None); // 超界返回 None，而不是 panic

    // let _ = &arr[0..9]; // ❌ 运行时 panic
}
```

## 字符串切片

`&str` 是 UTF-8 字节序列的切片，索引单位是**字节**而不是字符：

```rust
fn main() {
    let s = "你好世界";

    assert_eq!(&s[0..3], "你"); // "你" 占 3 字节
    assert_eq!(&s[3..6], "好");

    // ❌ 切在字符中间，运行时 panic
    // let bad = &s[0..2];

    // 安全版本：返回 Option<&str>
    assert_eq!(s.get(0..3), Some("你"));
    assert_eq!(s.get(0..2), None);
}
```

- `s.len()` 返回字节数，不是字符数
- 用 `char_indices()` 找到字符边界，再做切片

```rust
fn main() {
    let s = "你好世界";

    for (i, c) in s.char_indices() {
        println!("字节位置 {i}: {c}");
    }
}
```

## 访问元素

```rust
fn main() {
    let s = &[10, 20, 30, 40, 50];

    assert_eq!(s[2], 30); // 越界会 panic
    assert_eq!(s.get(2), Some(&30)); // 安全访问
    assert_eq!(s.get(9), None);

    assert_eq!(s.first(), Some(&10));
    assert_eq!(s.last(), Some(&50));

    let empty: &[i32] = &[];
    assert_eq!(empty.first(), None);
    assert!(empty.is_empty());
}
```

- `first()` / `last()` 不会 panic，空切片返回 `None`
- `get_mut()` 可以取得 `Option<&mut T>`，用于原地修改
- `split_first()` / `split_last()` 可以同时拿到首/尾元素和剩余切片

```rust
fn main() {
    let mut v = vec![1, 2, 3];
    if let Some(first) = v.first_mut() {
        *first = 100;
    }
    assert_eq!(v, [100, 2, 3]);

    let (head, tail) = v.split_first().unwrap();
    println!("{head} {tail:?}"); // 100 [2, 3]
}
```

## 基本信息

```rust
fn main() {
    let s = &[1, 2, 3, 4, 5];

    assert_eq!(s.len(), 5);
    assert!(!s.is_empty());
    assert!(s.contains(&3));
    assert!(s.starts_with(&[1, 2]));
    assert!(s.ends_with(&[4, 5]));
}
```

- `len()` 是 O(1)，长度直接存放在胖指针里
- `contains` 对无序数据是 O(n)，需要频繁查找时考虑 `HashSet`
- `starts_with` / `ends_with` 比较前缀、后缀

## 分割与分块

```rust
fn main() {
    let s = &[1, 2, 3, 4, 5, 6];

    // 按位置一分为二（可变版本为 split_at_mut）
    let (left, right) = s.split_at(3);
    assert_eq!(left, &[1, 2, 3]);
    assert_eq!(right, &[4, 5, 6]);

    // 按条件分割，分隔元素本身会被丢弃
    let parts: Vec<&[i32]> = s.split(|&x| x % 2 == 0).collect();
    assert_eq!(parts.len(), 4); // [1] [3] [5] []
    assert_eq!(parts[0], &[1]);

    // 固定大小分块，最后一块可以不足
    let chunks: Vec<&[i32]> = s.chunks(4).collect();
    assert_eq!(chunks.len(), 2); // [1,2,3,4] [5,6]

    // 严格分块，忽略不足的尾部
    let exact: Vec<&[i32]> = s.chunks_exact(4).collect();
    assert_eq!(exact.len(), 1);
    assert_eq!(s.chunks_exact(4).remainder(), &[5, 6]);

    // 滑动窗口
    let windows: Vec<&[i32]> = s.windows(3).collect();
    assert_eq!(windows.len(), 4); // [1,2,3] [2,3,4] [3,4,5] [4,5,6]
}
```

- `split_at(mid)` 在 `mid > len` 时 panic
- `chunks(0)`、`windows(0)` 会 panic
- `split_at_mut` 是同时操作两段可变数据的标准方式：

```rust
fn main() {
    let mut arr = [1, 2, 3, 4, 5];

    let (left, right) = arr.split_at_mut(2);
    left[0] = 10;
    right[0] = 20;

    println!("{:?}", arr); // [10, 2, 20, 4, 5]
}
```

## 排序与搜索

切片可以原地排序和二分查找（需要 `&mut [T]` 或 `Vec`）：

```rust
fn main() {
    let mut v = vec![3, 1, 4, 1, 5, 9, 2];

    v.sort(); // 稳定排序，要求 T: Ord
    assert_eq!(v, [1, 1, 2, 3, 4, 5, 9]);

    v.dedup(); // 去除相邻重复，必须先排序
    assert_eq!(v, [1, 2, 3, 4, 5, 9]);

    v.sort_unstable_by(|a, b| b.cmp(a)); // 不稳定排序，降序，速度通常更快
    assert_eq!(v[0], 9);

    // 按元组的某个字段排序
    let mut people = vec![("Bob", 20), ("Alice", 18), ("Carol", 25)];
    people.sort_by_key(|&(_, age)| age);
    assert_eq!(people[0], ("Alice", 18));

    // 二分查找要求升序，返回 Ok(位置) 或 Err(插入位置)
    let nums = [10, 20, 30, 40];
    assert_eq!(nums.binary_search(&30), Ok(2));
    assert_eq!(nums.binary_search(&25), Err(2));
}
```

- `sort` 稳定但可能分配临时内存；`sort_unstable` 不保证相等元素顺序，更快
- `sort_by` 适合浮点数等只实现 `PartialOrd` 的类型（需自己处理 `NaN`）
- `binary_search` 前必须保证有序，否则结果无意义

## 转换：切片与集合

不可变切片可以复制成 `Vec`、数组或字符串：

```rust
fn main() {
    let s: &[i32] = &[1, 2, 3];

    let v: Vec<i32> = s.to_vec(); // 需要 T: Clone
    let v2 = Vec::from(s); // 等价写法
    let arr: [i32; 3] = s.try_into().unwrap(); // 长度必须匹配
    let boxed: Box<[i32]> = v.clone().into_boxed_slice();

    println!("{v:?} {v2:?} {arr:?} {boxed:?}");

    let joined = ["a", "b", "c"].join("-"); // 元素需实现 Borrow<str>
    let concat = ["hello", "world"].concat();
    println!("{joined} {concat}"); // a-b-c helloworld
}
```

可变切片可以原地修改数据：

```rust
fn main() {
    let mut v = vec![1, 2, 3];

    let s: &mut [i32] = v.as_mut_slice(); // Vec -> 可变切片
    s[0] = 100;

    for x in v.iter_mut() {
        *x *= 2;
    }
    println!("{:?}", v); // [200, 4, 6]

    let mut arr = [5, 4, 3, 2, 1];
    let (left, right) = arr.split_at_mut(2);
    left.sort();
    right.sort();
    println!("{:?}", arr); // [4, 5, 1, 2, 3]
}
```

- `to_vec()` 深拷贝元素，成本取决于 `T: Clone`
- `try_into()` 转数组时长度不匹配会返回 `Err`
- `into_boxed_slice()` 会把多余的容量释放掉
- 需要修改切片内容时，用 `&mut [T]` / `iter_mut()` / `split_at_mut`

## 切片作为函数参数

参数写成 `&[T]` 而不是 `&Vec<T>`，可以同时接受数组、`Vec` 和其他切片：

```rust
fn sum(values: &[i32]) -> i32 {
    values.iter().sum()
}

fn double_all(values: &mut [i32]) {
    for v in values.iter_mut() {
        *v *= 2;
    }
}

fn main() {
    let arr = [1, 2, 3];
    let mut v = vec![4, 5, 6];

    println!("{}", sum(&arr)); // 6，数组自动借成切片
    println!("{}", sum(&v)); // 15，Vec 自动解引用成切片

    double_all(&mut v);
    println!("{v:?}"); // [8, 10, 12]
}
```

- `&Vec<T>` 会限制调用方只能传 `Vec`，没有额外好处
- 切片不能返回局部变量的借用：

```rust
// ❌ 返回局部数组的切片，编译错误
// fn bad() -> &[i32] {
//     let arr = [1, 2, 3];
//     &arr
// }
```

## 常见错误

| 错误场景 | 说明 |
| -------- | ---- |
| `&arr[0..9]` 越界 | 直接 panic，改用 `get(0..9)` |
| 在字符中间切 `&str` | 运行时 panic，需按 `char_indices` 的边界切 |
| `chunks(0)` / `windows(0)` | 参数为 0 会 panic |
| 持有元素引用时修改 `Vec` | 借用冲突（E0502），`push` 可能重新分配内存 |
| 返回局部变量的切片 | 编译错误，生命周期不够长 |
| 参数写成 `&Vec<T>` | 限制调用方，应使用 `&[T]` |

同时持有元素引用和修改 `Vec` 的经典报错：

```rust
fn main() {
    let mut v = vec![1, 2, 3];
    let first = &v[0];

    // v.push(4); // ❌ E0502：可变借用与不可变借用冲突
    println!("{first}");
}
```

- `push` 可能触发扩容，让已有切片指向已释放的内存，编译器因此直接禁止
- 需要先结束借用：先复制出值，或把修改放到借用作用域之后

## 总结

- 切片是对连续内存的借用，`&[T]` 由「指针 + 长度」组成，不拥有数据
- 创建切片用范围语法；越界索引 panic，安全版本是 `get()` / `get_mut()`
- 字符串切片按字节索引，必须落在 UTF-8 字符边界上
- `split_at` / `chunks` / `windows` 用于分割和分块，`sort` / `binary_search` 用于排序查找
- 函数参数优先用 `&[T]` / `&mut [T]`，同时兼容数组与 `Vec`
- 切片与 `Vec` 的借用不能同时冲突，扩容会让旧切片失效
