---
title: ""
description: "nodejs、node环境安装"
---

# Node开发环境安装

## 选择安装路径 windows

在磁盘上选择/创建一个目录作为 nvm 安装目录，如：D:\Nvm

在磁盘上选择/创建一个目录作为 node 安装目录，如：D:\Nvm\nodejs

## 环境安装

推荐使用nvm作为node管理工具：[nvm](https://github.com/nvm-sh/nvm)、
windows使用：[nvm-windows](https://github.com/coreybutler/nvm-windows)

下载完成后安装到磁盘目录下

- nvm 安装到 `D:\Nvm\`
- nodejs 安装到 `D:\Nvm\nodejs`
    - 创建 `D:\Nvm\nodejs\node_global` 目录，用于存放全局包
    - 创建 `D:\Nvm\nodejs\node_cache` 目录，用于存放缓存
- 命令行输入以下命令：
    - `npm config set prefix "D:\Nvm\nodejs\node_global"` 设置全局包安装目录
    - `npm config set cache "D:\Nvm\nodejs\node_cache"` 设置缓存目录

查看nvm版本：

```
nvm -v
```

查看node版本，推荐安装LTS长期支持版本

```
nvm list available
```

下载/安装 node 环境 选择你需要的版本 18.20.0 其他版本...

```
nvm install 18.20.0
```

## npm 源管理工具

nrm用于快速切换 npm 的注册表（registry）源

安装

```
npm install -g nrm
```

列出所有源 *表示当前使用中的源地址

```
nrm ls
```
```
npm ---------- https://registry.npmjs.org/
yarn --------- https://registry.yarnpkg.com/
tencent ------ https://mirrors.tencent.com/npm/
cnpm --------- https://r.cnpmjs.org/
* taobao ------- https://registry.npmmirror.com/
npmMirror ---- https://skimdb.npmjs.com/registry/
huawei ------- https://repo.huaweicloud.com/repository/npm/
```

切换源 淘宝源

```
nrm use taobao
```

添加/使用/删除自定义源

```
nrm add myrepo https://registry.example.com
nrm use myrepo
nrm del myrepo
```