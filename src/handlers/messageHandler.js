const { askGemini } = require('../core/gemini');

// Set to track strangers who have already received the "testing" warning message
const notifiedStrangers = new Set();
// Set to track recent outgoing bot replies to prevent infinite self-chat loops
const botRecentMessages = [];

// The main function that handles incoming or generated messages
async function handleMessage(msg) {
    try {
        let messageText = msg.body || (msg._data && msg._data.caption) || "";
        
        // Prevent infinite loops where the bot replies to its own replies
        if (botRecentMessages.includes(messageText)) {
            return;
        }

        async function sendReply(text) {
            botRecentMessages.push(text);
            if (botRecentMessages.length > 50) botRecentMessages.shift(); // Keep array small
            return msg.reply(text);
        }

        console.log(`[RAW MSG] Type: ${msg.type} | OriginalBody: "${msg.body}" | ParsedText: "${messageText}"`);

        // Basic Commands
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
        
        // AUTHORIZATION BOUNCER: Check if sender is allowed
        // Get the clean phone number without @c.us or @lid tricks directly from msg.from
        const cleanNumber = (msg.from || "").split('@')[0];

        const adminNumbers = (process.env.ADMIN_NUMBERS || "").split(',').map(n => n.trim().replace(/['"]/g, ''));
        const subAdminNumbers = (process.env.SUB_ADMIN_NUMBERS || "").split(',').map(n => n.trim().replace(/['"]/g, ''));

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
            // Message came from someone else. Are they an authorized Sub-Admin?
            if (!isSubAdmin) {
                // STRANGER PROTOCOL: Silently drop the message. No warnings, no AI processing.
                console.log(`[ROUTING] Ignored Stranger: ${cleanNumber}`);
                return;
            }
        }

        console.log(`[BOUNCER DEBUG] Pure Number: "${cleanNumber}" | fromMe: ${msg.fromMe} | isSubAdmin: ${isSubAdmin}`);

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
        // We also pass a callback function so the Agent can send status texts like "Executing tool..."
        const aiResponse = await askGemini(msg.from, prompt, mediaPart, (statusText) => {
            sendReply(statusText); // Send live updates to the user on WhatsApp
        });

        // The loop is finished! Reply with the AI's final text
        return sendReply(aiResponse);

    } catch (error) {
        console.error("Error processing message:", error.message);
    }
}

module.exports = { handleMessage };
