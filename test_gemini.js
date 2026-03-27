const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: 'c:/Users/HP/OneDrive/Desktop/whats-web.js/my-whatsapp-agent/.env' });

async function testKey() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return;

    try {
        console.log(`Checking API Key: ${key.substring(0, 10)}...`);
        const genAI = new GoogleGenerativeAI(key);
        
        // Let's try to just hit the simplest model possible - gemini-pro
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Say 'key-is-working' if you read this.");
        const text = (await result.response).text();
        console.log(`✅ Result: ${text}`);
    } catch (e) {
        console.log(`❌ ERROR status: ${e.status}`);
        console.log(`❌ ERROR message: ${e.message}`);
    }
}

testKey();
