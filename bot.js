const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// =====================================================
// 👑 KINGDOM WARS
// لعبة ممالك وحروب - نسخة V1
// =====================================================

// -------------------------
// إعدادات
// -------------------------

const DATA_FILE = './kingdom_data.json';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: 'C:\\Users\\HP PRO\\.cache\\puppeteer\\chrome\\win64-146.0.7680.31\\chrome-win64\\chrome.exe',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

// -------------------------
// تحميل / حفظ البيانات
// -------------------------

let game = {
    players: {},
    alliances: {},
    kingdoms: {}
};

function loadGame() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            game = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

            if (!game.players) game.players = {};
            if (!game.alliances) game.alliances = {};
            if (!game.kingdoms) game.kingdoms = {};
        }
    } catch (error) {
        console.log('❌ خطأ في تحميل البيانات:', error.message);
    }
}

function saveGame() {
    try {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(game, null, 2),
            'utf8'
        );
    } catch (error) {
        console.log('❌ خطأ في حفظ البيانات:', error.message);
    }
}

loadGame();

// -------------------------
// أدوات مساعدة
// -------------------------

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getUserId(message) {
    return message.author || message.from;
}

function getPlayer(message) {
    return game.players[getUserId(message)];
}

function getPlayerById(id) {
    return game.players[id];
}

function playerName(player) {
    return player.name || 'لاعب';
}

function formatNumber(number) {
    return Number(number || 0).toLocaleString('en-US');
}

function xpNeeded(level) {
    return 100 + ((level - 1) * 75);
}

function totalPower(player) {
    return (
        player.soldiers * 2 +
        player.archers * 3 +
        player.cavalry * 5 +
        player.guardians * 6 +
        player.castleLevel * 50 +
        player.level * 20
    );
}

function kingdomScore(player) {
    return (
        totalPower(player) +
        player.gold / 10 +
        player.wood / 5 +
        player.stone / 5 +
        player.land * 25
    );
}

function addXP(player, amount) {
    player.xp += amount;

    let levels = 0;

    while (player.xp >= xpNeeded(player.level)) {
        player.xp -= xpNeeded(player.level);
        player.level++;
        player.maxEnergy += 10;
        player.energy = player.maxEnergy;
        player.gold += 300;
        levels++;
    }

    return levels;
}

function hasResources(player, cost) {
    return (
        player.gold >= (cost.gold || 0) &&
        player.food >= (cost.food || 0) &&
        player.wood >= (cost.wood || 0) &&
        player.stone >= (cost.stone || 0)
    );
}

function removeResources(player, cost) {
    player.gold -= cost.gold || 0;
    player.food -= cost.food || 0;
    player.wood -= cost.wood || 0;
    player.stone -= cost.stone || 0;
}

function mentionName(message) {
    const mentioned = message.mentionedIds || [];

    if (!mentioned.length) return null;

    return mentioned[0];
}

// -------------------------
// إنشاء لاعب
// -------------------------

function createPlayer(message) {
    const id = getUserId(message);

    return {
        id,
        name: message._data?.notifyName || 'لاعب',

        kingdomName: `مملكة ${message._data?.notifyName || 'المجهول'}`,

        level: 1,
        xp: 0,

        gold: 1000,
        food: 500,
        wood: 500,
        stone: 300,

        energy: 100,
        maxEnergy: 100,

        castleLevel: 1,

        soldiers: 10,
        archers: 0,
        cavalry: 0,
        guardians: 0,

        land: 1,

        farms: 1,
        mines: 1,
        lumbermills: 1,
        quarries: 1,
        barracks: 1,
        walls: 1,

        attackWins: 0,
        attackLosses: 0,

        defenseWins: 0,
        defenseLosses: 0,

        kills: 0,
        battles: 0,

        protectedUntil: 0,

        lastDaily: 0,
        lastWork: 0,
        lastCollect: 0,

        allianceId: null,

        inventory: {
            healthPotion: 0,
            attackBoost: 0,
            defenseBoost: 0
        },

        quests: {
            training: 0,
            battles: 0,
            buildings: 0,
            collected: 0
        }
    };
}

// =====================================================
// BOT EVENTS
// =====================================================

client.on('qr', (qr) => {
    console.log('\n📱 امسح QR من واتساب:\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n================================');
    console.log('👑 KINGDOM WARS ONLINE');
    console.log('⚔️ اللعبة جاهزة!');
    console.log('================================\n');
});

client.on('authenticated', () => {
    console.log('✅ تم تسجيل الدخول إلى WhatsApp');
});

client.on('auth_failure', (message) => {
    console.log('❌ فشل تسجيل الدخول:', message);
});

client.on('disconnected', (reason) => {
    console.log('⚠️ تم فصل البوت:', reason);
});

// =====================================================
// استقبال الرسائل
// =====================================================

client.on('message', async (message) => {

    try {

        const text = (message.body || '').trim();

        if (!text.startsWith('/')) return;

        const parts = text.split(/\s+/);

        const command = parts[0].toLowerCase();

        const args = parts.slice(1);

        const userId = getUserId(message);

        let player = getPlayer(message);

        // =================================================
        // /مساعدة
        // =================================================

        if (command === '/مساعدة' || command === '/الاوامر') {

            await message.reply(
`👑 *KINGDOM WARS*

🏰 المملكة
/ابدأ
/مملكتي
/مواردي
/ترتيب

💰 الاقتصاد
/جمع
/عمل
/يومي

🏗️ البناء
/المباني
/بناء مزرعة
/بناء منجم
/بناء منشرة
/بناء محجر
/بناء ثكنة
/بناء سور
/تطوير_القلعة

⚔️ الجيش
/جيشي
/تدريب جندي 10
/تدريب رامي 5
/تدريب فارس 2
/تدريب حارس 2

⚔️ الحرب
/هجوم @اللاعب
/استطلاع @اللاعب
/سجل_الحروب
/حماية

🗺️ الأراضي
/الخريطة
/استكشاف

🛒 المتجر
/متجر
/شراء جرعة
/شراء تعزيز_هجوم
/شراء تعزيز_دفاع

🎯 المهام
/مهام

🤝 التحالفات
/إنشاء_تحالف اسم
/انضمام_تحالف @اللاعب
/تحالف
/مغادرة_تحالف

🎮 أوامر إضافية
/قوة
/احصائيات
/حفظ

🔥 هدفك:
طوّر مملكتك، ابنِ جيشك، كوّن تحالفات، وكن أقوى حاكم في المجموعة!`
            );

            return;
        }

        // =================================================
        // /ابدأ
        // =================================================

        if (command === '/ابدأ') {

            if (player) {
                await message.reply(
                    '⚠️ عندك مملكة بالفعل!\n\nاكتب /مملكتي لعرضها.'
                );
                return;
            }

            player = createPlayer(message);

            game.players[userId] = player;

            saveGame();

            await message.reply(
`👑 *تم إنشاء مملكتك!*

🏰 ${player.kingdomName}

⭐ المستوى: 1
✨ XP: 0/100

💰 الذهب: 1,000
🌾 الطعام: 500
🪵 الخشب: 500
🪨 الحجر: 300

⚔️ الجيش:
🗡️ جنود: 10
🏹 رماة: 0
🐎 فرسان: 0
🛡️ حراس: 0

🌍 الأراضي: 1

🔥 مهمتك:
اجمع الموارد، طوّر القلعة، درّب الجيش، واهزم منافسيك!

اكتب:
/مملكتي`
            );

            return;
        }

        // جميع الأوامر بعد هذا تحتاج لاعب
        if (!player) {

            await message.reply(
                '❌ ليس لديك مملكة.\n\nاكتب /ابدأ أولًا 👑'
            );

            return;
        }

        // =================================================
        // /مملكتي
        // =================================================

        if (command === '/مملكتي') {

            const power = totalPower(player);

            await message.reply(
`👑 *${player.kingdomName}*

⭐ المستوى: ${player.level}
✨ XP: ${player.xp}/${xpNeeded(player.level)}

🏰 القلعة: مستوى ${player.castleLevel}

💰 الذهب: ${formatNumber(player.gold)}
🌾 الطعام: ${formatNumber(player.food)}
🪵 الخشب: ${formatNumber(player.wood)}
🪨 الحجر: ${formatNumber(player.stone)}

⚡ الطاقة: ${player.energy}/${player.maxEnergy}

⚔️ الجيش:
🗡️ جنود: ${player.soldiers}
🏹 رماة: ${player.archers}
🐎 فرسان: ${player.cavalry}
🛡️ حراس: ${player.guardians}

🌍 الأراضي: ${player.land}

💪 قوة المملكة: ${formatNumber(power)}

🏆 الانتصارات: ${player.attackWins}
💀 الخسائر: ${player.attackLosses}`
            );

            return;
        }

        // =================================================
        // /مواردي
        // =================================================

        if (command === '/مواردي') {

            await message.reply(
`💰 *موارد ${player.kingdomName}*

💰 الذهب: ${formatNumber(player.gold)}
🌾 الطعام: ${formatNumber(player.food)}
🪵 الخشب: ${formatNumber(player.wood)}
🪨 الحجر: ${formatNumber(player.stone)}

⚡ الطاقة: ${player.energy}/${player.maxEnergy}`
            );

            return;
        }

        // =================================================
        // /قوة
        // =================================================

        if (command === '/قوة') {

            await message.reply(
`⚔️ *قوة المملكة*

👑 ${player.kingdomName}

💪 القوة الإجمالية:
${formatNumber(totalPower(player))}

🗡️ الجنود: ${player.soldiers}
🏹 الرماة: ${player.archers}
🐎 الفرسان: ${player.cavalry}
🛡️ الحراس: ${player.guardians}

🏰 القلعة: ${player.castleLevel}`
            );

            return;
        }

        // =================================================
        // /جمع
        // =================================================

        if (command === '/جمع') {

            const now = Date.now();

            if (now - player.lastCollect < 60 * 1000) {

                const remaining = Math.ceil(
                    (60 * 1000 - (now - player.lastCollect)) / 1000
                );

                await message.reply(
                    `⏳ انتظر ${remaining} ثانية قبل جمع الموارد مرة أخرى.`
                );

                return;
            }

            const gold = random(100, 250) + player.mines * 30;
            const food = random(100, 250) + player.farms * 40;
            const wood = random(80, 180) + player.lumbermills * 30;
            const stone = random(50, 150) + player.quarries * 25;

            player.gold += gold;
            player.food += food;
            player.wood += wood;
            player.stone += stone;

            player.lastCollect = now;

            player.quests.collected++;

            saveGame();

            await message.reply(
`⛏️ *تم جمع الموارد!*

💰 +${gold} ذهب
🌾 +${food} طعام
🪵 +${wood} خشب
🪨 +${stone} حجر`
            );

            return;
        }

        // =================================================
        // /عمل
        // =================================================

        if (command === '/عمل') {

            const now = Date.now();

            if (now - player.lastWork < 5 * 60 * 1000) {

                const remaining = Math.ceil(
                    (5 * 60 * 1000 - (now - player.lastWork)) / 60000
                );

                await message.reply(
                    `⏳ يمكنك العمل مرة أخرى بعد حوالي ${remaining} دقيقة.`
                );

                return;
            }

            const reward = random(200, 500) + player.level * 50;

            player.gold += reward;
            player.lastWork = now;

            addXP(player, 25);

            saveGame();

            await message.reply(
`💼 *تم العمل!*

💰 حصلت على ${reward} ذهب
✨ +25 XP`
            );

            return;
        }

        // =================================================
        // /يومي
        // =================================================

        if (command === '/يومي') {

            const now = Date.now();

            if (now - player.lastDaily < 24 * 60 * 60 * 1000) {

                await message.reply(
                    '🎁 استلمت مكافأتك اليومية بالفعل.\nارجع غدًا!'
                );

                return;
            }

            const reward = 500 + player.level * 100;

            player.gold += reward;
            player.food += 200;

            player.lastDaily = now;

            addXP(player, 50);

            saveGame();

            await message.reply(
`🎁 *المكافأة اليومية!*

💰 +${reward} ذهب
🌾 +200 طعام
✨ +50 XP

ارجع غدًا لتحصل على مكافأة جديدة!`
            );

            return;
        }

        // =================================================
        // /المباني
        // =================================================

        if (command === '/المباني') {

            await message.reply(
`🏗️ *مباني ${player.kingdomName}*

🌾 المزارع: ${player.farms}
⛏️ المناجم: ${player.mines}
🪵 المناشر: ${player.lumbermills}
🪨 المحاجر: ${player.quarries}
⚔️ الثكنات: ${player.barracks}
🛡️ الأسوار: ${player.walls}

🏰 القلعة: مستوى ${player.castleLevel}

استخدم:
 /بناء مزرعة
 /بناء منجم
 /بناء منشرة
 /بناء محجر
 /بناء ثكنة
 /بناء سور`
            );

            return;
        }

        // =================================================
        // /بناء
        // =================================================

        if (command === '/بناء') {

            const building = args[0];

            if (!building) {

                await message.reply(
`🏗️ اختر مبنى:

/بناء مزرعة
/بناء منجم
/بناء منشرة
/بناء محجر
/بناء ثكنة
/بناء سور`
                );

                return;
            }

            const costs = {

                'مزرعة': {
                    gold: 150,
                    wood: 100,
                    stone: 50
                },

                'منجم': {
                    gold: 200,
                    wood: 100,
                    stone: 100
                },

                'منشرة': {
                    gold: 180,
                    wood: 100,
                    stone: 50
                },

                'محجر': {
                    gold: 200,
                    wood: 100,
                    stone: 100
                },

                'ثكنة': {
                    gold: 500,
                    wood: 300,
                    stone: 200
                },

                'سور': {
                    gold: 400,
                    wood: 200,
                    stone: 400
                }

            };

            if (!costs[building]) {

                await message.reply(
                    '❌ هذا المبنى غير موجود.'
                );

                return;
            }

            const cost = costs[building];

            if (!hasResources(player, cost)) {

                await message.reply(
`❌ موارد غير كافية!

💰 تحتاج: ${cost.gold || 0}
🪵 تحتاج: ${cost.wood || 0}
🪨 تحتاج: ${cost.stone || 0}`
                );

                return;
            }

            removeResources(player, cost);

            if (building === 'مزرعة') player.farms++;
            if (building === 'منجم') player.mines++;
            if (building === 'منشرة') player.lumbermills++;
            if (building === 'محجر') player.quarries++;
            if (building === 'ثكنة') player.barracks++;
            if (building === 'سور') player.walls++;

            player.quests.buildings++;

            const levels = addXP(player, 50);

            saveGame();

            await message.reply(
`🏗️ *تم بناء ${building}!*

🏰 ${player.kingdomName}

✨ +50 XP
${levels > 0 ? `🎉 ارتفع مستواك إلى ${player.level}!` : ''}`
            );

            return;
        }

        // =================================================
        // /تطوير_القلعة
        // =================================================

        if (command === '/تطوير_القلعة') {

            const level = player.castleLevel;

            const cost = {
                gold: 500 * level,
                wood: 300 * level,
                stone: 500 * level
            };

            if (!hasResources(player, cost)) {

                await message.reply(
`🏰 تطوير القلعة إلى المستوى ${level + 1}

التكلفة:

💰 ${cost.gold}
🪵 ${cost.wood}
🪨 ${cost.stone}

❌ مواردك غير كافية.`
                );

                return;
            }

            removeResources(player, cost);

            player.castleLevel++;

            player.maxEnergy += 10;
            player.energy = player.maxEnergy;

            addXP(player, 150);

            saveGame();

            await message.reply(
`🏰🔥 *تم تطوير القلعة!*

المستوى الجديد:
⭐ ${player.castleLevel}

⚡ زادت الطاقة القصوى
💪 زادت قوة المملكة
✨ +150 XP`
            );

            return;
        }

        // =================================================
        // /جيشي
        // =================================================

        if (command === '/جيشي') {

            await message.reply(
`⚔️ *جيش ${player.kingdomName}*

🗡️ جنود: ${player.soldiers}
🏹 رماة: ${player.archers}
🐎 فرسان: ${player.cavalry}
🛡️ حراس: ${player.guardians}

💪 القوة العسكرية:
${formatNumber(totalPower(player))}`
            );

            return;
        }

        // =================================================
        // /تدريب
        // =================================================

        if (command === '/تدريب') {

            const type = args[0];
            const amount = parseInt(args[1]);

            if (!type || !amount || amount <= 0) {

                await message.reply(
`⚔️ طريقة التدريب:

/تدريب جندي 10
/تدريب رامي 5
/تدريب فارس 2
/تدريب حارس 2`
                );

                return;
            }

            if (amount > 1000) {

                await message.reply(
                    '❌ الحد الأقصى للتدريب في المرة الواحدة هو 1000.'
                );

                return;
            }

            const costs = {

                'جندي': {
                    gold: 20,
                    food: 10
                },

                'رامي': {
                    gold: 35,
                    food: 15,
                    wood: 5
                },

                'فارس': {
                    gold: 80,
                    food: 30,
                    wood: 10
                },

                'حارس': {
                    gold: 100,
                    food: 40,
                    stone: 10
                }

            };

            if (!costs[type]) {

                await message.reply(
                    '❌ نوع الجندي غير موجود.'
                );

                return;
            }

            const unitCost = costs[type];

            const cost = {

                gold: (unitCost.gold || 0) * amount,
                food: (unitCost.food || 0) * amount,
                wood: (unitCost.wood || 0) * amount,
                stone: (unitCost.stone || 0) * amount

            };

            if (!hasResources(player, cost)) {

                await message.reply(
`❌ موارد غير كافية!

💰 الذهب المطلوب: ${formatNumber(cost.gold)}
🌾 الطعام المطلوب: ${formatNumber(cost.food)}`
                );

                return;
            }

            removeResources(player, cost);

            if (type === 'جندي') player.soldiers += amount;
            if (type === 'رامي') player.archers += amount;
            if (type === 'فارس') player.cavalry += amount;
            if (type === 'حارس') player.guardians += amount;

            player.quests.training += amount;

            const xp = amount * 5;
            const levels = addXP(player, xp);

            saveGame();

            await message.reply(
`⚔️ *تم التدريب!*

👤 النوع: ${type}
🔢 العدد: ${amount}

✨ +${xp} XP

${levels > 0 ? `🎉 ارتفع مستواك إلى ${player.level}!` : ''}

💪 قوة جيشك الآن:
${formatNumber(totalPower(player))}`
            );

            return;
        }

        // =================================================
        // /استطلاع
        // =================================================

        if (command === '/استطلاع') {

            const targetId = mentionName(message);

            if (!targetId) {

                await message.reply(
                    '🔎 استخدم الأمر مع منشن اللاعب:\n/استطلاع @اللاعب'
                );

                return;
            }

            const target = getPlayerById(targetId);

            if (!target) {

                await message.reply(
                    '❌ اللاعب لا يملك مملكة.'
                );

                return;
            }

            await message.reply(
`🔎 *تقرير الاستطلاع*

🏰 ${target.kingdomName}

⭐ المستوى: ${target.level}
🏰 القلعة: ${target.castleLevel}

⚔️ القوة التقريبية:
${formatNumber(Math.floor(totalPower(target) * random(80, 110) / 100))}

🌍 الأراضي: ${target.land}

🛡️ مستوى السور:
${target.walls}

⚠️ معلومات الجيش الدقيقة غير مكشوفة.`
            );

            return;
        }

        // =================================================
        // /حماية
        // =================================================

        if (command === '/حماية') {

            if (player.gold < 300) {

                await message.reply(
                    '❌ تحتاج 300 ذهب لشراء حماية.'
                );

                return;
            }

            player.gold -= 300;

            player.protectedUntil =
                Date.now() + 30 * 60 * 1000;

            saveGame();

            await message.reply(
`🛡️ *تم تفعيل حماية المملكة!*

⏳ الحماية: 30 دقيقة

خلال هذه المدة لا يمكن للاعبين مهاجمتك.`
            );

            return;
        }

        // =================================================
        // /هجوم
        // =================================================

        if (command === '/هجوم') {

            const targetId = mentionName(message);

            if (!targetId) {

                await message.reply(
                    '⚔️ استخدم:\n/هجوم @اللاعب'
                );

                return;
            }

            if (targetId === userId) {

                await message.reply(
                    '😂 لا يمكنك مهاجمة نفسك.'
                );

                return;
            }

            const target = getPlayerById(targetId);

            if (!target) {

                await message.reply(
                    '❌ هذا اللاعب ليس لديه مملكة.'
                );

                return;
            }

            if (target.protectedUntil > Date.now()) {

                await message.reply(
`🛡️ هذه المملكة تحت الحماية!

لا يمكنك مهاجمتها الآن.`
                );

                return;
            }

            if (player.energy < 20) {

                await message.reply(
                    '⚡ طاقتك غير كافية. تحتاج 20 طاقة للهجوم.'
                );

                return;
            }

            if (player.soldiers + player.archers +
                player.cavalry + player.guardians <= 0) {

                await message.reply(
                    '❌ ليس لديك جيش.'
                );

                return;
            }

            player.energy -= 20;

            player.battles++;
            target.battles++;

            const attackerPower =
                totalPower(player) *
                random(85, 115) / 100;

            const defenderPower =
                totalPower(target) *
                random(85, 115) / 100;

            const attackerWon =
                attackerPower > defenderPower;

            let report = '';

            if (attackerWon) {

                player.attackWins++;
                target.defenseLosses++;

                const lootGold =
                    Math.min(
                        target.gold,
                        Math.floor(random(50, 200) + target.gold * 0.08)
                    );

                const lootFood =
                    Math.min(
                        target.food,
                        Math.floor(random(30, 120))
                    );

                target.gold -= lootGold;
                target.food -= lootFood;

                player.gold += lootGold;
                player.food += lootFood;

                const xp = 100 + target.level * 20;

                const levels = addXP(player, xp);

                player.kills += random(1, 5);

                report =
`🏆 *انتصرت في المعركة!*

⚔️ قوتك: ${Math.floor(attackerPower)}
🛡️ قوة الخصم: ${Math.floor(defenderPower)}

💰 الغنيمة:
💰 +${lootGold} ذهب
🌾 +${lootFood} طعام

✨ +${xp} XP

${levels > 0 ? `🎉 وصلت للمستوى ${player.level}!` : ''}`;

            } else {

                player.attackLosses++;
                target.defenseWins++;

                const lossSoldiers =
                    Math.min(
                        player.soldiers,
                        random(1, Math.max(1, Math.floor(player.soldiers * 0.15)))
                    );

                player.soldiers -= lossSoldiers;

                const defenderXP = 75 + player.level * 10;

                addXP(target, defenderXP);

                report =
`💀 *خسرت المعركة!*

⚔️ قوتك: ${Math.floor(attackerPower)}
🛡️ قوة الخصم: ${Math.floor(defenderPower)}

💔 خسرت ${lossSoldiers} من الجنود.

🏰 المدافع حصل على ${defenderXP} XP.`;
            }

            saveGame();

            await message.reply(
`⚔️🔥 *معركة ممالك!*

👑 ${player.kingdomName}
VS
👑 ${target.kingdomName}

${report}`
            );

            return;
        }

        // =================================================
        // /سجل_الحروب
        // =================================================

        if (command === '/سجل_الحروب') {

            await message.reply(
`📜 *سجل الحروب*

⚔️ المعارك: ${player.battles}

🏆 انتصارات: ${player.attackWins}
💀 خسائر: ${player.attackLosses}

🛡️ انتصارات دفاعية: ${player.defenseWins}
💥 هزائم دفاعية: ${player.defenseLosses}

☠️ إسقاطات: ${player.kills}`
            );

            return;
        }

        // =================================================
        // /الخريطة
        // =================================================

        if (command === '/الخريطة') {

            const players = Object.values(game.players)
                .sort((a, b) => kingdomScore(b) - kingdomScore(a))
                .slice(0, 10);

            let map = '🗺️ *خريطة الممالك*\n\n';

            players.forEach((p, index) => {

                map +=
`${index + 1}. 👑 ${p.kingdomName}
   💪 ${formatNumber(totalPower(p))}
   🌍 ${p.land} أرض\n\n`;

            });

            await message.reply(map);

            return;
        }

        // =================================================
        // /استكشاف
        // =================================================

        if (command === '/استكشاف') {

            if (player.energy < 10) {

                await message.reply(
                    '⚡ تحتاج 10 طاقة للاستكشاف.'
                );

                return;
            }

            player.energy -= 10;

            const event = random(1, 5);

            let result = '';

            if (event === 1) {

                const gold = random(100, 400);

                player.gold += gold;

                result =
`🗺️ وجدت كنزًا!
💰 +${gold} ذهب`;

            }

            else if (event === 2) {

                const food = random(100, 300);

                player.food += food;

                result =
`🌾 وجدت أرضًا زراعية!
🌾 +${food} طعام`;

            }

            else if (event === 3) {

                player.land++;

                result =
`🌍 اكتشفت أرضًا جديدة!
+1 أرض`;

            }

            else if (event === 4) {

                const xp = 100;

                addXP(player, xp);

                result =
`📜 اكتشفت أطلالًا قديمة!
✨ +${xp} XP`;

            }

            else {

                const damage = random(1, 3);

                player.soldiers =
                    Math.max(0, player.soldiers - damage);

                result =
`👹 تعرضت لكمين!
💔 خسرت ${damage} جنود.`;
            }

            saveGame();

            await message.reply(
`🧭 *رحلة استكشاف*

${result}`
            );

            return;
        }

        // =================================================
        // /ترتيب
        // =================================================

        if (command === '/ترتيب') {

            const players = Object.values(game.players)
                .sort((a, b) => kingdomScore(b) - kingdomScore(a));

            if (players.length === 0) {

                await message.reply(
                    'لا توجد ممالك بعد.'
                );

                return;
            }

            let text =
`🏆 *ترتيب أقوى الممالك*

`;

            players.slice(0, 10).forEach((p, index) => {

                const medal =
                    index === 0 ? '🥇' :
                    index === 1 ? '🥈' :
                    index === 2 ? '🥉' :
                    `${index + 1}.`;

                text +=
`${medal} ${p.kingdomName}
⭐ المستوى: ${p.level}
💪 القوة: ${formatNumber(totalPower(p))}
🌍 الأراضي: ${p.land}

`;

            });

            await message.reply(text);

            return;
        }

        // =================================================
        // /احصائيات
        // =================================================

        if (command === '/احصائيات') {

            const allPlayers = Object.values(game.players);

            const totalPlayers = allPlayers.length;

            const totalGold = allPlayers.reduce(
                (sum, p) => sum + p.gold,
                0
            );

            const totalArmies = allPlayers.reduce(
                (sum, p) =>
                    sum +
                    p.soldiers +
                    p.archers +
                    p.cavalry +
                    p.guardians,
                0
            );

            await message.reply(
`🌍 *إحصائيات العالم*

👑 الممالك: ${totalPlayers}

⚔️ إجمالي الجيوش:
${formatNumber(totalArmies)}

💰 الذهب الموجود:
${formatNumber(totalGold)}

🤝 التحالفات:
${Object.keys(game.alliances).length}`
            );

            return;
        }

        // =================================================
        // /مهام
        // =================================================

        if (command === '/مهام') {

            const trainingTarget = 100;
            const battleTarget = 5;
            const buildingTarget = 10;
            const collectionTarget = 20;

            await message.reply(
`🎯 *مهام المملكة*

⚔️ تدريب الجنود
${Math.min(player.quests.training, trainingTarget)}/${trainingTarget}
🎁 المكافأة: 1,000 ذهب

⚔️ خوض المعارك
${Math.min(player.quests.battles, battleTarget)}/${battleTarget}
🎁 المكافأة: 2,000 ذهب

🏗️ بناء المباني
${Math.min(player.quests.buildings, buildingTarget)}/${buildingTarget}
🎁 المكافأة: 1,500 ذهب

⛏️ جمع الموارد
${Math.min(player.quests.collected, collectionTarget)}/${collectionTarget}
🎁 المكافأة: 1,000 ذهب`
            );

            return;
        }

        // =================================================
        // /متجر
        // =================================================

        if (command === '/متجر') {

            await message.reply(
`🛒 *متجر المملكة*

🧪 جرعة الطاقة
السعر: 300 💰
/شراء جرعة

⚔️ تعزيز هجوم
السعر: 1,000 💰
/شراء تعزيز_هجوم

🛡️ تعزيز دفاع
السعر: 1,000 💰
/شراء تعزيز_دفاع

💰 رصيدك:
${formatNumber(player.gold)}`
            );

            return;
        }

        // =================================================
        // /شراء
        // =================================================

        if (command === '/شراء') {

            const item = args[0];

            if (item === 'جرعة') {

                if (player.gold < 300) {

                    await message.reply(
                        '❌ تحتاج 300 ذهب.'
                    );

                    return;
                }

                player.gold -= 300;
                player.inventory.healthPotion++;

                saveGame();

                await message.reply(
`🧪 تم شراء جرعة طاقة!

📦 الجرعات: ${player.inventory.healthPotion}`
                );

                return;
            }

            if (item === 'تعزيز_هجوم') {

                if (player.gold < 1000) {

                    await message.reply(
                        '❌ تحتاج 1,000 ذهب.'
                    );

                    return;
                }

                player.gold -= 1000;
                player.inventory.attackBoost++;

                saveGame();

                await message.reply(
                    '⚔️ تم شراء تعزيز هجوم!'
                );

                return;
            }

            if (item === 'تعزيز_دفاع') {

                if (player.gold < 1000) {

                    await message.reply(
                        '❌ تحتاج 1,000 ذهب.'
                    );

                    return;
                }

                player.gold -= 1000;
                player.inventory.defenseBoost++;

                saveGame();

                await message.reply(
                    '🛡️ تم شراء تعزيز دفاع!'
                );

                return;
            }

            await message.reply(
`❌ المنتج غير موجود.

اكتب /متجر`
            );

            return;
        }

        // =================================================
        // /إنشاء_تحالف
        // =================================================

        if (command === '/إنشاء_تحالف') {

            const allianceName = args.join(' ');

            if (!allianceName) {

                await message.reply(
                    '🤝 مثال:\n/إنشاء_تحالف أسود الحرب'
                );

                return;
            }

            if (player.allianceId) {

                await message.reply(
                    '❌ أنت بالفعل عضو في تحالف.'
                );

                return;
            }

            const allianceId =
                'A' + Date.now().toString();

            game.alliances[allianceId] = {

                id: allianceId,
                name: allianceName,
                leader: userId,
                members: [userId],
                wars: []

            };

            player.allianceId = allianceId;

            saveGame();

            await message.reply(
`🤝🔥 *تم إنشاء التحالف!*

🛡️ ${allianceName}

👑 القائد:
${playerName(player)}

استخدم:
 /تحالف`
            );

            return;
        }

        // =================================================
        // /تحالف
        // =================================================

        if (command === '/تحالف') {

            if (!player.allianceId) {

                await message.reply(
                    '❌ أنت لست عضوًا في تحالف.'
                );

                return;
            }

            const alliance =
                game.alliances[player.allianceId];

            if (!alliance) {

                player.allianceId = null;

                saveGame();

                await message.reply(
                    '❌ التحالف غير موجود.'
                );

                return;
            }

            let membersText = '';

            alliance.members.forEach((id, index) => {

                const member = getPlayerById(id);

                if (member) {

                    membersText +=
`${index + 1}. ${playerName(member)}\n`;

                }

            });

            await message.reply(
`🛡️ *${alliance.name}*

👑 القائد:
${playerName(getPlayerById(alliance.leader))}

👥 الأعضاء: ${alliance.members.length}

${membersText}`
            );

            return;
        }

        // =================================================
        // /انضمام_تحالف
        // =================================================

        if (command === '/انضمام_تحالف') {

            const targetId = mentionName(message);

            if (!targetId) {

                await message.reply(
                    'استخدم منشن قائد التحالف.'
                );

                return;
            }

            const target = getPlayerById(targetId);

            if (!target || !target.allianceId) {

                await message.reply(
                    '❌ هذا اللاعب ليس قائد تحالف.'
                );

                return;
            }

            if (player.allianceId) {

                await message.reply(
                    '❌ أنت بالفعل عضو في تحالف.'
                );

                return;
            }

            const alliance =
                game.alliances[target.allianceId];

            if (alliance.leader !== targetId) {

                await message.reply(
                    '❌ يجب أن تمنشن قائد التحالف.'
                );

                return;
            }

            alliance.members.push(userId);

            player.allianceId = alliance.id;

            saveGame();

            await message.reply(
`🤝 مرحبًا بك في التحالف!

🛡️ ${alliance.name}`
            );

            return;
        }

        // =================================================
        // /مغادرة_تحالف
        // =================================================

        if (command === '/مغادرة_تحالف') {

            if (!player.allianceId) {

                await message.reply(
                    '❌ أنت لست في تحالف.'
                );

                return;
            }

            const alliance =
                game.alliances[player.allianceId];

            if (alliance && alliance.leader === userId) {

                await message.reply(
                    '❌ قائد التحالف لا يستطيع المغادرة حاليًا.'
                );

                return;
            }

            if (alliance) {

                alliance.members =
                    alliance.members.filter(
                        id => id !== userId
                    );

            }

            player.allianceId = null;

            saveGame();

            await message.reply(
                '🚪 غادرت التحالف.'
            );

            return;
        }

        // =================================================
        // /حفظ
        // =================================================

        if (command === '/حفظ') {

            saveGame();

            await message.reply(
                '💾 تم حفظ جميع بيانات المملكة.'
            );

            return;
        }

        // =================================================
        // أمر غير معروف
        // =================================================

        await message.reply(
`❓ الأمر غير معروف.

اكتب:
/مساعدة

لرؤية جميع أوامر اللعبة.`
        );

    } catch (error) {

        console.log('❌ ERROR:', error);

        try {

            await message.reply(
                '❌ حدث خطأ داخل اللعبة. حاول مرة أخرى.'
            );

        } catch (replyError) {

            console.log(
                '❌ لم أستطع إرسال رسالة الخطأ:',
                replyError.message
            );

        }

    }

});

// =====================================================
// حفظ تلقائي كل دقيقة
// =====================================================

setInterval(() => {

    saveGame();

    console.log('💾 تم الحفظ تلقائيًا.');

}, 60 * 1000);

// =====================================================
// تشغيل البوت
// =====================================================

client.initialize();