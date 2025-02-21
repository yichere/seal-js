## 项目原理

该项目原理为中间件，即客户端向中间件请求，进而向 meme-generator 请求，并将结果返回客户端。

## 安装

第一次使用在项目目录下执行

```shell

pip install -r requirements.txt

```

启动 `meme-generator` 服务

``` shell

meme download

meme start

```

根据需要修改源代码的 meme-generator 服务地址，然后启动 `meme-middleware` 服务

```shell

uvicorn serve:app

```

默认开放端口 8000。