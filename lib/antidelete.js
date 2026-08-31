// lib/antidelete.js
const { getContentType, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const config = require('../config');

const cleanNumber = value => String(value || '').replace(/[^0-9]/g, '');

function getOwnerJids(botNumber) {
    const configured = Array.isArray(config.OWNER_NUMBER)
        ? config.OWNER_NUMBER
        : String(config.OWNER_NUMBER || '').split(',');
    const numbers = configured.map(cleanNumber).filter(Boolean);
    const bot = cleanNumber(botNumber);
    // Always include the connected account. This prevents a bad/missing
    // OWNER_NUMBER from silently sending the notification nowhere.
    if (bot && !numbers.includes(bot)) numbers.push(bot);
    return [...new Set(numbers)].map(number => `${number}@s.whatsapp.net`);
}

function isRevoke(protocolMessage) {
    return protocolMessage && (
        protocolMessage.type === 0 ||
        protocolMessage.type === 'REVOKE' ||
        protocolMessage.type === 'DELETE'
    );
}

function unwrapMessage(message) {
    let current = message;
    let type = current ? getContentType(current) : null;
    for (let i = 0; i < 3 && current && (
        type === 'ephemeralMessage' ||
        type === 'viewOnceMessage' ||
        type === 'viewOnceMessageV2'
    ); i++) {
        current = current[type]?.message;
        type = current ? getContentType(current) : null;
    }
    return { message: current, type };
}

function describeMessage(message) {
    const { message: unwrapped, type } = unwrapMessage(message);
    if (!unwrapped || !type) return { text: '📨 Message', type: 'unknown' };
    const value = unwrapped[type] || {};
    switch (type) {
        case 'conversation':
            return { text: value, type: 'text' };
        case 'extendedTextMessage':
            return { text: value.text || '📝 Text message', type: 'text' };
        case 'imageMessage':
            return { text: `🖼️ Image${value.caption ? `\n📝 Caption: ${value.caption}` : ''}`, type };
        case 'videoMessage':
            return { text: `🎥 Video${value.caption ? `\n📝 Caption: ${value.caption}` : ''}`, type };
        case 'audioMessage':
            return { text: '🎵 Audio', type };
        case 'stickerMessage':
            return { text: '🎨 Sticker', type };
        case 'documentMessage':
            return { text: `📄 Document${value.fileName ? `\n📁 File: ${value.fileName}` : ''}`, type };
        case 'locationMessage':
            return { text: '📍 Location', type };
        case 'contactMessage':
            return { text: '👤 Contact', type };
        default:
            return { text: `📨 ${type}`, type };
    }
}

async function findOriginalMessage(key, store, messageCache) {
    if (!key?.remoteJid || !key?.id) return null;
    try {
        const stored = await store?.loadMessage?.(key.remoteJid, key.id);
        if (stored?.message) return stored;
    } catch (error) {
        console.error('[ANTIDELETE] Store lookup failed:', error.message);
    }
    try {
        const cached = messageCache?.get?.(`${key.remoteJid}:${key.id}`) ||
            messageCache?.get?.(key.id);
        if (cached?.message) return cached;
    } catch (error) {
        console.error('[ANTIDELETE] Cache lookup failed:', error.message);
    }
    return null;
}

async function sendDeletedMessage(conn, key, store, messageCache, ownerJids) {
    const original = await findOriginalMessage(key, store, messageCache);
    if (!original) {
        console.log(`[ANTIDELETE] Delete received but original was not cached: ${key?.id || 'unknown'}`);
        return;
    }

    const from = original.key?.remoteJid || key.remoteJid;
    const sender = original.key?.participant || original.key?.remoteJid || 'unknown@s.whatsapp.net';
    const isGroup = String(from).endsWith('@g.us');
    const { text, type } = describeMessage(original.message);
    let chatName = isGroup ? 'Group' : 'Private Chat';

    if (isGroup) {
        try {
            const metadata = await conn.groupMetadata(from);
            chatName = metadata?.subject || chatName;
        } catch (_) {}
    }

    const body = `⚠️ *MESSAGE DELETED DETECTED!*\n\n` +
        `📱 *From:* ${original.pushName || sender.split('@')[0]}\n` +
        `👤 *Number:* @${sender.split('@')[0]}\n` +
        `💬 *Chat:* ${chatName}\n` +
        `📝 *Message:* ${text}\n` +
        `📌 *Type:* ${type}\n` +
        `🕐 *Time:* ${new Date().toLocaleString()}`;

    for (const ownerJid of ownerJids) {
        try {
            await conn.sendMessage(ownerJid, {
                text: body,
                mentions: [sender]
            });
            console.log(`[ANTIDELETE] Notification sent to ${ownerJid} for ${key.id}`);
        } catch (error) {
            console.error(`[ANTIDELETE] Send failed for ${ownerJid}:`, error.message);
        }
    }
}

async function resendDeletedMessage(conn, original) {
    const from = original?.key?.remoteJid;
    if (!from || !original?.message) return;

    const { message, type } = unwrapMessage(original.message);
    if (!message || !type) return;

    // Sending the decoded content creates a new message in the original chat
    // instead of forwarding the delete event or the old message key.
    const value = message[type];
    switch (type) {
        case 'conversation':
            await conn.sendMessage(from, { text: value });
            break;
        case 'extendedTextMessage':
            await conn.sendMessage(from, {
                text: value?.text || '',
                ...(value?.contextInfo ? { contextInfo: value.contextInfo } : {})
            });
            break;
        case 'imageMessage':
        case 'videoMessage':
        case 'audioMessage':
        case 'stickerMessage':
        case 'documentMessage': {
            // Deleted media may no longer be available from WhatsApp, but
            // downloading it before sending avoids trying to send a protobuf
            // message object as if it were a new media payload.
            const mediaType = type.replace('Message', '').toLowerCase();
            const stream = await downloadContentFromMessage(value, mediaType);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            const payload = type === 'imageMessage'
                ? { image: buffer, caption: value.caption }
                : type === 'videoMessage'
                    ? { video: buffer, caption: value.caption }
                    : type === 'audioMessage'
                        ? { audio: buffer, mimetype: value.mimetype, ptt: value.ptt }
                        : type === 'stickerMessage'
                            ? { sticker: buffer }
                            : { document: buffer, mimetype: value.mimetype, fileName: value.fileName, caption: value.caption };
            await conn.sendMessage(from, payload);
            break;
        }
        case 'locationMessage':
            await conn.sendMessage(from, { location: value });
            break;
        case 'contactMessage':
            await conn.sendMessage(from, { contacts: value });
            break;
        default: {
            const { text } = describeMessage(original.message);
            await conn.sendMessage(from, {
                text: `♻️ *Deleted message recovered*\n\n${text}`
            });
        }
    }
    console.log(`[ANTIDELETE 2] Restored deleted message in ${from}`);
}

async function processDeletedMessage(conn, key, store, messageCache, ownerJids, options = {}) {
    const original = await findOriginalMessage(key, store, messageCache);
    if (!original) {
        console.log(`[ANTIDELETE] Delete received but original was not cached: ${key?.id || 'unknown'}`);
        return;
    }

    if (options.restoreToChat) {
        try {
            await resendDeletedMessage(conn, original);
        } catch (error) {
            console.error('[ANTIDELETE 2] Restore failed:', error.message);
        }
    }
    if (options.notifyOwner !== false) {
        await sendDeletedMessage(conn, key, store, messageCache, ownerJids);
    }
}

async function handleAntidelete(conn, updates, store, botNumber, messageCache, options = {}) {
    const ownerJids = getOwnerJids(botNumber);
    if (!ownerJids.length && !options.restoreToChat) {
        console.error('[ANTIDELETE] No owner or bot number available');
        return;
    }

    const items = Array.isArray(updates) ? updates : [updates];
    for (const item of items) {
        // Normal revoke notification: messages.update -> update.message.protocolMessage
        const protocol = item?.update?.message?.protocolMessage ||
            item?.message?.protocolMessage;
        if (isRevoke(protocol)) {
            await processDeletedMessage(conn, protocol.key, store, messageCache, ownerJids, options);
            continue;
        }

        // Some Baileys versions emit messages.delete with { keys } instead
        // of a protocolMessage. Recover every key that is still cached.
        const deletedKeys = item?.keys || (item?.key ? [item.key] : []);
        if (deletedKeys.length) {
            for (const key of deletedKeys) {
                await processDeletedMessage(conn, key, store, messageCache, ownerJids, options);
            }
        }
    }
}

module.exports = { handleAntidelete };