const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Team = require('../models/Team');
const Admin = require('../models/Admin');
const { auth } = require('../middleware/authMiddleware');

// @route   POST api/auth/login
// @desc    Team Login
// @access  Public
router.post('/login', async (req, res) => {
    const { teamId, password } = req.body;

    try {
        const team = await Team.findOne({ teamId });
        if (!team) return res.status(400).json({ msg: 'Invalid Credentials' });

        // In a real app, use bcrypt.compare. For this MVP, if we pre-seed plain text, we might need to hash them first or check directly.
        // Assuming seeded passwords are HASHED. If not, we need to hash them before seeding or check plain text (not recommended but okay for quick MVP if specified).
        // Let's assume we will seed with HASHED passwords for security.
        const isMatch = await bcrypt.compare(password, team.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        if (team.quizStatus === 'submitted') {
            return res.status(400).json({ msg: 'You have already submitted the quiz.' });
        }

        const payload = { id: team.id, role: 'team' };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, team: { id: team.id, teamId: team.teamId, quizStatus: team.quizStatus } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/admin/login
// @desc    Admin Login
// @access  Public
router.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const admin = await Admin.findOne({ username });
        if (!admin) return res.status(400).json({ msg: 'Invalid Credentials' });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        const payload = { id: admin.id, role: 'admin' };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '4h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, async (req, res) => {
    try {
        const team = await Team.findById(req.user.id).select('-password');
        res.json(team);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
