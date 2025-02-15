// ==UserScript==
// @name         好感排行
// @author       以炽热挥剑
// @version      1.1.0
// @description  查询好感度排行，与自定义回复的好感度相对应，取决于你的自定义回复 #1.0.1新增 clr/clear 清空排行榜指令，修复修改昵称被记录为两个人问题。#1.1.0 新增非指令提示词选项，（但不完全自定义，如需真正自定义请修改源码
// @timestamp    1724146744
// @license      MIT
// @homepageURL  http://lovesealdice.online
// ==/UserScript==

// 必要流程，注册扩展，注意即使是非指令关键词也是依附于扩展的
if (!seal.ext.find('好感排行')) {
    ext = seal.ext.new('好感排行', '以炽热挥剑', '1.1.0');

    function getResult(obj) {
        let list = obj.list;
        let index = obj.list.length
        function paixu(list) {
            return list.sort(function (a, b) {
                return b.value - a.value;
            });
        }
        let result = "好感排行如下：\n";
        if (index < 10) {
            let res = paixu(list)
            for (let i = 0; i < res.length; i++) {
                result += "- " + "第" + (i + 1) + "名：" + res[i].name + "好感为：" + res[i].value + "\n"
            }
        } else {
            let res = paixu(list)
            for (let i = 0; i < 10; i++) {
                result += "- " + "第" + (i + 1) + "名：" + res[i].name + "好感为：" + res[i].value + "\n"
            }
        }
        return result
    }

    ext.onNotCommandReceived = (ctx, msg) => {
        const tag = seal.ext.getStringConfig(ext, "自定义响应词")
        // 无论如何，这部分都不能动
        let varil = seal.ext.getStringConfig(ext, "好感度")
        let vars = seal.format(ctx, `{$m${varil}}`);
        let obj = { list: [] };
        if (!ext.storageGet("好感度")) {
            obj['list'].push({ name: ctx.player.name, value: vars, id: ctx.player.userId })
        } else {
            // 先检查这个人是否在列表里
            obj = JSON.parse(ext.storageGet("好感度"));
            let index = obj.list.findIndex(item => item.id === ctx.player.userId);
            if (index === -1) {
                obj['list'].push({ name: ctx.player.name, value: vars, id: ctx.player.userId });
            } else {
                obj['list'][index].value = vars;
            }
        }
        ext.storageSet("好感度", JSON.stringify(obj));

        if (seal.ext.getBoolConfig(ext, "是否为非指令响应")) {
            // 如果为真，执行判断提示词部分
            const regesp = new RegExp(`^${tag}`);
            if (regesp.test(msg.message.replace(`[CQ:at,qq=${ctx.endPoint.userId.replace(/\D/g,"")}]`,"").replace(/\s+/,""))) {
                seal.replyToSender(ctx, msg, getResult(obj))
            }   
        }
    }
    const cmdlist = seal.ext.newCmdItemInfo();
    cmdlist.name = '好感排行';
    cmdlist.allowDelegate = true;
    cmdlist.solve = (ctx, msg, cmdArgs) => {
        if (cmdArgs.getArgN(1) == "clear" || cmdArgs.getArgN(1) == "clr") {
            if (ctx.privilegeLevel == "100") {
                ext.storageSet("好感度", null);
                seal.replyToSender(ctx, msg, "好感度已清除");
            } else {
                seal.replyToSender(ctx, msg, seal.format(ctx, "{核心:提示_无权限}"));
            }
        }
        else {
            let varil = seal.ext.getStringConfig(ext, "好感度")
            function init() {
                let vars = seal.format(ctx, `{$m${varil}}`);
                let obj = { list: [] };
                if (!ext.storageGet("好感度")) {
                    obj['list'].push({ name: ctx.player.name, value: vars, id: ctx.player.userId })
                } else {
                    // 先检查这个人是否在列表里
                    obj = JSON.parse(ext.storageGet("好感度"));
                    let index = obj.list.findIndex(item => item.id === ctx.player.userId);
                    if (index === -1) {
                        obj['list'].push({ name: ctx.player.name, value: vars, id: ctx.player.userId });
                    } else {
                        obj['list'][index].value = vars;
                    }
                }
                ext.storageSet("好感度", JSON.stringify(obj));
                // 初始化完成，可以调用变量了
            }
            init(); if (seal.ext.getBoolConfig(ext, "是否为非指令响应")) {
                // 啥也不做
            } else {
                let obj = JSON.parse(ext.storageGet("好感度"));
                seal.replyToSender(ctx, msg, getResult(obj))
            }
        }
    }

    ext.cmdMap['好感排行'] = cmdlist;

    // 注册扩展
    seal.ext.register(ext);
    seal.ext.registerStringConfig(ext, "好感度", "好感度", "用于修改好感度名称，对应自定义回复中的好感度变量。");
    seal.ext.registerBoolConfig(ext, "是否为非指令响应", false, "若为是，则为非指令响应");
    seal.ext.registerStringConfig(ext, "自定义响应词", "好感排行", "触发词，仅限非指令响应");
}