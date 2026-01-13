const mongoose = require('mongoose');

const ballSchema = new mongoose.Schema({
    ballNumber: { type: Number, required: true }, // 1.1, 1.2 etc.
    batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    runs: { type: Number, default: 0 }, // Raw runs scored
    extras: { type: Number, default: 0 },
    isWicket: { type: Boolean, default: false },
    wicketType: { type: String }, // 'Bowled', 'Catch', etc.
    commentary: { type: String },
    extraType: {
        type: String,
        enum: ['None', 'Wide', 'No Ball', 'Bye', 'Leg Bye'],
        default: 'None'
    }
});

const overSchema = new mongoose.Schema({
    overNumber: { type: Number, required: true }, // 1, 2, 3...
    balls: [ballSchema],
    totalRuns: { type: Number, default: 0 },
    // For Rule 6 (2nd Over):
    rawRuns: { type: Number, default: 0 },
    adjustedRuns: { type: Number, default: 0 }
});

const inningsSchema = new mongoose.Schema({
    battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    overs: [overSchema],
    totalRuns: { type: Number, default: 0 },
    wicketsLost: { type: Number, default: 0 },
    fallenWickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }], // Stores IDs of batsmen who are OUT
    oversPlayed: { type: Number, default: 0 }
});

const matchSchema = new mongoose.Schema({
    matchDate: { type: Date, default: Date.now },
    stage: {
        type: String,
        enum: ['League', 'Playoff', 'Final'],
        default: 'League'
    },
    teams: {
        teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
        teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true }
    },
    squads: {
        teamA: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }], // Full squad (up to 12)
        teamB: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
        teamAPlaying: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }], // 10 on field
        teamBPlaying: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }]
    },
    innings: {
        first: { type: inningsSchema, default: () => ({}) },
        second: { type: inningsSchema, default: () => ({}) }
    },
    status: {
        type: String,
        enum: ['Scheduled', 'Live', 'Completed'],
        default: 'Scheduled'
    },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    resultNote: { type: String }, // e.g. "Team A won by 10 runs"
    rules: {
        handicapActive: { type: Boolean, default: true }, // Rule 7
        secondOverRuleActive: { type: Boolean, default: true }, // Rule 6
        maxOvers: { type: Number, default: 5 } // 5 or 6 (Rule 8)
    },
    substituteUsed: {
        teamA: { type: Boolean, default: false },
        teamB: { type: Boolean, default: false }
    },
    toss: {
        winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
        choice: { type: String, enum: ['Bat', 'Bowl'] }
    }
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
