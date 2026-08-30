---
title: ""
description: "rust trait"
---

# Trait 特性

Trait定义了特定类型所具有的功能，可以使用Trait以一种抽象的方式去定义共享行为

## 定义Trait

```rust
//定义两个结构体 NewsArticle 和 Tweet  
pub struct NewsArticle {
    pub headline: String,
    pub location: String,
    pub author: String,
    pub content: String,
}
pub struct Tweet {
    pub username: String,
    pub content: String,
    pub reply: bool,
    pub retweet: bool,
}

//定义一个trait
pub trait Summary {
    fn summarize(&self) -> String; //定义一个方法签名
    fn print_word(&self) { //定义一个默认方法
        println!("Hello World")
    }
}

```
## 实现Trait
