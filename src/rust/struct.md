# Struct 结构体

## 定义

```rust
struct Rectangle {
    width: i32,
    height: i32,
}
```

## 实现方法

```rust
fn main() {
    struct Rectangle {
        width: i32,
        height: i32,
    }

    impl Rectangle { 
        // 实现结构体方法
        fn area(&self) -> i32 {
            self.width * self.height
        }
    
        //使用关联函数创建结构体实例
        fn from(width: i32, height: i32) -> Rectangle {
            Rectangle { width, height }
        }
    }

    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };
    println!(
        "The area of the rectangle is {} square pixels.",
        rect1.area()
    );
    let rect2 = Rectangle::from(30, 50);
    println!(
        "The area of the rectangle is {} square pixels.",
        rect2.area()
    );
}

```