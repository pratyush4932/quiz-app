const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    links: {
        type: [{
            label: { type: String, default: '' },
            url: { type: String }
        }],
        default: []
    },
    correctAnswer: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Medium'
    },
    maxAttempts: {
        type: Number,
        default: 1
    },
    hints: {
        type: [String],
        default: []
    },
    category: {
        type: String,
        default: 'General'
    }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
