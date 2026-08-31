/**
 * Interactive buttons helper (FAIZAN-MD).
 *
 * Plain @whiskeysockets/baileys cannot emit the binary nodes WhatsApp needs for
 * interactive buttons, so the raw `relayMessage(interactiveMessage)` blocks used
 * in song.js / fb.js were accepted locally and rendered as nothing on the phone.
 * `gifted-btns` injects those nodes (biz / interactive / native_flow / bot).
 *
 * IMPORTANT — payload shape: gifted-btns' `sendButtons()` accepts ONLY the legacy
 * quick-reply shape `{ id, text }` (plus named cta_url / cta_copy / cta_call).
 * Passing WhatsApp's own `{ name: 'quick_reply', buttonParamsJson }` makes it throw
 * `InteractiveValidationError: button[0] name 'quick_reply' not allowed in
 * sendButtons`, which is why the first attempt silently fell back to a text menu.
 * Plugins keep using `{ display_text, id }`; the conversion happens here.
 *
 * RATE LIMITS: sending into a group makes Baileys resolve the group's participant
 * list, and WhatsApp answers a burst of those with `rate-overlimit` (429). That
 * rejection surfaces here as a failed send, so a transient limit used to downgrade
 * the menu to plain text. The real cure is the group-metadata cache in main.js; this
 * adds a short backoff so a single throttled attempt still ends up as buttons.
 *
 * If the send still fails (package missing, WhatsApp rejecting the node), a plain
 * text menu listing the same commands goes out instead, so a command never answers
 * with silence.
 */

let sendButtons = null;
let loadError = null;

try {
    ({ sendButtons } = require('gifted-btns'));
} catch (e) {
    loadError = e;
    console.error('[buttons] gifted-btns not installed — run `npm install gifted-btns`:', e.message);
}

const RETRY_DELAYS = [1500, 4000];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// `rate-overlimit` arrives as a Boom with data: 429 and that exact message.
const isRateLimited = (e) =>
    /rate.?overlimit|rate.?limit|too many/i.test(String(e && e.message)) || (e && e.data === 429);

/**
 * @param {object} conn      baileys socket
 * @param {string} jid       target chat
 * @param {object} opts      { title, text, footer, image, aimode, buttons }
 *                           buttons: [{ display_text, id }]        -> quick reply
 *                                    [{ display_text, url }]       -> cta_url
 *                                    [{ display_text, copy_code }] -> cta_copy
 * @param {object} [quoted]  message to quote in the fallback
 */
const sendBtns = async (conn, jid, opts, quoted) => {
    const { title, text, footer, image, aimode = false, buttons = [] } = opts;

    if (!buttons.length) throw new Error('sendBtns called with no buttons');

    if (sendButtons) {
        const payload = buttons.map(b => {
            const label = b.display_text || b.text;
            if (b.url) {
                return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: label, url: b.url }) };
            }
            if (b.copy_code) {
                return { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: label, copy_code: b.copy_code }) };
            }
            // legacy quick reply — the only quick-reply shape sendButtons accepts
            return { id: b.id, text: label };
        });

        const message = {
            ...(title ? { title } : {}),
            text,
            ...(footer ? { footer } : {}),
            ...(image ? { image } : {}),
            aimode,
            buttons: payload
        };

        for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
            try {
                return await sendButtons(conn, jid, message);
            } catch (e) {
                const retryable = isRateLimited(e) && attempt < RETRY_DELAYS.length;
                console.error(`[buttons] send attempt ${attempt + 1} failed: ${e.message}`,
                    e.errors ? JSON.stringify(e.errors) : '');
                if (!retryable) break;
                console.error(`[buttons] WhatsApp rate limit — retrying in ${RETRY_DELAYS[attempt]}ms`);
                await sleep(RETRY_DELAYS[attempt]);
            }
        }
        console.error('[buttons] giving up on buttons, falling back to text menu');
    }

    // Keep a second interactive path for Baileys versions where gifted-btns
    // is unavailable or WhatsApp rejects the native-flow payload.
    try {
        const legacyButtons = buttons
            .filter(b => b.id && !b.url && !b.copy_code)
            .map(b => ({
                buttonId: b.id,
                buttonText: { displayText: b.display_text || b.text || b.id },
                type: 1
            }));
        if (legacyButtons.length) {
            return await conn.sendMessage(jid, {
                text: text || title || '',
                ...(footer ? { footer } : {}),
                buttons: legacyButtons,
                headerType: 1
            }, quoted ? { quoted } : {});
        }
    } catch (legacyError) {
        console.error('[buttons] legacy button send failed:', legacyError.message);
    }

    const menu = buttons.map((b, i) => `*${i + 1}.* ${b.display_text || b.text}\n   \`${b.id || b.url || ''}\``).join('\n');
    const body = `${title ? `*${title}*\n\n` : ''}${text || ''}\n\n${menu}\n\n` +
        `_Buttons load nahi huay — upar wala command copy karke bhej dein._` +
        `${footer ? `\n\n${footer}` : ''}`;

    return conn.sendMessage(jid, { text: body }, quoted ? { quoted } : {});
};

module.exports = { sendBtns, buttonsAvailable: () => !!sendButtons, buttonsLoadError: () => loadError };
