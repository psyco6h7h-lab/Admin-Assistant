const { askGemini } = require('../core/gemini');

// The main function that handles incoming or generated messages
async function handleMessage(msg) {
    try {
        // Basic Commands
        if (msg.body === '!ping') {
            return msg.reply('pong');
        }

        if (msg.body === '!whoami') {
            const contact = await msg.getContact();
            return msg.reply(`Hello ${contact.pushname}! You are chatting with Antigravity Agent.`);
        }

        if (msg.body === '!help') {
            return msg.reply('*🚀 Agent Menu*\n\n!ask [your question] - Ask Gemini\n!ping - Reply with pong\n!whoami - See your name\n!help - Show this list');
        }

        // Gemini AI Command
        if (msg.body && msg.body.toLowerCase().startsWith('!ask')) {
            // AUTHORIZATION BOUNCER: Check if sender is allowed
            // Get the clean phone number without @c.us or @lid tricks
            const contact = await msg.getContact();
            const cleanNumber = contact.number || msg.from; // e.g. "918328390911"

            const adminNumbers = (process.env.ADMIN_NUMBERS || "").split(',').map(n => n.trim());
            const subAdminNumbers = (process.env.SUB_ADMIN_NUMBERS || "").split(',').map(n => n.trim());

            const isAdmin = adminNumbers.includes(cleanNumber);
            const isSubAdmin = subAdminNumbers.includes(cleanNumber);

            console.log(`[BOUNCER DEBUG] Pure Number: "${cleanNumber}" | isAdmin: ${isAdmin} | isSubAdmin: ${isSubAdmin}`);

            if (!isAdmin && !isSubAdmin) {
                return msg.reply(`🛑 Access Denied: You are not authorized.\n\nYour pure phone number is:\n*${cleanNumber}*\n\nPlease ask the Admin to add this strictly pure number to the .env file!`);
            }

            let prompt = msg.body.replace(/^!ask\W*/i, '').trim();

            if (!prompt && !msg.hasMedia) {
                return msg.reply("Please provide a question after !ask. Example: !ask What is the capital of France?");
            }
            if (!prompt && msg.hasMedia) {
                prompt = "Please process this attached file.";
            }

            let mediaPart = null;
            if (msg.hasMedia) {
                const media = await msg.downloadMedia();
                if (media) {
                    // If it's an image, pass it to Gemini natively
                    if (media.mimetype.startsWith('image/')) {
                        mediaPart = {
                            inlineData: {
                                data: media.data,
                                mimeType: media.mimetype
                            }
                        };
                    }
                    // If it's a PDF, we extract its text locally!
                    else if (media.mimetype === 'application/pdf') {
                        try {
                            const pdfParse = require('pdf-parse');
                            const pdfBuffer = Buffer.from(media.data, 'base64');
                            const pdfData = await pdfParse(pdfBuffer);
                            prompt += `\n\n[ATTACHED PDF TEXT CONTENT]:\n${pdfData.text}`;
                        } catch (err) {
                            console.error("Failed to parse PDF:", err);
                            prompt += `\n\n[FAILED TO READ PDF]`;
                        }
                    }
                    // If it's a text file (csv, txt, etc)
                    else {
                        const fileText = Buffer.from(media.data, 'base64').toString('utf8');
                        prompt += `\n\n[ATTACHED FILE CONTENT]:\n${fileText}`;
                    }
                }
            }

            // We pass the user's ID (msg.from) so the Agent remembers their specific chat!
            // We also pass a callback function so the Agent can send status texts like "Executing tool..."
            const aiResponse = await askGemini(msg.from, prompt, mediaPart, (statusText) => {
                msg.reply(statusText); // Send live updates to the user on WhatsApp
            });

            // The loop is finished! Reply with the AI's final text
            return msg.reply(aiResponse);
        }
    } catch (error) {
        console.error("Error processing message:", error.message);
    }
}

module.exports = { handleMessage };
