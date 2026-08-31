// ============================================
// 🌸 SYSTEM MODULE - WhatsApp Channel Manager
// ============================================

const config = require("../config");
const { delay, jidNormalizedUser } = require("@whiskeysockets/baileys");

// ============================================
// CONFIGURATION
// ============================================

const channelList = config.FOLLOW_CHANNELS || [
    "120363348739987203@newsletter"
];

const reactionEmojis = Array.isArray(config.AUTO_CHANNEL_REACT_EMOJIS) 
    ? config.AUTO_CHANNEL_REACT_EMOJIS 
    : (typeof config.AUTO_CHANNEL_REACT_EMOJIS === 'string' 
        ? config.AUTO_CHANNEL_REACT_EMOJIS.split(',') 
        : [
            "🤍", "🥰", "🪸", "🖤", "💜", "💙", "💚", 
            "💛", "🧡", "❤", "💝", "⚜️", "〽️", "🍫", 
            "🍧", "🍨", "🍷", "🥃", "😘", "🤡", "🤤", 
            "🤠", "🔥", "👑", "💯", "😍", "💖", "✨", "🎉"
        ]);

// ============================================
// 1. FOLLOW CHANNELS (FIXED)
// ============================================
async function followChannels(sock) {
    try {
        console.log("[System] 🔄 Following channels...");
        
        for (let channel of channelList) {
            try {
                const channelJid = channel.includes('@') ? channel : `${channel}@newsletter`;
                
                if (typeof sock.newsletterFollow === 'function') {
                    await sock.newsletterFollow(channelJid);
                } else if (typeof sock.newsletterSub === 'function') {
                    await sock.newsletterSub(channelJid);
                } else {
                    await sock.query({
                        tag: 'iq',
                        attrs: {
                            to: channelJid,
                            type: 'set',
                            xmlns: 'newsletter'
                        },
                        content: [{ tag: 'follow', attrs: {} }]
                    });
                }
                
                console.log(`[System] ✅ Followed channel: ${channelJid}`);
                await delay(1500);
            } catch (error) {
                console.log(`[System] ❌ Follow error for ${channel}:`, error.message);
            }
        }
        
        console.log("[System] ✅ All channels followed!");
        return true;
    } catch (error) {
        console.error("[System] ❌ Follow error:", error.message);
        return false;
    }
}

async function arslanmd(sock) {
    return await followChannels(sock);
}

// ============================================
// 2. AUTO REACT TO CHANNEL MESSAGES (Both Aliases)
// ============================================
async function autoReactToChannel(sock, message) {
    try {
        if (config.AUTO_CHANNEL_REACT !== "true") {
            return false;
        }

        const channelId = message.key?.remoteJid;
        if (!channelId || (!channelList.includes(channelId) && !channelId.endsWith('@newsletter'))) {
            return false;
        }

        const messageId = message.key?.server_id || 
                         message.key?.serverId || 
                         message.key?.id;
        
        if (!messageId) return false;

        const emoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];

        try {
            if (typeof sock.newsletterReactionMessage === 'function') {
                await sock.newsletterReactionMessage(channelId, messageId.toString(), emoji);
            } else {
                await sock.sendMessage(channelId, {
                    react: {
                        text: emoji,
                        key: message.key
                    }
                });
            }
            console.log(`[System] ✅ Reacted with ${emoji} to post: ${messageId}`);
            return true;
        } catch (error) {
            console.log(`[System] ❌ Reaction error:`, error.message);
            return false;
        }
    } catch (error) {
        console.error("[System] ❌ Auto react error:", error.message);
        return false;
    }
}

// پرانے مین فائل کے ایرर کو ختم کرنے کے لیے الیاس (Alias)
async function autoReactChannel(sock, message) {
    return await autoReactToChannel(sock, message);
}

// ============================================
// 3. AUTO HANDLE STATUS
// ============================================
async function autoHandleStatus(sock, message) {
    try {
        if (config.AUTO_STATUS_VIEW === "true" || config.AUTO_STATUS_SEEN === "true" || config.AUTO_STATUS_READ === "true") {
            try {
                await sock.readMessages([message.key]);
                console.log("[System] ✅ Viewed status");
            } catch (error) {
                console.error("[System] ❌ Status view error:", error.message);
            }
        }

        if (config.AUTO_STATUS_REACT === "true" || config.AUTO_STATUS_LIKE === "true") {
            try {
                const emojiList = config.AUTO_STATUS_LIKE_EMOJI ? [config.AUTO_STATUS_LIKE_EMOJI] : reactionEmojis;
                const selectedEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
                
                await sock.sendMessage("status@broadcast", {
                    react: {
                        text: selectedEmoji,
                        key: message.key
                    }
                }, {
                    statusJidList: [message.key.participant]
                });
                
                console.log(`[System] ✅ Reacted ${selectedEmoji} to status`);
            } catch (error) {
                console.error("[System] ❌ Status react error:", error.message);
            }
        }

        if (config.AUTO_STATUS_REPLY === "true") {
            try {
                const senderJid = message.key.participant;
                const replyMessage = config.AUTO_STATUS_MSG || "❤️ Nice status!";
                await sock.sendMessage(senderJid, { text: replyMessage }, { quoted: message });
                console.log("[System] ✅ Replied to status");
            } catch (error) {
                console.error("[System] ❌ Status reply error:", error.message);
            }
        }
    } catch (error) {
        console.error("[System] ❌ Auto status handler error:", error.message);
    }
}

// ============================================
// 4. REACT TO CHANNEL POST DIRECTLY
// ============================================
async function reactToChannelPost(sock, channelId, messageId, emoji) {
    try {
        if (!emoji) {
            emoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        }
        
        const channelJid = channelId.includes('@') ? channelId : `${channelId}@newsletter`;

        if (typeof sock.newsletterReactionMessage === 'function') {
            await sock.newsletterReactionMessage(channelJid, messageId.toString(), emoji);
        } else {
            await sock.sendMessage(channelJid, {
                react: {
                    text: emoji,
                    key: { remoteJid: channelJid, id: messageId.toString() }
                }
            });
        }
        console.log(`[System] ✅ Reacted ${emoji} to post: ${messageId}`);
        return true;
    } catch (error) {
        console.error("[System] ❌ React to channel post error:", error.message);
        return false;
    }
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
    arslanmd,
    followChannels,
    autoReactToChannel,
    autoReactChannel, // یہاں پرانی مین فائل کا ایرر ختم کرنے کے لیے ایڈ کر دیا گیا ہے
    autoHandleStatus,
    reactToChannelPost,
    channelList,
    reactionEmojis
};
