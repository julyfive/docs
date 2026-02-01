---
title: ""
description: "nodejs、node环境安装"
---

# Node开发环境搭建

## nvm

使用nvm作为node管理工具

下载地址：[nvm](https://github.com/nvm-sh/nvm)、[nvm-windows](https://github.com/coreybutler/nvm-windows)

在磁盘上选择/创建一个目录作为 nvm 安装目录，如：D:\Nvm

在磁盘上选择/创建一个目录作为 node 安装目录，如：D:\Nvm\nodejs

- nvm 安装到 `D:\Nvm\`
- nodejs 安装到 `D:\Nvm\nodejs`

nvm安装完成后查看版本：

```
nvm -v
```

查看所有可下载的node版本：

```
nvm list available
```

下载/安装 node 推荐安装LTS长期支持的版本

```
nvm install 18.20.0/(其他版本)
```

下载完成后 使用/切换 node：

```
nvm use 18.20.0/(其他版本)
```

查看node版本：

```
node -v
```

## 配置全局包以及npm缓存位置

创建全局包存放的目录，如：D:\Nvm\nodejs\node_global

创建npm的缓存存放目录，如：D:\Nvm\nodejs\node_cache

配置全局包安装位置：

```
npm config set prefix "D:\Nvm\nodejs\node_global"
```

配置npm缓存位置：

```
npm config set cache "D:\Nvm\nodejs\node_cache"
```

## 添加系统环境变量

右键单击我的电脑->属性->在系统信息中找到 '高级系统设置'->找到 '环境变量'->在 '系统环境变量' 下找到 "path" 双击->新建->输入
D:\Nvm\nodejs\node_global (全局包的地址)->确定

恭喜！安装完成！

## nrm

nrm用于快速切换 npm 的注册表（registry）源

安装：

```
npm install -g nrm
```

列出所有源 *表示当前使用中的源地址：

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

切换淘宝源：

```
nrm use taobao/其他源名称
```

添加/使用/删除自定义源：

```
nrm add myrepo https://registry.example.com
nrm use myrepo
nrm del myrepo
```
