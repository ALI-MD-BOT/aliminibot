const { cmd } = require('../arslan');
const config = require('../config');
const os = require('os');
const { runtime } = require('../lib/functions');
const { sendBtns } = require('../lib/buttons');

cmd({
    pattern: "ping",
    alias: ["pong", "speed", "lag"],
    desc: "Check bot response speed and status",
    category: "info",
    react: "🏓",
    filename: __filename
}, async (conn, mek, m, { from, reply, isOwner, prefix }) => {
    try {
        const start = Date.now();
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        const end = Date.now();
        const pingTime = end - start;

        const botName = config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃';
        const botNumber = conn.user.id.split(':')[0];
        const ownerNumber = config.OWNER_NUMBER || '923266105873';

        const usedMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
        const cpuUsage = os.loadavg()[0].toFixed(1);
        const uptime = runtime(process.uptime());

        let statusEmoji = "🟢", statusText = "Excellent";
        if (pingTime > 500) { statusEmoji = "🟡"; statusText = "Slow"; }
        else if (pingTime > 200) { statusEmoji = "🟠"; statusText = "Good"; }
        else { statusEmoji = "🟢"; statusText = "Fast"; }

        const message = `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${botName} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ 🏓 𝐑𝐞𝐬𝐩𝐨𝐧𝐬𝐞:* ${pingTime}ms ${statusEmoji}
*│❀ 📊 𝐒𝐭𝐚𝐭𝐮𝐬:* ${statusText}
*│❀ 🤖 𝐁𝐨𝐭:* ${botName}
*│❀ 👤 𝐎𝐰𝐧𝐞𝐫:* ${ownerNumber}
*│❀ 🔢 𝐍𝐮𝐦𝐛𝐞𝐫:* ${botNumber}
*│❀ 💾 𝐑𝐀𝐌:* ${usedMemory}MB / ${totalMemory}GB
*│❀ 🖥️ 𝐂𝐏𝐔:* ${cpuUsage}%
*│❀ ⚙️ 𝐒𝐭𝐚𝐭𝐮𝐬:* 🟢 Online
*│❀ ⏱️ 𝐔𝐩𝐭𝐢𝐦𝐞:* ${uptime}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ${config.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ꜰᴀɪᴢᴀɴ-ᴍᴅ'} ✅`;

        // 4 buttons as requested: alive / uptime / menu (quick replies) + the
        // WhatsApp channel (a real link, so it has to be a cta_url button).
        try {
            await sendBtns(conn, from, {
                title: `🏓 ${botName}`,
                text: message,
                buttons: [
                    { display_text: '💚 𝐀ℓινє', id: `${prefix}alive` },
                    { display_text: '⏱️ 𝐔ρтιмє', id: `${prefix}uptime` },
                    { display_text: '📜 𝐌єɴυ', id: `${prefix}menu` },
                    { display_text: '📢 𝐂нαɴɴєℓ', url: config.CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbC4SGZLSmbRcz85AZ0d' }
                ]
            }, mek);
        } catch (e) {
            await reply(message);
        }

        if (pingTime < 200) await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        else if (pingTime < 500) await conn.sendMessage(from, { react: { text: "⚠️", key: mek.key } });
        else await conn.sendMessage(from, { react: { text: "🐌", key: mek.key } });

    } catch (error) {
        console.error("Ping command error:", error);
        reply(`
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃'} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ ❌ 𝐄𝐫𝐫𝐨𝐫:* ${error.message}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ${config.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ꜰᴀɪᴢᴀɴ-ᴍᴅ'} ❌`);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});
