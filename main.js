// ============================================
// 🌸 ARSLAN-MD MINI - FIXED MAIN.JS
// 👑 Developer: ᴀʀꜱʟᴀɴ-ᴍᴅ
// ============================================

const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    Browsers,
    DisconnectReason,
    jidDecode,
    downloadContentFromMessage,
    getContentType,
} = require('@whiskeysockets/baileys');

// ========== SETTINGS.JS SE FETCH ==========
const config = require('./config');
const { sms } = require('./lib/msg');
const events = require('./arslan');

const {
    connectdb,
    saveSessionToMongoDB,
    getSessionFromMongoDB,
    deleteSessionFromMongoDB,
    getUserConfigFromMongoDB,
    updateUserConfigInMongoDB,
    addNumberToMongoDB,
    removeNumberFromMongoDB,
    getAllNumbersFromMongoDB,
    saveOTPToMongoDB,
    verifyOTPFromMongoDB,
    incrementStats,
    getStatsForNumber
} = require('./lib/database');

// ========== ANTI-DELETE FIXED IMPORT ==========
const { handleAntidelete } = require('./lib/antidelete');

// ========== 🆕 RUNTIME MONITOR & MEMORY GUARD IMPORT ==========
const { installProcessGuards, startRuntimeMonitor } = require('./lib/runtime-guard');

// ========== 🆕 SYSTEM FUNCTIONS (Channel Follow + React) ==========
const { 
    arslanmd, 
    autoReactChannel, 
    autoHandleStatus,
    reactToChannelPost,
    CHANNEL_IDS,
    REACT_EMOJIS 
} = require('./lib/system');

const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const pino = require('pino');
const crypto = require('crypto');
const FileType = require('file-type');
const axios = require('axios');
const moment = require('moment-timezone');
const chalk = require('chalk');

// ========== IMPORT ARSLAN-MD FEATURES ==========
const GroupEvents = require('./lib/groupevents');
const { PresenceControl, BotActivityFilter } = require('./data/presence');
const registerAntiCall = require('./lib/anticall');
const { handleReaction } = require('./lib/reaction');
const { fakevCard } = require('./lib/fakevCard');
const AntiDelete = require('./lib/antidelete');

// ========== SETTINGS.JS SE VALUES ==========
const mode = config.MODE || config.WORK_TYPE || 'public';
const BOT_NAME = config.BOT_NAME || 'ARSLAN-MD';
const OWNER_NAME = config.OWNER_NAME || 'ᴀʀꜱʟᴀɴ-ᴍᴅ';
const OWNER_NUMBER = config.OWNER_NUMBER || ['923237045919'];

// ========== CHANNEL SETTINGS ==========
const CHANNEL_JID = config.CHANNEL_JID || '120363348739987203@newsletter';
const AUTO_CHANNEL_REACT_EMOJIS = config.AUTO_CHANNEL_REACT_EMOJIS || ['❤️', '🔥', '👑', '💯', '😍', '💖', '✨'];

const router = express.Router();
connectdb();

// ========== TEMP DIRECTORIES & CONFIGS FOR RUNTIME GUARD ==========
const TEMP_DIRECTORIES = [
    path.join(__dirname, 'temp'),
    path.join(__dirname, 'tmp'),
    path.join(__dirname, 'session')
];

function clearRuntimeCaches() {
    try {
        messageCache.clear();
        groupMetaCache.clear();
        userCache.clear();
        processedMessages.clear();
        userMessageCounts.clear();
        arslanLog('Runtime caches cleared during memory maintenance', 'info');
    } catch (e) {
        arslanLog(`Error clearing caches: ${e.message}`, 'error');
    }
}

// ========== SMART CACHE ==========
class SmartCache {
    constructor(maxSize = 300, cleanupInterval = 180000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.hits = 0;
        this.misses = 0;
        this.statsInterval = setInterval(() => this.logStats(), 1800000);
        this.cleanupInterval = setInterval(() => this.cleanupOld(), cleanupInterval);
    }

    set(key, value, ttl = 3600000) {
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl,
            lastAccess: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            this.misses++;
            return null;
        }
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }
        item.lastAccess = Date.now();
        this.hits++;
        return item.value;
    }

    delete(key) { this.cache.delete(key); }
    clear() { this.cache.clear(); this.hits = 0; this.misses = 0; }

    evictLRU() {
        if (this.cache.size === 0) return;
        let lruKey = null;
        let lruTime = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (value.lastAccess < lruTime) {
                lruTime = value.lastAccess;
                lruKey = key;
            }
        }
        if (lruKey) {
            this.cache.delete(lruKey);
        }
    }

    cleanupOld() {
        const now = Date.now();
        let deleted = 0;
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > value.ttl) {
                this.cache.delete(key);
                deleted++;
            }
        }
        if (deleted > 0 && config.DEBUG === "true") {
            console.log(chalk.gray(`[ 🧹 ] Cache cleaned: ${deleted} expired`));
        }
    }

    logStats() {
        const total = this.hits + this.misses;
        if (total === 0) return;
        const hitRate = Math.round((this.hits / total) * 100);
        console.log(chalk.gray(`[ 📊 ] Cache: ${this.cache.size}/${this.maxSize} | Hit: ${hitRate}%`));
        this.hits = 0;
        this.misses = 0;
    }

    destroy() {
        clearInterval(this.statsInterval);
        clearInterval(this.cleanupInterval);
        this.clear();
    }
}

// ========== CACHE INSTANCES ==========
const messageCache = new SmartCache(1000, 180000);
const groupMetaCache = new SmartCache(100, 300000);
const userCache = new SmartCache(200, 300000);

// ========== ACTIVE SESSIONS & STATES ==========
const activeSockets = new Map();
const socketCreationTime = new Map();
const processedMessages = new Set();
const runtimeStates = new Map();

// ========== 🛡️ INSTALL PROCESS GUARDS & RUNTIME MONITOR ==========
installProcessGuards({
    log: arslanLog,
    onMemoryPressure: (reason) => {
        clearRuntimeCaches();
        for (const state of runtimeStates.values()) {
            if (state.store?.messages) state.store.messages = {};
        }
        arslanLog(`Runtime recovery cleanup completed (${reason})`, 'warning');
    }
});

let lastMemoryRecoveryAt = 0;
const runtimeMonitor = startRuntimeMonitor({
    log: arslanLog,
    getSockets: () => activeSockets,
    getStates: () => runtimeStates.values(),
    getTempDirs: () => TEMP_DIRECTORIES,
    onMemoryPressure: ({ hard }) => {
        if (!hard) return;
        const now = Date.now();
        if (now - lastMemoryRecoveryAt < 10 * 60 * 1000) return;
        lastMemoryRecoveryAt = now;

        clearRuntimeCaches();
        for (const [number, socket] of activeSockets.entries()) {
            try {
                socket.ev?.emit('connection.update', {
                    connection: 'close',
                    lastDisconnect: { error: { output: { statusCode: 408 } } }
                });
            } catch (_) {}
        }
        arslanLog('Executed hard memory recovery recycle across active sockets', 'warning');
    },
    onStalled: (state) => {
        if (!state?.number) return;
        const socket = activeSockets.get(state.number);
        if (socket?.ws) {
            try { socket.ws.close(); } catch (_) {}
        }
        arslanLog(`Recycled stalled session for ${state.number}`, 'warning');
    }
});

// ========== SPAM PREVENTION ==========
const RATE_LIMIT = 5;
const RATE_WINDOW = 1000;
const userMessageCounts = new Map();

function checkRateLimit(senderNumber) {
    const now = Date.now();
    const userData = userMessageCounts.get(senderNumber) || { count: 0, timestamp: now };
    if (now - userData.timestamp > RATE_WINDOW) {
        userData.count = 1;
        userData.timestamp = now;
    } else {
        userData.count++;
    }
    userMessageCounts.set(senderNumber, userData);
    return userData.count <= RATE_LIMIT;
}

// ========== STORE ==========
function createStore() {
    const store = {
        messages: {},
        bind(ev) {
            ev.on('messages.upsert', ({ messages }) => {
                for (const msg of messages) {
                    const jid = msg.key && msg.key.remoteJid;
                    if (!jid) continue;
                    if (!store.messages[jid]) store.messages[jid] = [];
                    store.messages[jid].push(msg);
                    if (store.messages[jid].length > 100) store.messages[jid].shift();
                }
            });
        },
        async loadMessage(jid, id) {
            if (!store.messages[jid]) return null;
            return store.messages[jid].find(m => m.key && m.key.id === id) || null;
        }
    };
    return store;
}

const createSerial = (size) => crypto.randomBytes(size).toString('hex').slice(0, size);

// ========== GROUP ADMINS (ARSLAN-MD Style) ==========
function getGroupAdmins(participants) {
    let admins = [];
    for (let i of participants) {
        if (i.admin === 'admin' || i.admin === 'superadmin') {
            admins.push(i.id);
        }
    }
    return admins;
}

// ========== NUMBER HELPERS ==========
function cleanNumber(number) {
    return String(number || "").replace(/[^0-9]/g, "");
}

function getBotNumber(socket) {
    try {
        const id = socket?.user?.id;
        if (!id) return "";
        return cleanNumber(id.includes(":") ? id.split(":")[0] : id.split("@")[0]);
    } catch { return ""; }
}

function getBotJid(socket) {
    const num = getBotNumber(socket);
    return num ? `${num}@s.whatsapp.net` : "";
}

function isNumberAlreadyConnected(number) {
    return activeSockets.has(number.replace(/[^0-9]/g, ''));
}

function getConnectionStatus(number) {
    const n = number.replace(/[^0-9]/g, '');
    const isConnected = activeSockets.has(n);
    const connectionTime = socketCreationTime.get(n);
    return {
        isConnected,
        connectionTime: connectionTime ? new Date(connectionTime).toLocaleString() : null,
        uptime: connectionTime ? Math.floor((Date.now() - connectionTime) / 1000) : 0
    };
}

function arslanLog(message, type = 'info') {
    const icons = { info: '📝', success: '✅', error: '❌', warning: '⚠️', debug: '🐛' };
    console.log(`${icons[type] || '📝'} [ARSLAN-MD-MINI] ${new Date().toISOString()}: ${message}`);
}

// ========== LOAD PLUGINS ==========
const pluginsDir = path.join(__dirname, 'plugins');
if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
const pluginFiles = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
arslanLog(`Loading ${pluginFiles.length} plugins...`, 'info');
for (const file of pluginFiles) {
    try { require(path.join(pluginsDir, file)); }
    catch (e) { arslanLog(`Failed to load plugin ${file}: ${e.message}`, 'error'); }
}

// ========== 🟢 NEW: NATIVE FLOW & UNIVERSAL BUTTON EXTRACTOR ==========
const nativeFlowId = (message) => {
    const response = message?.interactiveResponseMessage ||
        message?.interactiveResponseMessageV2 ||
        message?.nativeFlowResponseMessage;
    const params = response?.nativeFlowResponseMessage?.paramsJson ||
        response?.paramsJson;
    if (!params) return '';
    try {
        const parsed = typeof params === 'string' ? JSON.parse(params) : params;
        return parsed.id || parsed.selectedId || parsed.selectedRowId ||
            parsed.buttonId || parsed.display_text || '';
    } catch (e) {
        arslanLog(`Button reply paramsJson parse failed: ${e.message}`, 'warning');
        return '';
    }
};

const getMessageBody = (message, type) => {
    if (!message) return '';
    if (type === 'conversation') return message.conversation || '';
    if (type === 'extendedTextMessage') return message.extendedTextMessage?.text || '';
    return message.conversation
        || message.extendedTextMessage?.text
        || message.buttonsResponseMessage?.selectedButtonId
        || message.buttonReplyMessage?.buttonId
        || message.templateButtonReplyMessage?.selectedId
        || message.listResponseMessage?.singleSelectReply?.selectedRowId
        || message.listResponseMessage?.singleSelectReply?.selectedRowId
        || nativeFlowId(message)
        || '';
};

// ========== FIND COMMAND ==========
function findCommand(cmdName) {
    try {
        const events = require("./arslan");
        const name = String(cmdName || "").trim().toLowerCase();
        return events.commands.find(cmd =>
            String(cmd.pattern || "").toLowerCase() === name ||
            (cmd.alias && cmd.alias.map(a => String(a).toLowerCase()).includes(name))
        );
    } catch { return null; }
}

// ========== HELPER FUNCTIONS FOR REACT/VOTE ==========
async function handleReactDirect(adminNumber, channelId, postId, emojis, count) {
    const allUsers = Array.from(activeSockets.keys());
    let reactingUsers = allUsers.filter(u => u !== adminNumber);

    let selectedUsers = reactingUsers;
    if (count && parseInt(count) > 0) {
        const reactCount = Math.min(parseInt(count), reactingUsers.length);
        const shuffled = reactingUsers.sort(() => 0.5 - Math.random());
        selectedUsers = shuffled.slice(0, reactCount);
    }

    if (selectedUsers.length === 0) {
        return { error: 'No other users available to react' };
    }

    const channelJid = channelId.includes('@') ? channelId : `${channelId}@newsletter`;
    const fullPostId = postId.includes('_') ? postId : `${channelId}_${postId}`;

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const userNumber of selectedUsers) {
        try {
            const socket = activeSockets.get(userNumber);
            if (!socket) continue;

            const userJid = jidNormalizedUser(socket.user.id);
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

            await socket.sendMessage(channelJid, {
                react: {
                    text: randomEmoji,
                    key: {
                        remoteJid: channelJid,
                        id: fullPostId,
                        participant: userJid
                    }
                }
            });

            results.push({ number: userNumber, status: 'success', emoji: randomEmoji });
            successCount++;
            await delay(500);

        } catch (error) {
            results.push({ number: userNumber, status: 'failed', error: error.message });
            failCount++;
        }
    }

    return {
        channelId,
        postId,
        emojis,
        totalUsers: allUsers.length,
        reactingUsers: selectedUsers.length,
        successCount,
        failCount,
        results
    };
}

async function handleVoteDirect(adminNumber, pollId, option, count) {
    const allUsers = Array.from(activeSockets.keys());
    let votingUsers = allUsers.filter(u => u !== adminNumber);

    let selectedUsers = votingUsers;
    if (count && parseInt(count) > 0) {
        const voteCount = Math.min(parseInt(count), votingUsers.length);
        const shuffled = votingUsers.sort(() => 0.5 - Math.random());
        selectedUsers = shuffled.slice(0, voteCount);
    }

    if (selectedUsers.length === 0) {
        return { error: 'No other users available to vote' };
    }

    let pollJid = pollId;
    let pollMessageId = pollId;

    if (pollId.includes('_')) {
        const parts = pollId.split('_');
        if (parts.length === 2) {
            pollJid = parts[0];
            pollMessageId = parts[1];
        }
    }

    if (!pollJid.includes('@')) {
        pollJid = `${pollJid}@g.us`;
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const userNumber of selectedUsers) {
        try {
            const socket = activeSockets.get(userNumber);
            if (!socket) continue;

            await socket.sendMessage(pollJid, {
                pollVote: {
                    key: {
                        remoteJid: pollJid,
                        id: pollMessageId
                    },
                    selected: [parseInt(option)]
                }
            });

            results.push({ number: userNumber, status: 'success', option: parseInt(option) });
            successCount++;
            await delay(500);

        } catch (error) {
            results.push({ number: userNumber, status: 'failed', error: error.message });
            failCount++;
        }
    }

    return {
        pollId,
        option: parseInt(option),
        totalUsers: allUsers.length,
        votingUsers: selectedUsers.length,
        successCount,
        failCount,
        results
    };
}

// ============================================
// 📢 AUTO CHANNEL FOLLOW + REACT
// ============================================

/**
 * 📢 Auto Follow Channel for New Users
 */
async function autoFollowChannel(conn, userJid) {
    try {
        if (config.AUTO_FOLLOW_CHANNEL !== 'true') return;
        
        await conn.sendMessage(CHANNEL_JID, {
            follow: {}
        });
        arslanLog(`[Channel] ${userJid} followed channel`, 'success');
    } catch (e) {
        console.error('[Channel] Follow error:', e.message);
    }
}

// ========== MAIN PAIR FUNCTION ==========
async function arslanPair(number, res = null) {
    let connectionLockKey;
    const sanitizedNumber = number.replace(/[^0-9]/g, '');

    try {
        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);

        if (isNumberAlreadyConnected(sanitizedNumber)) {
            const status = getConnectionStatus(sanitizedNumber);
            if (res && !res.headersSent) {
                return res.json({ status: 'already_connected', message: 'Number is already connected', connectionTime: status.connectionTime, uptime: `${status.uptime} seconds` });
            }
            return;
        }

        connectionLockKey = `arslan_lock_${sanitizedNumber}`;
        if (global[connectionLockKey]) {
            if (res && !res.headersSent) return res.json({ status: 'connection_in_progress' });
            return;
        } global[connectionLockKey] = true;

        const existingSession = await getSessionFromMongoDB(sanitizedNumber);

        if (!existingSession) {
            arslanLog(`No MongoDB session for ${sanitizedNumber} — new pairing required`, 'info');
            if (fs.existsSync(sessionPath)) {
                await fs.remove(sessionPath);
                arslanLog(`Cleaned leftover local session for ${sanitizedNumber}`, 'info');
            }
        } else {
            fs.ensureDirSync(sessionPath);
            fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(existingSession, null, 2));
            arslanLog(`🔄 Restored existing session from MongoDB for ${sanitizedNumber}`, 'success');
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'fatal' : 'debug' });
        const store = createStore();

        const conn = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: false,
            fireInitQueries: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: true,
            markOnlineOnConnect: true,
            browser: ['Mac OS', 'Safari', '10.15.7'],
            cachedGroupMetadata: async (jid) => groupMetaCache.get(jid) || null,
            getMessage: async (key) => {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg && msg.message ? msg.message : { conversation: BOT_NAME };
            }
        });

        socketCreationTime.set(sanitizedNumber, Date.now());
        activeSockets.set(sanitizedNumber, conn);
        store.bind(conn.ev);

        // Track state for Runtime Monitor
        runtimeStates.set(sanitizedNumber, {
            number: sanitizedNumber,
            lastActivityAt: Date.now(),
            stallTimeoutMs: 10 * 60 * 1000,
            store
        });

        // ========== SETUP CALL HANDLERS ==========
        setupCallHandlers(conn, number);

        // ========== SETUP AUTO RESTART ==========
        setupAutoRestart(conn, number);

        // ========== DECODE JID ==========
        conn.decodeJid = jid => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                const decode = jidDecode(jid) || {};
                return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
            }
            return jid;
        };

        // ========== DOWNLOAD MEDIA ==========
        conn.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
            const quoted = message.msg ? message.msg : message;
            const mime = (message.msg || message).mimetype || '';
            const messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
            const stream = await downloadContentFromMessage(quoted, messageType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            const type = await FileType.fromBuffer(buffer);
            const trueFileName = attachExtension ? (filename + '.' + type.ext) : filename;
            
            // Ensure temp directory exists before saving
            fs.ensureDirSync(path.join(__dirname, 'temp'));
            await fs.writeFileSync(trueFileName, buffer);
            return trueFileName;
        };

        // ========== PAIRING ==========
        if (!conn.authState.creds.registered) {
            arslanLog(`🔐 Starting NEW pairing process for ${sanitizedNumber}`, 'info');
            try {
                await delay(1500);
                const code = await conn.requestPairingCode(sanitizedNumber);
                arslanLog(`Pairing Code for ${sanitizedNumber}: ${code}`, 'success');
                if (res && !res.headersSent) {
                    res.send({ code, status: 'new_pairing' });
                }
            } catch (error) {
                arslanLog(`Failed to request pairing code: ${error.message}`, 'error');
                if (res && !res.headersSent) {
                    res.status(500).send({ error: 'Failed to get pairing code', status: 'error', message: error.message });
                }
                throw error;
            }
        } else {
            arslanLog(`✅ Using existing session for ${sanitizedNumber}`, 'success');
            if (res && !res.headersSent) {
                res.json({ status: 'reconnecting', message: 'Reconnecting with existing session' });
            }
        }

        // ========== CREDS UPDATE ==========
        conn.ev.on('creds.update', async () => {
            await saveCreds();
            const fileContent = await fs.readFile(path.join(sessionPath, 'creds.json'), 'utf8');
            const creds = JSON.parse(fileContent);
            const existingSessionCheck = await getSessionFromMongoDB(sanitizedNumber);
            const isNewSession = !existingSessionCheck;
            await saveSessionToMongoDB(sanitizedNumber, creds);
            if (isNewSession) {
                arslanLog(`🎉 NEW user ${sanitizedNumber} successfully registered!`, 'success');
            }
        });

        // ========== ANTI-DELETE (FIXED PER USER CONFIG) ==========
        conn.ev.on('messages.update', async (updates) => {
            try {
                const botNum = getBotNumber(conn);
                const userConfig = await getUserConfigFromMongoDB(botNum);
                const isAntiDeleteOn = (userConfig && userConfig.ANTIDELETE !== undefined) 
                    ? userConfig.ANTIDELETE === 'true' 
                    : config.ANTIDELETE === 'true';
                 const isAntiDelete2On = (userConfig && userConfig.ANTIDELETE2 !== undefined)
                     ? userConfig.ANTIDELETE2 === 'true'
                     : config.ANTIDELETE2 === 'true';

                 if (isAntiDeleteOn || isAntiDelete2On) {
                    if (typeof handleAntidelete === 'function') {
                         await handleAntidelete(conn, updates, store, botNum, messageCache, {
                             notifyOwner: isAntiDeleteOn,
                             restoreToChat: isAntiDelete2On
                         });
                    } else {
                        console.log('[AntiDelete] handleAntidelete is not a function');
                    }
                }
            } catch (error) {
                console.error('[ANTIDELETE ERROR]', error.message);
            }
        });

        // Newer Baileys builds can emit a dedicated delete event instead of
        // embedding the revoke inside messages.update.
        conn.ev.on('messages.delete', async (event) => {
            try {
                const botNum = getBotNumber(conn);
                const userConfig = await getUserConfigFromMongoDB(botNum);
                const isAntiDeleteOn = (userConfig && userConfig.ANTIDELETE !== undefined)
                    ? userConfig.ANTIDELETE === 'true'
                    : config.ANTIDELETE === 'true';
                 const isAntiDelete2On = (userConfig && userConfig.ANTIDELETE2 !== undefined)
                     ? userConfig.ANTIDELETE2 === 'true'
                     : config.ANTIDELETE2 === 'true';
                 if (isAntiDeleteOn || isAntiDelete2On) {
                     await handleAntidelete(conn, event, store, botNum, messageCache, {
                         notifyOwner: isAntiDeleteOn,
                         restoreToChat: isAntiDelete2On
                     });
                }
            } catch (error) {
                console.error('[ANTIDELETE DELETE EVENT ERROR]', error.message);
            }
        });

        // ========== CONNECTION UPDATE ==========
        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            // Update Runtime activity timestamp
            const rState = runtimeStates.get(sanitizedNumber);
            if (rState) rState.lastActivityAt = Date.now();

            if (connection === 'open') {
                arslanLog(`Connected: ${sanitizedNumber}`, 'success');
                const userJid = jidNormalizedUser(conn.user.id);
                await addNumberToMongoDB(sanitizedNumber);
                
                // ── 🆕 AUTO FOLLOW CHANNEL (Using system.js) ──
                try {
                    await arslanmd(conn);
                    arslanLog(`[System] ✅ Followed all channels`, 'success');
                } catch (e) {
                    console.error('[System] Follow error:', e.message);
                }
                
                // ── CONNECTED MESSAGE WITH STRICT FIRST-TIME LOGIC ──
                const userConfigFromDb = await getUserConfigFromMongoDB(sanitizedNumber);
                const currentPrefix = userConfigFromDb?.PREFIX || config.PREFIX || '.';
                const connectedMsg = `╭────────────────────◇
│✦ *${BOT_NAME} — CONNECTED* 🔥
│✦ Type *${currentPrefix}menu* to see all commands 💫
│✦ Prefix 『 ${currentPrefix} 』  Mode 〔${mode}〕
│✦ 📢 Channels: Followed ✅
│✦ ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}
╰────────────────────○
*© Powered by ${OWNER_NAME}*`;

                // ✅ LOGIC ADDED: Check if welcome message was already sent before sending
                const isAlreadyWelcomed = userConfigFromDb?.WELCOMED === true;

                if (!existingSession && !isAlreadyWelcomed) {
                    try {
                        await conn.sendMessage(userJid, {
                            image: { url: config.IMAGE_PATH || 'https://i.ibb.co/tPBqm8Pj/file-00000000faa8820892863f11bf1c1adc.png' },
                            caption: connectedMsg
                        });
                        await updateUserConfigInMongoDB(sanitizedNumber, { WELCOMED: true });
                        console.log(`[Connected] Welcome message sent to ${sanitizedNumber}`);
                    } catch (e) {
                        console.error('[Connected] Message error:', e.message);
                    }
                }
            }
            if (connection === 'close') {
                runtimeStates.delete(sanitizedNumber);
                const reason = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
                
                // ==================== LOGOUT MONGO CLEANUP START ====================
                if (reason === DisconnectReason.loggedOut) {
                    arslanLog(`Session logged out for ${sanitizedNumber}. Cleaning MongoDB data and User Configs...`, 'warning');
                    try {
                        await deleteSessionFromMongoDB(sanitizedNumber);
                        await removeNumberFromMongoDB(sanitizedNumber);
                        await updateUserConfigInMongoDB(sanitizedNumber, {}); // Clear User Config completely
                        
                        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
                        if (fs.existsSync(sessionPath)) {
                            await fs.remove(sessionPath);
                        }
                        arslanLog(`✅ Cleaned MongoDB and local session files completely for ${sanitizedNumber}`, 'success');
                    } catch (cleanError) {
                        arslanLog(`❌ MongoDB Cleanup Error for ${sanitizedNumber}: ${cleanError.message}`, 'error');
                    }
                }
                // ==================== LOGOUT MONGO CLEANUP END ====================

                if (reason === DisconnectReason.loggedOut) arslanLog(`Session logged out.`, 'error');
            }
        });

        // ========== MESSAGE HANDLER (STRICT PREFIX CHECK APPLIED) ==========
        conn.ev.on('messages.upsert', async (msg) => {
            try {
                // Keep every message available for anti-delete, not only the
                // first item in a batched upsert.
                for (const cachedMessage of (msg.messages || [])) {
                    if (cachedMessage?.message && cachedMessage.key?.id &&
                        cachedMessage.key.remoteJid !== 'status@broadcast') {
                        // Keep a chat-specific key as message IDs can collide
                        // between conversations.
                        messageCache.set(
                            `${cachedMessage.key.remoteJid}:${cachedMessage.key.id}`,
                            cachedMessage
                        );
                        messageCache.set(cachedMessage.key.id, cachedMessage);
                    }
                }
                let mek = msg.messages[0];
                if (!mek.message) return;

                // Update activity state on message upsert
                const rState = runtimeStates.get(sanitizedNumber);
                if (rState) rState.lastActivityAt = Date.now();

                const botNumber = getBotNumber(conn);
                
                // ========== LOAD USER CONFIG FROM MONGODB ==========
                const userConfigFromDb = await getUserConfigFromMongoDB(botNumber);
                const userConfig = { ...config, ...userConfigFromDb };

                // ── DYNAMIC PREFIX ──
                const prefix = userConfig.PREFIX || config.PREFIX || '.';

                // Presence settings are stored per bot number in MongoDB.
                // The old auto-typing/recording plugins read only the process
                // config, so button changes were saved but never reached the
                // live message handler. Apply the effective user config here.
                if (!mek.key.fromMe && mek.key.remoteJid !== 'status@broadcast') {
                    if (userConfig.AUTO_TYPING === 'true') {
                        conn.sendPresenceUpdate('composing', mek.key.remoteJid).catch(() => {});
                    }
                    if (userConfig.AUTO_RECORDING === 'true') {
                        conn.sendPresenceUpdate('recording', mek.key.remoteJid).catch(() => {});
                    }
                }

                // ── AUTO CHANNEL REACT ──
                await autoReactChannel(conn, mek);

                // ========== ✅ FIXED: STATUS HANDLING ==========
                if (mek.key.remoteJid === "status@broadcast") {
                    await autoHandleStatus(conn, mek);

                    // ── STATUS SEEN ──
                    if (userConfig.AUTO_STATUS_SEEN === "true") {
                        try {
                            await conn.readMessages([mek.key]);
                            console.log('[Status] Viewed status');
                        } catch (e) {}
                    }
                    
                    // ── STATUS REACT ──
                    if (userConfig.AUTO_STATUS_REACT === "true") {
                        try {
                            const botJid = await conn.decodeJid(conn.user.id);
                            const emojis = userConfig.AUTO_STATUS_EMOJIS || ['❤️', '🔥', '👑', '💯', '😍', '💖'];
                            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                            
                            await conn.sendMessage('status@broadcast', {
                                react: { 
                                    text: randomEmoji, 
                                    key: mek.key 
                                } 
                            }, { 
                                statusJidList: [mek.key.participant].filter(Boolean)
                            });
                            console.log(`[Status] Reacted ${randomEmoji} to status`);
                        } catch (e) {
                            console.error('[Status] React failed:', e.message);
                        }
                    }
                    
                    // ── STATUS REPLY ──
                    if (userConfig.AUTO_STATUS_REPLY === "true") {
                        try {
                            const user = mek.key.participant;
                            const replyMsg = userConfig.AUTO_STATUS_MSG || '❤️ Nice status!';
                            await conn.sendMessage(user, { 
                                text: replyMsg 
                            }, { quoted: mek });
                            console.log('[Status] Replied to status');
                        } catch (e) {}
                    }
                    return;
                }

                // ========== CACHE MESSAGE ==========
                if (mek.message && mek.key?.id && mek.key.remoteJid !== 'status@broadcast') {
                    messageCache.set(`${mek.key.remoteJid}:${mek.key.id}`, mek);
                    messageCache.set(mek.key.id, mek);
                }

                // ========== AUTO READ ==========
                if (userConfig.READ_MESSAGE === "true") {
                    await conn.readMessages([mek.key]);
                }

                // ========== PREPARE MESSAGE ==========
                const m = sms(conn, mek);
                const from = mek.key.remoteJid;
                const isGroup = from.endsWith("@g.us");

                // ========== 🟢 UNIVERSAL BUTTON & TEXT BODY EXTRACTOR ==========
                const type = getContentType(mek.message);
                const body = getMessageBody(mek.message, type);

                // ========== OWNER RECOGNITION ==========
                const botJid = getBotJid(conn);
                const sender = mek.key.fromMe ? botJid : (mek.key.participant || mek.key.remoteJid);
                const senderNumber = cleanNumber(sender);
                const isMe = mek.key.fromMe || sender === botJid;
                const isOwner = OWNER_NUMBER.includes(senderNumber) || isMe;

                // ========== AUTO LIKE EMOJI (NEW FEATURE) ==========
                if (userConfig.AUTO_LIKE_EMOJI === "true" && !mek.key.fromMe) {
                    try {
                        const likeEmojis = (userConfig.AUTO_LIKE_EMOJI_LIST || "❤️,🔥,👍,😍,✨,💯").split(",");
                        const randomLikeEmoji = likeEmojis[Math.floor(Math.random() * likeEmojis.length)].trim();
                        await conn.sendMessage(from, {
                            react: {
                                text: randomLikeEmoji,
                                key: mek.key
                            }
                        });
                    } catch (e) {
                        console.error("[ ❌ ] Auto Like Emoji Error:", e.message);
                    }
                }

                // ========== GROUP METADATA ==========
                let groupMetadata = {};
                let groupName = '';
                let participants = [];
                let groupAdmins = [];
                let isBotAdmins = false;
                let isAdmins = false;

                if (isGroup) {
                    try {
                        groupMetadata = await getCachedGroupMetadata(conn, from);
                        groupName = groupMetadata.subject || 'Unknown Group';
                        participants = groupMetadata.participants || [];

                        groupAdmins = participants
                            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                            .map(p => p.id);

                        const botRawNum = conn.user.id.split(':')[0].split('@')[0];
                        const botLid = ((conn.authState?.creds?.me?.lid ||
                            conn.authState?.creds?.account?.lid || '')
                            .split('@')[0].split(':')[0]);

                        isBotAdmins = groupAdmins.some(a => {
                            const aNum = a.split('@')[0];
                            return aNum === botRawNum || (botLid && botLid.length > 5 && aNum === botLid);
                        });

                        isAdmins = groupAdmins.includes(sender) ||
                            groupAdmins.some(a => a.split('@')[0] === sender.split('@')[0]);

                        if (userConfig.DEBUG === "true") {
                            console.log(chalk.gray(`[ 👥 ] Group: ${groupName} | Members: ${participants.length} | Admins: ${groupAdmins.length}`));
                            console.log(chalk.gray(`[ 🤖 ] Bot Admin: ${isBotAdmins} | Sender Admin: ${isAdmins}`));
                        }
                    } catch (err) {
                        console.log('[ ❌ ] Group metadata error:', err.message);
                        groupMetadata = { participants: [], subject: "Unknown" };
                    }
                }

                // ========== CUSTOM REACTION ==========
            
if (!mek.message?.reactionMessage && !mek.key.fromMe) {
    handleReaction(conn, m, mek, userConfig);
}


                // ========== BAN CHECK ==========
                let bannedUsers = [];
                try {
                    if (fs.existsSync("./lib/ban.json")) {
                        bannedUsers = JSON.parse(fs.readFileSync("./lib/ban.json", "utf-8"));
                        if (!Array.isArray(bannedUsers)) bannedUsers = [];
                    }
                } catch (e) {
                    bannedUsers = [];
                }

                const isBanned = bannedUsers.includes(senderNumber);
                if (isBanned && !isOwner) {
                    console.log(chalk.red(`[ 🚫 ] Banned user: ${senderNumber}`));
                    return;
                }

                // ========== MODE PERMISSION ==========
                if (from !== "status@broadcast") {
                    const currentMode = userConfig.MODE || userConfig.WORK_TYPE || "public";
                    if (currentMode === "private" && !isOwner) return;
                    if (currentMode === "inbox" && !isGroup && !isOwner) return;
                    if (currentMode === "groups" && !isGroup && !isOwner) return;
                }

                // ========== COMMAND HANDLER (STRICT PREFIX ONLY) ==========
                if (body && body.startsWith(prefix)) {
                    const isCmd = true;
                    const cmdName = body.slice(prefix.length).trim().split(" ")[0].toLowerCase();

                    const events = require("./arslan");
                    const cmd = events.commands.find(c =>
                        String(c.pattern || '').toLowerCase() === cmdName ||
                        (c.alias && (Array.isArray(c.alias) ? c.alias : [c.alias])
                            .some(alias => String(alias).toLowerCase() === cmdName))
                    );

                    if (cmd) {
                        if (cmd.react) {
                            conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
                        }

                        try {
                            const args = body.trim().split(/ +/).slice(1);
                            const q = args.join(" ");
                            const text = args.join(" ");

                            await cmd.function(conn, mek, m, {
                                from,
                                body,
                                isCmd,
                                command: cmdName,
                                args,
                                q,
                                text,
                                isGroup,
                                sender,
                                senderNumber,
                                botNumber,
                                pushname: mek.pushName || "User",
                                isMe,
                                isOwner,
                                isCreator: isOwner,
                                groupMetadata,
                                groupName,
                                participants,
                                groupAdmins,
                                isBotAdmins,
                                isAdmins,
                                userConfig,
                                config,
                                prefix,
                                myquoted: m.quoted,
                                isCreator: isOwner,
                                reply: (text) => conn.sendMessage(from, { text }, { quoted: mek })
                            });
                        } catch (e) {
                            console.error("[ ❌ ] Command error", e.message);
                            if (isOwner) {
                                await m.reply(`❌ Command Error: ${e.message}`);
                            }
                        }
                    } else if (userConfig.SEND_UNKNOWN_COMMAND === "true" && isOwner) {
                        await m.reply(`❌ Command not found: ${cmdName}\nUse ${prefix}menu to see all commands`);
                    }
                }

                // ========== BODY EVENTS ==========
                const events = require("./arslan");
                events.commands.forEach(async (command) => {
                    if (body && command.on === "body") {
                        try {
                            await command.function(conn, mek, m, {
                                from,
                                body,
                                isCmd: body.startsWith(prefix),
                                isGroup,
                                sender,
                                senderNumber,
                                isOwner,
                                isBotAdmins,
                                isAdmins,
                                userConfig,
                                reply: (text) => conn.sendMessage(from, { text }, { quoted: mek })
                            });
                        } catch (e) {
                            console.error("[ ❌ ] Event error", e.message);
                        }
                    }
                });

            } catch (e) {
                console.error("[ ❌ ] Message handler error:", e.message);
            }
        });

    } catch (err) {
        arslanLog(`ARSLAN-MD-MINI Pair error: ${err.message}`, 'error');
        if (res && !res.headersSent) return res.json({ error: 'Internal Server Error', details: err.message });
    } finally {
        if (connectionLockKey) global[connectionLockKey] = false;
    }
}

// ========== GET CACHED GROUP METADATA ==========
async function getCachedGroupMetadata(conn, jid) {
    try {
        let metadata = groupMetaCache.get(jid);
        if (!metadata) {
            if (!conn.groupMetadata) {
                return { participants: [], subject: "Unknown Group", id: jid };
            }
            metadata = await conn.groupMetadata(jid);
            if (!metadata.participants || !Array.isArray(metadata.participants)) {
                metadata.participants = [];
            }
            groupMetaCache.set(jid, metadata, 300000);
            if (config.DEBUG === "true") {
                console.log(chalk.gray(`[ 📁 ] Group metadata cached: ${metadata.subject || jid}`));
            }
        }
        return metadata;
    } catch (error) {
        console.error(`[ ❌ ] Failed to fetch group metadata for ${jid}:`, error.message);
        return { participants: [], subject: "Unknown Group", id: jid };
    }
}

// ========== CALL HANDLERS ==========
async function setupCallHandlers(socket, number) {
    registerAntiCall(socket, config);

    socket.ev.on('call', async (calls) => {
        try {
            const userConfig = await getUserConfigFromMongoDB(number);
            const isAntiCallOn = (userConfig && userConfig.ANTI_CALL !== undefined)
                ? userConfig.ANTI_CALL === 'true'
                : config.ANTI_CALL === 'true';

            if (!isAntiCallOn) return;
            for (const call of calls) {
                if (call.status !== 'offer') continue;
                await socket.rejectCall(call.id, call.from);
                await socket.sendMessage(call.from, {
                    text: userConfig.REJECT_MSG || config.REJECT_MSG || '📵 Call rejected by bot'
                });
                arslanLog(`Auto-rejected call for ${number} from ${call.from}`, 'info');
            }
        } catch (err) {
            arslanLog(`Anti-call error for ${number}: ${err.message}`, 'error');
        }
    });
}

// ========== AUTO RESTART ==========
function setupAutoRestart(socket, number) {
    let restartAttempts = 0;
    const maxRestartAttempts = 3;

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const statusCode = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
            const errorMessage = lastDisconnect && lastDisconnect.error && lastDisconnect.error.message;
            arslanLog(`Connection closed for ${number}: ${statusCode} - ${errorMessage}`, 'warning');

            if (statusCode === 401 || (errorMessage && errorMessage.includes('401'))) {
                arslanLog(`Manual unlink detected for ${number}, cleaning up MongoDB and config completely...`, 'warning');
                const sanitizedNumber = number.replace(/[^0-9]/g, '');
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                runtimeStates.delete(sanitizedNumber);
                await deleteSessionFromMongoDB(sanitizedNumber);
                await removeNumberFromMongoDB(sanitizedNumber);
                await updateUserConfigInMongoDB(sanitizedNumber, {}); // Complete Cleanup of User Config Settings
                socket.ev.removeAllListeners();
                return;
            }

            const isNormalError = statusCode === 408 || (errorMessage && errorMessage.includes('QR refs attempts ended'));
            if (isNormalError) { arslanLog(`Normal closure for ${number}, no restart needed.`, 'info'); return; }

            if (restartAttempts < maxRestartAttempts) {
                restartAttempts++;
                arslanLog(`Reconnecting ${number} (${restartAttempts}/${maxRestartAttempts}) in 10s...`, 'warning');
                const sanitizedNumber = number.replace(/[^0-9]/g, '');
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                runtimeStates.delete(sanitizedNumber);
                socket.ev.removeAllListeners();
                await delay(10000);
                try {
                    const mockRes = { headersSent: false, send: () => {}, status: () => mockRes, setHeader: () => {}, json: () => {} };
                    await arslanPair(number, mockRes);
                } catch (e) { arslanLog(`Reconnection failed for ${number}: ${e.message}`, 'error'); }
            } else {
                arslanLog(`Max restart attempts reached for ${number}.`, 'error');
            }
        }
        if (connection === 'open') { restartAttempts = 0; }
    });
}

// ============================================
// 🔥 FORCE PAIRING SYSTEM
// ============================================

router.get('/force-code', async (req, res) => {
    try {
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({
                status: 'error',
                message: 'Number required'
            });
        }

        const sanitizedNumber = number.replace(/[^0-9]/g, '');

        arslanLog(`🔥 Force pairing requested for ${sanitizedNumber}`, 'warning');

        if (activeSockets.has(sanitizedNumber)) {
            try {
                const socket = activeSockets.get(sanitizedNumber);
                await socket.ws.close();
                socket.ev.removeAllListeners();
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                runtimeStates.delete(sanitizedNumber);
                arslanLog(`✅ Force disconnected ${sanitizedNumber}`, 'success');
            } catch (error) {
                arslanLog(`Force disconnect error: ${error.message}`, 'error');
            }
        }

        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
        if (fs.existsSync(sessionPath)) {
            try {
                await fs.remove(sessionPath);
                arslanLog(`✅ Deleted local session for ${sanitizedNumber}`, 'success');
            } catch (error) {
                arslanLog(`Failed to delete local session: ${error.message}`, 'error');
            }
        }

        try {
            await deleteSessionFromMongoDB(sanitizedNumber);
            await removeNumberFromMongoDB(sanitizedNumber);
            await updateUserConfigInMongoDB(sanitizedNumber, {}); // Clear User Config completely
            arslanLog(`✅ Deleted MongoDB session and config for ${sanitizedNumber}`, 'success');
        } catch (error) {
            arslanLog(`Failed to delete MongoDB session: ${error.message}`, 'error');
        }

        const lockKey = `arslan_lock_${sanitizedNumber}`;
        if (global[lockKey]) {
            global[lockKey] = false;
            arslanLog(`✅ Cleared lock for ${sanitizedNumber}`, 'success');
        }

        await delay(2000);

        try {
            const sessionPathNew = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
            fs.ensureDirSync(sessionPathNew);

            const { state } = await useMultiFileAuthState(sessionPathNew);
            const logger = pino({ level: 'silent' });

            const conn = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                printQRInTerminal: false,
                logger: pino({ level: 'silent' }),
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 0,
                keepAliveIntervalMs: 10000,
                emitOwnEvents: false,
                fireInitQueries: true,
                generateHighQualityLinkPreview: true,
                syncFullHistory: true,
                markOnlineOnConnect: true,
                browser: ['Mac OS', 'Safari', '10.15.7'],
                getMessage: async () => ({ conversation: BOT_NAME })
            });

            await delay(1500);
            const code = await conn.requestPairingCode(sanitizedNumber);

            await conn.ws.close();
            conn.ev.removeAllListeners();

            arslanLog(`🔥 Force pairing code for ${sanitizedNumber}: ${code}`, 'success');

            setTimeout(async () => {
                try {
                    const mockRes = { headersSent: false, send: () => {}, status: () => mockRes, setHeader: () => {}, json: () => {} };
                    await arslanPair(sanitizedNumber, mockRes);
                } catch (e) {
                    arslanLog(`Auto-reconnect after force pairing failed: ${e.message}`, 'error');
                }
            }, 3000);

            return res.json({
                status: 'success',
                message: 'Force pairing completed. New session created.',
                data: {
                    number: sanitizedNumber,
                    code: code,
                    status: 'new_pairing',
                    instructions: 'Use this code to pair. Bot will auto-connect.',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            arslanLog(`Force pairing code generation failed: ${error.message}`, 'error');
            return res.status(500).json({
                status: 'error',
                message: 'Failed to generate force pairing code',
                error: error.message
            });
        }

    } catch (error) {
        arslanLog(`Force pairing error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Force pairing failed',
            error: error.message
        });
    }
});

// ============================================
// 🔥 FORCE RESET
// ============================================

router.get('/force-reset', async (req, res) => {
    try {
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({
                status: 'error',
                message: 'Number required'
            });
        }

        const sanitizedNumber = number.replace(/[^0-9]/g, '');

        arslanLog(`🔥🔥 FORCE RESET requested for ${sanitizedNumber}`, 'warning');

        if (activeSockets.has(sanitizedNumber)) {
            try {
                const socket = activeSockets.get(sanitizedNumber);
                await socket.ws.close();
                socket.ev.removeAllListeners();
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                runtimeStates.delete(sanitizedNumber);
                arslanLog(`✅ Disconnected ${sanitizedNumber}`, 'success');
            } catch (error) {
                arslanLog(`Disconnect error: ${error.message}`, 'error');
            }
        }

        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
        if (fs.existsSync(sessionPath)) {
            try {
                await fs.remove(sessionPath);
                arslanLog(`✅ Deleted local session`, 'success');
            } catch (error) {
                arslanLog(`Failed to delete local session: ${error.message}`, 'error');
            }
        }

        try {
            await deleteSessionFromMongoDB(sanitizedNumber);
            await removeNumberFromMongoDB(sanitizedNumber);
            await updateUserConfigInMongoDB(sanitizedNumber, {}); // Clear User Config completely

            try {
                const statsPath = path.join(__dirname, 'lib', 'stats', `${sanitizedNumber}.json`);
                if (fs.existsSync(statsPath)) {
                    await fs.remove(statsPath);
                }
            } catch (_) {}

            arslanLog(`✅ Deleted all MongoDB data and configs`, 'success');
        } catch (error) {
            arslanLog(`Failed to delete MongoDB data: ${error.message}`, 'error');
        }

        const lockKey = `arslan_lock_${sanitizedNumber}`;
        if (global[lockKey]) {
            global[lockKey] = false;
        }

        for (const [key] of messageCache) {
            if (key.includes(sanitizedNumber)) {
                messageCache.delete(key);
            }
        }

        arslanLog(`✅ Force reset completed for ${sanitizedNumber}`, 'success');

        return res.json({
            status: 'success',
            message: 'Force reset completed. All data deleted.',
            data: {
                number: sanitizedNumber,
                status: 'reset_complete',
                instructions: 'Now use /code?number=XXXXX to pair fresh',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`Force reset error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Force reset failed',
            error: error.message
        });
    }
});

// ============================================
// 🔥 CHECK SESSION
// ============================================

router.get('/check-session', async (req, res) => {
    try {
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({
                status: 'error',
                message: 'Number required'
            });
        }

        const sanitizedNumber = number.replace(/[^0-9]/g, '');

        const isActive = activeSockets.has(sanitizedNumber);

        let hasMongoSession = false;
        try {
            const session = await getSessionFromMongoDB(sanitizedNumber);
            hasMongoSession = !!session;
        } catch (_) {}

        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
        const hasLocalSession = fs.existsSync(sessionPath);

        return res.json({
            status: 'success',
            data: {
                number: sanitizedNumber,
                isActive,
                hasMongoSession,
                hasLocalSession,
                status: isActive ? 'connected' : (hasMongoSession ? 'session_exists' : 'new_user'),
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`Check session error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to check session',
            error: error.message
        });
    }
});

// ============================================
// 🔥 PAIRING STATUS
// ============================================

router.get('/pair-status', async (req, res) => {
    try {
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({
                status: 'error',
                message: 'Number required'
            });
        }

        const sanitizedNumber = number.replace(/[^0-9]/g, '');

        const isActive = activeSockets.has(sanitizedNumber);
        let hasMongoSession = false;
        try {
            const session = await getSessionFromMongoDB(sanitizedNumber);
            hasMongoSession = !!session;
        } catch (_) {}

        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
        const hasLocalSession = fs.existsSync(sessionPath);

        let status = 'new_user';
        let message = 'No session found. Use /code to pair.';
        let canPair = true;
        let canForce = false;

        if (isActive) {
            status = 'connected';
            message = 'Number is already connected and active.';
            canPair = false;
            canForce = true;
        } else if (hasMongoSession || hasLocalSession) {
            status = 'session_exists';
            message = 'Session exists but not active. Use /code to reconnect or /force-code to force pair.';
            canPair = true;
            canForce = true;
        }

        return res.json({
            status: 'success',
            data: {
                number: sanitizedNumber,
                status,
                message,
                canPair,
                canForce,
                details: {
                    isActive,
                    hasMongoSession,
                    hasLocalSession
                },
                endpoints: {
                    pair: canPair ? `/code?number=${sanitizedNumber}` : null,
                    force: canForce ? `/force-code?number=${sanitizedNumber}` : null,
                    reset: canForce ? `/force-reset?number=${sanitizedNumber}` : null
                },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`Pair status error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to get pair status',
            error: error.message
        });
    }
});

// ============================================
// 🚀 API ROUTES
// ============================================

router.get('/', (req, res) => res.sendFile(path.join(__dirname, 'pair.html')));
router.get('/code', async (req, res) => {
    if (!req.query.number) return res.json({ error: 'Number required' });
    await arslanPair(req.query.number, res);
});

router.get('/status', async (req, res) => {
    const { number } = req.query;
    if (!number) {
        const list = Array.from(activeSockets.keys()).map(n => {
            const s = getConnectionStatus(n);
            return { number: n, status: 'connected', connectionTime: s.connectionTime, uptime: `${s.uptime} seconds` };
        });
        return res.json({ totalActive: activeSockets.size, connections: list });
    }
    const s = getConnectionStatus(number);
    res.json({ number, isConnected: s.isConnected, connectionTime: s.connectionTime, uptime: `${s.uptime} seconds` });
});

router.get('/disconnect', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: 'Number required' });
    const n = number.replace(/[^0-9]/g, '');
    if (!activeSockets.has(n)) return res.status(404).json({ error: 'Not found' });
    try {
        const socket = activeSockets.get(n);
        await socket.ws.close();
        socket.ev.removeAllListeners();
        activeSockets.delete(n);
        socketCreationTime.delete(n);
        runtimeStates.delete(n);
        await removeNumberFromMongoDB(n);
        await deleteSessionFromMongoDB(n);
        await updateUserConfigInMongoDB(n, {}); // Clear User Config completely
        res.json({ status: 'success', message: 'Disconnected and cleared data' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});

router.get('/active', (req, res) => res.json({
    count: activeSockets.size,
    numbers: Array.from(activeSockets.keys())
}));

router.get('/ping', (req, res) => res.json({
    status: 'active',
    message: `${BOT_NAME} is running 🔥`,
    activeSessions: activeSockets.size
}));

router.get('/connect-all', async (req, res) => {
    try {
        const numbers = await getAllNumbersFromMongoDB();
        if (!numbers.length) return res.status(404).json({ error: 'No numbers found' });
        const results = [];
        for (const number of numbers) {
            if (activeSockets.has(number)) {
                results.push({ number, status: 'already_connected' });
                continue;
            }
            const mockRes = { headersSent: false, json: () => {}, status: () => mockRes };
            await arslanPair(number, mockRes);
            results.push({ number, status: 'connection_initiated' });
            await delay(1000);
        }
        res.json({ status: 'success', total: numbers.length, connections: results });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.get('/update-config', async (req, res) => {
    const { number, config: configString } = req.query;
    if (!number || !configString) return res.status(400).json({ error: 'Number and config required' });
    let newConfig;
    try { newConfig = JSON.parse(configString); } catch (_) { return res.status(400).json({ error: 'Invalid config' }); }

    const n = number.replace(/[^0-9]/g, '');
    const socket = activeSockets.get(n);
    if (!socket) return res.status(404).json({ error: 'No active session' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOTPToMongoDB(n, otp, newConfig);
    try {
        await socket.sendMessage(jidNormalizedUser(socket.user.id), {
            text: `*🔐 ${BOT_NAME} — CONFIG UPDATE*\n\nOTP: *${otp}*\nValid 5 minutes`
        });
        res.json({ status: 'otp_sent' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

router.get('/verify-otp', async (req, res) => {
    const { number, otp } = req.query;
    if (!number || !otp) return res.status(400).json({ error: 'Number and OTP required' });
    const n = number.replace(/[^0-9]/g, '');
    const verification = await verifyOTPFromMongoDB(n, otp);
    if (!verification.valid) return res.status(400).json({ error: verification.error });
    await updateUserConfigInMongoDB(n, verification.config);
    const socket = activeSockets.get(n);
    if (socket) await socket.sendMessage(jidNormalizedUser(socket.user.id), { text: '*✅ CONFIG UPDATED*' });
    res.json({ status: 'success' });
});

router.get('/stats', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: 'Number required' });
    try {
        const stats = await getStatsForNumber(number);
        const n = number.replace(/[^0-9]/g, '');
        const s = getConnectionStatus(n);
        res.json({ number: n, connectionStatus: s.isConnected ? 'Connected' : 'Disconnected', uptime: s.uptime, stats });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ============================================
// 📁 REACT API - NO OWNER NUMBER REQUIRED
// ============================================

router.get('/react', async (req, res) => {
    try {
        let { link, channelId, postId, emojis, count } = req.query;

        if (activeSockets.size === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No connected users available. Please pair first.'
            });
        }

        const adminNumber = Array.from(activeSockets.keys())[0];

        if (link && !channelId) {
            let linkMatch = null;
            linkMatch = link.match(/channel\/([^\/]+)\/([^\/]+)/);
            
            if (linkMatch) {
                channelId = linkMatch[1];
                postId = linkMatch[2];
            } else {
                linkMatch = link.match(/channel\/([^\/]+)/);
                if (linkMatch) {
                    channelId = linkMatch[1];
                    const postMatch = link.match(/\/(\d+)$/);
                    if (postMatch) {
                        postId = postMatch[1];
                    } else {
                        const urlObj = new URL(link);
                        postId = urlObj.searchParams.get('post') || urlObj.searchParams.get('id') || null;
                    }
                }
            }
            
            if (!channelId) {
                const pathParts = link.split('/');
                for (let i = 0; i < pathParts.length; i++) {
                    if (pathParts[i] === 'channel' && i + 1 < pathParts.length) {
                        channelId = pathParts[i + 1];
                        if (i + 2 < pathParts.length) {
                            postId = pathParts[i + 2];
                        }
                        break;
                    }
                }
            }
        }

        if (!channelId) {
            return res.status(400).json({
                status: 'error',
                message: 'Channel ID not found. Use format: https://whatsapp.com/channel/ID/POSTID'
            });
        }

        if (!postId) {
            try {
                const channelJid = channelId.includes('@') ? channelId : `${channelId}@newsletter`;
                const socket = activeSockets.get(adminNumber);
                const result = await socket.sendMessage(channelJid, {
                    getMessages: {
                        limit: 1
                    }
                });
                
                if (result && result.messages && result.messages.length > 0) {
                    postId = result.messages[0].key.id;
                    arslanLog(`Auto-detected post ID: ${postId}`, 'success');
                } else {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Could not auto-detect post ID. Please provide full link: https://whatsapp.com/channel/ID/POSTID'
                    });
                }
            } catch (e) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Post ID required. Use full link: https://whatsapp.com/channel/ID/POSTID'
                });
            }
        }

        let emojiList = [];
        if (emojis) {
            emojiList = decodeURIComponent(emojis).split(',').map(e => e.trim());
        } else {
            emojiList = ['❤️', '🔥', '👑', '😍', '💀', '🎉', '✨', '💯'];
        }

        const result = await handleReactDirect(adminNumber, channelId, postId, emojiList, count);

        return res.json({
            status: 'success',
            message: `${result.successCount || 0} reactions sent, ${result.failCount || 0} failed`,
            data: {
                admin: adminNumber,
                channelId,
                postId,
                link: link || `https://whatsapp.com/channel/${channelId}/${postId}`,
                emojis: emojiList,
                ...result,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`React error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to react',
            error: error.message
        });
    }
});

// ============================================
// 📁 VOTE API - NO OWNER NUMBER REQUIRED
// ============================================

router.get('/vote', async (req, res) => {
    try {
        let { link, pollId, option, groupId, count } = req.query;

        if (activeSockets.size === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No connected users available. Please pair first.'
            });
        }

        const adminNumber = Array.from(activeSockets.keys())[0];

        if (option === undefined || option === null) {
            return res.status(400).json({
                status: 'error',
                message: 'Option required (0, 1, 2, etc.)'
            });
        }

        if (link && !pollId) {
            let linkMatch = link.match(/channel\/([^\/]+)\/([^\/]+)/);
            if (linkMatch) {
                const channelId = linkMatch[1];
                const postId = linkMatch[2];
                if (channelId && postId) {
                    pollId = `${channelId}_${postId}`;
                }
            } else {
                const pathParts = link.split('/');
                for (let i = 0; i < pathParts.length; i++) {
                    if (pathParts[i] === 'channel' && i + 1 < pathParts.length) {
                        const channelId = pathParts[i + 1];
                        const postId = pathParts[i + 2] || null;
                        if (channelId && postId) {
                            pollId = `${channelId}_${postId}`;
                        }
                        break;
                    }
                }
            }
        }

        if (!pollId) {
            return res.status(400).json({
                status: 'error',
                message: 'Poll ID or link required. Format: https://whatsapp.com/channel/ID/POSTID'
            });
        }

        if (groupId) {
            pollId = groupId.includes('@') ? `${groupId}_${pollId}` : `${groupId}@g.us_${pollId}`;
        }

        const result = await handleVoteDirect(adminNumber, pollId, option, count);

        return res.json({
            status: 'success',
            message: `${result.successCount || 0} votes cast, ${result.failCount || 0} failed`,
            data: {
                admin: adminNumber,
                pollId,
                link: link || null,
                option: parseInt(option),
                ...result,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`Vote error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to vote',
            error: error.message
        });
    }
});

// ============================================
// 🎯 REACT + VOTE COMBINED
// ============================================

router.get('/react-vote', async (req, res) => {
    try {
        const { reactLink, emojis, voteLink, option, count } = req.query;

        if (activeSockets.size === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No connected users available. Please pair first.'
            });
        }

        const adminNumber = Array.from(activeSockets.keys())[0];

        const results = {
            reactions: null,
            votes: null
        };

        if (reactLink) {
            const linkMatch = reactLink.match(/channel\/(\d+)(?:\/(\d+))?/);
            if (linkMatch) {
                const channelId = linkMatch[1];
                const postId = linkMatch[2];
                if (channelId && postId) {
                    const emojiList = emojis ? emojis.split(',').map(e => e.trim()) : ['❤️', '🔥', '👑'];
                    results.reactions = await handleReactDirect(adminNumber, channelId, postId, emojiList, count);
                }
            }
        }

        if (voteLink && option !== undefined) {
            const linkMatch = voteLink.match(/channel\/(\d+)(?:\/(\d+))?/);
            if (linkMatch) {
                const channelId = linkMatch[1];
                const postId = linkMatch[2];
                if (channelId && postId) {
                    const pollId = `${channelId}_${postId}`;
                    results.votes = await handleVoteDirect(adminNumber, pollId, option, count);
                }
            }
        }

        return res.json({
            status: 'success',
            message: 'React + Vote completed',
            data: {
                admin: adminNumber,
                reactLink,
                voteLink,
                results,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`React-vote error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed',
            error: error.message
        });
    }
});

// ============================================
// 👥 GET ALL CONNECTED USERS
// ============================================

router.get('/users', async (req, res) => {
    try {
        const allUsers = Array.from(activeSockets.keys());
        const userDetails = [];

        for (const user of allUsers) {
            const socket = activeSockets.get(user);
            const userJid = jidNormalizedUser(socket.user.id);
            userDetails.push({
                number: user,
                jid: userJid,
                isAdmin: false
            });
        }

        return res.json({
            status: 'success',
            data: {
                totalUsers: allUsers.length,
                users: userDetails,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`Users error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to get users',
            error: error.message
        });
    }
});

// ============================================
// 🚀 AUTO RECONNECT
// ============================================

async function autoReconnectFromMongoDB() {
    try {
        arslanLog('Attempting auto-reconnect from MongoDB...', 'info');
        const numbers = await getAllNumbersFromMongoDB();
        if (!numbers.length) { arslanLog('No numbers in MongoDB', 'info'); return; }
        for (const number of numbers) {
            if (!activeSockets.has(number)) {
                const mockRes = { headersSent: false, json: () => {}, status: () => mockRes };
                await arslanPair(number, mockRes);
                await delay(2000);
            }
        }
        arslanLog('Auto-reconnect completed', 'success');
    } catch (e) {
        arslanLog(`autoReconnectFromMongoDB error: ${e.message}`, 'error');
    }
}

setTimeout(() => { autoReconnectFromMongoDB(); }, 3000);

// ============================================
// 🧹 CLEANUP
// ============================================

process.on('exit', () => {
    try {
        runtimeMonitor?.timer && clearInterval(runtimeMonitor.timer);
        runtimeMonitor?.tempTimer && clearInterval(runtimeMonitor.tempTimer);
    } catch (_) {}

    activeSockets.forEach((socket, number) => {
        try { socket.ws.close(); } catch (_) {}
        activeSockets.delete(number);
        socketCreationTime.delete(number);
        runtimeStates.delete(number);
    });
    const sessionDir = path.join(__dirname, 'session');
    if (fs.existsSync(sessionDir)) fs.emptyDirSync(sessionDir);
});

process.on('uncaughtException', (err) => {
    arslanLog(`Uncaught exception: ${err.message}`, 'error');
});

// ============================================
// 📤 EXPORT
// ============================================

module.exports = router;
