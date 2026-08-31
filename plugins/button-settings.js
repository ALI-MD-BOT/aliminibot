// ============================================
// ⚙️ BOT SETTINGS - ARSLAN-MD MINI
// 👑 Developer: ᴀʀꜱʟᴀɴ-ᴍᴅ
// 🔥 Dynamic Settings & Stylish Framed Layout
// ============================================

const { cmd } = require('../arslan');
const { updateUserConfig } = require('../lib/database');
const { sendBtns } = require('../lib/buttons');
const { sendToggleButtons } = require('../lib/toggle-buttons');
const { faizan } = require('../lib/style');

const valueOf = (config, key) =>
    String(config?.[key] ?? 'false').toLowerCase() === 'true';

async function save(config, botNumber, key, value) {
    config[key] = value;
    await updateUserConfig(botNumber, { ...config, [key]: value });
}

async function showMode(conn, mek, from, prefix, current, reply, menuFooter) {
    const mode = String(current || 'public').toLowerCase();
    const text = faizan('BOT MODE', mode.toUpperCase(), 'Neeche button par click karke mode change karein');
    
    // Framed fallback text if buttons fail
    const framedFallback = 
        `╭──❍ *⚙️ BOT MODE SETTINGS* ❍──╮\n` +
        `├─ *Current Mode:* ${mode.toUpperCase()}\n` +
        `├─ *Action:* Click button or use:\n` +
        `│ • ${prefix}mode public\n` +
        `│ • ${prefix}mode private\n` +
        `│ • ${prefix}mode groups\n` +
        `│ • ${prefix}mode inbox\n` +
        `╰──────────────────────────╯\n` +
        `👑 *${menuFooter}*`;

    try {
        await sendBtns(conn, from, {
            title: '⚙️ BOT MODE',
            text,
            buttons: [
                { display_text: '🌍 PUBLIC', id: `${prefix}mode public` },
                { display_text: '🔒 PRIVATE', id: `${prefix}mode private` },
                { display_text: '👥 GROUPS', id: `${prefix}mode groups` },
                { display_text: '📥 INBOX', id: `${prefix}mode inbox` }
            ]
        }, mek);
    } catch (_) {
        await reply(framedFallback);
    }
}

cmd({
    pattern: 'mode',
    alias: ['worktype'],
    desc: 'Change bot mode with buttons',
    category: 'settings',
    react: '⚙️'
}, async (conn, mek, m, { from, args, isOwner, botNumber, config, prefix, reply, userConfig }) => {
    
    // ─── SETTINGS CONFIGURATION (Dynamic Sync) ───
    const settings = { ...config, ...(userConfig || {}) };
    const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

    if (!isOwner) return reply(
        `╭─── ❌ *ACCESS DENIED* ───╮\n` +
        `│ Yeh command sirf bot owner ke liye hai.\n` +
        `╰───────────────────────╯`
    );

    const choice = String(args[0] || '').toLowerCase();
    const valid = ['public', 'private', 'groups', 'inbox'];
    
    if (!valid.includes(choice)) {
        return showMode(conn, mek, from, prefix, settings.WORK_TYPE || settings.MODE || 'public', reply, menuFooter);
    }

    await save(settings, botNumber, 'WORK_TYPE', choice);
    
    return reply(
        `╭──❍ *✅ MODE UPDATED* ❍──╮\n` +
        `├─ *New Mode:* ${choice.toUpperCase()}\n` +
        `╰──────────────────────────╯\n` +
        `👑 *${menuFooter}*`
    );
});

for (const item of [
    ['autorecording', 'AUTO_RECORDING', 'AUTO RECORDING'],
    ['autotyping', 'AUTO_TYPING', 'AUTO TYPING'],
    ['autoread', 'READ_MESSAGE', 'AUTO READ'],
    ['autoreact', 'CUSTOM_REACT', 'AUTO REACT'],
    ['autolikestatus', 'AUTO_STATUS_REACT', 'AUTO STATUS REACT'],
    ['anticall', 'ANTI_CALL', 'ANTI CALL']
]) {
    const [command, key, label] = item;
    
    cmd({
        pattern: command,
        desc: `${label} on/off with buttons`,
        category: 'settings',
        filename: __filename
    }, async (conn, mek, m, { from, args, isOwner, botNumber, config, prefix, reply, userConfig }) => {
        
        // ─── SETTINGS CONFIGURATION (Dynamic Sync) ───
        const settings = { ...config, ...(userConfig || {}) };
        const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

        if (!isOwner) return reply(
            `╭─── ❌ *ACCESS DENIED* ───╮\n` +
            `│ Yeh command sirf bot owner ke liye hai.\n` +
            `╰───────────────────────╯`
        );

        const action = String(args[0] || '').toLowerCase();
        
        if (action !== 'on' && action !== 'off') {
            return sendToggleButtons(conn, mek, {
                from, prefix, command, label, current: valueOf(settings, key), reply
            });
        }

        await save(settings, botNumber, key, action === 'on' ? 'true' : 'false');
        
        const statusText = action === 'on' ? '🟢 ENABLED' : '🔴 DISABLED';
        
        return reply(
            `╭──❍ *⚙️ ${label}* ❍──╮\n` +
            `├─ *Status:* ${statusText}\n` +
            `├─ *Setting:* Updated successfully\n` +
            `╰──────────────────────────╯\n` +
            `👑 *${menuFooter}*`
        );
    });
}
