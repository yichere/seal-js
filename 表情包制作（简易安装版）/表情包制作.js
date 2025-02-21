// ==UserScript==
// @name         meme-generator
// @author       以炽热挥剑
// @version      2.0.0
// @description  调用后端 api 实现表情包制作，发送 “.memelist” 获取帮助
// @timestamp    1740058740
// @license      MIT
// @homepageURL   http://blog.lovesealdice.online
// ==/UserScript==

let ext = seal.ext.find('meme');

if (!ext) {
  ext = seal.ext["new"]('meme', '以炽热挥剑', '2.0.0');
  seal.ext.register(ext);
}

let cmdMeme = seal.ext.newCmdItemInfo();

cmdMeme.name = 'memelist';

cmdMeme.help = `表情包列表`;

cmdMeme.solve = (ctx, msg, cmd) => {
  let baseurl = seal.ext.getStringConfig(ext, "url")
  let reply = `图片来源 meme-generator ，感谢开源项目！
触发方式：“制作 + 关键词 + 图片/文字”
图片可以使用@来替代，即使用头像作为图片生成，
使用艾特回复慢或空回复皆为正常现象
发送 “表情详情 + 关键词” 查看表情参数和预览
如果查看详情遇到没有回复时代表并没有该关键词
示例：5000兆 你好 洛天依
示例：。表情详情 5000兆
目前支持的表情列表：` + `[CQ:image,file=${baseurl}meme_list]`
  seal.replyToSender(ctx, msg, reply)
}

let cmdInfo = seal.ext.newCmdItemInfo();

cmdInfo.name = "表情详情"

cmdInfo.help = `查看表情参数和预览`

cmdInfo.solve = async(ctx, msg, cmd) => {

  let baseurl = seal.ext.getStringConfig(ext, "url")
  let i = msg.message.replace(/[\s\S]+表情详情/,"").replace(/^\s+/,"")
  let key = await fetch(`${baseurl}${i}/key`).then((res) => { 
    return res.json() 
  });

  key = key.result
  let info = await fetch(`${baseurl}${key}/info`).then((res) => { return res.json() });
  
  let preview = `[CQ:image,file=${baseurl}${key}/preview]`
  let params_type = info["params_type"]
  let replt = `预览：${preview}\n最大文字数：${params_type.max_texts}\n最小文字数：${params_type.min_texts}\n最大图片数：${params_type.max_images}\n最小图片数：${params_type.min_images}\n`
  seal.replyToSender(ctx, msg, replt)
}

async function getlist(baseurl) {
  return await fetch(`${baseurl}get_list`).then(res => {
    return res.json()
  })
}

async function getcommand(baseurl) {
  if (!ext.storageGet("command")){
   let  temp = await fetch(`${baseurl}get_command`).then(res => {
      return res.json()
    })
    ext.storageSet("command",JSON.stringify(temp))
    return temp
  }else{
    return JSON.parse(ext.storageGet("command"))
  }
}

async function get_info(baseurl, key) {
  return await fetch(`${baseurl}${key}/info`).then(res => {
    return res.json()
  })
}

ext.onNotCommandReceived = async (ctx, msg) => {

  const baseurl = seal.ext.getStringConfig(ext, "url")
  let command_list = await getcommand(baseurl);
  let command = [];

  for (let i of command_list) {
    for (let s of i) {
      command.push(s);
    }
  }

  for (let i of command) {
    let re = new RegExp(`^制作${i}`);
    if (re.test(msg.message)) {
      // command 是 i
      let key = await fetch(`${baseurl}${i}/key`).then((res) => { return res.json() });
      key = key.result
      let info = await fetch(`${baseurl}${key}/info`).then((res) => { return res.json() });
      let s = msg.message.replace(re, '');
      let at = s.match(/\[CQ:at,qq=\d+\]/g)
      s = s.replace(/\[CQ:at,qq=\d+\]/g, "")
      s = s.replace(/\s+/g, " ");
      s = s.replace(/^\s/, "")
      let image = s.match(/\[CQ:image,[\s\S]+/g)
      s = s.replace(/\[CQ:image,[\s\S]+/g, "")
      let text = s.split(" ");

      let url = [];
      if (image) {
        for (let i of image) {
          url.push(i.match(/https:\/\/[\s\S^\]]+/)[0].replace(/\]$/,""))
        }
      }

      if (at) {
        for (let i of at) {
          url.push(`https://q.qlogo.cn/headimg_dl?dst_uin=${i.match(/\d+/)[0]}&spec=640&img_type=jpg`)
        }
      }
      if (text[0]==""){
        text = []
      }
      if (text.length > info.params_type.max_texts) {
        seal.replyToSender(ctx, msg, `最多只能输入${info.params_type.max_texts}段文字`)
        console.log("通过")
      } else if (text.length < info.params_type.min_texts) {
        seal.replyToSender(ctx, msg, `最少需要输入${info.params_type.min_texts}段文字`)
        console.log("通过")
      } else if (url.length > info.params_type.max_images) {
        seal.replyToSender(ctx, msg, `最多只能输入${info.params_type.max_images}个图片`)
        console.log("通过")
      } else if (url.length < info.params_type.min_images) {
        seal.replyToSender(ctx, msg, `最少需要输入${info.params_type.min_images}个图片`)
        console.log("通过")
      } else {
        let args = {}
        let req = {
          key: key,
          image: url,
          text: text,
          args: args
        }
        console.log(JSON.stringify(req))
        fetch(baseurl + 'meme_generate', {
          method: 'POST',
          body: JSON.stringify(req),
        }).then(res => res.json())
          .then(data => {
            if (data.status == "success") {
              seal.replyToSender(ctx, msg, `[CQ:image,file=${seal.base64ToImage(data.message)}]`)
            } else {
              seal.replyToSender(ctx, msg, "发生错误" + data.message)
            }
          })
      }
    }
  }
}
ext.cmdMap["memelist"] = cmdMeme
ext.cmdMap["表情详情"] = cmdInfo

seal.ext.registerStringConfig(ext, "url", "http://meme.lovesealdice.online/", "表情包制作服务的地址")