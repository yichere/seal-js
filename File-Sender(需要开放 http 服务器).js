// ==UserScript==
// @name         File-sender
// @author       以炽热挥剑
// @version      1.0.0
// @description  。发送文件 <文件名> 让骰娘发送本地文件
// @timestamp    1740829842
// @license      MIT
// @homepageURL   http://blog.lovesealdice.online
// ==/UserScript==

let ext = seal.ext.find('File-sender');

if (!ext) {
    ext = seal.ext["new"]('File-sender', '以炽热挥剑', '1.0.0');
    seal.ext.register(ext);
    seal.ext.registerTemplateConfig(ext, "fileList", ["coc空白卡"], "存储文件的列表")
    seal.ext.registerStringConfig(ext, "url", "{}", "map[endpoint]url")
    seal.ext.registerStringConfig(ext, "help", "发送\"。发送文件 <文件名>\" 让骰娘发送本地文件")
    seal.ext.registerBoolConfig(ext, "isCheck", true, "是否检查用户发送的文件在列表中")
    seal.ext.registerStringConfig(ext, "base", "C://Users/Administrator/Desktop/文件/", "文件存放的根目录")
    seal.ext.registerBoolConfig(ext, "isAiSearch", false, "是否开启 ai 搜索文件")
    seal.ext.registerStringConfig(ext, "aiUrl", "https://open.bigmodel.cn/api/paas/v4/chat/completions", "ai 模型的地址，这里使用 glm 的免费模型")
    seal.ext.registerStringConfig(ext, "apikey", "", "ai 模型的 apikey")
    seal.ext.registerStringConfig(ext, "aiModel", "glm-4-flash", "模型名称")
}

let cmdFile = seal.ext.newCmdItemInfo();

cmdFile.name = '发送文件';

cmdFile.help = `使用。发送文件 <文件名> 来发送本地文件`;

cmdFile.solve = (ctx, msg, cmd) => {
    if (cmd.args[0] == "help" || cmd.args[0] == "帮助") {
        seal.replyToSender(ctx, msg, seal.format(ctx, seal.ext.getStringConfig(ext, "help")));
    } else {

        function sendFile(filepath) {
            url = encodeURI(url + `upload_group_file?group_id=${ctx.group.groupId.replace(/QQ-Group:/, "")}&file=${seal.ext.getStringConfig(ext, "base")}/${filepath}&name=${!filepath.match(/\/[\s\S]+/) ? filepath : filepath.match(/\/[\s\S]+/)[0].replace("/", "")}`)
            fetch(url).then(res => res.json()).then(res => {
                if (res.status != 'ok') {
                    seal.replyToSender(ctx, msg, "上传失败！请检查群聊是否允许上传文件，填写 url 是否正确。")
                }
            })
        }

        let fileList = seal.ext.getTemplateConfig(ext, "fileList");
        let url = JSON.parse(seal.ext.getStringConfig(ext, "url"))[ctx.endPoint.userId];
        console.log(JSON.stringify(fileList))
        if (seal.ext.getBoolConfig(ext, "isCheck")) {
            if (seal.ext.getBoolConfig(ext, "isAiSearch")) {
                let prompt = `你仅作为搜索工具，因此有以下几点要求：
                1.你必须仅返回 json 文本，不允许返回非 json 的文本
                2.仅允许返回列表中存在的内容，不允许出现 file_list 不存在的内容
                3.返回的 json 按照 { "path" : file_path ,"status":200 }
                4.这是所有的 file_path 列表： ${JSON.stringify(fileList)}
                5.如果没有找到合适的文件，返回{"status":404}
                6.不要输出 Markdown ,请输出 json
                请根据用户输入返回最佳选项`
                fetch(seal.ext.getStringConfig(ext, "aiUrl"), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${seal.ext.getStringConfig(ext, "apikey")}`
                    },
                    body: JSON.stringify(
                        {
                            "model": seal.ext.getStringConfig(ext, "aiModel"),
                            "messages":[{
                                "role": "system",
                                "content": prompt
                            },{
                                "role": "user",
                                "content": cmd.args[0]
                            }]
                        }
                    )
                }).then(res => res.json()).then(res => {
                    let response = JSON.parse(res.choices[0].message.content.match(/{[\s\S]+}/)[0])
                    if (response["status"] != 200){
                        seal.replyToSender(ctx,msg,"咱喵没有找到合适的文件呢……")
                    }else{
                        sendFile(response["path"])
                    }
                })
            } else if (fileList.indexOf(cmd.args[0]) == -1) {
                seal.replyToSender(ctx, msg, "文件不在列表中");
                return;
            } else {
                sendFile(cmd.args[0])
            }
        } else {
            sendFile(cmd.args[0]);
        }

    }
}

ext.cmdMap["发送文件"] = cmdFile;
ext.cmdMap["sendFile"] = cmdFile 