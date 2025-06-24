// ==UserScript==
// @name         吃什么
// @author       以炽热挥剑
// @version      1.0.0
// @description  让骰娘解决你的吃饭选择困难症
// @timestamp    1747501620
// @license      MIT
// @homepageURL   http://lovesealdice.online
// ==/UserScript==


let ext = seal.ext.find('EatWhat');

if (!ext) {
  ext = seal.ext["new"]('EatWhat', '以炽热挥剑', '1.0.0');
  seal.ext.register(ext);
}

let cmdMeme = seal.ext.newCmdItemInfo();


ext.onNotCommandReceived =(ctx,msg)=>{
    const url = "https://zj.v.api.aa1.cn/api/eats/"
    if (/吃什么/.test(msg.message)){
       fetch(url).then(response => response.json()).then(data => {
           let date = Date.now()%2 ? "meal1"  : "meal2"
           seal.replyToSender(ctx,msg,data[date])
    })
  }
}

