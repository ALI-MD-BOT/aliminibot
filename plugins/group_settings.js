// =========================================================================
// 👑 COMBINED GROUP COMMANDS FILE (CLEANED & UPDATED)
// =========================================================================

const config = require('../config');
const { cmd } = require("../arslan");
const prefix = config.PREFIX;
const fs = require('fs');
const path = require('path');
const { writeFileSync } = require('fs');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, sleep, fetchJson, runtime } = require('../lib/functions2');

// =========================================================================================================
//   1. GET GROUP ADMINS COMMAND (PUBLIC USE)
// =========================================================================================================
cmd({
    pattern: "admins",
    alias: ["adminlist", "tagadmins"],
    desc: "Get a tagged list of all group admins",
    category: "group",
    use: ".admins",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const adminParticipants = groupMetadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');

        if (!adminParticipants.length) return reply("❌ No admins found in this group.");

        const adminMentions = adminParticipants.map(admin => admin.id);
        const adminTextList = adminParticipants.map(admin => `*│* 👤 @${admin.id.split('@')[0]}`).join('\n');

        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🎯 𝐀𝐃𝐌𝐈𝐍𝐒 𝐋𝐈𝐒𝐓 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
${adminTextList}
*│* ⚙️ Total Admins: ${adminParticipants.length}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return await conn.sendMessage(from, { text: layout, mentions: adminMentions }, { quoted: mek });
    } catch (e) {
        return reply("❌ Failed to fetch admin list.");
    }
});

// =========================================================================================================
//   2. SET GROUP DESCRIPTION COMMAND
// =========================================================================================================
cmd({
    pattern: "groupdesc",
    alias: ["setdesc", "changedesc"],
    desc: "Change the group description",
    category: "group",
    use: ".groupdesc <New Description>",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isOwner, reply, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins or the owner can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin to change description.");
        if (args.length === 0) return reply("❌ Please provide description text.");

        const newDesc = args.join(' ');
        await conn.groupUpdateDescription(from, newDesc);

        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 📝 𝐆𝐑𝐎𝐔𝐏 𝐃𝐄𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 📄 New Desc: ${newDesc}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return reply(layout);
    } catch (e) {
        return reply("❌ Failed to update description.");
    }
});

// =========================================================================================================
//   3. GET GROUP INFO COMMAND (PUBLIC USE)
// =========================================================================================================
cmd({
    pattern: "groupinfo",
    alias: ["ginfo", "infogroup"],
    desc: "Get basic information about the group",
    category: "group",
    use: ".groupinfo",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const groupMetadata = await conn.groupMetadata(from);
        
        const groupName = groupMetadata.subject;
        const groupDesc = groupMetadata.desc || 'No description provided.';
        const memberCount = groupMetadata.participants.length;
        const creationDate = new Date(groupMetadata.creation * 1000).toLocaleString();

        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 📊 𝐆𝐑𝐎𝐔𝐏 𝐈𝐍𝐅𝐎 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 📝 Name: ${groupName}
*│* 👥 Members: ${memberCount}
*│* 📅 Created At: ${creationDate}
*│* 📖 Description: ${groupDesc}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return reply(layout);
    } catch (e) {
        return reply("❌ Failed to fetch group info.");
    }
});

// =========================================================================================================
//   4. GET GROUP LINK COMMAND (PUBLIC USE)
// =========================================================================================================
cmd({
    pattern: "grouplink",
    alias: ["glink", "invitecode"],
    desc: "Get the group's invite link",
    category: "group",
    use: ".grouplink",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isBotAdmin) return reply("❌ I need to be an admin to generate link.");

        const inviteLink = await conn.groupInviteCode(from);
        
        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🔗 𝐆𝐑𝐎𝐔𝐏 𝐋𝐈𝐍𝐊 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 📌 Link: https://chat.whatsapp.com/${inviteLink}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return reply(layout);
    } catch (e) {
        return reply("❌ Failed to fetch invite link.");
    }
});

// =========================================================================================================
//   5 & 6. CHANGE GROUP NAME COMMANDS (ADMIN ONLY)
// =========================================================================================================
const nameConfig = {
    category: "group",
    filename: __filename
};

cmd({ ...nameConfig, pattern: "gname", alias: ["setname", "changegname"], desc: "Change group name" }, changeGroupSubject);
cmd({ ...nameConfig, pattern: "setsubject", alias: ["subject", "gsubject"], desc: "Change group subject" }, changeGroupSubject);

async function changeGroupSubject(conn, mek, m, { from, args, isGroup, isOwner, reply, sender }) {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin to change name.");

        const newName = args.join(" ");
        if (!newName) return reply("❌ Please provide a new name.");

        await conn.groupUpdateSubject(from, newName);
        
        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* ✏️ 𝐆𝐑𝐎𝐔𝐏 𝐍𝐀𝐌𝐄 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 📌 New Name: ${newName}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return reply(layout);
    } catch (e) {
        return reply("❌ Failed to change group name.");
    }
}

// =========================================================================================================
//   7. VIEW JOIN REQUESTS COMMAND
// =========================================================================================================
cmd({
    pattern: "requests",
    alias: ["joinrequests", "reqlist"],
    desc: "View pending group join requests",
    category: "group",
    use: ".requests",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, reply, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin.");

        const requests = await conn.groupRequestParticipantsList(from);
        if (!requests || requests.length === 0) return reply("✨ *No pending join requests found.*");

        let requestListText = "";
        requests.forEach((request, index) => {
            requestListText += `*│* [${index + 1}] 👤 @${request.jid.split("@")[0]}\n`;
        });

        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* ⏳ 𝐉𝐎𝐈𝐍 𝐑𝐄𝐐𝐔𝐄𝐒𝐓𝐒 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
${requestListText}*│* ⚙️ Total Requests: ${requests.length}
*│* 👉 Use: .accept <num> or .reject <num>
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return await conn.sendMessage(from, { text: layout, mentions: requests.map(r => r.jid) }, { quoted: mek });
    } catch (error) {
        return reply("❌ Failed to retrieve requests.");
    }
});

// =========================================================================================================
//   8. ACCEPT JOIN REQUESTS COMMAND
// =========================================================================================================
cmd({
    pattern: "accept",
    alias: ["approve", "acc"],
    desc: "Accept group join request(s)",
    category: "group",
    use: ".accept <numbers>",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, reply, sender, args }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin.");

        const requests = await conn.groupRequestParticipantsList(from);
        if (!requests || requests.length === 0) return reply("❌ No requests available.");

        const match = args.join(" ");
        if (!match) return reply("❌ Provide numbers. Example: `.accept 1` or `.accept 1,2`");

        const indexes = match.split(",").map(num => parseInt(num.trim()) - 1);
        const validIndexes = indexes.filter(index => index >= 0 && index < requests.length);

        if (validIndexes.length === 0) return reply("❌ Invalid request number(s).");

        for (let index of validIndexes) {
            await conn.groupRequestParticipantsUpdate(from, [requests[index].jid], "accept");
        }

        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* ✅ 𝐑𝐄𝐐𝐔𝐄𝐒𝐓𝐒 𝐀𝐂𝐂𝐄𝐏𝐓𝐄𝐃 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 🎉 Successfully Accepted!
*│* 📈 Total processed: ${validIndexes.length}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return reply(layout);
    } catch (error) {
        return reply("❌ Error processing approvals.");
    }
});

// =========================================================================================================
//   9. REJECT JOIN REQUESTS COMMAND
// =========================================================================================================
cmd({
    pattern: "reject",
    alias: ["deny", "rej"],
    desc: "Reject group join request(s)",
    category: "group",
    use: ".reject <numbers>",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, reply, sender, args }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin.");

        const requests = await conn.groupRequestParticipantsList(from);
        if (!requests || requests.length === 0) return reply("❌ No requests available.");

        const match = args.join(" ");
        if (!match) return reply("❌ Provide numbers. Example: `.reject 1`");

        const indexes = match.split(",").map(num => parseInt(num.trim()) - 1);
        const validIndexes = indexes.filter(index => index >= 0 && index < requests.length);

        if (validIndexes.length === 0) return reply("❌ Invalid request number(s).");

        for (let index of validIndexes) {
            await conn.groupRequestParticipantsUpdate(from, [requests[index].jid], "reject");
        }

        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* ❌ 𝐑𝐄𝐐𝐔𝐄𝐒𝐓𝐒 𝐑𝐄𝐉𝐄𝐂𝐓𝐄𝐃 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 🚫 Successfully Rejected!
*│* 📉 Total processed: ${validIndexes.length}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return reply(layout);
    } catch (error) {
        return reply("❌ Error processing rejections.");
    }
});

// =========================================================================================================
//   10. HIDETAG / ANNOUNCEMENT COMMAND
// =========================================================================================================
cmd({
    pattern: "hidetag",
    alias: ["htag", "totag", "announce"],
    desc: "Tag all group members invisibly",
    category: "group",
    use: ".hidetag <Message>",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isOwner, reply, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");

        const announcementText = args.join(" ") || "📢 Attention Everyone!";
        const allParticipants = groupMetadata.participants.map(p => p.id);

        return await conn.sendMessage(from, { text: announcementText, mentions: allParticipants }, { quoted: mek });
    } catch (e) {
        return reply("❌ Failed to execute hidetag.");
    }
});

// =========================================================================================================
//   11. LOCK GROUP SETTINGS
// =========================================================================================================
cmd({
    pattern: "lock",
    desc: "Only allow admins to modify group settings",
    category: "group",
    react: "🔒",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, reply, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command is only for groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin.");

        await conn.groupSettingUpdate(from, 'locked');
        
        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🔒 𝐒𝐄𝐓𝐓𝐈𝐍𝐆𝐒 𝐋𝐎𝐂𝐊𝐄𝐃 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* ⚠️ Status: Settings Closed
*│* 🔒 Only Admins can modify settings now!
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return reply(layout);
    } catch (e) {
        return reply("❌ Failed to lock settings.");
    }
});

// =========================================================================================================
//   12. UNLOCK GROUP SETTINGS
// =========================================================================================================
cmd({
    pattern: "unlock",
    desc: "Allow all participants to modify group settings",
    category: "group",
    react: "🔓",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, reply, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command is only for groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin.");

        await conn.groupSettingUpdate(from, 'unlocked');
        
        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🔓 𝐒𝐄𝐓𝐓𝐈𝐍𝐆𝐒 𝐔𝐍𝐋𝐎𝐂𝐊𝐄𝐃 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 🌐 Status: Settings Opened
*│* 🔓 All participants can modify settings now!
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return reply(layout);
    } catch (e) {
        return reply("❌ Failed to unlock settings.");
    }
});

// =========================================================================================================
//   13. AUTO APPROVE SPECIFIC COUNTRY CODE
// =========================================================================================================
cmd({
    pattern: "approvecountry",
    alias: ["autounknown", "addcountry"],
    desc: "Automatically approve specific country users from waitlist",
    category: "group",
    react: "✅",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, reply, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command is only for groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin.");

        const response = await conn.groupRequestParticipantsList(from);
        if (!response || response.length === 0) return reply("❌ No participants found in waiting list.");

        const targetCode = config.AUTO_ADD_Country_Code || "92";
        const toAddUsers = response.filter(user => user.jid.startsWith(targetCode));

        if (toAddUsers.length === 0) return reply(`❌ No members found with +${targetCode}.`);

        const userJids = toAddUsers.map(user => user.jid);
        await conn.groupRequestParticipantsUpdate(from, userJids, "approve");

        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🗺️ 𝐂𝐎𝐔𝐍𝐓𝐑𝐘 𝐀𝐏𝐏𝐑𝐎𝐕𝐀𝐋 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* ✅ Auto Approve Executed!
*│* 📌 Approved: ${userJids.length} users
*│* 🌐 Target Code: +${targetCode}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return reply(layout);
    } catch (e) {
        return reply("❌ Error processing country approvals.");
    }
});

// =========================================================================================================
//   14. CREATE POLL (PUBLIC USE)
// =========================================================================================================
cmd({
    pattern: "poll",
    desc: "Create a group poll for voting",
    category: "group",
    use: ".poll Question | Option1 | Option2",
    react: "📊",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply, args }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const match = args.join(" ");
        const [question, ...options] = match.split("|").map(item => item.trim());
        if (!question || options.length < 2) return reply("❌ *Usage:* .poll Question | Option1 | Option2");

        return await conn.sendMessage(from, { poll: { name: question, values: options, selectableCount: 1 } });
    } catch (error) {
        return reply("❌ Failed to create poll.");
    }
});

// =========================================================================================================
//   15. GET GROUP PROFILE PICTURE (PUBLIC USE)
// =========================================================================================================
cmd({
    pattern: "getpic",
    alias: ["grouppic", "gdp"],
    desc: "Get the current group profile picture",
    category: "group",
    react: "🖼️",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const groupPic = await conn.getProfilePicture(from);
        
        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🖼️ 𝐆𝐑𝐎𝐔𝐏 𝐃𝐏 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 📸 Profile Picture Fetched!
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return await conn.sendMessage(from, { image: { url: groupPic }, caption: layout }, { quoted: mek });
    } catch (e) {
        return reply("❌ Failed to fetch picture (DP might be private or empty).");
    }
});

// =========================================================================================================
//   16. OPENTIME COMMAND
// =========================================================================================================
cmd({
    pattern: "opentime",
    alias: ["otime"],
    desc: "Automatically open the group after a specified time",
    category: "group",
    react: "🔓",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isOwner, reply, sender, q }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin.");

        if (args.length < 2) return reply("❌ *Usage:* .opentime 10 minute");

        const value = parseInt(args[0]);
        const unit = args[1].toLowerCase();
        let timer = 0;

        if (unit === 'second') timer = value * 1000;
        else if (unit === 'minute') timer = value * 60000;
        else if (unit === 'hour') timer = value * 3600000;
        else if (unit === 'day') timer = value * 86400000;
        else return reply("❌ Invalid unit.");

        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🔓 𝐎𝐏𝐄𝐍𝐓𝐈𝐌𝐄 𝐒𝐂𝐇𝐄𝐃𝐔𝐋𝐄𝐃 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* ⏳ Timer Set!
*│* 🔓 Group will open after: ${q}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        await reply(layout);

        setTimeout(async () => {
            await conn.groupSettingUpdate(from, 'not_announcement');
            const openLayout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🔓 𝐆𝐑𝐎𝐔𝐏 𝐎𝐏𝐄𝐍𝐄𝐃 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 🌐 Status: Unmuted
*│* 🔓 All members can send messages now!
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;
            await conn.sendMessage(from, { text: openLayout });
        }, timer);
    } catch (e) {
        return reply("❌ Error setting time.");
    }
});

// =========================================================================================================
//   17. CLOSETIME COMMAND
// =========================================================================================================
cmd({
    pattern: "closetime",
    alias: ["ctime"],
    desc: "Automatically close the group after a specified time",
    category: "group",
    react: "🔒",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isOwner, reply, sender, q }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin.");

        if (args.length < 2) return reply("❌ *Usage:* .closetime 1 hour");

        const value = parseInt(args[0]);
        const unit = args[1].toLowerCase();
        let timer = 0;

        if (unit === 'second') timer = value * 1000;
        else if (unit === 'minute') timer = value * 60000;
        else if (unit === 'hour') timer = value * 3600000;
        else if (unit === 'day') timer = value * 86400000;
        else return reply("❌ Invalid unit.");

        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🔒 𝐂𝐋𝐎𝐒𝐄𝐓𝐈𝐌𝐄 𝐒𝐂𝐇𝐄𝐃𝐔𝐋𝐄𝐃 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* ⏳ Timer Set!
*│* 🔒 Group will close after: ${q}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        await reply(layout);

        setTimeout(async () => {
            await conn.groupSettingUpdate(from, 'announcement');
            const closeLayout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🔒 𝐆𝐑𝐎𝐔𝐏 𝐂𝐋𝐎𝐒𝐄𝐃 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* ⚠️ Status: Muted
*│* 🔐 Only admins can send messages now!
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;
            await conn.sendMessage(from, { text: closeLayout });
        }, timer);
    } catch (e) {
        return reply("❌ Error setting time.");
    }
});

// =========================================================================================================
//   18. TAGALL COMMAND
// =========================================================================================================
cmd({
    pattern: "tagall",
    alias: ["mentionall", "everyone"],
    desc: "Mention all group members",
    category: "group",
    react: "📣",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, reply, sender, args }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");

        const members = groupMetadata.participants.map(u => u.id);
        const customMsg = args.join(" ") || "Attention Everyone!";

        let memberTagList = members.map(m => `*│* 👤 @${m.split('@')[0]}`).join('\n');

        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 📣 𝐆𝐑𝐎𝐔𝐏 𝐀𝐍𝐍𝐎𝐔𝐍𝐂𝐄𝐌𝐄𝐍𝐓 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 📢 Message: ${customMsg}
${memberTagList}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return await conn.sendMessage(from, { text: layout, mentions: members }, { quoted: mek });
    } catch (e) {
        return reply("❌ Failed to tag all.");
    }
});

// =========================================================================================================
//   19. MUTE GROUP
// =========================================================================================================
cmd({
    pattern: "mute",
    alias: ["close", "closegroup"],
    desc: "Close group messages for members",
    category: "group",
    react: "🔒",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, reply, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command is only for groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin.");

        await conn.groupSettingUpdate(from, 'announcement');
        
        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🔒 𝐆𝐑𝐎𝐔𝐏 𝐌𝐔𝐓𝐄𝐃 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* ⚠️ Status: Closed
*│* 🔐 Only admins can send messages now!
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return reply(layout);
    } catch (e) {
        return reply("❌ Failed to mute group.");
    }
});

// =========================================================================================================
//   20. UNMUTE GROUP
// =========================================================================================================
cmd({
    pattern: "unmute",
    alias: ["open", "opengroup"],
    desc: "Open group messages for all members",
    category: "group",
    react: "🔓",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, reply, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command is only for groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin.");

        await conn.groupSettingUpdate(from, 'not_announcement');
        
        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🔓 𝐆𝐑𝐎𝐔𝐏 𝐔𝐍𝐌𝐔𝐓𝐄𝐃 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 🌐 Status: Opened
*│* 🔓 All members can send messages now!
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return reply(layout);
    } catch (e) {
        return reply("❌ Failed to unmute group.");
    }
});

// =========================================================================================================
//   21. PROMOTE USER
// =========================================================================================================
cmd({
    pattern: "promote",
    desc: "Promote a member to admin",
    category: "group",
    react: "🔼",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, reply, sender, q }) => {
    try {
        if (!isGroup) return reply("❌ This command is only for groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin.");

        let user = m.quoted ? m.quoted.sender : mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (q ? q.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
        if (!user) return reply("❌ Please reply to a user or tag them.");

        await conn.groupParticipantsUpdate(from, [user], 'promote');
        
        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🔼 𝐏𝐑𝐎𝐌𝐎𝐓𝐈𝐎𝐍 𝐄𝐗𝐄𝐂𝐔𝐓𝐄𝐃 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 👑 @${user.split('@')[0]} has been promoted to Admin!
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return await conn.sendMessage(from, { text: layout, mentions: [user] }, { quoted: mek });
    } catch (e) {
        return reply("❌ Failed to promote.");
    }
});

// =========================================================================================================
//   22. DEMOTE USER
// =========================================================================================================
cmd({
    pattern: "demote",
    desc: "Demote an admin to member",
    category: "group",
    react: "🔽",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, reply, sender, q }) => {
    try {
        if (!isGroup) return reply("❌ This command is only for groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin.");

        let user = m.quoted ? m.quoted.sender : mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (q ? q.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
        if (!user) return reply("❌ Please reply to a user or tag them.");

        await conn.groupParticipantsUpdate(from, [user], 'demote');
        
        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🔽 𝐃𝐄𝐌𝐎𝐓𝐈𝐎𝐍 𝐄𝐗𝐄𝐂𝐔𝐓𝐄𝐃 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 👤 @${user.split('@')[0]} has been demoted to a regular member!
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return await conn.sendMessage(from, { text: layout, mentions: [user] }, { quoted: mek });
    } catch (e) {
        return reply("❌ Failed to demote.");
    }
});

// =========================================================================================================
//   23. DELETE MESSAGE (WITH FIXED AUTO-CLEAN)
// =========================================================================================================
cmd({
    pattern: "del",
    alias: ["delete"],
    desc: "Delete a member's message and auto-delete the command",
    category: "group",
    react: "❌",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, reply, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command is only for groups.");
        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) return reply("❌ Only admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need to be an admin.");

        const targetMessage = m.quoted || mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!targetMessage) return reply("❌ Please reply (Swipe) to the exact message you want to delete.");

        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        const memberMsgKey = {
            remoteJid: from,
            fromMe: contextInfo?.participant === conn.user?.id,
            id: contextInfo?.stanzaId,
            participant: contextInfo?.participant
        };
        
        const commandMsgKey = {
            remoteJid: from,
            fromMe: m.key.fromMe,
            id: m.key.id,
            participant: sender
        };

        await conn.sendMessage(from, { delete: memberMsgKey });
        
        setTimeout(async () => {
            try {
                await conn.sendMessage(from, { delete: commandMsgKey });
            } catch (err) {
                console.error("Auto clean failed:", err);
            }
        }, 400);

    } catch (e) {
        return reply("❌ Failed to delete message.");
    }
});

// =========================================================================================================
//   24. KICK MEMBER COMMAND (ADMIN ONLY)
// =========================================================================================================
cmd({
    pattern: "kick",
    alias: ["remove", "kk"],
    react: "🚷",
    desc: "Kick a member from the group",
    category: "group",
    use: ".kick (reply or tag)",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, reply, sender }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");

        const groupMetadata = await conn.groupMetadata(from);
        const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isSenderAdmin && !isOwner) {
            return reply("❌ Only admins or the owner can use this command.");
        }

        if (!isBotAdmin) {
            return reply("❌ I need to be an admin to kick someone.");
        }

        const quoted = mek.message?.extendedTextMessage?.contextInfo?.participant || 
                       mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        if (!quoted) return reply("❌ Please reply to a user's message or tag them to kick.");

        await conn.groupParticipantsUpdate(from, [quoted], "remove");
        
        const kickedUser = quoted.split("@")[0];
        
        const layout = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰* 🚷 𝐌𝐄𝐌𝐁𝐄𝐑 𝐊𝐈𝐂𝐊𝐄𝐃 *⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│* 👤 Removed: @${kickedUser}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*`;

        return await conn.sendMessage(from, { 
            text: layout,
            mentions: [quoted]
        }, { quoted: mek });

    } catch (e) {
        console.error("Kick Command Error:", e);
        return reply("❌ Failed to kick user. Something went wrong.");
    }
});
