// ==UserScript==
// @name         宠物冒险中
// @author       莫一
// @version      1.6.0
// @description  群成员可以领养宠物，体的请使用。宠物help
// @timestamp    2025/02/25
// ==/UserScript==

exports.__esModule = true;
var ext = seal.ext.find('PetRaising');
if (!ext) {
    ext = seal.ext.new('PetRaising', 'YourName', '1.6.0');
    seal.ext.register(ext);
}

// 初始化存储
ext.storageInit();

// 加载数据
function loadData() {
    try {
        const petData = ext.storageGet('petData') || {};
        const petDeathData = ext.storageGet('petDeathData') || {};
        const petRunawayData = ext.storageGet('petRunawayData') || {};
        const petReleaseData = ext.storageGet('petReleaseData') || {};
        return { petData, petDeathData, petRunawayData, petReleaseData };
    } catch (error) {
        console.error('加载数据时出错:', error);
        return { petData: {}, petDeathData: {}, petRunawayData: {}, petReleaseData: {} };
    }
}

// 保存数据
function saveData(petData, petDeathData, petRunawayData, petReleaseData) {
    try {
        ext.storageSet('petData', petData);
        ext.storageSet('petDeathData', petDeathData);
        ext.storageSet('petRunawayData', petRunawayData);
        ext.storageSet('petReleaseData', petReleaseData);
    } catch (error) {
        console.error('保存数据时出错:', error);
    }
}

// 加载数据到全局变量
const { petData, petDeathData, petRunawayData, petReleaseData } = loadData();

// 上次属性下降的日期
let lastAttributeDecreaseDate = new Date().getDate();

// 宠物类型及初始属性
const petTypes = {
    "小狗": { name: "小狗", hunger: 50, happiness: 50, health: 100 },
    "小鼠": { name: "小鼠", hunger: 50, happiness: 50, health: 100 },
    "小蛇": { name: "小蛇", hunger: 50, happiness: 50, health: 100 },
    "小鸟": { name: "小鸟", hunger: 50, happiness: 50, health: 100 },
    "小猫": { name: "小猫", hunger: 50, happiness: 50, health: 100 }
};

// 随机下降属性函数
function randomDecreaseAttributes() {
    const currentDate = new Date().getDate();
    if (currentDate !== lastAttributeDecreaseDate) {
        for (const userId in petData) {
            const pet = petData[userId];
            const attributes = ['hunger', 'happiness', 'health'];
            attributes.forEach(attr => {
                const decreaseAmount = Math.floor(Math.random() * 16) + 5;
                pet[attr] = Math.max(pet[attr] - decreaseAmount, 0);
            });
            // 检查是否离家出走
            if (pet.hunger === 0 && pet.happiness === 0) {
                petRunawayData[userId] = Date.now();
                delete petData[userId];
            }
        }
        lastAttributeDecreaseDate = currentDate;
        saveData(petData, petDeathData, petRunawayData, petReleaseData);
    }
}

// 模拟战斗失败，生命值随机下降 0 - 10
function battleFailure(pet) {
    const decreaseAmount = Math.floor(Math.random() * 11);
    pet.health = Math.max(pet.health - decreaseAmount, 0);
    return decreaseAmount;
}

// 领养宠物指令
const cmdAdopt = seal.ext.newCmdItemInfo();
cmdAdopt.name = "领养宠物";
cmdAdopt.help = `格式示例：
.领养宠物 小狗 旺财
（可领养宠物：小狗 小猫 小蛇 小鼠 小鸟）`;
cmdAdopt.solve = (ctx, msg, argv) => {
    randomDecreaseAttributes();
    const ret = seal.ext.newCmdExecuteResult(true);
    const userId = ctx.player.userId;
    if (petDeathData[userId] || petRunawayData[userId] || petReleaseData[userId]) {
        let deathOrRunawayTime = petDeathData[userId] || petRunawayData[userId] || petReleaseData[userId];
        const now = Date.now();
        const elapsed = (now - deathOrRunawayTime) / (1000 * 60 * 60);
        if (elapsed < 24) {
            const remaining = 24 - elapsed;
            if (petDeathData[userId]) {
                seal.replyToSender(ctx, msg, `你的宠物已死亡，还真是遗憾...稍微等一等吧，给我好好反省#阴暗\n还需等待约 ${remaining.toFixed(1)} 小时才能再次领养哦。`);
            } else if (petRunawayData[userId]) {
                seal.replyToSender(ctx, msg, `你的宠物离家出走了，还真是遗憾...稍微等一等吧，给我好好反省#阴暗\n还需等待约 ${remaining.toFixed(1)} 小时才能再次领养哦。`);
            } else {
                seal.replyToSender(ctx, msg, `你刚刚放生了宠物，还真是遗憾...稍微等一等吧，给我好好反省#阴暗\n还需等待约 ${remaining.toFixed(1)} 小时才能再次领养哦。`);
            }
            return ret;
        } else {
            if (petDeathData[userId]) delete petDeathData[userId];
            if (petRunawayData[userId]) delete petRunawayData[userId];
            if (petReleaseData[userId]) delete petReleaseData[userId];
        }
    }
    if (argv.args.length < 1) {
        ret.showHelp = true;
        return ret;
    }
    const petType = argv.args[0];
    if (!petTypes[petType]) {
        seal.replyToSender(ctx, msg, "没有这种宠物可以领养哦，请选择小狗 小猫 小蛇 小鼠 小鸟。");
        return ret;
    }
    if (petData[userId]) {
        seal.replyToSender(ctx, msg, "你已经有一只宠物啦，不能再领养啦，请专一一点哦。");
        return ret;
    }
    const pet = { ...petTypes[petType] };
    if (argv.args.length > 1) {
        pet.customName = argv.args[1];
    } else {
        pet.customName = pet.name;
    }
    petData[userId] = pet;
    saveData(petData, petDeathData, petRunawayData, petReleaseData);
    seal.replyToSender(ctx, msg, `你成功领养了一只 ${petType}，它的名字是 ${pet.customName}么？还真是可爱，好好照顾它吧~`);
    return ret;
}

// 查看宠物信息指令
const cmdCheckPet = seal.ext.newCmdItemInfo();
cmdCheckPet.name = "查看宠物";
cmdCheckPet.help = `.查看宠物 查看你的宠物信息`;
cmdCheckPet.solve = (ctx, msg, argv) => {
    randomDecreaseAttributes();
    const ret = seal.ext.newCmdExecuteResult(true);
    const userId = ctx.player.userId;
    const pet = petData[userId];
    if (!pet) {
        if (petRunawayData[userId]) {
            const runawayTime = petRunawayData[userId];
            const now = Date.now();
            const elapsed = (now - runawayTime) / (1000 * 60 * 60);
            if (elapsed < 24) {
                const remaining = 24 - elapsed;
                seal.replyToSender(ctx, msg, `你的宠物 ${petData[userId]?.customName || "它"} 因为伙食不好待遇不好心情不好离家出走了\n还需等待约 ${remaining.toFixed(1)} 小时才能再次领养或可以尝试寻回哦？`);
            } else {
                delete petRunawayData[userId];
                saveData(petData, petDeathData, petRunawayData, petReleaseData);
                seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
            }
        } else {
            seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
        }
        return ret;
    }
    const info = `你的宠物是 ${pet.name}\n名字叫 ${pet.customName}\n饱食度：${pet.hunger}\n心情值：${pet.happiness}\n生命值：${pet.health}\n请好好相处哦~`;
    seal.replyToSender(ctx, msg, info);
    return ret;
}

// 喂养宠物指令
const cmdFeed = seal.ext.newCmdItemInfo();
cmdFeed.name = "喂养宠物";
cmdFeed.help = `增加饱食度、心情值和生命值`;
cmdFeed.solve = (ctx, msg, argv) => {
    randomDecreaseAttributes();
    const ret = seal.ext.newCmdExecuteResult(true);
    const userId = ctx.player.userId;
    const pet = petData[userId];
    if (!pet) {
        if (petRunawayData[userId]) {
            const runawayTime = petRunawayData[userId];
            const now = Date.now();
            const elapsed = (now - runawayTime) / (1000 * 60 * 60);
            if (elapsed < 24) {
                const remaining = 24 - elapsed;
                seal.replyToSender(ctx, msg, `你的宠物 ${petData[userId]?.customName || "它"} 因为伙食不好待遇不好心情不好离家出走了\n还需等待约 ${remaining.toFixed(1)} 小时才能再次领养或可以尝试寻回哦？`);
            } else {
                delete petRunawayData[userId];
                saveData(petData, petDeathData, petRunawayData, petReleaseData);
                seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
            }
        } else {
            seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
        }
        return ret;
    }
    // 简单模拟喂养效果
    pet.hunger = Math.min(pet.hunger + 20, 100);
    pet.happiness = Math.min(pet.happiness + 10, 100);
    const healthIncrease = Math.floor(Math.random() * 11);
    pet.health = Math.min(pet.health + healthIncrease, 100);
    saveData(petData, petDeathData, petRunawayData, petReleaseData);
    const info = `你给你的 ${pet.customName}（${pet.name}）喂了一些食物\n它现在饱食度：${pet.hunger}\n心情值：${pet.happiness}\n生命值增加了 ${healthIncrease}，当前为 ${pet.health}`;
    seal.replyToSender(ctx, msg, info);
    return ret;
}

// 给宠物改名指令
const cmdRenamePet = seal.ext.newCmdItemInfo();
cmdRenamePet.name = "给宠物改名";
cmdRenamePet.help = `格式示例：
.给宠物改名 新名字`;
cmdRenamePet.solve = (ctx, msg, argv) => {
    randomDecreaseAttributes();
    const ret = seal.ext.newCmdExecuteResult(true);
    if (argv.args.length < 1) {
        ret.showHelp = true;
        return ret;
    }
    const userId = ctx.player.userId;
    const pet = petData[userId];
    if (!pet) {
        if (petRunawayData[userId]) {
            const runawayTime = petRunawayData[userId];
            const now = Date.now();
            const elapsed = (now - runawayTime) / (1000 * 60 * 60);
            if (elapsed < 24) {
                const remaining = 24 - elapsed;
                seal.replyToSender(ctx, msg, `你的宠物 ${petData[userId]?.customName || "它"} 因为伙食不好待遇不好心情不好离家出走了\n还需等待约 ${remaining.toFixed(1)} 小时才能再次领养或可以尝试寻回哦？`);
            } else {
                delete petRunawayData[userId];
                saveData(petData, petDeathData, petRunawayData, petReleaseData);
                seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
            }
        } else {
            seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
        }
        return ret;
    }
    const newName = argv.args[0];
    pet.customName = newName;
    saveData(petData, petDeathData, petRunawayData, petReleaseData);
    seal.replyToSender(ctx, msg, `你成功将你的宠物 ${pet.name} 的名字改为 ${newName}。`);
    return ret;
}

// 模拟战斗指令
const cmdBattle = seal.ext.newCmdItemInfo();
cmdBattle.name = "战斗";
cmdBattle.help = `.战斗 @某人 让你的宠物与对方的宠物进行战斗`;
cmdBattle.allowDelegate = true;
cmdBattle.solve = (ctx, msg, argv) => {
    randomDecreaseAttributes();
    const ret = seal.ext.newCmdExecuteResult(true);
    const userId = ctx.player.userId;
    const myPet = petData[userId];
    if (!myPet) {
        if (petRunawayData[userId]) {
            const runawayTime = petRunawayData[userId];
            const now = Date.now();
            const elapsed = (now - runawayTime) / (1000 * 60 * 60);
            if (elapsed < 24) {
                const remaining = 24 - elapsed;
                seal.replyToSender(ctx, msg, `你的宠物 ${petData[userId]?.customName || "它"} 因为伙食不好待遇不好心情不好离家出走了\n还需等待约 ${remaining.toFixed(1)} 小时才能再次领养或可以尝试寻回哦？`);
            } else {
                delete petRunawayData[userId];
                saveData(petData, petDeathData, petRunawayData, petReleaseData);
                seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
            }
        } else {
            seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
        }
        return ret;
    }
    if (myPet.health <= 0) {
        seal.replyToSender(ctx, msg, `你的宠物 ${myPet.customName} 已经死亡或正在医院治疗，是战斗狂么...真是恐怖啊...\n总之！无法战斗！`);
        return ret;
    }
    const mctx = seal.getCtxProxyFirst(ctx, argv);
    if (!mctx) {
        seal.replyToSender(ctx, msg, "请使用 @ 选择要对战的对象。");
        return ret;
    }
    // 直接使用完整的用户 ID
    const opponentId = mctx.player.userId;
    const opponentPet = petData[opponentId];
    if (!opponentPet) {
        if (petRunawayData[opponentId]) {
            const runawayTime = petRunawayData[opponentId];
            const now = Date.now();
            const elapsed = (now - runawayTime) / (1000 * 60 * 60);
            if (elapsed < 24) {
                const remaining = 24 - elapsed;
                seal.replyToSender(ctx, msg, `对方的宠物 ${petData[opponentId]?.customName || "它"} 因为伙食不好待遇不好心情不好离家出走了\n还需等待约 ${remaining.toFixed(1)} 小时才能再次领养或可以尝试寻回哦？`);
            } else {
                delete petRunawayData[opponentId];
                saveData(petData, petDeathData, petRunawayData, petReleaseData);
                seal.replyToSender(ctx, msg, "对方还没有领养宠物，无法进行战斗。");
            }
        } else {
            seal.replyToSender(ctx, msg, "对方还没有领养宠物，无法进行战斗。");
        }
        return ret;
    }
    if (opponentPet.health <= 0) {
        seal.replyToSender(ctx, msg, `对方的宠物 ${opponentPet.customName} 已经死亡或正在医院治疗，是战斗狂么...真是恐怖啊...\n总之！无法战斗！`);
        return ret;
    }

    // 定义宠物技能和成功率
    const mySkills = [
        { name: "啃咬", successRate: 50 },
        { name: "抓挠", successRate: 50 },
        { name: "卖萌", successRate: 50 },
        { name: "打滚", successRate: 50 },
        { name: "冲撞", successRate: 50 },
        { name: "吼叫", successRate: 50 }
    ];
    const opponentSkills = [
        { name: "啃咬", successRate: 50 },
        { name: "抓挠", successRate: 50 },
        { name: "卖萌", successRate: 50 },
        { name: "打滚", successRate: 50 },
        { name: "冲撞", successRate: 50 },
        { name: "吼叫", successRate: 50 }
    ];

    // 随机选择技能
    const mySkill = mySkills[Math.floor(Math.random() * mySkills.length)];
    const opponentSkill = opponentSkills[Math.floor(Math.random() * opponentSkills.length)];

    // 生成随机点数
    const myRoll = Math.floor(Math.random() * 100) + 1;
    const opponentRoll = Math.floor(Math.random() * 100) + 1;

    // 判断技能是否成功
    const myResult = myRoll <= mySkill.successRate;
    const opponentResult = opponentRoll <= opponentSkill.successRate;

    let resultMsg = `你的宠物 ${myPet.customName} 和对方宠物 ${opponentPet.customName} 开始战斗\n`;
    resultMsg += `你的宠物使用了 ${mySkill.name} ${myRoll}/${mySkill.successRate}，`;
    resultMsg += myResult ? "成功\n" : "失败\n";
    resultMsg += `对方宠物使用了 ${opponentSkill.name} ${opponentRoll}/${opponentSkill.successRate}，`;
    resultMsg += opponentResult ? "成功\n" : "失败\n";

    if (!myResult && !opponentResult) {
        resultMsg += `双方战斗都使出来王八拳，互相都未伤到对方——可喜可贺可喜可乐——`;
    } else if (myResult && opponentResult) {
        resultMsg += `双方宠物打的有来有回精彩纷呈，但还好！由于我们先手攻击，抓住机会，胜利！\n对方宠物 ${opponentPet.customName} 生命值下降\n`;
        const decreaseAmount = battleFailure(opponentPet);
        resultMsg += `对方宠物生命值下降了 ${decreaseAmount}\n当前生命值为 ${opponentPet.health}。\n你的宠物 ${myPet.customName} 当前生命值：${myPet.health}`;
    } else if (myResult) {
        resultMsg += `你的宠物 ${myPet.customName}简直就是节奏大师...打的对方节节败退，胜利！\n对方宠物 ${opponentPet.customName} 生命值下降\n`;
        const decreaseAmount = battleFailure(opponentPet);
        resultMsg += `对方宠物下降了 ${decreaseAmount}\n当前生命值为 ${opponentPet.health}。\n你的宠物 ${myPet.customName} 当前生命值：${myPet.health}`;
    } else {
        resultMsg += `对方宠物简直就是斗舞高手，你的宠物 ${myPet.customName} 毫无招架能力，失败！\n`;
        const decreaseAmount = battleFailure(myPet);
        resultMsg += `你的宠物生命值下降了 ${decreaseAmount}\n当前生命值为 ${myPet.health}`;
    }

    if (myPet.health <= 0) {
        if (myPet.health < 0) {
            petDeathData[userId] = Date.now();
            delete petData[userId];
            saveData(petData, petDeathData, petRunawayData, petReleaseData);
            resultMsg += `\n你的宠物 ${myPet.customName} 在战斗中死亡，还真是暴力啊...24 小时内禁止再次领养。`;
        } else {
            resultMsg += `\n你的宠物 ${myPet.customName} 在战斗中受伤，生命值降为 0，已强制送往医院休息 24 小时。`;
        }
    }
    if (opponentPet.health <= 0) {
        if (opponentPet.health < 0) {
            petDeathData[opponentId] = Date.now();
            delete petData[opponentId];
            saveData(petData, petDeathData, petRunawayData, petReleaseData);
            resultMsg += `\n对方的宠物 ${opponentPet.customName} 在战斗中死亡，还真是暴力啊...24 小时内禁止再次领养。`;
        } else {
            resultMsg += `\n对方的宠物 ${opponentPet.customName} 在战斗中受伤，生命值降为 0，已强制送往医院休息 24 小时。`;
        }
    }
    seal.replyToSender(ctx, msg, resultMsg);
    return ret;
}

// 送宠物去医院指令
const cmdHospital = seal.ext.newCmdItemInfo();
cmdHospital.name = "送医院";
cmdHospital.help = `送宠物去医院休息一会恢复满血`;
cmdHospital.solve = (ctx, msg, argv) => {
    randomDecreaseAttributes();
    const ret = seal.ext.newCmdExecuteResult(true);
    const userId = ctx.player.userId;
    const pet = petData[userId];
    if (!pet) {
        if (petRunawayData[userId]) {
            const runawayTime = petRunawayData[userId];
            const now = Date.now();
            const elapsed = (now - runawayTime) / (1000 * 60 * 60);
            if (elapsed < 24) {
                const remaining = 24 - elapsed;
                seal.replyToSender(ctx, msg, `你的宠物 ${petData[userId]?.customName || "它"} 因为伙食不好待遇不好心情不好离家出走了\n还需等待约 ${remaining.toFixed(1)} 小时才能再次领养或可以尝试寻回哦？`);
            } else {
                delete petRunawayData[userId];
                saveData(petData, petDeathData, petRunawayData, petReleaseData);
                seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
            }
        } else {
            seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
        }
        return ret;
    }
    if (pet.health <= 0) {
        if (pet.health < 0) {
            seal.replyToSender(ctx, msg, `你的宠物 ${pet.customName} 已经死亡，还真是遗憾...医院也无能为力呢...`);
        } else {
            seal.replyToSender(ctx, msg, `你的宠物 ${pet.customName} 已经在医院治疗，耐心等待恢复吧。`);
        }
        return ret;
    }
    pet.health = 100;
    saveData(petData, petDeathData, petRunawayData, petReleaseData);
    seal.replyToSender(ctx, msg, `你将宠物 ${pet.customName} 送往医院，它已经恢复活力，目前活蹦乱跳的！`);
    return ret;
}

// 宠物冒险指令
const cmdAdventure = seal.ext.newCmdItemInfo();
cmdAdventure.name = "冒险";
cmdAdventure.help = `.冒险 让你的宠物去冒险`;
cmdAdventure.solve = (ctx, msg, argv) => {
    randomDecreaseAttributes();
    const ret = seal.ext.newCmdExecuteResult(true);
    const userId = ctx.player.userId;
    const pet = petData[userId];
    if (!pet) {
        if (petRunawayData[userId]) {
            const runawayTime = petRunawayData[userId];
            const now = Date.now();
            const elapsed = (now - runawayTime) / (1000 * 60 * 60);
            if (elapsed < 24) {
                const remaining = 24 - elapsed;
                seal.replyToSender(ctx, msg, `你的宠物 ${petData[userId]?.customName || "它"} 因为伙食不好待遇不好心情不好离家出走了\n还需等待约 ${remaining.toFixed(1)} 小时才能再次领养或可以尝试寻回哦？`);
            } else {
                delete petRunawayData[userId];
                saveData(petData, petDeathData, petRunawayData, petReleaseData);
                seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
            }
        } else {
            seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
        }
        return ret;
    }
    if (pet.health <= 0) {
        seal.replyToSender(ctx, msg, `你的宠物 ${pet.customName} 已经死亡或正在医院治疗，无法冒险。`);
        return ret;
    }

    const eventType = Math.floor(Math.random() * 3);
    let eventMsg = "";

    switch (eventType) {
        case 0:
            const isLose = Math.random() < 0.5;
            if (isLose) {
                const decreaseAmount = battleFailure(pet);
                eventMsg = `你的宠物 ${pet.customName} 在冒险中遭遇了战斗并失败了\n生命值下降了 ${decreaseAmount}，当前生命值为 ${pet.health}\n`;
                if (pet.health <= 0) {
                    if (pet.health < 0) {
                        petDeathData[userId] = Date.now();
                        delete petData[userId];
                        saveData(petData, petDeathData, petRunawayData, petReleaseData);
                        eventMsg += `\n你的宠物 ${pet.customName} 在战斗中死亡，真是遗憾...24 小时内禁止再次领养。`;
                    } else {
                        eventMsg += `\n你的宠物 ${pet.customName} 在战斗中受伤，生命值降为 0，已强制送往医院休息 24 小时，真是的，好好保护它呀。`;
                    }
                }
            } else {
                eventMsg = `你的宠物 ${pet.customName} 在冒险中遭遇战斗并胜利了，真是强劲口牙！`;
            }
            break;
        case 1:
            const healthIncrease = Math.floor(Math.random() * 11);
            pet.health = Math.min(pet.health + healthIncrease, 100);
            saveData(petData, petDeathData, petRunawayData, petReleaseData);
            eventMsg = `你的宠物 ${pet.customName} 在冒险中遇到了神秘的深山温泉，生命值增加了 ${healthIncrease}，当前生命值为 ${pet.health}`;
            break;
        case 2:
            pet.happiness = Math.min(pet.happiness + 20, 100);
            saveData(petData, petDeathData, petRunawayData, petReleaseData);
            eventMsg = `你的宠物 ${pet.customName} 在冒险中玩得很开心，似乎交到新朋友叫...奈亚？心情值增加到了 ${pet.happiness}`;
            break;
    }

    seal.replyToSender(ctx, msg, eventMsg);
    return ret;
}

// 尝试寻回离家出走的宠物指令
const cmdRetrievePet = seal.ext.newCmdItemInfo();
cmdRetrievePet.name = "寻回宠物";
cmdRetrievePet.help = `.寻回宠物 尝试寻回离家出走的宠物`;
cmdRetrievePet.solve = (ctx, msg, argv) => {
    randomDecreaseAttributes();
    const ret = seal.ext.newCmdExecuteResult(true);
    const userId = ctx.player.userId;
    if (!petRunawayData[userId]) {
        seal.replyToSender(ctx, msg, "你的宠物没有离家出走，无需寻回。");
        return ret;
    }
    const runawayTime = petRunawayData[userId];
    const now = Date.now();
    const elapsed = (now - runawayTime) / (1000 * 60 * 60);
    if (elapsed >= 24) {
        delete petRunawayData[userId];
        saveData(petData, petDeathData, petRunawayData, petReleaseData);
        seal.replyToSender(ctx, msg, "你的宠物离家出走时间已过 24 小时，还真是遗憾...没有办法再找回来了...可以重新领养一只宠物哦。");
        return ret;
    }
    const isSuccess = Math.random() < 0.5;
    if (isSuccess) {
        const pet = { ...petTypes[petData[userId]?.name || "小狗"] };
        pet.customName = petData[userId]?.customName || pet.name;
        pet.hunger = Math.min(pet.hunger + 10, 100);
        pet.happiness = Math.min(pet.happiness + 10, 100);
        petData[userId] = pet;
        delete petRunawayData[userId];
        saveData(petData, petDeathData, petRunawayData, petReleaseData);
        seal.replyToSender(ctx, msg, `帮助你成功寻回了宠物 ${pet.customName}，它的饱食度和心情值恢复了 10，接下来请好好对待它呀。`);
    } else {
        petDeathData[userId] = Date.now();
        delete petRunawayData[userId];
        saveData(petData, petDeathData, petRunawayData, petReleaseData);
        seal.replyToSender(ctx, msg, `很遗憾，寻回宠物失败了，24 小时内禁止再次领养哦...`);
    }
    return ret;
}

// 宠物 help 指令
const cmdPetHelp = seal.ext.newCmdItemInfo();
cmdPetHelp.name = "宠物";
cmdPetHelp.help = `.宠物 help 查看所有宠物指令的帮助信息`;
cmdPetHelp.solve = (ctx, msg, argv) => {
    randomDecreaseAttributes();
    const ret = seal.ext.newCmdExecuteResult(true);
    let helpMsg = "以下是所有宠物指令的帮助信息：\n";
    const commands = [cmdAdopt, cmdCheckPet, cmdFeed, cmdRenamePet, cmdBattle, cmdHospital, cmdAdventure, cmdRetrievePet, cmdReleasePet];
    commands.forEach(cmd => {
        helpMsg += `${cmd.name}: ${cmd.help}\n`;
    });
    seal.replyToSender(ctx, msg, helpMsg);
    return ret;
};

const cmdReleasePet = seal.ext.newCmdItemInfo();
cmdReleasePet.name = "放生";
cmdReleasePet.help = `.放生 放生你当前的宠物`;
cmdReleasePet.solve = (ctx, msg, argv) => {
    randomDecreaseAttributes();
    const ret = seal.ext.newCmdExecuteResult(true);
    const userId = ctx.player.userId;
    const pet = petData[userId];
    if (!pet) {
        if (petRunawayData[userId]) {
            const runawayTime = petRunawayData[userId];
            const now = Date.now();
            const elapsed = (now - runawayTime) / (1000 * 60 * 60);
            if (elapsed < 24) {
                const remaining = 24 - elapsed;
                seal.replyToSender(ctx, msg, `你的宠物 ${petData[userId]?.customName || "它"} 因为伙食不好待遇不好心情不好离家出走了\n还需等待约 ${remaining.toFixed(1)} 小时才能再次领养或可以尝试寻回哦？`);
            } else {
                delete petRunawayData[userId];
                saveData(petData, petDeathData, petRunawayData, petReleaseData);
                seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
            }
        } else {
            seal.replyToSender(ctx, msg, "你还没有领养宠物呢，先使用 .领养宠物 指令领养一只吧。");
        }
        return ret;
    }
    // 记录放生时间
    petReleaseData[userId] = Date.now();
    // 删除宠物数据
    delete petData[userId];
    saveData(petData, petDeathData, petRunawayData, petReleaseData);
    seal.replyToSender(ctx, msg, `你已经成功放生了 ${pet.customName}，希望它在野外能顺利的活下去...`);
    return ret;
}

// 注册指令
ext.cmdMap["领养宠物"] = cmdAdopt;
ext.cmdMap["查看宠物"] = cmdCheckPet;
ext.cmdMap["喂养宠物"] = cmdFeed;
ext.cmdMap["给宠物改名"] = cmdRenamePet;
ext.cmdMap["战斗"] = cmdBattle;
ext.cmdMap["送医院"] = cmdHospital;
ext.cmdMap["冒险"] = cmdAdventure;
ext.cmdMap["寻回宠物"] = cmdRetrievePet;
ext.cmdMap["宠物"] = cmdPetHelp;
ext.cmdMap["放生"] = cmdReleasePet;