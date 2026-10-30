# HashMap\<K, V\>

`HashMap<K, V>` 是标准库提供的**哈希表**，用于存放键值对。键 `K` 必须实现 `Eq + Hash`，查找、插入、删除的平均时间复杂度都是 O(1)。

- 键唯一：重复插入同一个键会覆盖旧值，并返回被替换的旧值
- 无序：迭代顺序与插入顺序无关，每次运行都可能不同
- `get` 返回 `Option<&V>`，索引语法 `map[&key]` 在键缺失时会 panic
- `entry` API 可以「一次哈希」完成查找 + 插入，是计数、分组的标准写法
- `HashMap<String, V>` 可以直接用 `&str` 查询（借助 `Borrow`）
- 需要按 key 排序或范围查询时，改用 `BTreeMap`

```text
key ──hash──> 桶下标 ──> [(k1, v1), (k2, v2), ...]

"Blue"   ──> 3 ──> [("Blue", 10)]
"Yellow" ──> 7 ──> [("Yellow", 50)]
```

## 创建

```rust
use std::collections::HashMap;

fn main() {
    let mut scores: HashMap<String, i32> = HashMap::new();
    scores.insert(String::from("Blue"), 10);

    // 从键值对迭代器收集
    let from_pairs: HashMap<&str, i32> = [("a", 1), ("b", 2)].into_iter().collect();

    // 预分配容量，减少 rehash
    let with_cap: HashMap<&str, i32> = HashMap::with_capacity(10);

    println!("{scores:?}");
    println!("{from_pairs:?}");
    assert!(with_cap.capacity() >= 10);
}
```

- `HashMap::new()` 初始不分配，首次插入时才分配
- `with_capacity(n)` 预留空间，适合已知元素规模的场景
- 可以从 `(K, V)` 迭代器 `collect`，类型需要可推断或显式标注

## 插入与更新

```rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();

    // insert 返回旧值
    assert_eq!(scores.insert("Blue", 10), None);
    assert_eq!(scores.insert("Blue", 25), Some(10));
    assert_eq!(scores["Blue"], 25);

    // entry：键不存在时插入，存在时返回已有值的可变引用
    let score = scores.entry("Yellow").or_insert(50);
    *score += 1;
    assert_eq!(scores["Yellow"], 51);

    // and_modify：存在时修改；or_insert：不存在时插入
    scores.insert("Red", 5);
    scores
        .entry("Red")
        .and_modify(|v| *v += 10)
        .or_insert(0);
    assert_eq!(scores["Red"], 15);

    // or_insert_with：按需计算默认值，避免无谓开销
    scores.entry("Green").or_insert_with(|| 1 + 1);
    assert_eq!(scores["Green"], 2);

    // remove 返回被移除的值
    assert_eq!(scores.remove("Red"), Some(15));
    assert_eq!(scores.remove("Red"), None);

    // retain 按条件保留
    scores.retain(|_, v| *v > 10);
    println!("{scores:?}"); // 只剩 Blue、Yellow
}
```

| 方法 | 说明 |
| ---- | ---- |
| `insert(k, v)` | 插入/覆盖，返回 `Option<V>` 旧值 |
| `entry(k)` | 返回 `Entry`，用于链式插入或修改 |
| `or_insert(v)` | 键不存在时插入 `v`，返回 `&mut V` |
| `or_insert_with(f)` | 键不存在时用闭包生成值 |
| `or_default()` | 键不存在时插入 `V::default()` |
| `and_modify(f)` | 键存在时先用闭包修改，再继续链式调用 |
| `remove(&k)` | 删除并返回 `Option<V>` |
| `retain(f)` | 按条件原地保留键值对 |

- `insert` 会覆盖旧值；只想在缺失时插入时用 `entry(...).or_insert(...)`
- `entry` 只计算一次哈希，比 `get` + `insert` 少一次查找
- `or_insert_with` 适合默认值构造成本高的场景（如 `Vec::new`、字符串拼接）

## 查询

```rust
use std::collections::HashMap;

fn main() {
    let mut scores: HashMap<String, i32> = HashMap::new();
    scores.insert(String::from("Blue"), 10);

    let key = String::from("Blue");

    // get 返回 Option<&V>，可以用 &str 查询 String 键
    assert_eq!(scores.get("Blue"), Some(&10));
    assert_eq!(scores.get(&key), Some(&10));
    assert_eq!(scores.get("Red"), None);

    // get_mut 返回 Option<&mut V>
    if let Some(score) = scores.get_mut(&key) {
        *score += 1;
    }
    assert_eq!(scores[&key], 11);

    assert!(scores.contains_key("Blue"));
    assert_eq!(scores.len(), 1);

    // 索引语法：键不存在会 panic
    // let missing = scores["Red"];
}
```

- `get` 接收 `&Q`，只要 `K: Borrow<Q>`，`HashMap<String, _>` 就能用 `&str` 查询
- `get_mut` 返回可变引用，适合原地更新
- `contains_key` 只判断存在性，不需要值时比 `get().is_some()` 更直观
- `map[&key]` 在键缺失时 panic，生产代码优先 `get`

## 遍历

```rust
use std::collections::HashMap;

fn main() {
    let mut scores: HashMap<&str, i32> = HashMap::new();
    scores.insert("Blue", 10);
    scores.insert("Yellow", 50);

    for (k, v) in &scores {
        println!("{k}: {v}"); // 顺序不确定
    }

    for v in scores.values_mut() {
        *v += 1;
    }

    let keys: Vec<&&str> = scores.keys().collect();
    println!("{keys:?}");

    let total: i32 = scores.values().sum();
    println!("{total}"); // 62

    // into_iter 按值消费，之后不能再使用 scores
    for (k, v) in scores {
        println!("{k} = {v}");
    }
}
```

- `&map` 迭代得到 `(&K, &V)`；`&mut map` 得到 `(&K, &mut V)`
- `keys()` / `values()` / `values_mut()` 分别只遍历键、值、可变值
- `into_iter()` 消费 `HashMap`，得到 `(K, V)`
- 迭代顺序由哈希决定，不要依赖它做展示或业务逻辑

## 词频统计

`entry` 的经典用法：

```rust
use std::collections::HashMap;

fn main() {
    let text = "hello world wonderful world";
    let mut counts = HashMap::new();

    for word in text.split_whitespace() {
        *counts.entry(word).or_insert(0) += 1;
    }

    assert_eq!(counts["world"], 2);
    assert_eq!(counts["hello"], 1);
    println!("{counts:?}");
}
```

- `counts` 的类型由 `or_insert(0)` 推断为 `HashMap<&str, i32>`
- 如果用 `String` 作为键，可以用 `word.to_string()`，代价是每次分配
- 同样的模式可以用于分组（`or_insert_with(Vec::new).push(...)`）、缓存等

## 键的要求与 Borrow

- `K` 必须实现 `Eq + Hash`，浮点数 `f64` 因为 `NaN != NaN` 不实现 `Eq`，不能直接作键
- 自定义类型作键需要派生 `Hash`、`Eq`、`PartialEq`：

```rust
use std::collections::HashMap;

#[derive(Debug, Hash, PartialEq, Eq)]
struct UserId(u32);

fn main() {
    let mut users = HashMap::new();
    users.insert(UserId(1), "Alice");

    assert_eq!(users.get(&UserId(1)), Some(&"Alice"));
    assert_eq!(users.get(&UserId(2)), None);
}
```

- `HashMap<String, V>` 能用 `&str` 查询，是因为 `String: Borrow<str>`
- `HashMap<Vec<T>, V>` 同理可以用 `&[T]` 查询
- 键一旦插入就不要再修改：键的哈希值变化后，`HashMap` 就找不回这个条目

## HashMap、BTreeMap 与 HashSet

| 类型 | 键要求 | 顺序 | 查找复杂度 |
| ---- | ------ | ---- | ---------- |
| `HashMap<K, V>` | `Eq + Hash` | 无序 | 平均 O(1) |
| `BTreeMap<K, V>` | `Ord` | 按 key 排序 | O(log n) |
| `HashSet<T>` | `Eq + Hash` | 无序 | 平均 O(1) |

- 需要按 key 顺序遍历、范围查询（`range(..)`）时用 `BTreeMap`
- 只关心元素是否存在时用 `HashSet`，比 `HashMap<T, ()>` 语义更清晰
- 标准库 `HashMap` 使用随机种子（`RandomState`）抵御哈希碰撞攻击，安全性优先于极致性能

## 常见错误

| 错误场景 | 说明 |
| -------- | ---- |
| `get` 结果忘记解包 | 返回的是 `Option<&V>` |
| 持有 `get` 的引用时插入 | 借用冲突（E0502），先结束借用 |
| 用 `map[key]` 查询缺失键 | 直接 panic，应使用 `get` |
| 依赖迭代顺序 | 哈希表无序，顺序不可预测 |
| 用 `f64` 作键 | 不满足 `Eq + Hash`，编译错误 |
| 先 `get` 再 `insert` | 两次哈希，计数/分组应使用 `entry` |
| 修改已在 map 中的键 | 哈希值变化后条目无法再访问 |

```rust
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("a", 1);

    let value = map.get("a").unwrap();
    // map.insert("b", 2); // ❌ E0502：value 仍借用 map
    println!("{value}");

    map.insert("b", 2); // ✅ value 不再使用后可以修改
    assert_eq!(map.len(), 2);
}
```

## 总结

- `HashMap<K, V>` 存放无序键值对，键必须 `Eq + Hash`，平均 O(1) 查找
- `insert` 覆盖并返回旧值；只缺失时插入用 `entry(...).or_insert(...)`
- `get` / `get_mut` 返回 `Option`，索引语法在键缺失时会 panic
- `entry` 只计算一次哈希，是计数、分组、缓存的推荐写法
- `String` 键可用 `&str` 查询，`Vec<T>` 键可用 `&[T]` 查询（`Borrow`）
- 需要有序或范围查询时用 `BTreeMap`，只判存在性时用 `HashSet`
