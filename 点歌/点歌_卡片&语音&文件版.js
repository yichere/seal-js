// ==UserScript==
// @name         点歌
// @author       JustAnotherID, Fripine(modified)，炽热(modified)
// @version      1.0.4
// @description  基于 JustAnotherID 的音卡插件修改\n提供指令「.点歌 <歌名> [语音/卡片/文件](可选)」「.网易云 <歌名>[语音/卡片/文件](可选)」,api 均为炽热提供.由于 qq 音乐 url 无法获取，现已移除。
// @timestamp    1742218229
// @license      Apache-2
// @homepageURL  https://github.com/yichere/seal-js/tree/master/%E7%82%B9%E6%AD%8C
// @updateUrl    http://blog.lovesealdice.online/seal-js/%E7%82%B9%E6%AD%8C/%E7%82%B9%E6%AD%8C_%E5%8D%A1%E7%89%87&%E8%AF%AD%E9%9F%B3&%E6%96%87%E4%BB%B6%E7%89%88.js
// ==/UserScript==

if (!seal.ext.find("music-with-card")) {
  const ext = seal.ext.new("music-with-card", "JustAnotherID, Fripine(modified)，炽热(modified)", "1.0.4");

  seal.ext.register(ext);
  seal.ext.registerOptionConfig(ext, "Seletced Mode Plus", "卡片", ["卡片", "语音", "文件"], "默认发送格式，支持卡片/语音/文件");
  seal.ext.registerStringConfig(ext, "baseurl", "http://localhost:3666/", "本地开放的 http 客户端")
  seal.ext.registerStringConfig(ext, "cookie", "", "网易云点歌 api 访问的 cookie")
  seal.ext.registerStringConfig(ext, "net_url", "http://net.ease.music.lovesealdice.online", "网易云点歌 api 的地址")

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
            let name = m.result.songs[index].name
            let art = m.result.songs[index].artists[0].name
            fetch(`${net_url}/song/detail?ids=${id}`).then(res => res.json()).then(data => {
              let img = data.songs[0].al.picUrl
              fetch(`${net_url}/song/download/url?id=${id}`,
                {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Cookie': cookie
                  }
                }
              ).then(res => res.json()).then(async (res) => {
                console.log(JSON.stringify(res))
                re = `[CQ:music,type=163,url=${res.data.url},audio=${res.data.url},title=${name},content=${art},image=${img}]`
                seal.replyToSender(ctx, msg, re)

                if (res.data.url == null) {
                  return {
                    status: false
                  }
                } else {
                  return {
                    status: true,
                    title: name,
                    content: art,
                    image: img,
                    url: res.data.url
                  }
                }
              })
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
            let name = m.result.songs[0].name
            let imgurl = m.result.songs[0].artists[0].img1v1Url
            let art = m.result.songs[0].artists[0].name
            let abid = m.result.songs[0].album.id
            fetch(`${net_url}/song/detail?ids=${id}`).then(res => res.json()).then(data => {
              let img = data.songs[0].al.picUrl
              let re = `[CQ:image,file=${img}]\n歌曲名：${name}\n歌手：${art}`
              if (!img) {
                fetch(`${net_url}/album?id=${abid}`).then(res => res.json()).then(data => {
                  console.log(JSON.stringify(data))
                  img = data.songs[0].videoInfo.video.coverUrl
                  if (!img) {
                    img = imgurl
                  }
                  re = `[CQ:image,file=${img}]\n歌曲名：${name}\n歌手：${art}`
                  seal.replyToSender(ctx, msg, re)
                })
              } else {
                seal.replyToSender(ctx, msg, re)
              }
            })

            fetch(`${net_url}/song/download/url?id=${id}`,
              {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                  'Cookie': cookie
                }
              }
            ).then(res => res.json()).then(async (res) => {
              await res
              seal.replyToSender(ctx, msg, `[CQ:record,file=${res.data.url}]`)
              return;
            })
          }

          function handleFile() {
            let m = JSON.parse(data)
            if (!m.result.songs[0]) {
              seal.replyToSender(ctx, msg, "没找到这首歌...");
              return;
            }
            let id = m.result.songs[0].id
            let name = m.result.songs[0].name
            let imgurl = m.result.songs[0].artists[0].img1v1Url
            let art = m.result.songs[0].artists[0].name
            let abid = m.result.songs[0].album.id
            fetch(`${net_url}/song/detail?ids=${id}`).then(res => res.json()).then(data => {
              let img = data.songs[0].al.picUrl
              let re = `[CQ:image,file=${img}]\n歌曲名：${name}\n歌手：${art}`
              if (!img) {
                fetch(`${net_url}/album?id=${abid}`).then(res => res.json()).then(data => {
                  console.log(JSON.stringify(data))
                  img = data.songs[0].videoInfo.video.coverUrl
                  if (!img) {
                    img = imgurl
                  }
                  re = `[CQ:image,file=${img}]\n歌曲名：${name}\n歌手：${art}`
                  seal.replyToSender(ctx, msg, re)
                })
              } else {
                seal.replyToSender(ctx, msg, re)
              }
            })

            fetch(`${net_url}/song/download/url?id=${id}`,
              {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                  'Cookie': cookie
                }
              }
            ).then(res => res.json()).then(async (res) => {
              let url = seal.ext.getStringConfig(ext, "baseurl") + `upload_group_file?group_id=`
              url += ctx.group.groupId.replace(/QQ-Group:/, "")
              url += `&file=${res.data.url}`
              url += `&name=${name.replace(/&/g, "%26").replace(" ", "%20").replace(/"/g, "%22").replace(/\//g, "%2F").replace(/\(/g, "%28").replace(/\)/, "%29")}V.${art.replace("&", "%26").replace(" ", "%20").replace(/"/g, "%22").replace(/\//g, "%2F").replace(/\(/g, "%28").replace(/\)/, "%29")}.mp3`
              fetch(url).then(res => res.json()).then(res => {
                console.log(url)
                console.log(JSON.stringify(res))
                if (res.status != 'ok') {
                  seal.replyToSender(ctx, msg, "上传失败！请检查群聊是否允许上传文件，填写 url 是否正确。")
                }
              })
              return;
            })
          }

          if (i == "卡片") {
            let c = 0; // 初始化 c
            for (; c < 5; c++) { // 注意分号的位置
              console.log(c); // 打印 c 的值
              let r = handleCard(c);
              console.log(JSON.stringify(r));
              if (r.status) {
                let re = `[CQ:music,type=163,url=${r.url},audio=${r.url},title=${r.name},content=${r.art},image=${r.img}]`;
                seal.replyToSender(ctx, msg, re);
                break;
              }
            }
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
              let c = 0;
              for (; c < 5; c++) {
                let r = handleCard(c);
                console.log(JSON.stringify(r));
                if (r.status) {
                  let re = `[CQ:music,type=163,url=${r.url},audio=${r.url},title=${r.name},content=${r.art},image=${r.img}]`;
                  seal.replyToSender(ctx, msg, re);
                  break;
                }
              } break;
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