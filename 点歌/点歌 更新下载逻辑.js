// ==UserScript==
// @name         点歌
// @author       JustAnotherID, Fripine(modified)，炽热(modified)
// @version      2.0.0
// @description  基于 JustAnotherID 的音卡插件修改\n提供指令「.点歌 <歌名> [语音/卡片/文件](可选)」「.网易云 <歌名>[语音/卡片/文件](可选)」,api 均为炽热提供.此版本优化了下载逻辑，将文件下载到中转服务器中，先请求缓存，如若失败，再请求下载。并可在 http://lovesealdice.online:5244/ 中看到点过歌的文件。\n有计划开发每日推歌功能，敬请期待！
// @timestamp    1750745635
// @license      Apache-2
// @homepageURL  http://blog.lovesealdice.online/music-with-card/
// @updateUrl    http://blog.lovesealdice.online/seal-js/%E7%82%B9%E6%AD%8C/%E7%82%B9%E6%AD%8C_%E5%8D%A1%E7%89%87&%E8%AF%AD%E9%9F%B3&%E6%96%87%E4%BB%B6%E7%89%88.js
// ==/UserScript==

if (!seal.ext.find("music-with-card")) {
  const ext = seal.ext.new("music-with-card", "JustAnotherID, Fripine(modified)，炽热(modified)", "2.0.0");

  seal.ext.register(ext);
  seal.ext.registerOptionConfig(ext, "Seletced Mode Plus", "卡片", ["卡片", "语音", "文件"], "默认发送格式，支持卡片/语音/文件");
  seal.ext.registerStringConfig(ext, "baseurl", "http://localhost:3666/", "本地开放的 http 客户端")
  seal.ext.registerStringConfig(ext, "net_url", "http://net.ease.music.lovesealdice.online", "网易云点歌 api 的地址")
  seal.ext.registerStringConfig(ext, "server_url", "http://lovesealdice.online:8111/", "由炽热开发的中转，如不明白请不要修改。")

  const cmdCloudMusic = seal.ext.newCmdItemInfo();
  cmdCloudMusic.name = "网易云";
  cmdCloudMusic.help = "网易云点歌，可用「.网易云 <歌名> <歌手>(可选)」，如 .网易云 好汉歌";
  cmdCloudMusic.solve = trigger;

  ext.cmdMap["网易云"] = cmdCloudMusic;
  ext.cmdMap["点歌"] = cmdCloudMusic;
  function trigger(ctx, msg, cmdArgs) {
    let val = cmdArgs.getArgN(1);
    let command = cmdArgs.command;
    switch (val) {
      case "help": {
        const ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
      }
      default: {
        if (!val) {
          seal.replyToSender(ctx, msg, `要输入歌名啊...`);
          return seal.ext.newCmdExecuteResult(true);
        }
        let i = ""
        let cookie = seal.ext.getStringConfig(ext, "cookie")
        if (/卡片/.test(msg.message)) {
          i = "卡片"
          msg.message = msg.message.replace("卡片", "")
        }

        if (/语音/.test(msg.message)) {
          i = "语音"
          msg.message = msg.message.replace("语音", "")
        }

        if (/文件/.test(msg.message)) {
          i = "文件"
          msg.message = msg.message.replace("文件", "")
        }

        let re = new RegExp(`.*${command}`)
        let musicName = msg.message.replace(re, "").replace(/\[CQ:\S+\]/, "").replace(/^\S/, "").trim();
        console.log(musicName)
        let addition = '';
        const net_url = seal.ext.getStringConfig(ext, "net_url")
        const server = seal.ext.getStringConfig(ext, "server_url")
        let api = `${net_url}/search?keywords=${musicName}${addition}`

        fetch(api).then((response) => {
          if (response.ok) {
            return response.text();
          } else {
            console.log(`${command}api失效！`);
            return
          }
        }).then((data) => {
          function handleCard(index) {
            let m = JSON.parse(data)
            if (!m.result.songs[index]) {
              console.log(JSON.stringify(index))
              seal.replyToSender(ctx, msg, "没找到这首歌...");
              return;
            }
            let id = m.result.songs[index].id
            fetch(`${server}test?songid=${id}`).then(res => res.json()).then(data => {
              re = `[CQ:music,type=163,url=http://lovesealdice.online:5244/,audio=${data.file},title=${data.song_name},content=${data.singer},image=${data.img_url}]`
              seal.replyToSender(ctx, msg, re)
            }
            )
            return
          }

          function handleVoice() {
            let m = JSON.parse(data)
            if (!m.result.songs[0]) {
              seal.replyToSender(ctx, msg, "没找到这首歌...");
              return;
            }
            let id = m.result.songs[0].id
            fetch(`${server}test?songid=${id}`).then(res => res.json()).then(data => {
              seal.replyToSender(ctx,msg,`[CQ:image,file=${data.img_url}]\n歌曲名：${data.song_name}\n歌手：${data.singer}`)
              seal.replyToSender(ctx,msg,`[CQ:record,file=${data.file}]`)
            })
          }

          function handleFile() {
            let m = JSON.parse(data)
            if (!m.result.songs[0]) {
              seal.replyToSender(ctx, msg, "没找到这首歌...");
              return;
            }
            let id = m.result.songs[0].id
            fetch(`${server}test?songid=${id}`).then(res => res.json()).then(data => {
              seal.replyToSender(ctx,msg,`[CQ:image,file=${data.img_url}]\n歌曲名：${data.song_name}\n歌手：${data.singer}`)
              let url = seal.ext.getStringConfig(ext, "baseurl") + `upload_group_file?group_id=`
              url += ctx.group.groupId.replace(/QQ-Group:/, "")
              url += `&file=${data.file}`
              url += `&name=${data.song_name.replace(/&/g, "%26").replace(" ", "%20").replace(/"/g, "%22").replace(/\//g, "%2F").replace(/\(/g, "%28").replace(/\)/, "%29")}V.${data.singer.replace("&", "%26").replace(" ", "%20").replace(/"/g, "%22").replace(/\//g, "%2F").replace(/\(/g, "%28").replace(/\)/, "%29")}.flac`
              fetch(url).then(res => res.json()).then(res => {
                console.log(url)
                console.log(JSON.stringify(res))
                if (res.status != 'ok') {
                  seal.replyToSender(ctx, msg, "上传失败！请检查群聊是否允许上传文件，填写 url 是否正确。")
                }
              })
            })
            
          }

          if (i == "卡片") {
            handleCard(0)
            return;
          }
          if (i == "语音") {
            handleVoice()
            return;
          }
          if (i == '文件') {
            handleFile()
            return;
          }

          switch (seal.ext.getOptionConfig(ext, "Seletced Mode Plus")) {
            case "卡片":
              handleCard(0)
              break;
            case "语音":
              handleVoice()
              break;
            case "文件":
              handleFile()
              break;
          }

        }).catch((error) => {
          console.log(`${command}api请求错误！错误原因：${error}`);
        });
        return seal.ext.newCmdExecuteResult(true);
      }
    }
  }
}