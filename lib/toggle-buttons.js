const { sendBtns } = require('./buttons');
const { faizan } = require('./style');

/**
 * Shared ON/OFF button prompt for every config toggle (antilink, antidel,
 * antiviewonce, autoreact, ...). Centralised here so `.env` and each toggle's
 * own bare command (e.g. typing `.antilink` with no argument) render the same
 * two buttons instead of every plugin re-building its own text menu.
 *
 * Tapping a button re-sends its `id` as a normal command (main.js's button-tap
 * dispatch already resolves this to plain text), so ON/OFF just point back at
 * `<prefix><command> on` / `<prefix><command> off`.
 */
async function sendToggleButtons(conn, mek, { from, prefix = '.', command, label, current, reply, onLabel = '🟢 ON', offLabel = '🔴 OFF' }) {
    const isOn = current === true || String(current).toLowerCase() === 'true';
    const text = faizan(label, isOn ? 'ON ✅' : 'OFF ❌', 'Button par click karein ya ' + prefix + command + ' on/off bhejein');

    try {
        await sendBtns(conn, from, {
            title: `⚙️ ${label}`,
            text,
            footer: undefined,
            buttons: [
                { display_text: onLabel, id: `${prefix}${command} on` },
                { display_text: offLabel, id: `${prefix}${command} off` }
            ]
        }, mek);
    } catch (e) {
        // Buttons are a convenience — never let their failure hide the status.
        if (reply) reply(text);
        else throw e;
    }
}

module.exports = { sendToggleButtons };
