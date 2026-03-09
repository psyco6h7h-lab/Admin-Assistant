// Helper function to force the code to wait (sleep)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function broadcastMessage(numbers, message) {
    try {
        const { getWhatsAppClient } = require('../core/whatsapp');
        const client = getWhatsAppClient();
        if (!client) {
            return "Broadcast Error: WhatsApp client is not connected.";
        }

        // Clean and prepare the numbers
        // WhatsApp requires numbers to end with @c.us for regular users
        const cleanNumbers = numbers.map(n => n.replace(/\D/g, ''));
        
        if (cleanNumbers.length === 0) {
            return "Broadcast Error: No valid phone numbers provided.";
        }

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < cleanNumbers.length; i++) {
            const num = cleanNumbers[i];
            const chatId = `${num}@c.us`;

            try {
                // Check if the number is registered on WhatsApp to avoid bans from guessing
                const isRegistered = await client.isRegisteredUser(chatId);
                if (isRegistered) {
                    await client.sendMessage(chatId, message);
                    successCount++;
                    console.log(`[BROADCAST] Sent message to ${num}`);
                } else {
                    console.log(`[BROADCAST] Blocked: ${num} is not on WhatsApp.`);
                    failCount++;
                }
            } catch (err) {
                console.error(`[BROADCAST] Error sending to ${num}:`, err.message);
                failCount++;
            }

            // ANTI-BAN PROTECTION: Random sleep between 3 and 10 seconds before next message
            if (i < cleanNumbers.length - 1) { // Don't sleep after the very last message
                const delayMs = Math.floor(Math.random() * (10000 - 3000 + 1)) + 3000;
                console.log(`[BROADCAST] Anti-ban sleep for ${delayMs / 1000} seconds...`);
                await sleep(delayMs);
            }
        }

        return `Broadcast complete! Successfully sent to ${successCount} contacts. Failed/Unregistered: ${failCount}.`;

    } catch (error) {
        return `Broadcast System Error: ${error.message}`;
    }
}

module.exports = { broadcastMessage };
