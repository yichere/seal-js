// ==UserScript==
// @name         60s 读世界
// @author       以炽热挥剑
// @version      1.0.0
// @description  60s读世界文字版
// @timestamp    1719668406
// @license      MIT
// @homepageURL   http://39.105.48.16:4000/yichere/2024/06/29/untitled-1719668463681/
// ==/UserScript==

// TODO: 支持图片嵌入，支持艾特获取头像作为图片嵌入

let ext = seal.ext.find('60s');

if (!ext) {
  ext = seal.ext["new"]('60s', '以炽热挥剑', '1.0.0');
  seal.ext.register(ext);
}

let cmdMeme = seal.ext.newCmdItemInfo();

cmdMeme.name = '60s';

cmdMeme.help = `用于发送60s读世界文字版`;

ext.onNotCommandReceived =(ctx,msg)=>{
    const url = "https://60s.viki.moe/"
    if (msg.message =="60s"|| msg.message =="60s读世界"){
       fetch(url).then(response => response.json()).then(data => {
           const list = data["data"]
           let reply= "";
           for ( i = 0; i < list.length; i++) {
               reply += list[i] + "\n"
           }
           seal.replyToSender(ctx,msg,reply)
    })
  }
}

