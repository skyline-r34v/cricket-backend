const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    players: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    }],
    isHandicapTeam: {
        type: Boolean,
        default: false,
        description: "If true, team starts with -5 runs in league matches (Rule 7)"
    },
    stats: {
        played: { type: Number, default: 0 },
        won: { type: Number, default: 0 },
        lost: { type: Number, default: 0 },
        points: { type: Number, default: 0 }, // 2 for win, 0 for loss
        nrr: { type: Number, default: 0.0 }, // Net Run Rate
        totalRunsScored: { type: Number, default: 0 },
        totalOversFaced: { type: Number, default: 0 },
        totalRunsConceded: { type: Number, default: 0 },
        totalOversBowled: { type: Number, default: 0 },
        bonusPoints: { type: Number, default: 0 } // From swap rule (Rule 4)
    }
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
