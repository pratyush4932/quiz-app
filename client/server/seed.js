const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Team = require('./models/Team');
const Admin = require('./models/Admin');
const Question = require('./models/Question');
const Settings = require('./models/Settings');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected for Seeding'))
    .catch(err => console.log(err));

const seedData = async () => {
    try {
        // Clear existing data
        await Team.deleteMany({});
        await Admin.deleteMany({});
        await Question.deleteMany({});
        await Settings.deleteMany({});

        // Create Default Settings
        await Settings.create({
            isLive: false,
            duration: 30
        });
        console.log('Default Settings created');

        // Create Admin
        const salt = await bcrypt.genSalt(10);
        const adminPassword = await bcrypt.hash('admin123', salt);
        await Admin.create({
            username: 'admin',
            password: adminPassword
        });
        console.log('Admin created (user: admin, pass: admin123)');

        // Create Team
        const teamPassword = await bcrypt.hash('team123', salt);
        await Team.create({
            teamId: 'TEAM01',
            password: teamPassword
        });
        console.log('Team created (id: TEAM01, pass: team123)');

        // Create Questions
        const questions = [
            {
                text: "What is the capital of France?",
                correctAnswer: "Paris",
                image: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Paris_Night.jpg",
                category: "Geography",
                difficulty: "Easy"
            },
            {
                text: "Which planet is known as the Red Planet?",
                correctAnswer: "Mars",
                image: "https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg",
                category: "Science",
                difficulty: "Medium"
            },
            {
                text: "What is 2 + 2?",
                correctAnswer: "4",
                category: "Math",
                difficulty: "Easy"
            },
            {
                text: "Who wrote 'Hamlet'?",
                correctAnswer: "William Shakespeare",
                category: "Literature",
                difficulty: "Medium"
            },
            {
                text: "What is the chemical symbol for Gold?",
                correctAnswer: "Au",
                category: "Science",
                difficulty: "Hard"
            }
        ];

        await Question.insertMany(questions);
        console.log('5 Questions seeded');

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedData();
