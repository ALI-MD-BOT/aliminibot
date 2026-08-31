// ============================================
// 🖼️ IMAGE SEARCH - ARSLAN-MD MINI
// 👑 Developer: ᴀʀꜱʟᴀɴ-ᴍᴅ
// 🔥 Dynamic Settings & Stylish Framed Layout
// ============================================

const { cmd } = require('../arslan');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// =============== FAIZAN API (image search) ===============
const FAIZAN_IMG_API = "https://faizan-api.vercel.app/api/image";

async function searchImages(query) {
    try {
        const res = await axios.get(FAIZAN_IMG_API, {
            params: { q: query },
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const data = res.data;
        if (!data?.success || !Array.isArray(data?.result)) return [];

        // Use thumbnail (direct image URL), filter nulls and broken entries
        return data.result
            .filter(item => item?.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.startsWith('http'))
            .map(item => ({
                url: item.thumbnail,
                title: item.title || query
            }));
    } catch (err) {
        console.error('[IMG] Faizan API error:', err.message);
        return [];
    }
}

// =============== .image — send up to 5 images ===============
cmd({
    pattern: "image",
    alias: ["img", "gimages", "imagesearch", "pic"],
    desc: "Search wallpaper images",
    category: "search",
    react: "🖼️",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, userConfig, config }) => {
    try {
        // ─── SETTINGS CONFIGURATION (Dynamic Menu Sync) ───
        const settings = { ...config, ...(userConfig || {}) };
        const menuCard = settings.MENU_CARD || settings.BOT_NAME || 'ARSLAN-MD BOT';
        const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

        if (!q) {
            return reply(
                `╭──❍ *🖼️ IMAGE SEARCH* ❍──╮\n` +
                `├─ *Status:* ❌ Error\n` +
                `├─ *Info:* Please enter search query\n` +
                `├─ *Example:* .image car\n` +
                `╰──────────────────────────╯\n` +
                `👑 *${menuFooter}*`
            );
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        
        await reply(
            `╭──❍ *🖼️ ${menuCard}* ❍──╮\n` +
            `├─ *Status:* 🔍 Searching...\n` +
            `├─ *Query:* "${q}"\n` +
            `╰──────────────────────────╯\n` +
            `👑 *${menuFooter}*`
        );

        const images = await searchImages(q);

        if (!images || images.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(
                `╭──❍ *🖼️ IMAGE SEARCH* ❍──╮\n` +
                `├─ *Status:* ❌ No images found\n` +
                `├─ *Query:* "${q}"\n` +
                `╰──────────────────────────╯\n` +
                `👑 *${menuFooter}*`
            );
        }

        const maxImages = Math.min(images.length, 5);

        for (let i = 0; i < maxImages; i++) {
            try {
                const caption = i === 0 
                    ? `╭──❍ *🖼️ IMAGE RESULTS* ❍──╮\n` +
                      `├─ *Query:* ${q}\n` +
                      `├─ *Found:* ${images.length} images\n` +
                      `├─ *Status:* ✅ Success\n` +
                      `╰──────────────────────────╯\n` +
                      `👑 *${menuFooter}*`
                    : '';

                await conn.sendMessage(from, {
                    image: { url: images[i].url },
                    caption
                }, { quoted: mek });

                await new Promise(r => setTimeout(r, 1000));
            } catch (e) {
                console.log(`[IMG] Failed to send image ${i + 1}: ${e.message}`);
            }
        }

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error("Image Search Error:", err);
        const settings = { ...config, ...(userConfig || {}) };
        const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';
        
        await reply(
            `╭─── ❌ *ERROR* ───╮\n` +
            `│ ${err.message || 'Failed to search'}\n` +
            `╰─────────────────╯\n` +
            `👑 *${menuFooter}*`
        );
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});

// =============== .image1 — single random image ===============
cmd({
    pattern: "image1",
    alias: ["img1", "randomimg", "pic1"],
    desc: "Get a single random wallpaper image",
    category: "search",
    react: "🖼️",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, userConfig, config }) => {
    try {
        // ─── SETTINGS CONFIGURATION (Dynamic Menu Sync) ───
        const settings = { ...config, ...(userConfig || {}) };
        const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

        if (!q) {
            return reply(
                `╭──❍ *🖼️ RANDOM IMAGE* ❍──╮\n` +
                `├─ *Status:* ❌ Error\n` +
                `├─ *Info:* Please enter search query\n` +
                `├─ *Example:* .image1 cat\n` +
                `╰──────────────────────────╯\n` +
                `👑 *${menuFooter}*`
            );
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const images = await searchImages(q);

        if (!images || images.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(
                `╭──❍ *🖼️ RANDOM IMAGE* ❍──╮\n` +
                `├─ *Status:* ❌ No images found\n` +
                `├─ *Query:* "${q}"\n` +
                `╰──────────────────────────╯\n` +
                `👑 *${menuFooter}*`
            );
        }

        const randomIndex = Math.floor(Math.random() * images.length);
        const image = images[randomIndex];

        await conn.sendMessage(from, {
            image: { url: image.url },
            caption: `╭──❍ *🖼️ RANDOM IMAGE* ❍──╮\n` +
                     `├─ *Query:* ${q}\n` +
                     `├─ *Status:* ✅ Random Result\n` +
                     `╰──────────────────────────╯\n` +
                     `👑 *${menuFooter}*`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error("Random Image Error:", err);
        const settings = { ...config, ...(userConfig || {}) };
        const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';
        
        await reply(
            `╭─── ❌ *ERROR* ───╮\n` +
            `│ ${err.message || 'Failed to search'}\n` +
            `╰─────────────────╯\n` +
            `👑 *${menuFooter}*`
        );
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});
