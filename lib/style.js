const config = require('../config');

// ════════════════════════════════════════════════════════════
// 📁 SHARED FAIZAN-MD STYLE HELPER
// Same decorative banner used across the Faizan-MD repo's plugins,
// shared here so every FAIZAN-MD-MINI plugin renders replies the
// same way instead of each file re-declaring its own copy.
// ════════════════════════════════════════════════════════════
function faizan(title, value, status) {
    return `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 Mini'} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ ⚙️ ${title}:* ${value}
*│❀ 🔘 𝐒𝐭𝐚𝐭𝐮𝐬:* ${status}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ${config.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ꜰᴀɪᴢᴀɴ-ᴍᴅ'}
`;
}

module.exports = { faizan };
