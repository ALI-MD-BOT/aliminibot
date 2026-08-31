// ============================================
// 🛡️ ANTIDELETE COMMANDS - ARSLAN-MD MINI
// 👑 Developer: ᴀʀꜱʟᴀɴ-ᴍᴅ
// 🔥 Dynamic Settings & Stylish Framed Layout
// ============================================

const { cmd } = require("../arslan");
const {
    updateUserConfigInMongoDB,
    getUserConfigFromMongoDB
} = require('../lib/database');

cmd({
    pattern: "antidelete",
    alias: ["ad", "antidel"],
    desc: "Enable/Disable antidelete feature",
    category: "owner",
    react: "🛡️",
    filename: __filename
}, async (conn, mek, m, {
    from,
    reply,
    args,
    sender,
    isCreator,
    userConfig,
    config
}) => {
    try {
        // ─── SETTINGS CONFIGURATION (Dynamic Sync) ───
        const settings = { ...config, ...(userConfig || {}) };
        const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

        if (!isCreator) return reply(
            `╭─── ❌ *ACCESS DENIED* ───╮\n` +
            `│ Only bot owner can use this command.\n` +
            `╰───────────────────────╯`
        );
        
        const action = args[0]?.toLowerCase();
        if (!action || !['on', 'off', 'enable', 'disable'].includes(action)) {
            return reply(
                `╭──❍ *🛡️ ANTIDELETE SETTINGS* ❍──╮\n` +
                `├─ *Usage:* .antidelete <on/off>\n` +
                `├─ *Example:* .antidelete on\n` +
                `├─ *Status:* ${global.antideleteStatus || 'ON'}\n` +
                `├──────────────────────────\n` +
                `│ ⚠️ Deleted messages will be sent to owner's inbox only.\n` +
                `╰──────────────────────────╯\n` +
                `👑 *${menuFooter}*`
            );
        }
        
        const status = action === 'on' || action === 'enable' ? 'true' : 'false';
        
        const botNumber = String(conn.user?.id || '').split(':')[0].split('@')[0];
        const settingsNumber = botNumber || sender.split('@')[0];
        const saved = await updateUserConfigInMongoDB(settingsNumber, { ANTIDELETE: status });
        if (!saved) return reply(
            `╭─── ❌ *ERROR* ───╮\n` +
            `│ Database save failed. Setting not changed.\n` +
            `╰─────────────────╯`
        );
        
        global.antideleteStatus = status === 'true' ? 'ON' : 'OFF';
        
        return reply(
            `╭──❍ *✅ SUCCESS* ❍──╮\n` +
            `├─ *Antidelete:* ${status === 'true' ? 'ENABLED' : 'DISABLED'}\n` +
            `├─ *Target:* Owner's Inbox Only\n` +
            `╰──────────────────────╯\n` +
            `👑 *${menuFooter}*`
        );
        
    } catch (error) {
        console.error("Antidelete command error:", error);
        reply("❌ Failed to update antidelete settings.");
    }
});

// Anti-delete 2: restore deleted messages in their original chat.
cmd({
    pattern: "antidelete2",
    alias: ["ad2", "antidel2"],
    desc: "Enable/Disable chat restore for deleted messages",
    category: "owner",
    react: "♻️",
    filename: __filename
}, async (conn, mek, m, {
    reply,
    args,
    sender,
    isCreator,
    userConfig,
    config
}) => {
    try {
        // ─── SETTINGS CONFIGURATION (Dynamic Sync) ───
        const settings = { ...config, ...(userConfig || {}) };
        const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

        if (!isCreator) return reply(
            `╭─── ❌ *ACCESS DENIED* ───╮\n` +
            `│ Only bot owner can use this command.\n` +
            `╰───────────────────────╯`
        );

        const action = args[0]?.toLowerCase();
        if (!action || !['on', 'off', 'enable', 'disable'].includes(action)) {
            return reply(
                `╭──❍ *♻️ ANTIDELETE 2 SETTINGS* ❍──╮\n` +
                `├─ *Usage:* .antidelete2 <on/off>\n` +
                `├─ *Example:* .antidelete2 on\n` +
                `├─ *Status:* ${global.antidelete2Status || 'OFF'}\n` +
                `├──────────────────────────\n` +
                `│ ♻️ Deleted messages will be restored in original chat.\n` +
                `╰──────────────────────────╯\n` +
                `👑 *${menuFooter}*`
            );
        }

        const status = action === 'on' || action === 'enable' ? 'true' : 'false';
        const botNumber = String(conn.user?.id || '').split(':')[0].split('@')[0];
        const settingsNumber = botNumber || sender.split('@')[0];
        const saved = await updateUserConfigInMongoDB(settingsNumber, { ANTIDELETE2: status });
        if (!saved) return reply(
            `╭─── ❌ *ERROR* ───╮\n` +
            `│ Database save failed. Setting not changed.\n` +
            `╰─────────────────╯`
        );
        
        global.antidelete2Status = status === 'true' ? 'ON' : 'OFF';

        return reply(
            `╭──❍ *✅ SUCCESS* ❍──╮\n` +
            `├─ *Antidelete 2:* ${status === 'true' ? 'ENABLED' : 'DISABLED'}\n` +
            `├─ *Action:* ${status === 'true' ? 'Restoring in chat' : 'No restore'}\n` +
            `╰──────────────────────╯\n` +
            `👑 *${menuFooter}*`
        );
    } catch (error) {
        console.error("Antidelete 2 command error:", error);
        return reply("❌ Failed to update antidelete 2 settings.");
    }
});

// Command to check antidelete status
cmd({
    pattern: "antidelstatus",
    alias: ["adstatus", "checkad"],
    desc: "Check antidelete status",
    category: "owner",
    react: "📊",
    filename: __filename
}, async (conn, mek, m, {
    from,
    reply,
    sender,
    isCreator,
    userConfig,
    config
}) => {
    try {
        // ─── SETTINGS CONFIGURATION (Dynamic Sync) ───
        const settings = { ...config, ...(userConfig || {}) };
        const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

        if (!isCreator) return reply(
            `╭─── ❌ *ACCESS DENIED* ───╮\n` +
            `│ Only bot owner can use this command.\n` +
            `╰───────────────────────╯`
        );
        
        const botNumber = String(conn.user?.id || '').split(':')[0].split('@')[0];
        const settingsNumber = botNumber || sender.split('@')[0];
        const fetchedConfig = await getUserConfigFromMongoDB(settingsNumber);
        const status = fetchedConfig?.ANTIDELETE || 'true';
        const status2 = fetchedConfig?.ANTIDELETE2 || 'false';
        
        return reply(
            `╭──❍ *📊 ANTIDELETE STATUS* ❍──╮\n` +
            `├─ *Main Status:* ${status === 'true' ? '✅ ENABLED' : '❌ DISABLED'}\n` +
            `├─ *Delivery:* Owner's Inbox Only\n` +
            `├─ *Chat Restore (Anti 2):* ${status2 === 'true' ? '✅ ENABLED' : '❌ DISABLED'}\n` +
            `├─ *Owner:* @${sender.split('@')[0]}\n` +
            `├──────────────────────────\n` +
            `│ *To change:* .antidelete on/off\n` +
            `╰──────────────────────────╯\n` +
            `👑 *${menuFooter}*`,
            { mentions: [sender] }
        );
              
    } catch (error) {
        console.error("Status check error:", error);
        reply("❌ Failed to check status.");
    }
});
