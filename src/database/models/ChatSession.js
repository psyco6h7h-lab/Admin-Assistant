const mongoose = require('mongoose');

// The "Schema" is the blueprint for how we save a conversation
const ChatSessionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true // One document per user (phone number)
    },
    history: {
        type: Array, // This will hold the exact format Gemini uses: [{role: 'user', parts: [{text: '...'}]}, ...]
        default: []
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the timestamp every time we save new messages
ChatSessionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const ChatSession = mongoose.model('ChatSession', ChatSessionSchema);

module.exports = ChatSession;
