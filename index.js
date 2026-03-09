require('dotenv').config();
const { startWhatsAppClient } = require('./src/core/whatsapp');
const { connectDB } = require('./src/database/connection');

// Initialize dependencies
console.log("Starting the Admin Assistant Engine...");

// 1. Connect database
connectDB();

// 2. Start the WhatsApp Client and listen to messages
startWhatsAppClient();
