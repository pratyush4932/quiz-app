const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// Middleware
app.use(cors());
app.use(express.json());

// ── Rate Limiters ────────────────────────────────────────────────────────────

// Auth: strict — prevents brute-forcing team/admin passwords
const authLimiter = rateLimit({
    windowMs: 60 * 1000,          // 1 minute window
    max: 10,                       // 10 login attempts per IP per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: 'Too many login attempts. Please wait a minute and try again.' }
});

// Quiz gameplay — generous limit for 50–100 active participants
const quizLimiter = rateLimit({
    windowMs: 60 * 1000,          // 1 minute window
    max: 60,                       // 60 requests per IP per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: 'Too many requests. Please slow down.' }
});

// Admin dashboard — slightly higher for data-heavy operations
const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: 'Too many admin requests.' }
});

// Routes (rate-limited per tier)
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/quiz', quizLimiter, require('./routes/quiz'));
app.use('/api/admin', adminLimiter, require('./routes/admin'));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

app.get('/', (req, res) => {
    res.send('Quiz App API is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
