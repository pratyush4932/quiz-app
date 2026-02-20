const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/authMiddleware');
const Question = require('../models/Question');
const Team = require('../models/Team');
const Settings = require('../models/Settings');
const bcrypt = require('bcryptjs');

// @route   POST api/admin/teams
// @desc    Create a new team
// @access  Private (Admin)
router.post('/teams', adminAuth, async (req, res) => {
    try {
        const { teamId, password } = req.body;

        // Check if team already exists
        let team = await Team.findOne({ teamId });
        if (team) {
            return res.status(400).json({ msg: 'Team already exists' });
        }

        team = new Team({
            teamId,
            password,
            quizStatus: 'not_started',
            score: 0,
            answers: []
        });

        const salt = await bcrypt.genSalt(10);
        team.password = await bcrypt.hash(password, salt);

        await team.save();
        res.json(team);
    } catch (err) {
        console.error(err.message);
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Team ID already exists' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   POST api/admin/questions
// @desc    Add a new question
// @access  Private (Admin)
router.post('/questions', adminAuth, async (req, res) => {
    try {
        const { text, links, correctAnswer, category, difficulty, maxAttempts, hints } = req.body;
        const newQuestion = new Question({
            text,
            links: links || [],
            correctAnswer,
            category,
            difficulty,
            maxAttempts,
            hints: hints || []
        });
        const question = await newQuestion.save();
        res.json(question);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/questions
// @desc    Get all questions
// @access  Private (Admin)
router.get('/questions', adminAuth, async (req, res) => {
    try {
        const questions = await Question.find();
        res.json(questions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/results
// @desc    Get all team results
// @access  Private (Admin)
router.get('/results', adminAuth, async (req, res) => {
    try {
        const teams = await Team.find().select('-password').sort({ score: -1, endTime: 1 });
        res.json(teams);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/settings
// @desc    Get quiz settings
// @access  Private (Admin)
router.get('/settings', adminAuth, async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/admin/settings
// @desc    Update quiz settings
// @access  Private (Admin)
router.put('/settings', adminAuth, async (req, res) => {
    const { isLive, duration } = req.body;
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        if (isLive !== undefined) settings.isLive = isLive;
        if (duration !== undefined) settings.duration = duration;

        if (isLive === true && !settings.startTime) {
            settings.startTime = new Date();
        } else if (isLive === false) {
            settings.startTime = undefined;
        }

        await settings.save();
        res.json(settings);
    } catch (err) {
        console.error('Settings update error:', err.message, err);
        res.status(500).json({ msg: 'Server Error', detail: err.message });
    }
});

module.exports = router;

// @route   DELETE api/admin/teams/:id
// @desc    Delete a team
// @access  Private (Admin)
router.delete('/teams/:id', adminAuth, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ msg: 'Team not found' });

        await Team.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Team removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/admin/questions/:id
// @desc    Delete a question
// @access  Private (Admin)
router.delete('/questions/:id', adminAuth, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ msg: 'Question not found' });

        await Question.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Question removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/admin/questions/:id
// @desc    Update a question
// @access  Private (Admin)
router.put('/questions/:id', adminAuth, async (req, res) => {
    try {
        const { text, links, correctAnswer, category, difficulty, maxAttempts, hints } = req.body;
        let question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ msg: 'Question not found' });

        question = await Question.findByIdAndUpdate(
            req.params.id,
            { text, links: links || [], correctAnswer, category, difficulty, maxAttempts, hints: hints || [] },
            { new: true }
        );

        res.json(question);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
