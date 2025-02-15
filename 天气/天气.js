// ==UserScript==
// @name         weather-watch
// @author       以炽热挥剑
// @version      1.0.0
// @description  查看城市天气并给出出行建议
// @timestamp    1734445058
// @license      MIT
// @homepageURL   http://39.105.48.16:4000/yichere/2024/06/29/untitled-1719668463681/
// ==/UserScript==


let ext = seal.ext.find('weather');

const allowList = ["高温回复词", "低温回复词", "舒适回复词","雨天回复词", "雪天回复词", "雷暴回复词", "大风回复词","晴天回复词","多云回复词","小雨回复词"]

if (!ext) {
    ext = seal.ext.new("weather", "以炽热挥剑", "1.0.0")
    seal.ext.register(ext);
    seal.ext.registerStringConfig(ext, "apikey", "")
    seal.ext.registerBoolConfig(ext, "是否为 at 响应", true, "如果为真，则艾特之后仍响应");
    seal.ext.registerIntConfig(ext, "windLimit", 8, "风速超过该值，则回复 windAdd 配置项的内容,单位米每秒")
    seal.ext.registerIntConfig(ext, "tempratureAbove", 25, "当温度超过该值时，回复 hotAdd 配置项中的内容")
    seal.ext.registerIntConfig(ext, "tempratureBelow", -10, "当温度低于该值时，回复 coldAdd 配置项中的内容")
    seal.ext.registerStringConfig(ext, "noplace", "未能找到<城市>,你走丢了吧？", "当找不到城市时，回复该配置项的内容，自动将<城市>解析成提问的城市")
}

ext.onNotCommandReceived = (ctx, msg) => {
    if (seal.ext.getBoolConfig(ext, "是否为 at 响应")) {
        msg.message = msg.message.replace(/\[CQ:at,qq=\s+\]/, "", "");
    }
    if (/宵宫\S+天气如何/.test(msg.message) || /宵宫[\,,，]?帮我看看\S+的天气/.test(msg.message)) {
        console.log("收到天气请求");
        const city = msg.message.replace(/宵宫[\,,，]?/, "").replace(/天气如何/, "").replace(/帮我看看/, "").replace(/的天气/, "");
        const baseapi = "http://api.openweathermap.org/";
        const apikey = seal.ext.getStringConfig(ext,"apikey")

        function init() {
            for (let key of allowList) {
                if (!ext.storageGet(key)) {
                    const defaultReplies = {
                        "高温回复词": JSON.stringify(["天气炎热，出门注意防晒哦~"]),
                        "低温回复词": JSON.stringify(["天气寒冷，出门注意保暖哦~"]),
                        "雨天回复词": JSON.stringify(["这种天气真的适合出门么？在家睡觉吧"]),
                        "雪天回复词": JSON.stringify(["这种天气真的适合出门么？在家睡觉吧"]),
                        "雷暴回复词": JSON.stringify(["天气恶劣，出门注意安全哦~"]),
                        "大风回复词": JSON.stringify(["天气恶劣，出门注意安全哦~"]),
                        "晴天回复词": JSON.stringify(["天气晴朗，出门走走吧~"]),
                        "多云回复词":JSON.stringify(["今天多云？天气凉爽吧，出去走走~"]),
                        "小雨回复词":JSON.stringify(["小雨？也不错嘛~"]),
                        "舒适回复词":JSON.stringify(["嘛~温度正好，不出去走走嘛？"])
                    };

                    for (const key of allowList) {
                        const defaultReply = defaultReplies[key]; // 获取默认回复词
                        if (defaultReply) {
                            ext.storageSet(key, defaultReply); // 设置默认回复词
                        }
                    }
                }
            }
        }

        init();
        async function getLocation(city) {
            let result = await fetch(`${baseapi}geo/1.0/direct?q=${city}&appid=${apikey}`)
            result = await result.json();
            return await result;
        }

        async function getWeather(lat, lon) {
            let result = await fetch(`${baseapi}data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apikey}`)
            result = await result.json();
            return result;
        }

        function main() {
            location = getLocation(city).then(async (location) => {
                if (location.length == 0) {
                    let noplace = seal.ext.getStringConfig(ext, "noplace");
                    noplace = noplace.replace("<城市>", city);
                    seal.replyToSender(ctx, msg, noplace)
                    return;
                }
                await location;
                const lat = location[0].lat.toFixed(2);
                const lon = location[0].lon.toFixed(2);
                weather = getWeather(lat, lon).then(async (weather) => {
                    await weather;

                    const state = weather

                    const tempreature = state.main.temp - 273.15;

                    let result = ""
                    let reply = {}

                    function getReply() {
                        for (let key of allowList) {
                            let list = JSON.parse(ext.storageGet(key));
                            let index = seal.format(ext, `{d${list.length}}`)
                            reply[key] = list[index - 1]
                        }
                        return reply;
                    }
                    
                    const addtion = getReply()

                    result += `${city}天气${state.weather[0].main}，`.replace("Clear","晴朗").replace("Snow","雪天").replace("Rain","雨天").replace("Clouds","多云").replace("Drizzle","小雨").replace("Thunderstorm","雷暴")
                    switch (state.weather[0].main){
                        case "Clear": result += addtion["晴天回复词"];break;
                        case "Snow": result += addtion["雪天回复词"];break;
                        case "Rain": result += addtion["雨天回复词"];break;
                        case "Clouds":result+= addtion["多云回复词"];break;
                        case "Drizzle": result+=addtion["小雨回复词"];break;
                        case "Thunderstorm": result += addtion["雷暴回复词"];break;
                    }
                    result +=`\n温度为：${tempreature.toFixed(2)},`
                    if (tempreature >= seal.ext.getIntConfig(ext,"tempratureAbove")){
                        result+=addtion["高温回复词"]
                    }else if (tempreature <= seal.ext.getIntConfig(ext,'tempratureBelow')){
                        result += addtion["低温回复词"]
                    }else{
                        result+= addtion["舒适回复词"]
                    }
console.log("128")                    
                    result += `\n风速为：${state.wind.speed}m/s`
                    if (state.wind.speed >= seal.ext.getIntConfig(ext,"windLimit")){
                        result += addtion["大风回复词"]
                    }
                    const template = `${result}[CQ:image,file=${`https://openweathermap.org/img/wn/${state.weather[0].icon}@2x.png`}]`
                    seal.replyToSender(ctx, msg, template)
                })
            })
        }
        main()
    }
}


let cmdAdd = seal.ext.newCmdItemInfo();
cmdAdd.name = '天气添加';
cmdAdd.help = '.天气添加 <情况回复词> <回复词> 使回复词堆中加入回复词';


cmdAdd.solve = (ctx, msg, args) => {
    function init() {
        for (let key of allowList) {
            if (!ext.storageGet(key)) {
                const defaultReplies = {
                    "高温回复词": JSON.stringify(["天气炎热，出门注意防晒哦~"]),
                    "低温回复词": JSON.stringify(["天气寒冷，出门注意保暖哦~"]),
                    "雨天回复词": JSON.stringify(["这种天气真的适合出门么？在家睡觉吧"]),
                    "雪天回复词": JSON.stringify(["这种天气真的适合出门么？在家睡觉吧"]),
                    "雷暴回复词": JSON.stringify(["天气恶劣，出门注意安全哦~"]),
                    "大风回复词": JSON.stringify(["天气恶劣，出门注意安全哦~"]),
                    "晴天回复词": JSON.stringify(["天气晴朗，出门走走吧~"]),
                    "多云回复词":JSON.stringify(["今天多云？天气凉爽吧，出去走走~"]),
                    "小雨回复词":JSON.stringify(["小雨？也不错嘛~"]),
                    "舒适回复词":JSON.stringify(["嘛~温度正好，不出去走走嘛？"])
                };

                for (const key of allowList) {
                    const defaultReply = defaultReplies[key]; // 获取默认回复词
                    if (defaultReply) {
                        ext.storageSet(key, defaultReply); // 设置默认回复词
                    }
                }
            }
        }
    }

    init();
    if (allowList.includes(args.args[0])&&ctx.privilegeLevel == 100) {

        switch (args.args[1]) {
            case "添加": {
                let messagelist = JSON.parse(ext.storageGet(args.args[0]));
                message = msg.message.replace(args.args[0], "").replace(/\S天气添加/, "").replace(/\s+/g, " ").replace(" 添加 ","");
                messagelist.push(message)
                ext.storageSet(args.args[0], JSON.stringify(messagelist))
                result = `已添加${message}到${args.args[0]}列表中`
                seal.replyToSender(ctx, msg, result)
            } break;
            case "列表": {
                console.log(ext.storageGet(args.args[0]))
                let messagelist = JSON.parse(ext.storageGet(args.args[0]));
                let result = "当前列表：\n,前方为 id，可使用 .天气添加 <情况回复词> 删除 <id> 删除对应回复词\neg：.天气添加 高温回复词 删除 1\n"
                for (let i = 0; i < messagelist.length; i++) {
                    result += `${i + 1}. ${messagelist[i]}`
                }
                seal.replyToSender(ctx, msg, result)
            }; break;
            case "删除": {
                let messagelist = JSON.parse(ext.storageGet(args.args[0]));
                let id = args.args[2]
                if (id > messagelist.length) {
                    result = `id 超出范围，当前列表长度为${messagelist.length + 1}`
                } else {
                    messagelist.splice(id - 1, 1)
                    ext.storageSet(args.args[0], JSON.stringify(messagelist))
                    result = `已删除${id}对应回复词`
                }
                seal.replyToSender(ctx, msg, result)
            }; break;
            default: {
                result = "使用方法如下:\n"
                result += ".天气添加 <情况回复词> 添加 <回复词>，可将回复词添加至天气添加回复列表,eg：.天气添加 高温回复词 添加 高温天气\n"
                result += ".天气删除 <情况回复词> 删除 <id>，可删除指定 id 的回复词列表,e.g：.天气删除 高温回复词 删除 1\n，id 由.天气添加 <情况回复词> 列表中获取\n"
                result += ".天气添加 <情况回复词> 列表，可查看指定情况回复词的回复列表，e.g：.天气添加 高温回复词 列表\n"
                result += "未处在这三个命令中的会返回此帮助内容"
                seal.replyToSender(ctx, msg, result)
            }
        }

    } else {
        let result = "仅允许使用以下情况回复词：\n"
        for (let i = 0; i < allowList.length; i++) {
            result += `${allowList[i]}\n `
        }
        seal.replyToSender(ctx, msg, result)
    }
}

ext.cmdMap["天气添加"] = cmdAdd;