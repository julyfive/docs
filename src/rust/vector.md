# Vector\<T\>

`Vec<T>` 是标准库提供的**动态数组**：在堆上连续存储同类型元素，长度可以在运行时增长或缩短。它是 Rust 中最常用的集合类型，也是切片 `&[T]` 的主要来源。

- 数据在堆上**连续**存放，随机访问 O(1)
- 同时记录长度 `len` 与容量 `capacity`：`len` 是已初始化元素数，`capacity` 是已分配空间
- `push` 超出容量时会重新分配（通常翻倍），并移动所有元素
- 索引越界会 panic，安全版本是 `get()` / `get_mut()`
- 借用规则同样适用：持有元素引用时不能修改 `Vec` 的结构

```text
栈上的 Vec<T>:                堆上的连续内存:
┌──────┬──────┬──────┐       ┌────┬────┬────┬─────────────────┐
│ ptr  │ len  │ cap  │──────>│ T0 │ T1 │ T2 │ 未初始化容量...  │
└──────┴──────┴──────┘       └────┴────┴────┴─────────────────┘
                                ▲
                                └─ len = 3，cap = 6
```

## 创建

```rust
fn main() {
    let v1: Vec<i32> = Vec::new(); // 空 Vec，需要标注元素类型
    let v2 = vec![1, 2, 3]; // vec! 宏
    let v3 = vec![0; 5]; // 5 个 0，元素需要 Clone
    let v4: Vec<i32> = Vec::with_capacity(10); // 预留容量，长度仍为 0
    let v5: Vec<i32> = (1..=5).collect(); // 从迭代器收集
    let v6 = Vec::from([1, 2, 3]); // 从数组转换
    let v7 = [1, 2, 3].to_vec(); // 从切片复制，需要 Clone

    println!("{v2:?} {v3:?} {v5:?} {v6:?} {v7:?}");
    println!("v4: len = {}, cap = {}", v4.len(), v4.capacity());
    assert!(v1.is_empty());
}
```

- `Vec::new()` 不分配内存，首次插入时才分配
- `with_capacity(n)` 预分配 n 个元素的空间，适合已知规模的场景，避免反复扩容
- `vec![value; n]` 对非 `Copy` 类型会调用 `clone` n 次
- 从迭代器收集时用 `collect::<Vec<_>>()`，类型可以从上下文推断

## 访问元素

```rust
fn main() {
    let v = vec![10, 20, 30];

    assert_eq!(v[1], 20); // 越界会 panic
    assert_eq!(v.get(1), Some(&20)); // 安全访问，返回 Option
    assert_eq!(v.get(9), None);

    assert_eq!(v.first(), Some(&10));
    assert_eq!(v.last(), Some(&30));

    let empty: Vec<i32> = Vec::new();
    assert_eq!(empty.first(), None);

    let mut v = vec![1, 2, 3];
    if let Some(x) = v.get_mut(0) {
        *x = 100;
    }
    assert_eq!(v[0], 100);
}
```

- `v[i]` 在越界时 panic，适合「确定存在」的场景
- `get` / `get_mut` 返回 `Option<&T>` / `Option<&mut T>`，适合边界不确定的场景
- 索引必须连续：`Vec` 不支持从中间插入空洞

## 添加与删除

```rust
fn main() {
    let mut v = vec![1, 2, 3];

    v.push(4); // 尾部追加，均摊 O(1)
    assert_eq!(v.pop(), Some(4)); // 弹出尾部，O(1)

    v.insert(1, 10); // 中间插入，O(n)
    assert_eq!(v, [1, 10, 2, 3]);
    assert_eq!(v.remove(1), 10); // 按下标删除并返回，O(n)

    // swap_remove：把最后一个元素换到该位置，O(1) 但打乱顺序
    let mut v = vec!["a", "b", "c"];
    assert_eq!(v.swap_remove(0), "a");
    assert_eq!(v, ["c", "b"]);

    // retain：原地保留满足条件的元素
    let mut v = vec![1, 2, 3, 4, 5];
    v.retain(|&x| x % 2 == 1);
    assert_eq!(v, [1, 3, 5]);

    // dedup：只能去掉「相邻」重复，通常先排序
    let mut v = vec![1, 1, 2, 2, 3, 1];
    v.dedup();
    assert_eq!(v, [1, 2, 3, 1]);

    // split_off：在指定位置切成两个 Vec
    let mut v = vec![1, 2, 3, 4];
    let tail = v.split_off(2);
    assert_eq!(v, [1, 2]);
    assert_eq!(tail, [3, 4]);
}
```

| 方法 | 复杂度 | 说明 |
| ---- | ------ | ---- |
| `push(v)` / `pop()` | 均摊 O(1) | 尾部增删 |
| `insert(i, v)` / `remove(i)` | O(n) | 中间增删，后续元素移动 |
| `swap_remove(i)` | O(1) | 删除并打乱顺序 |
| `retain(f)` | O(n) | 按条件原地过滤 |
| `dedup()` | O(n) | 只能去除相邻重复 |
| `truncate(n)` / `clear()` | O(n) | 截断 / 清空，保留容量 |

## 长度与容量

```rust
fn main() {
    let mut v = Vec::with_capacity(4);

    assert_eq!(v.len(), 0);
    assert!(v.capacity() >= 4);

    v.extend([1, 2, 3]);
    assert_eq!(v.len(), 3);

    v.push(4);
    v.push(5); // 可能触发扩容，容量变大
    assert!(v.capacity() >= 5);

    v.truncate(2); // 保留前 2 个元素
    assert_eq!(v.len(), 2);

    v.shrink_to_fit(); // 容量收缩到接近 len
    assert!(v.capacity() >= v.len());

    v.clear(); // 清空元素，容量通常保留
    assert!(v.is_empty());

    // 预留空间，避免后续 push 反复扩容
    v.reserve(100);
    assert!(v.capacity() >= 100);
}
```

- `len()` 是已初始化元素个数，`capacity()` 是已分配空间，二者不要混淆
- 扩容会重新分配内存并**移动**所有元素，持有元素引用时编译不过
- `clear()` 只清空元素，容量保留；`shrink_to_fit()` 释放多余容量
- `reserve(n)` 确保至少还能再放 n 个元素

## 遍历

```rust
fn main() {
    let mut v = vec![1, 2, 3];

    for x in &v {
        println!("{x}"); // 不可变引用
    }

    for x in &mut v {
        *x *= 2; // 可变引用
    }
    assert_eq!(v, [2, 4, 6]);

    let total: i32 = v.iter().sum();
    println!("{total}"); // 12

    let doubled: Vec<i32> = v.iter().map(|x| x * 2).collect();
    println!("{doubled:?}"); // [4, 8, 12]

    for x in v {
        println!("{x}"); // 按值消费，v 之后不能再用
    }
}
```

- `&v` 迭代得到 `&T`；`&mut v` 得到 `&mut T`；`v` 得到 `T` 并消费 `Vec`
- 需要在遍历中修改元素时用 `iter_mut()` / `&mut v`
- 遍历时改变 `Vec` 的长度（`push` / `remove`）会被借用检查器拒绝

## 排序、去重与查找

```rust
fn main() {
    let mut v = vec![3, 1, 4, 1, 5, 9, 2];

    v.sort(); // 稳定排序，要求 T: Ord
    v.dedup(); // 排序后再去重，才能去掉所有重复
    assert_eq!(v, [1, 2, 3, 4, 5, 9]);

    assert!(v.contains(&4)); // 线性查找 O(n)
    assert_eq!(v.binary_search(&4), Ok(3)); // 二分查找 O(log n)，要求有序
    assert_eq!(v.iter().position(|&x| x == 9), Some(5));

    v.sort_unstable_by(|a, b| b.cmp(a)); // 降序，不保证相等元素顺序
    assert_eq!(v[0], 9);

    let mut people = vec![("Bob", 20), ("Alice", 18)];
    people.sort_by_key(|&(_, age)| age); // 按字段排序
    assert_eq!(people[0], ("Alice", 18));
}
```

- `sort` 稳定、可能分配临时内存；`sort_unstable` 更快但不稳定
- `binary_search` 返回 `Result<usize, usize>`：找到是 `Ok(下标)`，否则是 `Err(插入位置)`
- `contains` / `position` 是线性扫描，数据量大且有序时优先二分

## drain 与 splice

```rust
fn main() {
    let mut v = vec![1, 2, 3, 4, 5];

    // drain：删除范围并取走元素，返回迭代器
    let removed: Vec<i32> = v.drain(1..4).collect();
    assert_eq!(v, [1, 5]);
    assert_eq!(removed, [2, 3, 4]);

    // splice：用新元素替换一个范围，空范围相当于插入
    let _ = v.splice(1..1, [7, 8]);
    assert_eq!(v, [1, 7, 8, 5]);

    let _ = v.splice(1..3, [9]);
    assert_eq!(v, [1, 9, 5]);
}
```

- `drain` 适合「取出并删除一段元素」，容量保留
- `drain` 返回的迭代器即使不消费，被丢弃时元素也会被删除
- `splice` 可以替换任意范围，但要注意返回的迭代器是惰性的，丢弃时才会应用修改

## 所有权与借用规则

`Vec` 的元素是它拥有的数据，借用规则在集合上同样生效：

```rust
fn main() {
    let mut v = vec![1, 2, 3];
    let first = &v[0];

    // v.push(4); // ❌ E0502：不可变借用存活期间不能可变借用
    println!("{first}");

    v.push(4); // ✅ first 不再使用后可以修改
    assert_eq!(v, [1, 2, 3, 4]);
}
```

- `push` 可能触发扩容，旧内存被释放，已有引用会悬垂，因此编译器禁止同时存在
- 不能通过索引把元素**移动**出来：

```rust
fn main() {
    let mut v = vec![String::from("a"), String::from("b")];

    // let s = v[0]; // ❌ cannot move out of index
    let s = v.remove(0); // ✅ 移出并删除
    println!("{s} {v:?}");

    let mut v = vec![String::from("x")];
    let s = v.pop().unwrap(); // 从尾部移出
    println!("{s} {v:?}");
}
```

- 需要保留位置又要取出元素时，用 `Option::take` / `mem::take` / `replace`

```rust
fn main() {
    let mut v = vec![Some(String::from("a"))];
    let taken = v[0].take(); // 取出 Some 里的值，位置留下 None
    println!("{taken:?} {v:?}"); // Some("a") [None]
}
```

## 常见错误

| 错误场景 | 说明 |
| -------- | ---- |
| `v[10]` 访问越界 | 直接 panic，改用 `get(10)` |
| 持有元素引用时 `push` | 借用冲突（E0502），先结束借用 |
| `let s = v[0]` 移动元素 | 不能移出索引，改用 `remove` / `swap_remove` / `pop` |
| 正向循环中 `remove(i)` | 后续元素前移，会跳过元素，应倒序遍历或用 `retain` |
| 未排序就 `dedup()` | 只能去掉相邻重复，先去重需先排序 |
| 用 `capacity()` 当长度 | `len()` 才是元素个数，容量只是分配空间 |
| 遍历时修改 `Vec` 长度 | 借用检查器拒绝，先收集要删除的下标 |

## 总结

- `Vec<T>` 是堆上连续存储的动态数组，随机访问 O(1)，尾部增删均摊 O(1)
- `len` 是元素个数，`capacity` 是分配空间；预分配用 `with_capacity` / `reserve`
- 索引会 panic，`get` / `get_mut` 更安全
- `insert` / `remove` 是 O(n)，`swap_remove` 是 O(1) 但改变顺序
- 排序用 `sort` / `sort_unstable`，去重前先排序，二分查找要求有序
- 借用规则同样约束 `Vec`：持有元素引用时不能扩容或修改长度
