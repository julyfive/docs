# 数据库-PostgreSQL

<br/>

##### 连接数据库

```postgresql
psql -U 用户名 -d 数据库名 -h 主机 -p 端口
```

##### 本地连接

```postgresql
psql -U postgres
```

##### 创建数据库

```postgresql
CREATE DATABASE mapvision
    TEMPLATE template0
    ENCODING 'UTF8'
    LOCALE_PROVIDER 'icu'
    ICU_LOCALE 'zh-Hans-x-icu'
    LC_COLLATE 'zh-Hans-x-icu'
    LC_CTYPE 'zh-Hans-x-icu';
```