const mongoose = require('mongoose');

const tokenUsageSchema = new mongoose.Schema({
    dateString: { type: String, required: true, unique: true }, // Format: YYYY-MM-DD
    totalWordsSent: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TokenUsage', tokenUsageSchema);
