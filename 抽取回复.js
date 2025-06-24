// ==UserScript==
// @name         真正复读
// @author       以炽热挥剑
// @version      1.0.0
// @description  每十分钟检测一次，每次有 5% 的概率发送群友曾经说过的话，且群聊隔离如何
// @timestamp    1719668406
// @license      MIT
// @homepageURL   http://39.105.48.16:4000/yichere/2024/06/29/untitled-1719668463681/
// ==/UserScript==


let ext = seal.ext.find('repeat');

if (!ext) {
    ext = seal.ext["new"]('repeat', '以炽热挥剑', '1.0.0');
    seal.ext.register(ext);
}

let cmdMeme = seal.ext.newCmdItemInfo();

cmdMeme.name = 'repeat';

cmdMeme.help = `随机复读群友的发言`;

function getJSON(key) {
    return JSON.parse(ext.storageGet(key) || '[]')
}

/** 该函数接收两个参数，一个为键名，另一个为 对象，作用将对象存储到数据库中 */
function setJSON(key, object) {
    ext.storageSet(key, JSON.stringify(object))
}


class message {
    person
    msg
    id
    group
    constructor(person, msg, id, group) {
        this.person = person
        this.msg = msg
        this.id = parseInt(id.replace("QQ:", ""))
        this.timestamp = Date.now();
        this.group = group
    }
    toObject() {
        return {
            person: this.person,
            msg: this.msg,
            id: this.id,
            timestamp: this.timestamp,
            group:this.group
        };
    }
}


function randomMessage(ctx) {
    let s = getJSON(ctx.group.groupId.replace("QQ-Group:", ""));
    let len = s.length;
    let obj = s[seal.format(ctx, `{d${len}}`)]
    return obj
}

function randomReply(){
    let msg = seal.newMessage();
    msg.message = "test";msg.messageType = "group";msg.platform ="QQ";msg.sender= {"nickname":"好想成为人类","userId":"QQ:3142438625"};msg.time=Date.now();msg.groupId = "QQ-Group:729373137";msg.rawId="1947148892"
    let ctx = seal.createTempCtx(seal.getEndPoints()[0],msg);
    // 先遍历群聊
    for (let i of getJSON("Activate")){
        ctx.group.groupId = i;
        msg.groupId = i;
        let r = seal.format(ctx,"{d100}")
        if (r <= 10){
            r =  randomMessage(ctx);
            seal.replyToSender(ctx,msg,r)
        }
    }

}

ext.onNotCommandReceived = (ctx, msg) => {
    // 该段代码负责记录群友消息，采用分群存储的原则
    // 过滤表情包
    setInterval( randomReply(),1000*60*5 )
    if (/\[CQ:image/.test(msg.message)) {
        return;
    }
    let x = getJSON("Active")
    if (!ctx.group.groupId in x) {
        setJSON("Active",x.push(ctx.group.groupId))
    }
    
    let s = getJSON(ctx.group.groupId.replace("QQ-Group:", ""));
    let m = new message(ctx.player.name, msg.message, ctx.player.userId,ctx.group.groupId);
    s.push(m.toObject())
    setJSON(ctx.group.groupId.replace("QQ-Group:", ""), s)
}


cmdMeme.solve = (ctx, msg, cmdArgs) => {
    randomReply()   
}

ext.cmdMap["test"] = cmdMeme;
