const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('../handlers/messageHandler');

function startWhatsAppClient() {
    const client = new Client({
        authStrategy: new LocalAuth(),
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        puppeteer: {
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    // Emphasizing connection logic outside of core index.js
    client.on('qr', (qr) => {
        qrcode.generate(qr, { small: true });
        console.log('Scan this QR code with WhatsApp!');
    });

    client.on('ready', () => {
        console.log('Antigravity Agent is now initialized and online!');
    });

    // Pass messages to our handler
    client.on('message_create', handleMessage);

    client.initialize();
}

module.exports = { startWhatsAppClient };
