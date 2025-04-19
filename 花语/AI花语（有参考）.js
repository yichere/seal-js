// ==UserScript==
// @name         FloverLanguage
// @author       以炽热挥剑
// @version      1.0.0
// @description  使用。花语来发送随机的花语
// @timestamp    1745033610
// @license      MIT
// @homepageURL   http://blog.lovesealdice.online
// ==/UserScript==

let ext = seal.ext.find('FloverLanguage');

if (!ext) {
    ext = seal.ext["new"]('FloverLanguage', '以炽热挥剑', '1.0.0');
    seal.ext.register(ext);
    seal.ext.registerStringConfig(ext, "aiUrl", "https://api.yuegle.com/v1/chat/completions", "ai 模型的地址，这里使用 glm 的免费模型")
    seal.ext.registerStringConfig(ext, "apikey", "", "ai 模型的 apikey")
    seal.ext.registerStringConfig(ext, "aiModel", "gpt-4.1-mini-2025-04-14", "模型名称")
}

let cmdFile = seal.ext.newCmdItemInfo();

cmdFile.name = '花语';

cmdFile.help = `使用。花语来发送随机的花语`;

cmdFile.solve = (ctx, msg, cmd) => {
    if (cmd.args[0] == "help" || cmd.args[0] == "帮助") {
        seal.replyToSender(ctx, msg, "发送.花语 即可随机返回一种花语.")
    } else {
        let prompt = `你是一个应用程序，用来发送花朵及其花语，每次仅发送一个**随机的**花朵及花语。在你的回复当中，请不要出现“好的，我明白了”这样的词汇，你可以发送真正的花，例如，玫瑰，百合，也可以发送特殊的花，例如，脑花，烟花。
        你每次回复根据时间戳作为种子随机回复一朵花，请不要总是回复玫瑰。
        在你的数据库中检索时间戳对应的花语，这是时间戳：${seal.format(ctx,"{$tTimestamp}")}。
        请根据模板填入相应的花朵及花语：
        “你遇到了一台花朵贩卖机，而你身上正好有几个硬币所以你决定试试”（必回复），\n
        - 50%回复：你获得了一个{%_颜色}的{%_物品}，里面有{%花语}",
        - 30%回复：你获得了一个彩色的{%_物品}，里面有{%_特殊}",
        - 10%回复：机器什么反应也没有，你什么都没有得到",
        - 10%回复：你获得了一个{%_颜色}的{%_物品}，里面什么都没有……"
        `
        fetch(seal.ext.getStringConfig(ext, "aiUrl"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${seal.ext.getStringConfig(ext, "apikey")}`
            },
            body: JSON.stringify(
                {
                    "model": seal.ext.getStringConfig(ext, "aiModel"),
                    "messages": [{
                        "role": "system",
                        "content": prompt
                    }]
                }
            )
        }).then(res => res.json()).then(res => {
            let response = res.choices[0].message.content
            seal.replyToSender(ctx, msg, response)
        })


    }
}

ext.cmdMap["花语"] = cmdFile;