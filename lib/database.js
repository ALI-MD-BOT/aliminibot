const mongoose = require('mongoose');
const config = require('../config');

const connectdb = async () => {
    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(config.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log("✅ Database Connected Successfully");
    } catch (e) {
        console.error("❌ Database Connection Failed:", e.message);
    }
};

// ====================================
// MODÈLES
// ====================================

const sessionSchema = new mongoose.Schema({
    number: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    credentials: {
        type: Object,
        required: true
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const userConfigSchema = new mongoose.Schema({
    number: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    config: {
        AUTO_RECORDING: { type: String, default: 'false' },
        AUTO_TYPING: { type: String, default: 'false' },
        AUTO_REACT: { type: String, default: 'false' },
        ANTI_CALL: { type: String, default: 'false' },
        REJECT_MSG: { type: String, default: '*🔕 ʏᴏᴜʀ ᴄᴀʟʟ ᴡᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ʀᴇᴊᴇᴄᴛᴇᴅ..!*' },
        READ_MESSAGE: { type: String, default: 'false' },
        AUTO_VIEW_STATUS: { type: String, default: 'false' },
        AUTO_LIKE_STATUS: { type: String, default: 'false' },
        AUTO_STATUS_SEEN: { type: String, default: 'false' },
        AUTO_STATUS_REACT: { type: String, default: 'false' },
        WELCOME_ENABLE: { type: String, default: 'false' },
        GOODBYE_ENABLE: { type: String, default: 'false' },
        PREFIX: { type: String, default: '.' },
        WORK_TYPE: { type: String, default: 'public' },
        MODE: { type: String, default: 'public' },
        BOT_NAME: { type: String, default: '' },
        MENU_CARD: { type: String, default: '' },
        MENU_FOOTER: { type: String, default: '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ' },
        MENU_CHANNEL_NAME: { type: String, default: '𝘼𝙧𝙨𝙡𝙖𝙣-𝙈𝘿 𝙈𝙞𝙣𝙞 𝙑²' },
        MENU_IMAGE_URL: { type: String, default: '' },
        AUTO_STATUS_REPLY: { type: String, default: 'false' },
        AUTO_STATUS_MSG: { type: String, default: 'Hello from black popkid!' },
        AUTO_LIKE_EMOJI: { type: Array, default: ['❤️', '👍', '😮', '😎'] },
        ANTIDELETE: { type: String, default: 'false' },
        ANTIDELETE2: { type: String, default: 'false' }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const groupConfigSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true, index: true },
    antilink: { type: Boolean, default: false },
    action: { type: String, default: 'warn' },
    warns: { type: Map, of: Number, default: {} },
    antibad: { type: Boolean, default: false },
    badAction: { type: String, default: 'warn' },
    badWarns: { type: Map, of: Number, default: {} },
    updatedAt: { type: Date, default: Date.now }
});

const otpSchema = new mongoose.Schema({
    number: { 
        type: String, 
        required: true,
        index: true 
    },
    otp: { type: String, required: true },
    config: { type: Object, required: true },
    expiresAt: { 
        type: Date, 
        default: () => new Date(Date.now() + 5 * 60000),
        index: { expires: '5m' }
    },
    createdAt: { type: Date, default: Date.now }
});

const activeNumberSchema = new mongoose.Schema({
    number: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    lastConnected: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    connectionInfo: {
        ip: String,
        userAgent: String,
        timestamp: Date
    }
});

const statsSchema = new mongoose.Schema({
    number: { type: String, required: true },
    date: { type: String, required: true },
    commandsUsed: { type: Number, default: 0 },
    messagesReceived: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    groupsInteracted: { type: Number, default: 0 }
});

// ===============================
// DÉFINITION DES MODÈLES
// ===============================

const Session = mongoose.model('Session', sessionSchema);
const UserConfig = mongoose.model('UserConfig', userConfigSchema);
const GroupConfig = mongoose.model('GroupConfig', groupConfigSchema);
const OTP = mongoose.model('OTP', otpSchema);
const ActiveNumber = mongoose.model('ActiveNumber', activeNumberSchema);
const Stats = mongoose.model('Stats', statsSchema);

// ====================================
// FONCTIONS GROUPES (ANTILINK & ANTIBAD)
// ====================================

async function getGroupConfig(groupId) {
    try {
        let group = await GroupConfig.findOne({ groupId });
        if (!group) {
            group = await GroupConfig.create({ groupId });
        }
        return group;
    } catch (e) {
        console.error('❌ Error getting group config:', e);
        return { 
            antilink: false, action: 'warn', warns: new Map(),
            antibad: false, badAction: 'warn', badWarns: new Map()
        };
    }
}

async function updateGroupConfig(groupId, updateData) {
    try {
        return await GroupConfig.findOneAndUpdate(
            { groupId },
            { $set: { ...updateData, updatedAt: new Date() } },
            { upsert: true, new: true }
        );
    } catch (e) {
        console.error('❌ Error updating group config:', e);
        return null;
    }
}

async function clearUserWarns(groupId, senderNumber, type = 'antilink') {
    try {
        const fieldToUnset = type === 'antibad' ? `badWarns.${senderNumber}` : `warns.${senderNumber}`;
        await GroupConfig.updateOne(
            { groupId },
            { $unset: { [fieldToUnset]: "" } }
        );
    } catch (e) {
        console.error('❌ Error clearing warns:', e);
    }
}

// Session Functions
async function saveSessionToMongoDB(number, credentials) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await Session.findOneAndUpdate(
            { number: cleanNumber },
            { 
                credentials: credentials,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        console.log(`📁 Session saved to MongoDB for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error saving session to MongoDB:', error);
        return false;
    }
}

async function getSessionFromMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const session = await Session.findOne({ number: cleanNumber });
        return session ? session.credentials : null;
    } catch (error) {
        console.error('❌ Error getting session from MongoDB:', error);
        return null;
    }
}

async function deleteSessionFromMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await Session.deleteOne({ number: cleanNumber });
        await ActiveNumber.deleteOne({ number: cleanNumber });
        
        console.log(`🗑️ Session deleted from MongoDB for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error deleting session from MongoDB:', error);
        return false;
    }
}

// 🟢 NEW: FULL USER CLEANUP ON LOGOUT
async function clearUserAllData(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await Session.deleteOne({ number: cleanNumber });
        await ActiveNumber.deleteOne({ number: cleanNumber });
        await UserConfig.deleteOne({ number: cleanNumber });
        await Stats.deleteMany({ number: cleanNumber });
        await OTP.deleteMany({ number: cleanNumber });
        console.log(`🧹 ALL MongoDB data completely cleaned for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error clearing user data from MongoDB:', error);
        return false;
    }
}

// User Config Functions
async function getUserConfigFromMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        let userDoc = await UserConfig.findOne({ number: cleanNumber });
        
        const defaultConfig = {
            AUTO_RECORDING: 'false',
            AUTO_TYPING: 'false',
            AUTO_REACT: 'false',
            ANTI_CALL: 'false',
            REJECT_MSG: '*🔕 ʏᴏᴜʀ ᴄᴀʟʟ ᴡᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ʀᴇᴊᴇᴄᴛᴇᴅ..!*',
            READ_MESSAGE: 'false',
            AUTO_VIEW_STATUS: 'true',
            AUTO_LIKE_STATUS: 'true',
            AUTO_STATUS_SEEN: 'false',
            AUTO_STATUS_REACT: 'false',
            WELCOME_ENABLE: 'false',
            GOODBYE_ENABLE: 'false',
            PREFIX: '.',
            WORK_TYPE: 'public',
            MODE: 'public',
            BOT_NAME: '',
            MENU_CARD: '',
            MENU_FOOTER: '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ',
            MENU_CHANNEL_NAME: '𝘼𝙧𝙨𝙡𝙖𝙣-𝙈𝘿 𝙈𝙞𝙣𝙞 𝙑²',
            MENU_IMAGE_URL: '',
            AUTO_STATUS_REPLY: 'false',
            AUTO_STATUS_MSG: 'Hello from black popkid!',
            AUTO_LIKE_EMOJI: ['❤️', '👍', '😮', '😎'],
            ANTIDELETE: 'true',
            ANTIDELETE2: 'false'
        };

        if (userDoc) {
            let mergedConfig = { ...defaultConfig, ...userDoc.config };
            if (mergedConfig.WORK_TYPE && !mergedConfig.MODE) mergedConfig.MODE = mergedConfig.WORK_TYPE;
            if (mergedConfig.MODE && !mergedConfig.WORK_TYPE) mergedConfig.WORK_TYPE = mergedConfig.MODE;
            return mergedConfig;
        } else {
            await UserConfig.create({
                number: cleanNumber,
                config: defaultConfig
            });
            return defaultConfig;
        }
    } catch (error) {
        console.error('❌ Error getting user config from MongoDB:', error);
        return { WORK_TYPE: 'public', MODE: 'public', ANTIDELETE: 'true', ANTIDELETE2: 'false' };
    }
}

async function updateUserConfigInMongoDB(number, newConfig) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        
        if (!newConfig || Object.keys(newConfig).length === 0) {
            await UserConfig.deleteOne({ number: cleanNumber });
            console.log(`⚙️ Config completely deleted for ${cleanNumber}`);
            return true;
        }

        const existing = await UserConfig.findOne({ number: cleanNumber });
        let updatedConfig = {};
        
        if (existing) {
            updatedConfig = { ...existing.config, ...newConfig };
        } else {
            updatedConfig = {
                AUTO_RECORDING: 'false',
                AUTO_TYPING: 'false',
                AUTO_REACT: 'false',
                ANTI_CALL: 'false',
                REJECT_MSG: '*🔕 ʏᴏᴜʀ ᴄᴀʟʟ ᴡᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ʀᴇᴊᴇᴄᴛᴇᴅ..!*',
                READ_MESSAGE: 'false',
                AUTO_VIEW_STATUS: 'true',
                AUTO_LIKE_STATUS: 'true',
                AUTO_STATUS_SEEN: 'false',
                AUTO_STATUS_REACT: 'false',
                WELCOME_ENABLE: 'false',
                GOODBYE_ENABLE: 'false',
                PREFIX: '.',
                WORK_TYPE: 'public',
                MODE: 'public',
                BOT_NAME: '',
                MENU_CARD: '',
                MENU_FOOTER: '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀꜱʟᴀɴ-ᴍᴅ',
                MENU_CHANNEL_NAME: '𝘼𝙧𝙨𝙡𝙖𝙣-𝙈𝘿 𝙈𝙞𝙣𝙞 𝙑²',
                MENU_IMAGE_URL: '',
                AUTO_STATUS_REPLY: 'false',
                AUTO_STATUS_MSG: 'Hello from black popkid!',
                AUTO_LIKE_EMOJI: ['❤️', '👍', '😮', '😎'],
                ANTIDELETE: 'true',
                ANTIDELETE2: 'false',
                ...newConfig
            };
        }

        if (newConfig.WORK_TYPE) updatedConfig.MODE = newConfig.WORK_TYPE;
        if (newConfig.MODE) updatedConfig.WORK_TYPE = newConfig.MODE;
        
        await UserConfig.findOneAndUpdate(
            { number: cleanNumber },
            { 
                config: updatedConfig,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        console.log(`⚙️ Config updated for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error updating user config in MongoDB:', error);
        return false;
    }
}

// OTP Functions
async function saveOTPToMongoDB(number, otp, config) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await OTP.create({
            number: cleanNumber,
            otp: otp,
            config: config
        });
        console.log(`🔐 OTP saved for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error saving OTP to MongoDB:', error);
        return false;
    }
}

async function verifyOTPFromMongoDB(number, otp) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const otpRecord = await OTP.findOne({ 
            number: cleanNumber, 
            otp: otp,
            expiresAt: { $gt: new Date() }
        });
        
        if (!otpRecord) {
            return { valid: false, error: 'Invalid or expired OTP' };
        }
        
        await OTP.deleteOne({ _id: otpRecord._id });
        
        return {
            valid: true,
            config: otpRecord.config
        };
    } catch (error) {
        console.error('❌ Error verifying OTP from MongoDB:', error);
        return { valid: false, error: 'Verification error' };
    }
}

// Active Number Functions
async function addNumberToMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await ActiveNumber.findOneAndUpdate(
            { number: cleanNumber },
            { 
                lastConnected: new Date(),
                isActive: true
            },
            { upsert: true, new: true }
        );
        return true;
    } catch (error) {
        console.error('❌ Error adding number to MongoDB:', error);
        return false;
    }
}

async function removeNumberFromMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await ActiveNumber.deleteOne({ number: cleanNumber });
        return true;
    } catch (error) {
        console.error('❌ Error removing number from MongoDB:', error);
        return false;
    }
}

async function getAllNumbersFromMongoDB() {
    try {
        const activeNumbers = await ActiveNumber.find({ isActive: true });
        return activeNumbers.map(num => num.number);
    } catch (error) {
        console.error('❌ Error getting numbers from MongoDB:', error);
        return [];
    }
}

// Stats Functions
async function incrementStats(number, field) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const today = new Date().toISOString().split('T')[0];
        
        await Stats.findOneAndUpdate(
            { number: cleanNumber, date: today },
            { $inc: { [field]: 1 } },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('❌ Error updating stats:', error);
    }
}

async function getStatsForNumber(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const stats = await Stats.find({ number: cleanNumber })
            .sort({ date: -1 })
            .limit(30);
        return stats;
    } catch (error) {
        console.error('❌ Error getting stats:', error);
        return [];
    }
}

module.exports = {
    connectdb,
    Session,
    UserConfig,
    GroupConfig,
    OTP,
    ActiveNumber,
    Stats,
    
    // Group Config Functions
    getGroupConfig,
    updateGroupConfig,
    clearUserWarns,
    
    // Session
    saveSessionToMongoDB,
    getSessionFromMongoDB,
    deleteSessionFromMongoDB,
    clearUserAllData,
    
    // Config
    getUserConfigFromMongoDB,
    updateUserConfigInMongoDB,
    
    // OTP
    saveOTPToMongoDB,
    verifyOTPFromMongoDB,
    
    // Numbers
    addNumberToMongoDB,
    removeNumberFromMongoDB,
    getAllNumbersFromMongoDB,
    
    // Stats
    incrementStats,
    getStatsForNumber,
    
    getUserConfig: async (number) => {
        const config = await getUserConfigFromMongoDB(number);
        return config || {};
    },
    updateUserConfig: updateUserConfigInMongoDB
};
