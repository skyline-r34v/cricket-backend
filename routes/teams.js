const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Player = require('../models/Player');

// Get all teams
router.get('/', async (req, res) => {
    try {
        const teams = await Team.find().populate('players');
        res.json(teams);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a Team
router.post('/', async (req, res) => {
    const { name, isHandicapTeam } = req.body;
    try {
        const newTeam = new Team({ name, isHandicapTeam });
        await newTeam.save();
        res.status(201).json(newTeam);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Add Player to Team
router.post('/:teamId/players', async (req, res) => {
    const { name, ageCategory } = req.body;
    try {
        const team = await Team.findById(req.params.teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        const player = new Player({
            name,
            ageCategory,
            team: team._id
        });
        await player.save();

        team.players.push(player._id);
        await team.save();

        res.status(201).json(player);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
