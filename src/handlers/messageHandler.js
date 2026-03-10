const { askGemini } = require('../core/gemini');

// Set to track strangers who have already received the "testing" warning message
const notifiedStrangers = new Set();
// Set to track recent outgoing bot replies to prevent infinite self-chat loops
const botRecentMessages = [];

// The main function that handles incoming or generated messages
async function handleMessage(msg) {
    try {
        let messageText = msg.body || (msg._data && msg._data.caption) || "";

        // 1. SELF-REPLY LOOP FIX: Track exact text strings to prevent infinite loops, 
        // but consume the match so a user can legitimately copy-paste the exact same text later!
        if (msg.fromMe) {
            const botTextIndex = botRecentMessages.indexOf(messageText);
            if (botTextIndex !== -1) {
                // It's an echo of our own outgoing message! Consume it from the array and drop it.
                botRecentMessages.splice(botTextIndex, 1);
                return;
            }
        }

        async function sendReply(text) {
            botRecentMessages.push(text);
            if (botRecentMessages.length > 50) botRecentMessages.shift(); // Keep array small
            return msg.reply(text);
        }

        console.log(`[RAW MSG] Type: ${msg.type} | OriginalBody: "${msg.body}" | ParsedText: "${messageText}"`);

        // 2. GROUP CHAT BLACKHOLE FIX: User requested to explicitly drop all group messages
        if ((msg.from || "").endsWith('@g.us')) {
            console.log(`[ROUTING] Ignored Group Chat: ${msg.from}`);
            return;
        }

        // 3. AUTHORIZATION BOUNCER: Check if sender is allowed BEFORE executing commands
        let cleanNumber = (msg.from || "").split('@')[0];

        // UNMASK PRIVACY LIDs: If WhatsApp hid their real number behind an @lid
        if ((msg.from || "").includes('@lid')) {
            try {
                const contact = await msg.getContact();
                if (contact && contact.number) {
                    cleanNumber = contact.number;
                    console.log(`[LID UNMASK] Resolved masked ID ${msg.from} to real number: ${cleanNumber}`);
                }
            } catch (err) {
                console.log(`[LID ERROR] Could not resolve masked number: ${err.message}`);
            }
        }

        const adminNumbers = (process.env.ADMIN_NUMBERS || "").split(',').map(n => n.trim().replace(/['"]/g, ''));
        const subAdminNumbers = (process.env.SUB_ADMIN_NUMBERS || "").split(',').map(n => n.trim().replace(/['"]/g, ''));

        const isAdmin = adminNumbers.includes(cleanNumber);
        const isSubAdmin = subAdminNumbers.includes(cleanNumber);

        // INTERCEPTION SAFETY: If the message was sent by the Admin's own phone...
        if (msg.fromMe) {
            // ONLY process the message if the Admin is explicitly messaging THEMSELVES (msg.from === msg.to).
            // If they are messaging a friend, or if the bot is broadcasting to a student, IGNORE IT completely.
            if (msg.from !== msg.to) {
                console.log(`[ROUTING] Ignored: Admin is chatting with someone else (${msg.to})`);
                return;
            }
        } else {
            // ADMIN LOCKDOWN FIX: We now check if the sender is an Admin OR Sub-Admin
            if (!isAdmin && !isSubAdmin) {
                // STRANGER PROTOCOL: Silently drop the message. No warnings, no AI processing.
                console.log(`[ROUTING] Ignored Stranger: ${cleanNumber}`);
                return;
            }
        }

        console.log(`[BOUNCER DEBUG] Pure Number: "${cleanNumber}" | fromMe: ${msg.fromMe} | isAdmin: ${isAdmin} | isSubAdmin: ${isSubAdmin}`);

        // 4. COMMAND BYPASS FIX: Basic commands are now safely protected by the Bouncer
        if (messageText === '!ping') {
            return sendReply('pong');
        }

        if (messageText === '!whoami') {
            try {
                const contact = await msg.getContact();
                return sendReply(`Hello ${contact.pushname}! You are chatting with Admin Assistant.`);
            } catch (e) {
                return sendReply(`Hello! You are chatting with Admin Assistant.`);
            }
        }

        if (messageText === '!help') {
            return sendReply('*🚀 Agent Menu*\n\n!ask [your question] - Ask Gemini\n!ping - Reply with pong\n!whoami - See your name\n!help - Show this list');
        }

        // Gemini AI Command
        // Strip the old !ask prefix just in case the user still uses it out of habit
        let prompt = messageText.replace(/^!ask\W*/i, '').trim();

        // Check if there is media on the current message or the quoted message
        let hasMedia = msg.hasMedia || ['document', 'image', 'video', 'audio'].includes(msg.type);
        let mediaMessage = msg;

        if (!hasMedia && msg.hasQuotedMsg) {
            try {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg && (quotedMsg.hasMedia || ['document', 'image', 'video', 'audio'].includes(quotedMsg.type))) {
                    hasMedia = true;
                    mediaMessage = quotedMsg;
                }
            } catch (e) {
                console.log("Ignored quoted message getter error:", e.message);
            }
        }

        console.log(`[MEDIA DEBUG] hasMedia resolved to: ${hasMedia} (msg.hasMedia: ${msg.hasMedia}, msg.type: ${msg.type})`);

        if (hasMedia) {
            return sendReply("Developer says 'this feature will come soon..... please corporate 😅' ");
        }

        if (!prompt) {
            return sendReply("Please provide a message. I am ready to help!");
        }

        let mediaPart = null;

        console.log(`[PROMPT DEBUG] Final prompt being sent to Gemini (length: ${prompt.length}): ${prompt.substring(0, 500)}`);
        // We pass the user's ID (msg.from) so the Agent remembers their specific chat!
        // We also pass a callback function to log tool execution statuses in the terminal
        const aiResponse = await askGemini(msg.from, prompt, mediaPart, (statusText) => {
            console.log(statusText); // Log to server terminal instead of sending to WhatsApp
        });

        // The loop is finished! Reply with the AI's final text
        return sendReply(aiResponse);

    } catch (error) {
        console.error("Error processing message:", error.message);
    }
}

module.exports = { handleMessage };
