// ==UserScript==
// @name         meme-generator
// @author       以炽热挥剑
// @version      1.0.0
// @description  调用后端 api 实现表情包制作，发生 “表情包制作” 获取帮助
// @timestamp    1719668406
// @license      MIT
// @homepageURL   http://39.105.48.16:4000/yichere/2024/06/29/untitled-1719668463681/
// ==/UserScript==

// TODO: 支持图片嵌入，支持艾特获取头像作为图片嵌入

let ext = seal.ext.find('meme');

if (!ext) {
  ext = seal.ext["new"]('meme', '以炽热挥剑', '1.0.0');
  seal.ext.register(ext);
}

let cmdMeme = seal.ext.newCmdItemInfo();

cmdMeme.name = 'meme';

cmdMeme.help = `发送“表情包制作”获取表情详情`;

async function getMessage(base, path) {

  try {
    console.log(base + path)

    const response = await fetch(base + path, {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status},请确保你得 meme generate 服务器为开启状态！`);
    } else {
      const data = await response.json(); // Assuming the response is JSON
      return data;
    }
  }

  catch (error) {
    seal.replyToSender(ctx, msg, 'Fetch error:' + error);
    return null; // Or handle the error appropriately
  }

}

ext.onNotCommandReceived = (ctx, msg) => {

/** meme generator serve 开放端口 */
  const port = seal.ext.getStringConfig(ext,"meme")

  const base = "http://localhost:" + port;

  async function main(ctx, msg, ext) {

    if (!ext.storageGet("meme-list")) {
      // 不存在这个列表
      // 获取一下并写入
      const memelist = await getMessage(base, '/memes/keys');
      let store = { list: memelist };
      ext.storageSet("meme-list", JSON.stringify(store));
    }

    let store = JSON.parse(ext.storageGet("meme-list"));

    if (!store.meme) {
      // 列表不存在
      let res = []
      for (i = 0; i < store.list.length; i++) {
        const re = await fetch(`${base}/memes/${store.list[i]}/info`).then(res => res.json()).then(res =>
        // 获取列表
        { return res }
        ).catch(err => {
          console.log(err)
          return null
        })
        // 推入数组
        res.push(re)
      }
      store.meme = res
      // 写入映射
      ext.storageSet("meme-list", JSON.stringify(store));
    }
    if (!store.key) {
      // 不存在 key
      let res = []
      for (i = 0; i < store.meme.length; i++) {
        res.push(store.meme[i].keywords[0])
      }
      store.key = res
      ext.storageSet("meme-list", JSON.stringify(store));
    }

    let message = msg.message.replace(/ +/g, " ") // 去除多余空格

    const list = message.split(" ") // 分割消息

    switch (list[0]) {
      case "表情包制作": {
        // 命中帮助
        let result = "触发方式：“关键词 + 图片/文字”\n发送 “表情详情 + 关键词” 查看表情参数和预览\n目前支持的表情列表：\n"
        store = JSON.parse(ext.storageGet("meme-list"));
        for (i = 0; i < store.meme.length; i++) {
          result += ` ${i + 1}.  ${store.meme[i].keywords[0]}`
        }
        /* store 是一个 object，内容如
        {
          list:[
            "xxx",
            "xxx"
          ],
            meme:[{
              "key": "jiji_king",
              "keywords": [
              "急急国王"
            ],
              "patterns": [],
              "params": {
              "min_images": 1,
              "max_images": 11,
              "min_texts": 0,
              "max_texts": 11,
              "default_texts": [],
              "args": [
                  {
                      "name": "circle",
                      "type": "boolean",
                      "description": "是否将图片变为圆形",
                      "default": false,
                      "enum": null
                  }
              ]
      }]*/
        seal.replyToSender(ctx, msg, result)
      }; break;

      case "表情详情": {
        // 命中帮助
        let index = -1; // 初始化索引为-1，表示未找到
        let keywords = list[1];

        store.meme.forEach((item, i) => {
          if (item.keywords[0] === keywords) {
            index = i; // 找到目标值，更新索引
          }
        });

        if (index !== -1) {
          let key = store.meme[index].key
          const result = await fetch(base + `/memes/${key}/info`).then(res => res.json()).then(data => {
            return data
          })

          // 整理回复
          let reply = `表情包详制作详情：\n`
          reply += `最大图片：${result.params_type.max_images}\n`
          reply += `最少图片：${result.params_type.min_images}\n`
          reply += `最大文本：${result.params_type.max_texts}\n`
          reply += `最少文本：${result.params_type.min_texts}\n`
          const image = await fetch(base + `/memes/${key}/preview`).then(res => { return res.body })
          reply += `预览：\n`
          reply += `[CQ:image,file=${seal.base64ToImage(btoa(image))}]\n`
          seal.replyToSender(ctx, msg, reply)

        }
      }; break;

      case "表情包清空": {
        if (ctx.privilegeLevel !== 100) {
          // 不是骰主，拒绝执行
          seal.replyToSender(ctx, msg, seal.format("{核心:提示_无权限}"))
        } else {
          ext.storageSet("meme-list", null);
          seal.replyToSender(ctx, msg, "清除成功")
        }

      }; break;

      default: {
        // 如果命中关键词
        if (store.key.includes(list[0])) {
          // 先进行命令检测
          let index = -1; // 初始化索引为-1，表示未找到
          let keywords = list[0]
          store.meme.forEach((item, i) => {
            if (item.keywords[0] == keywords) {
              index = i; // 找到目标值，更新索引
            }
          });
          let config = store.meme[index]
          const ta = config.params_type.max_texts // 最大文字数
          const ti = config.params_type.min_texts // 最少文字数
          const ia = config.params_type.max_images // 最大图片数
          const ii = config.params_type.min_images // 最少图片数
          const regexp = /\[CQ:image,file=\S+\]/g // 这里命中一共有多少图片
          let images = msg.message.match(regexp);
          if (!images){
            images = []
          }
          if (images.length!=0) {
            // 图片数超过最大或小于最小
            seal.replyToSender(ctx, msg, `暂时不支持嵌入图片，咕咕咕...`)
          } else {
            // 图片数正确
            // 检查文本是否正确
            let text = msg.message.replace(regexp, "").replace(/ +/g, " ") // 删除其中的图片，并把多个空格转为一个空格
            let textlist = text.split(" ") //把文本切
            console.log(textlist)
            if (textlist.length > ti +images.length +1 || textlist.length < ta +images.length + 1) {
              // 文本数超过最大或小于最小
              seal.replyToSender(ctx, msg, `文本数不符合数量，应小于 ${ta} 或大于 ${ti}`)
            } else {
              // 文本数正确
              // 开始生成
              // 获得一下图片
              let image = [];
              let key = store.meme[index].key;
              if (images != []) {
                for (i = 0; i < images.length; i++) {
                  images[i] = images[i].replace("[CQ:image,file=", "").replace(/\]$/, "")
                }

                for (i = 0; i < images.length; i++) {
                  let imgdata = await fetch(images[i]).then(res => { return { data: res.body} })
                  image.push({ imgdata: imgdata.data})
                }
              }
              // 定义要上传的文件列表

              if (image != []) {
                for (i=0;i<image.length;i++){
                images.push(image[i].imgdata)
              }
              }
                let texts =  [];
              if (textlist !=[]){
                for (i=1;i<textlist.length;i++){
                  texts.push(textlist[i])
                }
              }
            body = {
              "texts": texts,
              "images": images,
              "port":port,
              "key":key
            }
              let img = await fetch(`http://localhost:${seal.ext.getStringConfig(ext,"node")}`,{
                method:"POST",
                body:JSON.stringify(body)
              })
              
              seal.replyToSender(ctx,msg,`[CQ:image,file=${seal.base64ToImage(JSON.parse(img.body).data)}]`)
            }
          }

          /*
                  {
                      "key": "kirby_hammer",
                      "keywords": [
                          "卡比锤",
                          "卡比重锤"
                      ],
                      "patterns": [],
                      "params": {
                          "min_images": 1,
                          "max_images": 1,
                          "min_texts": 0,
                          "max_texts": 0,
                          "default_texts": [],
                          "args": [
                              {
                                  "name": "circle",
                                  "type": "boolean",
                                  "description": "是否将图片变为圆形",
                                  "default": false,
                                  "enum": null
                              }
                          ]
                      }
                  }
          */
        }
        // 没命中不鸟你
      }
    }
  }
  main(ctx, msg, ext).catch(err => {
    console.log(err)
  })
}

seal.ext.registerStringConfig(ext,"node","3000","node 服务端开放的端口")
seal.ext.registerStringConfig(ext,"meme","2233","meme 服务端开放的端口")