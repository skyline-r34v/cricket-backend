const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Team = require('../models/Team');
const Player = require('../models/Player');
const { calculateBallPoints, applySecondOverRule } = require('../utils/scoring');
const { updateStandings } = require('../utils/standings');
const { protect } = require('../middleware/authMiddleware');

const populateMatch = (query) => {
    return query
        .populate({ path: 'teams.teamA', populate: { path: 'players' } })
        .populate({ path: 'teams.teamB', populate: { path: 'players' } });
};


// Schedule Match
router.post('/schedule', protect, async (req, res) => {
    const { teamAId, teamBId, stage, date } = req.body;
    try {
        // Initial -5 check (Rule 7)
        // Only for League matches and if team is handicap team
        const teamA = await Team.findById(teamAId);
        const teamB = await Team.findById(teamBId);

        let initialScoreA = 0;
        let initialScoreB = 0;

        if (stage === 'League') {
            if (teamA.isHandicapTeam) initialScoreA = -5;
            if (teamB.isHandicapTeam) initialScoreB = -5;
        }

        const match = new Match({
            teams: { teamA: teamAId, teamB: teamBId },
            stage,
            matchDate: date || Date.now(),
            innings: {
                first: { totalRuns: initialScoreA },
                second: { totalRuns: initialScoreB }
            }
        });

        await match.save();
        res.status(201).json(match);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Ball (Live Scoring)
router.post('/:id/ball', protect, async (req, res) => {
    const {
        inningNumber, // 1 or 2
        overNumber,
        ballNumber,
        batsmanId,
        bowlerId,
        runs,
        isWicket,
        wicketType,
        extras
    } = req.body;

    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        const inning = inningNumber === 1 ? match.innings.first : match.innings.second;

        // Find Batsman for Rule 5 Check
        const batsman = await Player.findById(batsmanId);
        const isChild = batsman.ageCategory === 'Child';

        // Calculate Runs (Rule 5)
        const effectiveRuns = calculateBallPoints(runs, isChild);

        // Add Ball logic
        // Verify Over exists, if not create
        let over = inning.overs.find(o => o.overNumber === overNumber);
        if (!over) {
            over = { overNumber, balls: [], totalRuns: 0, rawRuns: 0, adjustedRuns: 0 };
            inning.overs.push(over);
            // Re-find reference from array
            over = inning.overs.find(o => o.overNumber === overNumber);
        }

        const ball = {
            ballNumber,
            batsman: batsmanId,
            bowler: bowlerId,
            runs: effectiveRuns,
            extras,
            isWicket,
            wicketType,
            extraType: req.body.extraType || 'None'
        };

        over.balls.push(ball);

        // Update Over Totals
        // Rule 6 Tracking: rawRuns tracks purely runs in this over
        over.rawRuns += effectiveRuns + (extras || 0);

        // Check if Over 2 is done (assuming 6 balls for simplicity, should be dynamic)
        // If this is the last ball of Over 2 (e.g. 2.6)
        // We'll calculate adjustedRuns every ball but finalize it visually?
        // Logic: Apply Rule 6 logic to `adjustedRuns` based on current `rawRuns`
        if (match.stage === 'League' && overNumber === 2 && match.rules.secondOverRuleActive) {
            over.adjustedRuns = applySecondOverRule(over);
        } else {
            over.adjustedRuns = over.rawRuns; // No adjustment
        }

        // Update Inning Total
        // Recalculate total runs from all overs
        inning.totalRuns = inning.overs.reduce((sum, o) => sum + o.adjustedRuns, 0);

        // Update Wickets & Fallen Wickets
        let totalWickets = 0;
        let totalValidBalls = 0;
        const fallen = [];

        inning.overs.forEach(o => {
            o.balls.forEach(b => {
                if (b.isWicket) {
                    totalWickets++;
                    // Avoid duplicates if logic re-runs (though we rebuild array here)
                    if (b.batsman && !fallen.includes(b.batsman.toString())) fallen.push(b.batsman);
                }
                // Check valid ball for over count
                if (['None', 'Bye', 'Leg Bye'].includes(b.extraType || 'None')) {
                    totalValidBalls++;
                }
            });
        });

        inning.wicketsLost = totalWickets;
        inning.fallenWickets = fallen;

        // Calculate Overs Played (e.g. 2.4)
        const completedOvers = Math.floor(totalValidBalls / 6);
        const ballsRemaining = totalValidBalls % 6;
        inning.oversPlayed = Number(`${completedOvers}.${ballsRemaining}`);

        // Save
        // Save
        await match.save();

        const populatedMatch = await populateMatch(Match.findById(match._id));

        // Broadcast
        if (req.io) {
            req.io.emit(`match:${match._id}`, populatedMatch);
        }

        res.json(populatedMatch);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const matches = await Match.find()
            .populate('teams.teamA')
            .populate('teams.teamB')
            .sort({ matchDate: -1 });
        res.json(matches);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/:id/end', protect, async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        await updateStandings(match);
        res.json({ message: 'Match Finalized', match });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/:id/undo', protect, async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        // Logic: Find the latest over with balls
        const inning = match.innings.second.balls?.length > 0 || match.innings.second.overs?.length > 0
            ? match.innings.second
            : match.innings.first; // Simplified detection

        // Better: Check based on oversPlayed/status?
        // Let's assume we undo from the "current" inning context.
        // Actually, we need to find the *last active over*.

        // Find inning with last activity
        let activeInning = match.innings.second.overs.length > 0 ? match.innings.second : match.innings.first;
        if (activeInning.overs.length === 0 && match.innings.first.overs.length > 0) activeInning = match.innings.first;

        if (!activeInning || activeInning.overs.length === 0) {
            return res.status(400).json({ message: "Nothing to undo" });
        }

        const lastOverIndex = activeInning.overs.length - 1;
        let lastOver = activeInning.overs[lastOverIndex];

        if (lastOver.balls.length === 0) {
            // Empty over, remove it and look at previous
            activeInning.overs.pop();
            if (activeInning.overs.length === 0) return res.json(match);
            lastOver = activeInning.overs[activeInning.overs.length - 1];
        }

        // Pop last ball
        const poppedBall = lastOver.balls.pop();

        // Decrement stats
        if (poppedBall) {
            const runs = poppedBall.runs || 0;
            const extras = poppedBall.extras || 0;

            // Update Over metrics
            lastOver.rawRuns -= (runs + extras);
            lastOver.adjustedRuns = lastOver.rawRuns; // Re-apply rule 6 if needed, but undoing raw is safer for now.

            // Update Inning metrics
            // Re-calc entire inning runs? Safer.
            activeInning.totalRuns = activeInning.overs.reduce((sum, o) => sum + o.adjustedRuns, 0);

            // Wickets
            if (poppedBall.isWicket) {
                activeInning.wicketsLost -= 1;
                // Remove from fallenWickets? 
                // Need poppedBall.batsman ID.
                if (poppedBall.batsman) {
                    activeInning.fallenWickets = activeInning.fallenWickets.filter(id => id.toString() !== poppedBall.batsman.toString());
                }
            }

            // Overs Played
            // Re-calc
            let totalValidOnly = 0;
            activeInning.overs.forEach(o => {
                o.balls.forEach(b => {
                    if (['None', 'Bye', 'Leg Bye'].includes(b.extraType || 'None')) totalValidOnly++;
                });
            });
            const co = Math.floor(totalValidOnly / 6);
            const br = totalValidOnly % 6;
            activeInning.oversPlayed = Number(`${co}.${br}`);
        }

        await match.save();
        if (req.io) req.io.emit(`match:${match._id}`, match);
        res.json(match);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/:id/toss', protect, async (req, res) => {
    try {
        const { winnerId, choice } = req.body;
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        if (match.toss && match.toss.winner) {
            return res.status(400).json({ message: 'Toss already completed' });
        }

        match.toss = { winner: winnerId, choice };

        const teamAId = match.teams.teamA.toString();
        const teamBId = match.teams.teamB.toString();

        let batFirstId;
        if (choice === 'Bat') {
            batFirstId = winnerId;
        } else {
            batFirstId = winnerId === teamAId ? teamBId : teamAId;
        }

        const batSecondId = batFirstId === teamAId ? teamBId : teamAId;

        // Initialize Innings with Batting Teams
        match.innings.first.battingTeam = batFirstId;
        match.innings.first.bowlingTeam = batSecondId;
        match.innings.second.battingTeam = batSecondId;
        match.innings.second.bowlingTeam = batFirstId;

        await match.save();
        if (req.io) req.io.emit(`match:${match._id}`, match);
        res.json(match);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/:id/substitute', protect, async (req, res) => {
    try {
        const { team, active } = req.body; // team: 'teamA' or 'teamB', active: boolean
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        if (team === 'teamA') match.substituteUsed.teamA = active;
        if (team === 'teamB') match.substituteUsed.teamB = active;

        await match.save();
        res.json(match);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate({
                path: 'teams.teamA',
                populate: { path: 'players' }
            })
            .populate({
                path: 'teams.teamB',
                populate: { path: 'players' }
            })
            .populate('squads.teamAPlaying');
        res.json(match);
    } catch (err) {
        res.status(404).json({ message: 'Not found' });
    }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        await Match.findByIdAndDelete(req.params.id);
        res.json({ message: "Match deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
