// ============================================
// 👁️ VIEW ONCE RECOVERY - ARSLAN-MD MINI
// 👑 Developer: ᴀʀꜱʟᴀɴ-ᴍᴅ
// 🔥 Dynamic Settings & Stylish Framed Layout
// ============================================

const { cmd } = require('../arslan');
const {
    getContentType,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys');

function unwrapViewOnce(message) {
    let current = message;
    let type = current ? getContentType(current) : null;
    for (let i = 0; i < 3 && current &&
        (type === 'viewOnceMessage' ||
         type === 'viewOnceMessageV2' ||
         type === 'viewOnceMessageV2Extension' ||
         type === 'ephemeralMessage'); i++) {
        current = current[type]?.message;
        type = current ? getContentType(current) : null;
    }
    return { message: current, type };
}

function getBotJid(conn) {
    const rawJid = conn?.user?.id || conn?.user?.jid;
    if (!rawJid) return null;
    const cleanNum = rawJid.split(':')[0].split('@')[0];
    return `${cleanNum}@s.whatsapp.net`;
}

async function downloadMedia(media, type) {
    const mediaType = type.replace('Message', '').toLowerCase();
    const stream = await downloadContentFromMessage(media, mediaType);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

async function recoverViewOnce(conn, m, mode, from, reply, userConfig, config) {
    // ─── SETTINGS CONFIGURATION (Dynamic Menu Sync) ───
    const settings = { ...config, ...(userConfig || {}) };
    const menuCard = settings.MENU_CARD || settings.BOT_NAME || 'ARSLAN-MD BOT';
    const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

    const quoted = m?.quoted?.message;
    if (!quoted) {
        return reply(
            `╭─── ❌ *ERROR* ───╮\n` +
            `│View-once photo/video ko reply karke\n` +
            `╰─────────────────╯\n` +
            `👑 *${menuFooter}*`
        );
    }

    const { message, type } = unwrapViewOnce(quoted);
    if (!message || !type || !['imageMessage', 'videoMessage', 'audioMessage',
        'stickerMessage', 'documentMessage'].includes(type)) {
        return reply(
            `╭─── ❌ *ERROR* ───╮\n` +
            `│ Quoted message valid view-once media nahi hai.\n` +
            `╰─────────────────╯\n` +
            `👑 *${menuFooter}*`
        );
    }

    try {
        const media = message[type];
        const buffer = await downloadMedia(media, type);

        // Build Custom Framed Caption
        const baseCaption = media.caption ? `${media.caption}\n\n` : '';
        const customCaption = `${baseCaption}` +
            `╭──❍ *👁️ ${menuCard}* ❍──╮\n` +
            `├─ *Status:* ✅ Recovered\n` +
            `╰──────────────────────────╯\n` +
            `👑 *${menuFooter}*`;

        const payload = type === 'imageMessage'
            ? { image: buffer, caption: customCaption }
            : type === 'videoMessage'
                ? { video: buffer, caption: customCaption }
                : type === 'audioMessage'
                    ? { audio: buffer, mimetype: media.mimetype, ptt: media.ptt }
                    : type === 'stickerMessage'
                        ? { sticker: buffer }
                        : { document: buffer, mimetype: media.mimetype, fileName: media.fileName || 'view-once-file', caption: customCaption };

        const botJid = getBotJid(conn);
        const destination = mode === 'bot_pm' ? botJid : from;

        if (!destination) return reply(
            `╭─── ❌ *ERROR* ───╮\n` +
            `│ Bot JID fetch nahi ho saka.\n` +
            `╰─────────────────╯\n` +
            `👑 *${menuFooter}*`
        );

        // Send media directly without sending additional text replies
        await conn.sendMessage(destination, payload);

    } catch (error) {
        console.error('[VIEWONCE] Recovery failed:', error);
        return reply(
            `╭─── ❌ *EXPIRED* ───╮\n` +
            `│ View-once media expire ho chuka hai\n` +
            `│ ya download nahi ho saka.\n` +
            `╰───────────────────╯\n` +
            `👑 *${menuFooter}*`
        );
    }
}

cmd({
    pattern: 'vv',
    alias: ['vv1', 'viewonce'],
    desc: 'Recover quoted view-once media to bot own PM silently',
    category: 'owner',
    react: '👁️',
    filename: __filename
}, async (conn, mek, m, { from, reply, isCreator, userConfig, config }) => {
    if (!isCreator) return reply(
        `╭─── ❌ *ACCESS DENIED* ───╮\n` +
        `│ Only bot owner can use this command.\n` +
        `╰───────────────────────╯`
    );
    return recoverViewOnce(conn, m, 'bot_pm', from, reply, userConfig, config);
});

cmd({
    pattern: 'vv2',
    alias: ['viewoncechat'],
    desc: 'Recover quoted view-once media in the same chat silently',
    category: 'owner',
    react: '👁️',
    filename: __filename
}, async (conn, mek, m, { from, reply, isCreator, userConfig, config }) => {
    if (!isCreator) return reply(
        `╭─── ❌ *ACCESS DENIED* ───╮\n` +
        `│ Only bot owner can use this command.\n` +
        `╰───────────────────────╯`
    );
    return recoverViewOnce(conn, m, 'chat', from, reply, userConfig, config);
});
