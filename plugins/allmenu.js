const { cmd, commands } = require("../arslan");
const moment = require("moment-timezone");
const { fakevCard } = require('../lib/fakevCard');
const path = require('path');
const fs = require('fs');

cmd({
    pattern: "menu",
    alias: ["commandlist", "allmenu", "help"],
    desc: "Fetch and display all available bot commands",
    category: "system",
    filename: __filename,
}, async (conn, mek, m, { reply, userConfig, config }) => {
    try {
        const settings = { ...config, ...(userConfig || {}) };
        const menuCard = settings.MENU_CARD || settings.BOT_NAME || 'ARSLAN-MD BOT';
        const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';
        const channelName = settings.MENU_CHANNEL_NAME || '𝘼𝙧𝙨𝙡𝙖𝙣-𝙈𝘿 𝙈𝙞𝙣𝙞 𝙑²';

        // 1. Fast Command Grouping using Array
        let totalCommands = 0;
        const grouped = {};

        for (let i = 0; i < commands.length; i++) {
            const c = commands[i];
            if (!c || !c.pattern || !c.category) continue;

            totalCommands++;
            if (!grouped[c.category]) grouped[c.category] = [];
            grouped[c.category].push(c.pattern);
        }

        // 2. Optimized Text Generation (Faster than String Concatenation)
        const menuSections = [];
        for (const cat in grouped) {
            const categoryHeader = `\n*╭── 💗 ${cat.toUpperCase()} ⬡───*`;
            const categoryCmds = grouped[cat].map(c => `*├▢* 💫 ${c}`).join("\n");
            const categoryFooter = `*╰──────────────⬣*`;
            
            menuSections.push(`${categoryHeader}\n${categoryCmds}\n${categoryFooter}`);
        }

        const menuText = menuSections.join("\n");
        const time = moment().tz("Africa/Kampala").format("HH:mm:ss");
        const date = moment().tz("Africa/Kampala").format("dddd, MMMM Do YYYY");

        const caption = `*╭━〔 ${menuCard} 〕━━┈⊷*
*├▢* 🪅ᴜsᴇʀ: @${m.sender.split('@')[0]}
*├▢* 🪅ᴄᴏᴍᴍᴀɴᴅs: ${totalCommands}
*├▢* 🪅ᴛɪᴍᴇ: ${time}
*├▢* 🪅ᴅᴀᴛᴇ: ${date}
*├▢* 🪅ᴘʟᴀᴛғᴏʀᴍ: arslanmd.xo.je
*╰──────────────⬣*

*╭── 𝐌𝐄𝐍𝐔 𝐋𝐈𝐒𝐓 ⬡───*
${menuText}

*⚡ ${menuFooter}*
*Ξ sᴇʟᴇᴄᴛ ᴀ ᴄᴀᴛᴇɢᴏʀʏ ᴀʙᴏᴠᴇ*`.trim();

        // Direct path to the local menu image.
        const imagePath = path.join(__dirname, '../media/menu.jpg');
        const image = settings.MENU_IMAGE_URL ||
            (fs.existsSync(imagePath) ? { url: imagePath } : null);

        // 3. Fast Response Message Send
        await conn.sendMessage(m.chat, {
            ...(image ? { image: typeof image === 'string' ? { url: image } : image } : {}),
            caption,
            mentions: [m.sender],
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                mentionedJid: [m.sender],
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363348739987203@newsletter",
                    newsletterName: channelName,
                    serverMessageId: 2,
                },
            },
        }, { quoted: fakevCard });

    } catch (err) {
        console.error("AllMenu Fast Response Error:", err);
        reply("❌ Error while generating menu.");
    }
});
