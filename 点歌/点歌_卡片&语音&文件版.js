// ==UserScript==
// @name         点歌
// @author       JustAnotherID, Fripine(modified)，炽热(modified)
// @version      1.0.3
// @description  基于JustAnotherID的音卡插件修改\n提供指令「.点歌 <歌名> [语音/卡片/文件](可选)」「.qq音乐 <歌名>[语音/卡片/文件](可选)」「.网易云 <歌名>[语音/卡片/文件](可选)」,api 均为炽热提供.默认点歌更新为网易云音乐。
// @timestamp    2025-02-25 23:00:00
// @license      Apache-2
// @homepageURL  https://github.com/yichere/seal-js/tree/master/%E7%82%B9%E6%AD%8C
// @updateUrl    http://blog.lovesealdice.online/seal-js/%E7%82%B9%E6%AD%8C/%E7%82%B9%E6%AD%8C_%E5%8D%A1%E7%89%87&%E8%AF%AD%E9%9F%B3&%E6%96%87%E4%BB%B6%E7%89%88.js
// ==/UserScript==

if (!seal.ext.find("music-with-card")) {
  const ext = seal.ext.new("music-with-card", "JustAnotherID, Fripine(modified)，炽热(modified)", "1.0.2");

  seal.ext.register(ext);
  seal.ext.registerOptionConfig(ext, "Seletced Mode Plus", "卡片",["卡片", "语音", "文件"], "默认发送格式，支持卡片/语音/文件");
  seal.ext.registerStringConfig(ext, "baseurl", "http://localhost:3666/", "本地开放的 http 客户端")
  const cmdQQMusic = seal.ext.newCmdItemInfo();
  cmdQQMusic.name = "点歌";
  cmdQQMusic.help = "QQ音乐点歌，可用「.点歌 <歌名> <歌手>(可选)」，如 .点歌 好汉歌";
  cmdQQMusic.solve = trigger;

  const cmdCloudMusic = seal.ext.newCmdItemInfo();
  cmdCloudMusic.name = "网易云";
  cmdCloudMusic.help = "网易云点歌，可用「.网易云 <歌名> <歌手>(可选)」，如 .网易云 好汉歌";
  cmdCloudMusic.solve = trigger;

  // 注册命令
  ext.cmdMap["点歌"] = cmdQQMusic;
  ext.cmdMap["QQ音乐"] = cmdQQMusic;
  ext.cmdMap["qq音乐"] = cmdQQMusic;
  ext.cmdMap["网易云"] = cmdCloudMusic;

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
        // seletced如果为false,则无法获得音源src，卡片无法播放音频
        let addition = '';
        let api = '';
        switch (command) {
          case '点歌':
            type = '网易云';
            api = `http://net.ease.music.lovesealdice.online/search?keywords=${musicName}${addition}`;
            break;
          case 'QQ音乐':
            type = 'qq';
            api = `http://qqmusic.lovesealdice.online/search?key=${musicName}${addition}`;
            break;
          case 'qq音乐':
            type = 'qq';
            api = `http://qqmusic.lovesealdice.online/search?key=${musicName}${addition}`;
            break;
          case '网易云':
            type = '163';
            api = `http://net.ease.music.lovesealdice.online/search?keywords=${musicName}${addition}`;
            break;
        }


        fetch(api).then((response) => {
          if (response.ok) {
            return response.text();
          } else {
            console.log(`${command}api失效！`);
            return
          }
        }).then((data) => {
          console.log(api);
          function handleCard() {

            if (command == '网易云' || command == '点歌') {

              let id = JSON.parse(data).result.songs[0].id

              if (!id) {
                seal.replyToSender(ctx, msg, "没找到这首歌...");
                return;
              }

              seal.replyToSender(ctx, msg, `[CQ:music,type=qq,id=${id}]`)

              return
            } else {

              let list = JSON.parse(data).data.list[0]

              let id = list.grp == undefined ? list.grp[0].songid : list.songid

              if (!id) {
                seal.replyToSender(ctx, msg, "没找到这首歌...");
                return;
              }

              seal.replyToSender(ctx, msg, `[CQ:music,type=163,id=${id}]`)

              return
            }

          }

          function handleVoice() {
            if (command == '网易云' || command == '点歌') {
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
              fetch(`http://net.ease.music.lovesealdice.online/song/detail?ids=${id}`).then(res => res.json()).then(data => {
                let img = data.songs[0].al.picUrl
                let re = `[CQ:image,file=${img}]\n歌曲名：${name}\n歌手：${art}`
                if (!img) {
                  fetch(`http://net.ease.music.lovesealdice.online/album?id=${abid}`).then(res => res.json()).then(data => {
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

              fetch(`http://net.ease.music.lovesealdice.online/song/download/url?id=${id}`,
                {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Cookie': "_gid=GA1.2.2048499931.1737983161; _ga_MD3K4WETFE=GS1.1.1737983160.8.1.1737983827.0.0.0; _ga=GA1.1.1845263601.1736600307; MUSIC_U=00C10F470166570C36209E7E3E3649FEE210D3DB5B3C39C25214CFE5678DCC5773C63978903CEBA7BF4292B97ADADB566D96A055DCFDC860847761109F8986373FEC32BE2AFBF3DCFF015894EC61602562BF9D16AD12D76CED169C5052A470677A8D59F7B7D16D9FDE2A4ED237DE5C6956C0ED5F7A9EA151C3FA7367B0C6269FF7A74E6626B4D7F920D524718347659394CBB0DAE362991418070195FEFC730BCCE3CF4B03F24274075679FB4BFC884D099BD3CF679E4F1C9D5CBC2959CD29B0741BD52BCA155480116CE96393663B1A51D88AFDB57680F030CF93A305064A797B99874CA826D6760F616CB756B680591167AEE9AF31C4A187E61A19D7C1175961D4FE64CFD878F0BCEBB322A23E396DC5E8175A50D5E07B9788E4EBE8F8257FF139DB4FD03A89676F5C3DF1B70C101F4568C0A3657C24185218F975368ADB2DEF860760C59E9AFCCB214A4B51029E29ED; __csrf=85f3aa8cedc01f6d50b6b924efbf6f95; NMTID=00OG17oToz2Ne1rikTtgKPqOLaYuP0AAAGUqBEN0A"
                  }
                }
              ).then(res => res.json()).then(async (res) => {
                await res
                seal.replyToSender(ctx, msg, `[CQ:record,file=${res.data.url}]`)
                return;
              })
            } else {
              let m = JSON.parse(data)
              let song = m.data.list[0]
              if (!song) {
                seal.replyToSender(ctx, msg, "没找到这首歌...");
                return;
              }
              let songname = song.songname
              let signer = song.singer[0].name
              let songmid = song.songmid

              seal.replyToSender(ctx, msg, `歌曲名：${songname}\n歌手：${signer}`)

              fetch(`http://qqmusic.lovesealdice.online/song/url?id=${songmid}`).then(res => res.json()).then(res => {
                console.log(JSON.stringify(res))
                seal.replyToSender(ctx, msg, `[CQ:record,file=${res.data}]`)
                return;

              })
            }

          }

          function handleFile() {
            if (command == '网易云' || command == '点歌') {
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
              fetch(`http://net.ease.music.lovesealdice.online/song/detail?ids=${id}`).then(res => res.json()).then(data => {
                let img = data.songs[0].al.picUrl
                let re = `[CQ:image,file=${img}]\n歌曲名：${name}\n歌手：${art}`
                if (!img) {
                  fetch(`http://net.ease.music.lovesealdice.online/album?id=${abid}`).then(res => res.json()).then(data => {
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

              fetch(`http://net.ease.music.lovesealdice.online/song/download/url?id=${id}`,
                {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Cookie': "_gid=GA1.2.2048499931.1737983161; _ga_MD3K4WETFE=GS1.1.1737983160.8.1.1737983827.0.0.0; _ga=GA1.1.1845263601.1736600307; MUSIC_U=00C10F470166570C36209E7E3E3649FEE210D3DB5B3C39C25214CFE5678DCC5773C63978903CEBA7BF4292B97ADADB566D96A055DCFDC860847761109F8986373FEC32BE2AFBF3DCFF015894EC61602562BF9D16AD12D76CED169C5052A470677A8D59F7B7D16D9FDE2A4ED237DE5C6956C0ED5F7A9EA151C3FA7367B0C6269FF7A74E6626B4D7F920D524718347659394CBB0DAE362991418070195FEFC730BCCE3CF4B03F24274075679FB4BFC884D099BD3CF679E4F1C9D5CBC2959CD29B0741BD52BCA155480116CE96393663B1A51D88AFDB57680F030CF93A305064A797B99874CA826D6760F616CB756B680591167AEE9AF31C4A187E61A19D7C1175961D4FE64CFD878F0BCEBB322A23E396DC5E8175A50D5E07B9788E4EBE8F8257FF139DB4FD03A89676F5C3DF1B70C101F4568C0A3657C24185218F975368ADB2DEF860760C59E9AFCCB214A4B51029E29ED; __csrf=85f3aa8cedc01f6d50b6b924efbf6f95; NMTID=00OG17oToz2Ne1rikTtgKPqOLaYuP0AAAGUqBEN0A"
                  }
                }
              ).then(res => res.json()).then(async (res) => {
                let url = seal.ext.getStringConfig(ext,"baseurl")+`upload_group_file?group_id=`
                url += ctx.group.groupId.replace(/QQ-Group:/,"")
                url += `&file=${res.data.url}`
                url += `&name=${name.replace(/&/g,"%26").replace(" ","%20").replace(/"/g,"%22").replace(/\//g,"%2F").replace(/\(/g,"%28").replace(/\)/,"%29")}V.${art.replace("&","%26").replace(" ","%20").replace(/"/g,"%22").replace(/\//g,"%2F").replace(/\(/g,"%28").replace(/\)/,"%29")}.mp3`
                fetch(url).then(res => res.json()).then(res => {
                  console.log(url)
                  console.log(JSON.stringify(res))
                  if (res.status != 'ok'){
                    seal.replyToSender(ctx, msg, "上传失败！请检查群聊是否允许上传文件，填写 url 是否正确。")
                  }
                })
                return;
              })
            } else {
              let m = JSON.parse(data)
              let song = m.data.list[0]
              if (!song) {
                seal.replyToSender(ctx, msg, "没找到这首歌...");
                return;
              }
              let songname = song.songname
              let signer = song.singer[0].name
              let songmid = song.songmid

              seal.replyToSender(ctx, msg, `歌曲名：${songname}\n歌手：${signer}`)

              fetch(`http://qqmusic.lovesealdice.online/song/url?id=${songmid}`).then(res => res.json()).then(res => {
                console.log(JSON.stringify(res))
                let url = seal.ext.getStringConfig(ext,"baseurl")+`upload_group_file?group_id=`
                url += ctx.group.groupId.replace(/QQ-Group:/,"")
                url += `&file=${res.data}`
                url += `&name=${songname.replace(/&/g,"%26").replace(" ","%20").replace(/"/g,"%22").replace(/\//g,"%2F").replace(/\(/g,"%28").replace(/\)/,"%29")}V.${signer.replace("&","%26").replace(" ","%20").replace(/"/g,"%22").replace(/\//g,"%2F").replace(/\(/g,"%28").replace(/\)/,"%29")}.mp3`
                fetch(url).then(res => res.json()).then(res => {
                  console.log(JSON.stringify(res))
                  if (res.status != 'ok'){
                    seal.replyToSender(ctx, msg, "上传失败！请检查群聊是否允许上传文件，填写 url 是否正确。")
                  }
                return;

              })
             })
            }

          }

          if (i == "卡片") {
            handleCard()
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

          switch(seal.ext.getOptionConfig(ext, "Seletced Mode Plus")){
            case "卡片":
              handleCard()
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
