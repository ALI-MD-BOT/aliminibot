// ============================================
// 🔗 ANTI-LINK - ARSLAN-MD MINI (MONGO DB SAVING)
// 👑 Developer: ᴀʀꜱʟᴀɴ-ᴍᴅ
// 🔥 MongoDB Integrated + Multi-Group + Per User
// ============================================

const { cmd } = require('../arslan');
const { updateGroupConfig, getGroupConfig } = require('../lib/database'); 
// ─── ALLOWED DOMAINS ───
const ALLOWED_DOMAINS = [
    'youtube.com',
    'youtu.be',
    'instagram.com',
    'facebook.com',
    'twitter.com',
    'x.com',
    'tiktok.com',
    'github.com',
    'google.com',
    'drive.google.com'
];

// ─── CHECK IF LINK IS ALLOWED ───
function isAllowedLink(url) {
    try {
        const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
        const urlObj = new URL(urlWithProtocol);
        const hostname = urlObj.hostname.toLowerCase();
        return ALLOWED_DOMAINS.some(domain => hostname.includes(domain));
    } catch {
        return false;
    }
}

// ============================================
// 📌 MAIN COMMAND
// ============================================
cmd({
    pattern: "antilink",
    alias: ["al", "nolink", "linkfilter"],
    desc: "🔗 Anti-Link System for groups",
    category: "admin",
    react: "🔗",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, isCreator, reply, args, prefix, userConfig, config }) => {

    // ─── SETTINGS CONFIGURATION (Dynamic Menu Sync) ───
    const settings = { ...config, ...(userConfig || {}) };
    const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

    if (!isGroup) return reply(
        `╭─── ❌ *ERROR* ───╮\n` +
        `│ This command only works in groups.\n` +
        `╰─────────────────╯`
    );
    if (!isAdmins && !isCreator) return reply(
        `╭─── ❌ *ACCESS DENIED* ───╮\n` +
        `│ Admin or Owner role required.\n` +
        `╰───────────────────────╯`
    );

    const groupData = await getGroupConfig(from);
    const action = args[0]?.toLowerCase() || '';
    const actionType = args[1]?.toLowerCase() || 'warn';

    if (!action || (action !== 'on' && action !== 'off')) {
        const status = groupData.antilink ? '🟢 ENABLED' : '🔴 DISABLED';
        const actionMode = groupData.action || 'warn';
        
        return reply(
            `╭──❍ *🔗 ANTI-LINK SYSTEM* ❍──╮\n` +
            `├─ *Status:* ${status}\n` +
            `├─ *Action:* ${actionMode.toUpperCase()}\n` +
            `├──────────────────────────\n` +
            `├─ *Commands Menu:*\n` +
            `│ • ${prefix}antilink on warn\n` +
            `│ • ${prefix}antilink on delete\n` +
            `│ • ${prefix}antilink on kick\n` +
            `│ • ${prefix}antilink off\n` +
            `╰──────────────────────────╯\n` +
            `👑 *${menuFooter}*`
        );
    }

    if (action === 'on') {
        await updateGroupConfig(from, { antilink: true, action: actionType });
        
        const actionMsg = {
            'warn': '⚠️ 3 Warns + Kick on 4th link',
            'delete': '🗑️ Silent delete only',
            'kick': '👢 Instant Kick on 1st link'
        }[actionType] || '⚠️ 3 Warns + Kick on 4th link';

        return reply(
            `╭──❍ *✅ SUCCESS* ❍──╮\n` +
            `├─ *Anti-Link:* Activated\n` +
            `├─ *Mode:* ${actionMsg}\n` +
            `├─ *Database:* MongoDB Saved\n` +
            `╰──────────────────────╯\n` +
            `👑 *${menuFooter}*`
        );

    } else if (action === 'off') {
        await updateGroupConfig(from, { antilink: false });
        
        return reply(
            `╭──❍ *❌ DEACTIVATED* ❍──╮\n` +
            `├─ *Anti-Link Filter:* Off\n` +
            `╰──────────────────────────╯\n` +
            `👑 *${menuFooter}*`
        );
    }
});

// ============================================
// 📌 ANTI-LINK HANDLER (Auto)
// ============================================

cmd({
    on: "body",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isAdmins, isCreator, sender, reply, userConfig, config }) => {

    if (!isGroup) return;

    // ─── SETTINGS CONFIGURATION ───
    const settings = { ...config, ...(userConfig || {}) };
    const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

    // Fetch DB Status for this specific group
    const groupData = await getGroupConfig(from);
    if (!groupData || !groupData.antilink) return;

    // ─── STRICT ADMIN & BOT OWNER CHECK ───
    const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
    const isBotSelf = sender === botNumber || sender === conn.user.id;

    if (isAdmins || isCreator || isBotSelf) return;

    const senderNumber = sender ? sender.split('@')[0] : '';
    const body = mek.message?.conversation || 
                 mek.message?.extendedTextMessage?.text || 
                 mek.message?.imageMessage?.caption || 
                 mek.message?.videoMessage?.caption || '';
    
    if (!body) return;

    // Detect WhatsApp Group Links & General URLs
    const linkRegex = /(https?:\/\/[^\s]+|chat\.whatsapp\.com\/[a-zA-Z0-9]+|wa\.me\/[0-9]+)/gi;
    const matches = body.match(linkRegex);

    if (!matches || matches.length === 0) return;

    // Check if link is allowed
    const isDisallowed = matches.some(link => !isAllowedLink(link));
    if (!isDisallowed) return;

    // ─── 1. DELETE LINK MESSAGE IMMEDIATELY ───
    if (isBotAdmins) {
        try {
            await conn.sendMessage(from, { delete: mek.key });
        } catch (e) {
            console.log('[AntiLink] Delete error:', e.message);
        }
    }

    const action = groupData.action || 'warn';

    // ─── 2. SILENT DELETE MODE ───
    if (action === 'delete') {
        return;
    }

    // ─── 3. INSTANT KICK MODE (Direct Kick on 1st Link) ───
    if (action === 'kick') {
        if (isBotAdmins) {
            try {
                await conn.groupParticipantsUpdate(from, [sender], 'remove');
                
                await conn.sendMessage(from, {
                    text: `╭──❍ *👢 INSTANT KICK* ❍──╮\n` +
                          `├─ *Reason:* Prohibited Link\n` +
                          `├─ *User:* @${senderNumber}\n` +
                          `╰──────────────────────────╯\n` +
                          `👑 *${menuFooter}*`,
                    mentions: [sender]
                });
                return;
            } catch (e) {
                console.log('[AntiLink] Kick error:', e.message);
            }
        } else {
            await conn.sendMessage(from, {
                text: `╭──❍ *⚠️ ANTI-LINK ALERT* ❍──╮\n` +
                      `├─ *User:* @${senderNumber}\n` +
                      `├─ *Notice:* Sent a link!\n` +
                      `├─ *Error:* Bot is not an Admin.\n` +
                      `╰──────────────────────────╯`,
                mentions: [sender]
            });
            return;
        }
    }

    // ─── 4. WARN MODE (3 Warns + Kick on 4th Link) ───
    if (action === 'warn') {
        const currentWarns = groupData.warns instanceof Map ? (groupData.warns.get(senderNumber) || 0) : (groupData.warns?.[senderNumber] || 0);
        const warnCount = currentWarns + 1;
        const maxWarns = 3;

        // Save new warn count to MongoDB
        await updateGroupConfig(from, { [`warns.${senderNumber}`]: warnCount });

        // Kick on 4th Link
        if (warnCount > maxWarns) {
            if (isBotAdmins) {
                try {
                    await conn.groupParticipantsUpdate(from, [sender], 'remove');
                    
                    await conn.sendMessage(from, {
                        text: `╭──❍ *👢 KICKED (MAX WARNS)* ❍──╮\n` +
                              `├─ *Reason:* Too many links\n` +
                              `├─ *Warnings:* ${maxWarns}/${maxWarns}\n` +
                              `├─ *User:* @${senderNumber}\n` +
                              `╰──────────────────────────────╯\n` +
                              `👑 *${menuFooter}*`,
                        mentions: [sender]
                    });

                    await clearUserWarns(from, senderNumber);
                    return;
                } catch (e) {
                    console.log('[AntiLink] Kick error:', e.message);
                }
            } else {
                await conn.sendMessage(from, {
                    text: `╭──❍ *⚠️ MAX WARNS REACHED* ❍──╮\n` +
                          `├─ *User:* @${senderNumber}\n` +
                          `├─ *Warnings:* ${maxWarns}/${maxWarns}\n` +
                          `├─ *Error:* Bot needs admin rights to kick!\n` +
                          `╰──────────────────────────────╯`,
                    mentions: [sender]
                });
                return;
            }
        }

        // Send 1st, 2nd, 3rd Warning Message
        const warnMsg = `╭──❍ *🔗 LINK DETECTED* ❍──╮\n` +
                        `├─ *User:* @${senderNumber}\n` +
                        `├─ *Warnings:* ${warnCount}/${maxWarns}\n` +
                        `╰──────────────────────────────╯\n` +
                        `👑 *${menuFooter}*`;

        await conn.sendMessage(from, {
            text: warnMsg,
            mentions: [sender]
        });
    }
});
