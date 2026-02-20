const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    teamId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    quizStatus: {
        type: String,
        enum: ['not_started', 'in_progress', 'submitted'],
        default: 'not_started'
    },
    score: {
        type: Number,
        default: 0
    },
    violationCount: {
        type: Number,
        default: 0
    },
    startTime: {
        type: Date
    },
    endTime: {
        type: Date
    },
    answers: [{
        questionId: mongoose.Schema.Types.ObjectId,
        answerText: String,
        attemptsUsed: { type: Number, default: 0 },
        isCorrect: { type: Boolean, default: false },
        hintsUsed: { type: Number, default: 0 }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
