// ============================================
// 📌 PINTEREST IMAGE SEARCH - ARSLAN-MD MINI
// 👑 Developer: ᴀʀꜱʟᴀɴ-ᴍᴅ
// 🔥 Dynamic Settings & Stylish Framed Layout
// ============================================

const { cmd } = require('../arslan');
const axios = require('axios');

cmd({
    pattern: "pinimg",
    alias: ["pinterestimg", "pinimage", "imgpin"],
    desc: "Download images from Pinterest by search query",
    category: "download",
    react: "📌",
    filename: __filename
},
async (conn, mek, m, { from, args, reply, userConfig, config }) => {
    try {
        // ─── SETTINGS CONFIGURATION (Dynamic Menu Sync) ───
        const settings = { ...config, ...(userConfig || {}) };
        const menuCard = settings.MENU_CARD || settings.BOT_NAME || 'ARSLAN-MD BOT';
        const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

        const query = args.join(' ').trim();
        
        if (!query) {
            return reply(
                `╭──❍ *📌 PINTEREST SEARCH* ❍──╮\n` +
                `├─ *Status:* ❌ Error\n` +
                `├─ *Info:* Please provide search query\n` +
                `├─ *Example:* .pinimg cat\n` +
                `╰──────────────────────────╯\n` +
                `👑 *${menuFooter}*`
            );
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // ✅ QASIM API - PINTEREST SEARCH
        const apiUrl = `https://api.qasimdev.dpdns.org/api/pinterest/search?query=${encodeURIComponent(query)}&apiKey=qasim-dev`;
        const response = await axios.get(apiUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.data?.success || !response.data?.data) {
            throw new Error('No images found');
        }

        const images = response.data.data;
        
        if (!images || images.length === 0) {
            return reply(
                `╭──❍ *📌 PINTEREST SEARCH* ❍──╮\n` +
                `├─ *Status:* ❌ No images found\n` +
                `├─ *Query:* "${query}"\n` +
                `╰──────────────────────────╯\n` +
                `👑 *${menuFooter}*`
            );
        }

        const maxImages = Math.min(images.length, 5);
        let validBuffers = [];

        // پہلے 5 درست ایمجز ڈاؤنلوڈ کریں
        for (let i = 0; i < images.length && validBuffers.length < maxImages; i++) {
            try {
                const imageUrl = images[i].images_url;
                if (!imageUrl || !imageUrl.startsWith('http')) continue;

                const imageBuffer = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                }).then(res => Buffer.from(res.data));

                validBuffers.push(imageBuffer);
            } catch (err) {
                continue;
            }
        }

        if (validBuffers.length === 0) {
            return reply(
                `╭─── ❌ *ERROR* ───╮\n` +
                `│ Failed to download images\n` +
                `╰─────────────────╯\n` +
                `👑 *${menuFooter}*`
            );
        }

        // ایمجز بھیجنے کا لوپ
        for (let i = 0; i < validBuffers.length; i++) {
            const isLast = (i === validBuffers.length - 1);
            
            const messageOptions = {
                image: validBuffers[i]
            };

            // صرف آخری ایمج میں فریم کیپشن شامل کریں
            if (isLast) {
                messageOptions.caption = 
                    `╭──❍ *📌 ${menuCard}* ❍──╮\n` +
                    `├─ *Query:* ${query}\n` +
                    `├─ *Category:* Pinterest Search\n` +
                    `├─ *Total Images:* ${validBuffers.length}\n` +
                    `├─ *Status:* ✅ Success\n` +
                    `╰──────────────────────────╯\n` +
                    `👑 *${menuFooter}*`;
            }

            await conn.sendMessage(from, messageOptions, { quoted: mek });
            await new Promise(r => setTimeout(r, 1500));
        }

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error("[PINIMG] Error:", e);
        const errorMsg = e.response?.data?.message || e.message || 'Download failed';
        
        const settings = { ...config, ...(userConfig || {}) };
        const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

        await reply(
            `╭─── ❌ *ERROR* ───╮\n` +
            `│ ${errorMsg}\n` +
            `╰─────────────────╯\n` +
            `👑 *${menuFooter}*`
        );
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});
