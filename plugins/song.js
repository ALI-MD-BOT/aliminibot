const { cmd } = require("../arslan");
const config = require('../config');
const axios = require('axios');
const yts = require('yt-search');

// =================== FAIZAN-MD STYLE ===================
function faizanStyle(title, value, status, quality = "", duration = "") {
    return `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅αɪᴢαɴ-𝐌ᴅ⎯꯭̽'} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❖ 🍵 ${title}:* ${value}
*│❖ 🌧 𝐐𝐮𝐚𝐥𝐢𝐭𝐲:* ${quality}
*│❖ ⏱️ 𝐃𝐮𝐫𝐚𝐭𝐢𝐨𝐧:* ${duration}
*│❖ ✨ 𝐒𝐭𝐚𝐭𝐮𝐬:* ${status}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ${config.DESCRIPTION || '𝆸𝆰𝆴𝆸𝆰𝆴 𝆵𝆰 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🍍'}
`;
}

// =================== FAIZAN API (ytdl - YouTube Legacy) ===================
const FAIZAN_API = "https://faizan-api.vercel.app/api/ytdl";

async function downloadWithFaizan(url, type = 'mp3') {
    try {
        const response = await axios.get(FAIZAN_API, {
            params: { url, type },
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const data = response.data;
        if (data?.status === true && data?.result?.audio_download) {
            return {
                success: true,
                downloadUrl: data.result.audio_download,
                title: data.result.title || 'Audio',
                duration: data.result.duration ? `${data.result.duration}s` : 'Unknown',
                quality: '128kbps'
            };
        }
        return { success: false, error: 'No download link found' };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// =================== GET VIDEO URL (NAME OR LINK) ===================
async function getVideoUrl(query) {
    if (query.includes('youtube.com') || query.includes('youtu.be')) {
        const videoId = query.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/)?.[1];
        if (videoId) {
            const search = await yts({ videoId });
            return {
                url: query,
                title: search?.title || 'YouTube Video',
                thumbnail: search?.thumbnail || null,
                duration: search?.timestamp || 'Unknown'
            };
        }
        return { url: query, title: 'YouTube Video', thumbnail: null, duration: 'Unknown' };
    }
    const search = await yts(query);
    if (!search.videos || search.videos.length === 0) throw new Error("No results found");
    const video = search.videos[0];
    return {
        url: video.url,
        title: video.title,
        thumbnail: video.thumbnail,
        duration: video.timestamp
    };
}

// =================== MAIN COMMAND ===================
cmd({
    pattern: "song",
    alias: ["play", "music", "audio", "yta", "mp3"],
    desc: "Download audio song directly from YouTube",
    category: "download",
    react: "🍵",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        if (!args.length) {
            return reply(`*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*\n*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍 𝐌𝐄𝐍𝐔'} ⊱┈─̇─̣╌*\n*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*\n*│❖ 📝 Usage:* .song <name or link>\n*│❖ 📗 Example:* .song Believer Imagine Dragons\n*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*\n\n> *𝐏𝐫𝐨𝐯𝐢𝐝𝐞𝐝 𝐁𝐲 𝐅𝐚𝐢𝐳𝐚𝐧-𝐌𝐝 🍵*`);
        }

        let query = args.join(" ");
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        
        // 1. ویڈیو/سونگ کی تفصیلات حاصل کریں
        const videoInfo = await getVideoUrl(query);

        // 2. آڈیو کا ڈاؤنلوڈ لنک نکالیں
        let result = await downloadWithFaizan(videoInfo.url, 'mp3');
        if (!result.success) throw new Error(result.error || "Download failed");

        // 3. پہلے تھمب نیل / پکچر کیپشن کے ساتھ بھیجیں
        const captionText = faizanStyle('SONG', videoInfo.title || result.title, '✅ Success!', result.quality, videoInfo.duration || result.duration);
        
        if (videoInfo.thumbnail) {
            await conn.sendMessage(from, { 
                image: { url: videoInfo.thumbnail }, 
                caption: captionText 
            }, { quoted: mek });
        } else {
            await reply(captionText);
        }

        await conn.sendMessage(from, { react: { text: '📥', key: mek.key } });

        // 4. آڈیو فائل کی بفر (Buffer) ڈاؤنلوڈ کریں
        const audioBuffer = await axios.get(result.downloadUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }).then(res => Buffer.from(res.data));

        // 5. اب ڈائریکٹ آڈیو بھیجیں
        await conn.sendMessage(from, { 
            audio: audioBuffer, 
            mimetype: 'audio/mp4', 
            ptt: false, 
            fileName: `${videoInfo.title || result.title}.mp3`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error("[SONG CMD] Error:", err);
        reply(`❌ Error: ${err.message}`);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});
