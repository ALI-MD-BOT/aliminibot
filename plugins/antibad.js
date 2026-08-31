// ============================================
// 🚫 ANTI-BAD WORDS - ARSLAN-MD MINI
// 👑 Developer: ᴀʀꜱʟᴀɴ-ᴍᴅ
// 🔥 Auto delete bad words + MongoDB Integrated
// ============================================

const { cmd } = require('../arslan');
const { updateGroupConfig, getGroupConfig } = require('../lib/database'); 

// ─── BAD WORDS LIST ───
const BAD_WORDS = [
    // English
    'fuck', 'shit', 'bitch', 'asshole', 'damn', 'hell', 'crap',
    'dick', 'pussy', 'cock', 'whore', 'slut', 'bastard', 'motherfucker',
    'nigga', 'nigger', 'retard', 'idiot', 'stupid', 'dumb',
    
    // Urdu/Hindi
    'bhosdi', 'bhosri', 'chutiya', 'chut', 'gand', 'gaand',
    'madarchod', 'behenchod', 'bhenchod', 'lode', 'lund',
    'kutti', 'kutta', 'harami', 'nalayak', 'hijda',
    
    // Roman Urdu
    'bsdk', 'mc', 'bc', 'mkc', 'bkc', 'rndi', 'randi',
    'chutiyapa', 'bhosdike', 'bhosdiwale', 'madarchod',
    'bhenkelode', 'bhenkelund', 'teri maa ki', 'teri behan ki'
];

// ─── BAD WORD PATTERNS (Regex) ───
const BAD_PATTERNS = [
    /f[uck]+/gi,
    /s[h!]?it/gi,
    /b[i!]tch/gi,
    /a[s$]sho[l!]e/gi,
    /b[s$]dk/gi,
    /mc/gi,
    /bc/gi,
    /mkc/gi,
    /bkc/gi,
    /chutiya/gi,
    /g[a@]nd/gi,
    /l[u@]nd/gi,
    /r[a@]ndi/gi,
    /h[a@]rami/gi
];

// ============================================
-- 📌 MAIN COMMAND
// ============================================
cmd({
    pattern: "antibad",
    alias: ["ab", "badword", "filterbad", "badfilter"],
    desc: "🚫 Anti-Bad Words System for groups",
    category: "admin",
    react: "🚫",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, isCreator, reply, args, prefix, userConfig, config }) => {

    // ─── SETTINGS CONFIGURATION (Dynamic Menu Sync) ───
    const settings = { ...config, ...(userConfig || {}) };
    const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

    // ─── CHECK GROUP ───
    if (!isGroup) {
        return reply(
            `╭─── ❌ *ERROR* ───╮\n` +
            `│ This command only works in groups.\n` +
            `╰─────────────────╯`
        );
    }

    // ─── CHECK PERMISSION (Admin or Owner) ───
    if (!isAdmins && !isCreator) {
        return reply(
            `╭─── ❌ *ACCESS DENIED* ───╮\n` +
            `│ Admin or Owner role required.\n` +
            `╰───────────────────────╯`
        );
    }

    const groupData = await getGroupConfig(from);

    // ─── GET ARGUMENTS ───
    const action = args[0]?.toLowerCase() || '';
    const actionType = args[1]?.toLowerCase() || 'warn';

    // ─── SHOW STATUS ───
    if (!action || (action !== 'on' && action !== 'off')) {
        const status = groupData.antibad ? '🟢 ENABLED' : '🔴 DISABLED';
        const actionMode = groupData.badAction || 'warn';
        
        return reply(
            `╭──❍ *🚫 ANTI-BAD FILTER* ❍──╮\n` +
            `├─ *Status:* ${status}\n` +
            `├─ *Action:* ${actionMode.toUpperCase()}\n` +
            `├──────────────────────────\n` +
            `├─ *Commands Menu:*\n` +
            `│ • ${prefix}antibad on warn\n` +
            `│ • ${prefix}antibad on delete\n` +
            `│ • ${prefix}antibad on kick\n` +
            `│ • ${prefix}antibad off\n` +
            `╰──────────────────────────╯\n` +
            `👑 *${menuFooter}*`
        );
    }

    // ─── TOGGLE ON ───
    if (action === 'on') {
        if (actionType === 'kick' && !isBotAdmins) {
            return reply(
                `╭─── ⚠️ *WARNING* ───╮\n` +
                `│ Bot must be admin to use kick action.\n` +
                `╰───────────────────────╯`
            );
        }

        await updateGroupConfig(from, { antibad: true, badAction: actionType });
        
        const actionMsg = {
            'warn': '⚠️ Warn User (3 Warns + Kick)',
            'delete': '🗑️ Delete Message Only',
            'kick': '👢 Instant Kick'
        }[actionType] || '⚠️ Warn User';

        return reply(
            `╭──❍ *✅ SUCCESS* ❍──╮\n` +
            `├─ *Anti-Bad:* Activated\n` +
            `├─ *Mode:* ${actionMsg}\n` +
            `├─ *Database:* MongoDB Saved\n` +
            `╰──────────────────────╯\n` +
            `👑 *${menuFooter}*`
        );

    // ─── TOGGLE OFF ───
    } else if (action === 'off') {
        await updateGroupConfig(from, { antibad: false });
        
        return reply(
            `╭──❍ *❌ DEACTIVATED* ❍──╮\n` +
            `├─ *Anti-Bad Filter:* Off\n` +
            `╰──────────────────────────╯\n` +
            `👑 *${menuFooter}*`
        );
    }
});

// ============================================
// 📌 ANTI-BAD WORDS HANDLER (Auto)
// ============================================

cmd({
    on: "body",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isAdmins, isCreator, sender, reply, userConfig, config }) => {

    if (!isGroup) return;

    // ─── SETTINGS CONFIGURATION ───
    const settings = { ...config, ...(userConfig || {}) };
    const menuFooter = settings.MENU_FOOTER || settings.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ';

    // Fetch DB Status for this group
    const groupData = await getGroupConfig(from);
    if (!groupData || !groupData.antibad) return;

    // Skip Admins, Bot Owner & Bot Self
    const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
    const isBotSelf = sender === botNumber || sender === conn.user.id;

    if (isAdmins || isCreator || isBotSelf) return;

    const senderNumber = sender ? sender.split('@')[0] : '';
    const body = mek.message?.conversation || 
                 mek.message?.extendedTextMessage?.text || 
                 mek.message?.imageMessage?.caption ||
                 mek.message?.videoMessage?.caption || '';
    
    if (!body) return;

    let foundBadWord = false;
    let badWord = '';

    // Check Array List
    for (const word of BAD_WORDS) {
        if (body.toLowerCase().includes(word.toLowerCase())) {
            foundBadWord = true;
            badWord = word;
            break;
        }
    }

    // Check Regex List
    if (!foundBadWord) {
        for (const pattern of BAD_PATTERNS) {
            if (pattern.test(body)) {
                foundBadWord = true;
                badWord = body.match(pattern)?.[0] || 'bad word';
                break;
            }
        }
    }

    if (!foundBadWord) return;

    // Delete Bad Message if Bot is Admin
    if (isBotAdmins) {
        try {
            await conn.sendMessage(from, { delete: mek.key });
        } catch (e) {
            console.log('[AntiBad] Delete error:', e.message);
        }
    }

    const action = groupData.badAction || 'warn';

    // Silent Delete Mode
    if (action === 'delete') {
        return;
    }

    // Instant Kick Mode
    if (action === 'kick') {
        if (isBotAdmins) {
            try {
                await conn.groupParticipantsUpdate(from, [sender], 'remove');
                await conn.sendMessage(from, {
                    text: `╭──❍ *👢 INSTANT KICK* ❍──╮\n` +
                          `├─ *Reason:* Prohibited Word\n` +
                          `├─ *User:* @${senderNumber}\n` +
                          `╰──────────────────────────╯\n` +
                          `👑 *${menuFooter}*`,
                    mentions: [sender]
                });
                return;
            } catch (e) {
                console.log('[AntiBad] Kick error:', e.message);
            }
        } else {
            await conn.sendMessage(from, {
                text: `╭──❍ *⚠️ ANTI-BAD ALERT* ❍──╮\n` +
                      `├─ *User:* @${senderNumber}\n` +
                      `├─ *Notice:* Used bad word!\n` +
                      `├─ *Error:* Bot is not an Admin.\n` +
                      `╰──────────────────────────╯`,
                mentions: [sender]
            });
            return;
        }
    }

    // Warn Mode (MongoDB Save)
    if (action === 'warn') {
        const currentWarns = groupData.badWarns instanceof Map ? (groupData.badWarns.get(senderNumber) || 0) : (groupData.badWarns?.[senderNumber] || 0);
        const warnCount = currentWarns + 1;
        const maxWarns = 3;

        // Save new warn count to MongoDB
        await updateGroupConfig(from, { [`badWarns.${senderNumber}`]: warnCount });

        // Kick on Limit Reached
        if (warnCount > maxWarns) {
            if (isBotAdmins) {
                try {
                    await conn.groupParticipantsUpdate(from, [sender], 'remove');
                    await conn.sendMessage(from, {
                        text: `╭──❍ *👢 KICKED (MAX WARNS)* ❍──╮\n` +
                              `├─ *Reason:* Repeated Bad Words\n` +
                              `├─ *Warnings:* ${maxWarns}/${maxWarns}\n` +
                              `├─ *User:* @${senderNumber}\n` +
                              `╰──────────────────────────────╯\n` +
                              `👑 *${menuFooter}*`,
                        mentions: [sender]
                    });

                    await clearUserWarns(from, senderNumber, 'antibad');
                    return;
                } catch (e) {
                    console.log('[AntiBad] Kick error:', e.message);
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

        // Send Warning Message
        const warnMsg = `╭──❍ *⚠️ WARNING DETECTED* ❍──╮\n` +
                        `├─ *User:* @${senderNumber}\n` +
                        `├─ *Word:* \`${badWord}\`\n` +
                        `├─ *Warnings:* ${warnCount}/${maxWarns}\n` +
                        `╰──────────────────────────────╯\n` +
                        `👑 *${menuFooter}*`;

        await conn.sendMessage(from, {
            text: warnMsg,
            mentions: [sender]
        });
    }
});
