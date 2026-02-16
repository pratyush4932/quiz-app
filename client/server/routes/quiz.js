const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware').auth;
const Question = require('../models/Question');
const Team = require('../models/Team');
const Settings = require('../models/Settings');

// Shuffle helper
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// @route   POST api/quiz/attempt
// @desc    Attempt a specific question
// @access  Private (Team)
router.post('/attempt', auth, async (req, res) => {
    try {
        const { questionId, answerText } = req.body;
        const team = await Team.findById(req.user.id);
        const question = await Question.findById(questionId);

        if (!team || !question) {
            return res.status(404).json({ msg: 'Team or Question not found' });
        }

        if (team.quizStatus === 'submitted') {
            return res.status(400).json({ msg: 'Quiz already submitted.' });
        }

        // Find existing answer record or create new
        let answerRecord = team.answers.find(a => a.questionId.toString() === questionId);
        if (!answerRecord) {
            answerRecord = {
                questionId: question._id,
                answerText: '',
                attemptsUsed: 0,
                isCorrect: false
            };
            team.answers.push(answerRecord);
            // Re-fetch to get the reference from the array (Mongoose weirdness sometimes)
            // But pushing object usually works. Let's stick to modifying the found object if exists.
        }
        // If we pushed a new one, we need to access it again from the array to Modify it in place? 
        // Actually, team.answers.push returns length. We need to access the last element.
        // Safer to treat `answerRecord` as the object we will save. 
        // Wait, if I push to `team.answers`, `answerRecord` local var is not linked to the mongoose subdoc unless I pull it from the array.

        // Let's optimize:
        const answerIndex = team.answers.findIndex(a => a.questionId.toString() === questionId);
        if (answerIndex === -1) {
            team.answers.push({
                questionId: question._id,
                answerText: '',
                attemptsUsed: 0,
                isCorrect: false
            });
        }

        // Now get the subdocument
        const storedAnswer = team.answers.find(a => a.questionId.toString() === questionId);

        // Check locks
        if (storedAnswer.isCorrect) {
            return res.status(400).json({ msg: 'Question already answered correctly.', correct: true });
        }
        const maxAttempts = question.maxAttempts || 1;
        if (storedAnswer.attemptsUsed >= maxAttempts) {
            return res.status(400).json({ msg: 'No attempts remaining.', attemptsLeft: 0 });
        }

        // Validate
        const submitted = (answerText || '').trim().toLowerCase();
        const expected = (question.correctAnswer || '').trim().toLowerCase();
        const isCorrect = submitted === expected;

        // Update State
        storedAnswer.attemptsUsed += 1;
        storedAnswer.answerText = answerText; // Store last attempt
        storedAnswer.isCorrect = isCorrect;

        if (isCorrect) {
            // Update score immediately? Or calculate at end? 
            // Plan said "calculate score: Easy=25..."
            // Let's update score immediately for live leaderboard!
            const points = question.difficulty === 'Easy' ? 25 : question.difficulty === 'Medium' ? 50 : 100;
            // Only add points if it wasn't already correct (checked above)
            team.score += points;
        }

        await team.save();

        res.json({
            correct: isCorrect,
            attemptsLeft: maxAttempts - storedAnswer.attemptsUsed,
            message: isCorrect ? 'Correct!' : 'Incorrect answer.'
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/quiz/start
// @desc    Start quiz, get randomized questions
// @access  Private (Team)
router.get('/start', auth, async (req, res) => {
    try {
        const team = await Team.findById(req.user.id);
        if (team.quizStatus === 'submitted') {
            return res.status(400).json({ msg: 'Quiz already submitted.' });
        }

        const settings = await Settings.findOne();
        if (!settings || !settings.isLive) {
            return res.status(400).json({ msg: 'Quiz has not started yet.' });
        }

        // Fetch all questions
        const questions = await Question.find();

        // Shuffle questions
        const shuffledQuestions = shuffleArray([...questions]);

        // Process questions: Only send necessary info (no correct answer)
        const processedQuestions = shuffledQuestions.map(q => ({
            _id: q._id,
            text: q.text,
            image: q.image,
            difficulty: q.difficulty,
            category: q.category,
            marks: q.difficulty === 'Easy' ? 25 : q.difficulty === 'Medium' ? 50 : 100,
            maxAttempts: q.maxAttempts || 1
        }));

        // Update Team status
        if (team.quizStatus === 'not_started') {
            team.quizStatus = 'in_progress';
            team.startTime = new Date();
            await team.save();
        }

        // Map current user state for frontend hydration
        const userState = {};
        if (team.answers && team.answers.length > 0) {
            team.answers.forEach(a => {
                userState[a.questionId] = {
                    attemptsUsed: a.attemptsUsed,
                    isCorrect: a.isCorrect,
                    isLocked: a.isCorrect || a.attemptsUsed >= (questions.find(q => q._id.toString() === a.questionId.toString())?.maxAttempts || 1)
                };
            });
        }

        res.json({
            questions: processedQuestions,
            duration: settings.duration,
            startTime: settings.startTime, // Use Global Start Time
            userState
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/quiz/submit
// @desc    Finish quiz (end timer)
// @access  Private (Team)
router.post('/submit', auth, async (req, res) => {
    try {
        const team = await Team.findById(req.user.id);

        if (team.quizStatus === 'submitted') {
            return res.status(400).json({ msg: 'Quiz already submitted.' });
        }

        team.quizStatus = 'submitted';
        team.endTime = new Date();
        // Score is now cumulative via /attempt, so no need to recalculate here.

        await team.save();

        res.json({ msg: 'Quiz submitted successfully', score: team.score });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/quiz/violation
// @desc    Record a violation
// @access  Private (Team)
router.post('/violation', auth, async (req, res) => {
    try {
        const team = await Team.findById(req.user.id);
        if (!team) return res.status(404).json({ msg: 'Team not found' });

        if (team.quizStatus === 'submitted') {
            return res.json({ msg: 'Already submitted', action: 'terminate' });
        }

        team.violationCount = (team.violationCount || 0) + 1;

        if (team.violationCount >= 4) {
            team.quizStatus = 'submitted';
            team.endTime = new Date();
            await team.save();
            return res.json({ msg: 'Disqualified', action: 'terminate', count: team.violationCount });
        }

        await team.save();
        res.json({ msg: 'Violation recorded', action: 'warning', count: team.violationCount });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/quiz/info
// @desc    Get quiz metadata (duration, question count)
// @access  Private (Team)
router.get('/info', auth, async (req, res) => {
    try {
        const settings = await Settings.findOne();
        const questionCount = await Question.countDocuments();

        res.json({
            duration: settings ? settings.duration : 0,
            questionCount: questionCount || 0
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
