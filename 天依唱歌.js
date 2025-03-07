// ==UserScript==
// @name         Singing
// @author       以炽热挥剑
// @version      1.0.0
// @description  发送 xxx唱首歌吧？随机返回一首 xxx 唱的歌曲\n 发送 xxx唱首xxx，发送xxx歌曲
// @timestamp    1740829842
// @license      MIT
// @homepageURL   http://blog.lovesealdice.online
// ==/UserScript==

let ext = seal.ext.find('Singing');

if (!ext) {
    ext = seal.ext["new"]('Singing', '以炽热挥剑', '1.0.0');
    seal.ext.register(ext);
    seal.ext.registerStringConfig(ext, "singer", "天依", "xxx唱首歌中的xxx")
    seal.ext.registerStringConfig(ext, "Random", "嘿嘿...那么，天依就随机给你唱一首吧？ ⸜₍๑•⌔•๑₎⸝#{SPLIT}<img>歌曲名：<song>\n调教/演唱者：<singer>#{SPLIT}<sing>", "xxx唱首歌吧的回复文本")
    seal.ext.registerStringConfig(ext, "Must", "嘿嘿...那么，天依就为你你唱一首吧! ⸜₍๑•⌔•๑₎⸝#{SPLIT}<img>歌曲名：<song>\n调教/演唱者：<singer>#{SPLIT}<sing>", "xxx唱首xxx的回复")
}

ext.onNotCommandReceived = async (ctx, msg) => {
    let regexp = new RegExp(`${seal.ext.getStringConfig(ext, "singer")}唱首歌吧`)

    function sing(singer, type, song) {
        let url
        if (type == "Random") {
            let Random = seal.format(ctx, "{d500}")
            console.log(Random)
            url = `http://net.ease.music.lovesealdice.online/search?keywords=${singer}&offset=${Random}`
        } else {
            url = `http://net.ease.music.lovesealdice.online/search?keywords=${song} ${singer}`
        }
        console.log(JSON.stringify(url))
        fetch(url).then(res => res.json()).then(data => {
            let m = data
            if (!m.result.songs[0]) {
                seal.replyToSender(ctx, msg, "没找到这首歌...");
                return;
            }
            let index = 0

            if (type == "Random") { index = seal.format(ctx, `{d${m.result.songs.length}}`) }

            console.log(index)
            let id = m.result.songs[index].id
            let name = m.result.songs[index].name
            let art = m.result.songs[index].artists[0].name
            fetch(`http://net.ease.music.lovesealdice.online/song/detail?ids=${id}`).then(res => res.json()).then(data => {
                let img = data.songs[0].al.picUrl
                fetch(`http://net.ease.music.lovesealdice.online/song/download/url?id=${id}`,
                    {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Cookie': "_gid=GA1.2.2048499931.1737983161; _ga_MD3K4WETFE=GS1.1.1737983160.8.1.1737983827.0.0.0; _ga=GA1.1.1845263601.1736600307; MUSIC_U=00C10F470166570C36209E7E3E3649FEE210D3DB5B3C39C25214CFE5678DCC5773C63978903CEBA7BF4292B97ADADB566D96A055DCFDC860847761109F8986373FEC32BE2AFBF3DCFF015894EC61602562BF9D16AD12D76CED169C5052A470677A8D59F7B7D16D9FDE2A4ED237DE5C6956C0ED5F7A9EA151C3FA7367B0C6269FF7A74E6626B4D7F920D524718347659394CBB0DAE362991418070195FEFC730BCCE3CF4B03F24274075679FB4BFC884D099BD3CF679E4F1C9D5CBC2959CD29B0741BD52BCA155480116CE96393663B1A51D88AFDB57680F030CF93A305064A797B99874CA826D6760F616CB756B680591167AEE9AF31C4A187E61A19D7C1175961D4FE64CFD878F0BCEBB322A23E396DC5E8175A50D5E07B9788E4EBE8F8257FF139DB4FD03A89676F5C3DF1B70C101F4568C0A3657C24185218F975368ADB2DEF860760C59E9AFCCB214A4B51029E29ED; __csrf=85f3aa8cedc01f6d50b6b924efbf6f95; NMTID=00OG17oToz2Ne1rikTtgKPqOLaYuP0AAAGUqBEN0A"
                        }
                    }
                ).then(res => res.json()).then(async (res) => {
                    await res
                    let reply;
                    if (type == "Random") {
                        reply = seal.ext.getStringConfig(ext, "Random")
                    } else {
                        reply = seal.ext.getStringConfig(ext, "Must")
                    }
                    reply = reply.replace(`<img>`, `[CQ:image,file=${img}]`).replace(`<song>`, `${name}`).replace(`<singer>`, `${art}`).replace(`<sing>`, `[CQ:record,file=${res.data.url}]`)
                    seal.replyToSender(ctx, msg, seal.format(ctx, reply))
                    return;
                })
            }
            )
        })

    }

    if (regexp.test(msg.message)) {
        sing(seal.ext.getStringConfig(ext, "singer"), "Random")
    } else {
        regexp = new RegExp(`${seal.ext.getStringConfig(ext, "singer")}唱首\\S+`)
        if (regexp.test(msg.message)) {
            let song = msg.message.replace(`${seal.ext.getStringConfig(ext, "singer")}唱首`, "").replace("吧", "")
            sing(seal.ext.getStringConfig(ext, "singer"), "Must", song)
        }
    }

}