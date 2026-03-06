const mongoose = require('mongoose');

async function connectDB() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Successfully connected to MongoDB Permanent Memory!');
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error.message);
    }
}

module.exports = { connectDB };
