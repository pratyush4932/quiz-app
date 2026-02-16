const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    isLive: {
        type: Boolean,
        default: false
    },
    duration: {
        type: Number, // in minutes
        default: 30
    },
    startTime: {
        type: Date
    }
});

// We only need one settings document, so we can treat it as a singleton in logic
module.exports = mongoose.model('Settings', settingsSchema);
