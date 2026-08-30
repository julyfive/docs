# 切片 String Slice
创建：[起始索引..结束索引] 不包括结束索引位置的元素
```rust
let s = String::from("hello world");
let hello = &s[0..5];
let world = &s[6..11];
let s2 = &s;
```
```rust
let s = "hello";
let slice = &s[0..2];
let slice = &s[0..<2];

let length = s.len();
let slice = &s[3..<length];
let slice = &s[3..];

let slice = &s[..<length];
let slice = &s[..];
```

```rust
let a = [1,2,3,4,5];
let slice = &a[1..<3]; //&[i32]
assert_eq!(slice, &[2,3]);
```
Slice 是特殊的引用类型，因为它们是”fat“（宽/胖/肥）指针，带有元数据