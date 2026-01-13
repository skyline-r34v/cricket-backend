const Team = require('../models/Team');

const updateStandings = async (match) => {
    // 1. Determine Winner and Result
    let winnerId = null;
    let resultNote = "";

    // Assuming First Innings = Team A, Second = Team B for simplicity of reference logic
    // We should use match.innings.first.battingTeam if available
    // Standardizing: 
    // If match won by Team A (First Innings) -> Won by Runs
    // If match won by Team B (Second Innings) -> Won by Wickets

    const runsA = match.innings.first.totalRuns;
    const runsB = match.innings.second.totalRuns;
    const teamA = await Team.findById(match.teams.teamA);
    const teamB = await Team.findById(match.teams.teamB);

    if (runsA > runsB) {
        winnerId = teamA._id;
        resultNote = `${teamA.name} won by ${runsA - runsB} runs`;
    } else if (runsB > runsA) {
        winnerId = teamB._id;
        resultNote = `${teamB.name} won by ${10 - match.innings.second.wicketsLost} wickets`;
    } else {
        resultNote = "Match Tied";
        // Super over logic? user didn't specify. Tie = 1 point each?
    }

    match.winner = winnerId;
    match.status = 'Completed';
    match.resultNote = resultNote;
    await match.save();

    // 2. Update Team Stats
    const updateStats = async (team, runsFor, oversFor, runsAgainst, oversAgainst, isWinner) => {
        team.stats.played += 1;
        if (isWinner) team.stats.won += 1;
        else if (winnerId && !winnerId.equals(team._id)) team.stats.lost += 1;

        if (isWinner) team.stats.points += 2;
        else if (!winnerId) team.stats.points += 1; // Tie

        // NRR Accumulators
        team.stats.totalRunsScored += runsFor;
        team.stats.totalOversFaced += oversFor;
        team.stats.totalRunsConceded += runsAgainst;
        team.stats.totalOversBowled += oversAgainst;

        // Calculate NRR
        let runRateFor = team.stats.totalOversFaced > 0 ? (team.stats.totalRunsScored / team.stats.totalOversFaced) : 0;
        let runRateAgainst = team.stats.totalOversBowled > 0 ? (team.stats.totalRunsConceded / team.stats.totalOversBowled) : 0;

        let nrr = runRateFor - runRateAgainst;

        // Apply Substitute Rule (+1 NRR)
        if (match.substituteUsed) {
            const isTeamA = match.teams.teamA.equals(team._id);
            const isTeamB = match.teams.teamB.equals(team._id);

            if (isTeamA && match.substituteUsed.teamA) nrr += 1.0;
            if (isTeamB && match.substituteUsed.teamB) nrr += 1.0;
        }

        team.stats.nrr = nrr;

        await team.save();
    };

    // Calculate Overs (simplified: decimal overs need conversion for math? e.g. 1.3 is 1.5/1.83? 
    // Standard cricket NRR uses actual balls. 
    // Let's assume oversPlayed is float but for NRR it should be balls/6.
    // match.innings.first.oversPlayed might be "2" or "2.4".
    // I'll stick to raw overs value for MVP simplicity, or convert.
    // Let's rely on the stored Number.

    await updateStats(teamA, runsA, match.innings.first.oversPlayed, runsB, match.innings.second.oversPlayed, winnerId?.equals(teamA._id));
    await updateStats(teamB, runsB, match.innings.second.oversPlayed, runsA, match.innings.first.oversPlayed, winnerId?.equals(teamB._id));
};

module.exports = { updateStandings };
