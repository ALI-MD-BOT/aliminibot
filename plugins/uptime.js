const { cmd } = require('../arslan');

// Helper function for delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

cmd({
  pattern: "uptime",
  alias: ["up", "runtime", "botstatus"],
  desc: "Bot uptime monitor",
  category: "main",
  react: "⏱️",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {

  try {

    // start reaction
    await conn.sendMessage(from, {
      react: { text: "⏱️", key: m.key }
    });

    // Function to format uptime seconds into days, hours, minutes, seconds
    function formatUptime(seconds) {
      const d = Math.floor(seconds / (3600 * 24));
      const h = Math.floor((seconds % (3600 * 24)) / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      
      let u = "";
      if (d > 0) u += `${d}d `;
      if (h > 0 || d > 0) u += `${h}h `;
      u += `${m}m ${s}s`;
      return u;
    }

    // initial message
    const initialSeconds = process.uptime();
    const msg = await conn.sendMessage(from, {
      text: `⏱️ ${formatUptime(initialSeconds)}\nUPTIME`
    }, { quoted: mek });

    await sleep(1000);

    // 🔁 live update loop (30 seconds)
    for (let i = 0; i < 30; i++) {

      await sleep(1000);

      const currentUptime = process.uptime();
      const formattedTime = formatUptime(currentUptime);

      await conn.relayMessage(from, {
        protocolMessage: {
          key: msg.key,
          type: 14,
          editedMessage: {
            conversation: `⏱️ ${formattedTime}\nUPTIME`
          }
        }
      }, {});
    }

    // end reaction
    await conn.sendMessage(from, {
      react: { text: "✨", key: m.key }
    });

  } catch (e) {

    console.error("Uptime Error:", e);

    await conn.sendMessage(from, {
      react: { text: "❌", key: m.key }
    });

    reply("*Uptime check failed — try again.*");
  }
});
