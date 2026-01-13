const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    ageCategory: {
        type: String,
        enum: ['Adult', 'Child'],
        required: true,
        default: 'Adult'
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    stats: {
        matches: { type: Number, default: 0 },
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 }
    }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
