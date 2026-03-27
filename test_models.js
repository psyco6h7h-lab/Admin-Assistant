const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: 'c:/Users/HP/OneDrive/Desktop/whats-web.js/my-whatsapp-agent/.env' });

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        
        if (data.models) {
            data.models.forEach(m => {
                if (m.name.includes("gemini")) {
                    console.log(m.name);
                }
            });
        }
    } catch (e) {}
}

listModels();
