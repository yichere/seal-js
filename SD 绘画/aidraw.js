// ==UserScript==
// @name         SD绘画
// @author       以炽热挥剑
// @version      1.2.0
// @description  用于海豹调用本地 AI 后端。更多帮助请到主页链接查看。 
// @timestamp    1718556448
// @license      MIT
// @homepageURL  http://39.105.48.16:4000/yichere/2024/06/05/untitled-1717601590343/   #过几天会更新使用文档。以及使用服务器调用本机的方法
// @sealVersion  1.4.5
// ==/UserScript==
if (!seal.ext.find('SD绘画')) {
    let ext = seal.ext.new('SD绘画', '以炽热挥剑', '1.2.0');
    const cmdaidraw = seal.ext.newCmdItemInfo();
    const help = "利用海豹调用本地stable-diffusion绘画,\n灵感来自https://nb.novelai.dev/\n，大幅度重构，基础功能已完备，新增同义词系统，具体同义词请看源码，下次（猴年马月）会新增白名单黑名单功能。支持如下参数\
:\n - width :宽度 默认为 512,单位 px\n - height :高度 默认为 512,单位 px\n - step :迭代步数 默认为 28,单位:步\n - face_fix: 修复人脸 默认为 0, 如果使用真人模型建议改为 1. 注：1 为 true, 0 为 false \n - tag :标签 由于没有搭载翻译接口，请确保标签为英文输入\n - ntag :\
负面标签\n - sipmler:采样方法\n - seed:生成种子\n - 引导系数:设置提示词引导系数\neg:  .aidraw  --tag=beautiful girl --ntag=bad hand --step=20 --width=555 --height=743 --face_fix=1\n也可以像这样调用:  .aidraw cool boy --step=20\
\n- v1.1.0 新增\n- .aidraw model ls #输出本地模型\n- .aidraw model change 1 #将模型切换为 1 号模型，该索引在 ls 中可以看到" +
        `\n- v1.2.0 新增\n 允许在 UI 中修改默认选项，修复若干提示词不生效问题\n`+
        `打广告.jpg，更多的内容可前往 http://lovesealdice.online:4000/yichere/2024/06/05/untitled-1717601590343/ 查看，建立了用户群，可以在群里看到我正在开发什么插件，欢迎加入（不是\n`+
        `神秘代码：706029419`
    // 大幅重构之后逻辑清晰多了，舒服了
    cmdaidraw.name = 'aidraw';
    cmdaidraw.help = help;
    cmdaidraw.allowDelegate = true;
    cmdaidraw.solve = (ctx, msg, cmdArgs) => {
        const dtag = seal.ext.getStringConfig(ext, 'tag');
        const dntag = seal.ext.getStringConfig(ext, 'ntag');
        const dsampler = seal.ext.getOptionConfig(ext, 'simpler');
        const dwidth = seal.ext.getIntConfig(ext, 'width');
        const dheight = seal.ext.getIntConfig(ext, 'height');
        const dstep = seal.ext.getIntConfig(ext, 'steps');
        const dseed = seal.ext.getIntConfig(ext, 'seed');
        const dcfg_scale = seal.ext.getIntConfig(ext, 'cfg');
        const baseurl = seal.ext.getStringConfig(ext, 'baseurl');
        const drestore_faces = seal.ext.getBoolConfig(ext, 'restore_faces');

        let message = msg.message.replace(/\[CQ:at,qq=\d+\]/, '').replace(/\S+aidraw/, "").replace(/\s+/g, ' ');
        // 这样就把 @ 消息给去掉了,同时得到了两种可能 
        // 1.  msg = "some tag --width=xxxx --height=xxx"
        // 2.  msg = "--width=xxx --height=xxx --tag xxxx"
        let all = {
            "tag": dtag,
            "ntag": dntag,
            "sampler": dsampler,
            "width": dwidth,
            "height": dheight,
            "steps": dstep,
            "seed": dseed,
            "restore_faces":drestore_faces,
            "cfg_scale": dcfg_scale
        }

        // 把参数解析出来，先解析除 tag 之外的参数
        // 整理一下逻辑
        // To std template
        // 逻辑是这样的：
        // 先把所有内容分段，若其中为--xxx=xxx，且 key 在 alias[i] 中，则将其标准化
        /**同义词系统，如有需要请修改 */
        const alias = {
            whole:["width","height","sampler","steps","seed","cfg_scale"],
            width: ["宽度", "w", "width"],
            height: ["高度", "h", "height"],
            sampler: ["采样器", "sampler", "s"],
            steps: ["步数", "step", "steps", "st"],
            seed: ["种子", "seed", "sd"],
            cfg_scale: ["cfg_scale", "cfg", "cfgscale", "提示词引导系数"],
        }
        
        
        function handleAlias(msg) {
            // 假设 alias 和 all 已定义
            let args = msg.split(" ");
            let rep = [];
            
            for (let i = 0; i < args.length; i++) {
                if (/^--/.test(args[i])) {
                    let split = args[i].split("=");
                    // 检查是否为 key-value 对
                    if (split.length == 2) {
                        for (let j = 0; j < alias.whole.length; j++) {
                            // 检查 key 是否存在
                            if (alias[alias.whole[j]].includes(split[0].replace("--", ""))) {
                                // 用实际的 key 替换 all 中的值
                                all[alias.whole[j]] = split[1];
                                rep.push(args[i]); // 只有在替换后才加入 rep
                            }
                        }
                    }
                }
            }
            return rep;
        }

        function deleteArgs(message,del){

            for (let i = 0; i < del.length; i++) {

                message = message.replace(del[i],"");

            }

            return message;

        }

        // function toStdTag()
        // 这个函数把所有的输入转换成标准格式。
        // 如果返回值是 -1，则无需解析，反之，不为 -1 则说明在解析时需要处理
        // 在 toStdTag 之前应当处理 alias
        /** toStdTag 在词头没有 -- 时自动添加 --tag= */
        function toStdTag(msg) {
             // 不以 -- 为开头的字符串视为 tag
             if (/^\s.?\-\-/.test(msg)) {
                return msg;
             }else{
                return "--tag="+msg
             }
        } 
        
        // 此时有三种情况
        // 1. msg = --tag=xxx
        // 2. msg = --ntag=xxx
        // 3. msg = --ntag=xxx --tag=xxx
        // 应当写一个函数 handleTag(msg) 来处理这三种情况
        // copy 了一下 chatgpt 的代码，不会写正则呜呜

        function handleTag(message) {
            let result = {
                tag: "",
                ntag: ""
            };
        
            // 匹配 --tag= 和 --ntag= 后面的所有内容，直到下一个参数或者行尾
            const tagMatch = message.match(/--tag=([^\s-][^--]*)/);
            const ntagMatch = message.match(/--ntag=([^\s-][^--]*)/);
        
            // 如果匹配到多个单词，去掉前后多余的空格
            if (tagMatch) {
                result.tag = tagMatch[1].trim();
            }
        
            if (ntagMatch) {
                result.ntag = ntagMatch[1].trim();
            }
        
            return result;
        }
        /**  用于处理 draw 命令 */ 
        function draw(ctx,msg,message){
            const del = handleAlias( message);
            

            let m = toStdTag(deleteArgs( message,del));
            
            console.log(m);
            

            const tagobject = handleTag(m);

            all["tag"] = all["tag"]+tagobject.tag;

            all["ntag"] = all["ntag"]+tagobject.ntag;

            const data = {
                prompt: all["tag"],
                negative_prompt: all["ntag"],
                steps: all["steps"],
                width: all["width"],
                height: all["height"],
                restore_faces: all["restore_faces"],
                sampler_name: dsampler,
                seed: all["seed"],
                cfg_scale: all["cfg_scale"]
            };

            let inittime = Date.now();

            seal.replyToSender(ctx, msg, '正在生成图片，请稍候...');

            fetch(`${baseurl}/sdapi/v1/txt2img`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json' // 指定请求体的数据类型为 JSON
                },
                body: JSON.stringify(data) // 将数据转换为 JSON 字符串

            }).then(response => {
                if (!response.ok) {
                    if (response.status === 500) {
                        seal.replyToSender(ctx, msg, '请确保 stable-diffusion 已经启动')
                        return
                    } else {
                        seal.replyToSender(ctx, msg, '喔唷，服务器崩溃了！')
                        return
                    }
                }
                return response.json(); // 解析 JSON 格式的响应数据
            })
                .then(responseData => {
                    filename = seal.base64ToImage(responseData.images);
                    seal.replyToSender(ctx, msg, `[CQ:image,file=${filename}]`);
                    const finishtime = Date.now();
                    const time = (finishtime - inittime) / 1000;
                    console.log(JSON.stringify(responseData))
                    let par = responseData.parameters;
                    let r = `提示词:${par.prompt}\n负面提示词:${par.negative_prompt}\n迭代步数:${par.steps}\n宽度:${par.width}\n高度:${par.height}\n完成时间:${time}秒\n种子:${par.seed}`;
                    seal.replyToSender(ctx, msg, r);
                })
        }

        switch (cmdArgs.args[0]) {
            case 'help':
                seal.replyToSender(ctx, msg, help); break;
            case "draw": draw(ctx,msg, message); break;
            case "model": {
                function modells() {
                    fetch(`${baseurl}/sdapi/v1/sd-models`).then(response => {
                        if (!response.ok) {
                            if (response.status === 500) {
                                seal.replyToSender(ctx, msg, '请确保 stable-diffusion 已经启动')
                                return
                            }
                        }
                        return response.json()
                    }
                    ).then(
                        responseData => {
                            let models = responseData
                            let message = "模型列表：\n";
                            for (i = 0; i < models.length; i++) {
                                message += `-${i + 1} ${models[i].model_name} \n`;
                            }
                            ext.storageSet("model", JSON.stringify({ model: models }));
                            seal.replyToSender(ctx, msg, message);
                        }
                    )
                }
                function changemodel() {
                    let models = JSON.parse(ext.storageGet("model"))

                    if (!models) {
                        seal.replyToSender(ctx, msg, "尚未初始化模型，请使用命令 .aidraw model ls 获取模型列表，并通过索引号切换模型")
                        return
                    }
                    else {
                        let index = cmdArgs.args[2];
                        index = parseInt(index);
                        if (index > models.model.length) {
                            seal.replyToSender(ctx, msg, "索引号超出范围，请重新输入，请使用命令 .aidraw model ls 获取模型列表，并通过索引号切换模型")
                            return
                        } else {
                            model = models.model[index - 1].model_name
                            fetch(`${baseurl}/sdapi/v1/options`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json' // 指定请求体的数据类型为 JSON
                                },
                                body: JSON.stringify(
                                    {
                                        sd_model_checkpoint: model
                                    }
                                ) // 将数据转换为 JSON 字符串
                            }
                            ).then(response => {
                                if (!response.ok) {
                                    if (response.status === 500) {
                                        seal.replyToSender(ctx, msg, '请确保 stable-diffusion 已经启动')
                                        return
                                    }
                                }
                                return response.json(); // 解析 JSON 格式的响应数据
                            }).then(r => {
                                seal.replyToSender(ctx, msg, `模型切换成功，当前模型为${model}`)
                            })
                        }
                    }
                }
                switch (cmdArgs.args[1]) {
                    case "ls": modells(); break;
                    case "list": modells(); break;
                    case "show": modells(); break;
                    case "change": changemodel(); break;
                }
            }; break;

            default: {
                draw(ctx,msg, message);
            }
        };
    }

    ext.cmdMap['aidraw'] = cmdaidraw;

    // 注册扩展
    const simpler = ["DPM++ 2M Karras", "DPM++ SDE Karras", "DPM++ 2M SDE Exponential", "DPM++ 2M SDE Karras", "Euler a", "Euler", "LMS", "Heun", "DPM2", "DPM2 a", "DPM++ 2S a", "DPM++ 2M", "DPM++ SDE", "DPM++ 2M SDE", "DPM++ 2M SDE Heun", "DPM++ 2M SDE Heun Karras", "DPM++ 2M SDE Heun Exponential", "DPM++ 3M SDE", "DPM++ 3M SDE Karras", "DPM++ 3M SDE Exponential", "DPM fast", "DPM adaptive", "LMS Karras", "DPM2 Karras", "DPM2 a Karras", "DPM++ 2S a Karras", "Restart", "DDIM", "PLMS", "UniPC", "LCM"]

    seal.ext.register(ext);
    // 注册整型配置项
    const defaulttag = "masterpiece、best quality、ultra-detailed、extremely detailed CG unity 8k wallpaper、dynamic angle、floating、finely detail、depth of,  "
    seal.ext.registerStringConfig(ext, "tag", defaulttag, "默认的提示词");
    const defaultNtag = "low quality, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, ";
    seal.ext.registerStringConfig(ext, "ntag", defaultNtag, "默认的负面引导词")
    seal.ext.registerIntConfig(ext, "width", 512, "默认的宽度")
    seal.ext.registerIntConfig(ext, "height", 512, "默认的高度")
    seal.ext.registerIntConfig(ext, "steps", 28, "默认的步数")
    seal.ext.registerIntConfig(ext, "seed", -1, "默认的种子")
    seal.ext.registerBoolConfig(ext,"restore_faces",false,"是否修复人脸")
    seal.ext.registerOptionConfig(ext, "simpler", "Euler a", simpler, "默认的采样方法,注: Euler 采样方法注重效率，DPM 采样方法注重质量，具体差距可自行在互联网中搜索")
    seal.ext.registerIntConfig(ext, "cfg", 7, "默认引导词提示系数")
    seal.ext.registerStringConfig(ext,"baseurl","http://127.0.0.1:7860","默认的 sd 基础后端地址，如需修改请自行修改")
}