const { cmd } = require('../arslan');

cmd({
    pattern: "jid",
    alias: ["id", "chatid", "gjid"],  
    desc: "Get full JID of current chat/user (Creator Only)",
    react: "🆔",
    category: "utility",
    filename: __filename,
}, async (conn, mek, m, { 
    from, isGroup, isCreator, reply, sender, prefix
}) => {
    try {
        if (!isCreator) {
            return reply("❌ *Command Restricted* - Only my creator can use this.");
        }

        const targetJid = isGroup
            ? (from.includes('@g.us') ? from : `${from}@g.us`)
            : (sender.includes('@s.whatsapp.net') ? sender : `${sender}@s.whatsapp.net`);
        const label = isGroup ? '👥 *Group JID:*' : '👤 *User JID:*';

        // Single "copy jid" button — same shape as .tiny's "copy url" button.
        const { sendBtns } = require('../lib/buttons');
        try {
            await sendBtns(conn, from, {
                title: '🆔 JID',
                text: `${label}\n\`\`\`${targetJid}\`\`\``,
                buttons: [
                    { display_text: '📋 𝐂σρу 𝐉ι∂', copy_code: targetJid }
                ]
            }, mek);
        } catch (e) {
            return reply(`${label}\n\`\`\`${targetJid}\`\`\``);
        }

    } catch (e) {
        console.error("JID Error:", e);
        reply(`⚠️ Error fetching JID:\n${e.message}`);
    }
});
