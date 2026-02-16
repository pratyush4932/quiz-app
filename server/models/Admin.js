const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String, // Hashed
        required: true
    }
});

module.exports = mongoose.model('Admin', adminSchema);
