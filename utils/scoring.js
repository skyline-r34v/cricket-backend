// Core business logic for scoring

const calculateBallPoints = (runs, isChild) => {
    // Rule 5: If batsman is child, runs are doubled
    if (isChild) {
        return runs * 2;
    }
    return runs;
};

const applySecondOverRule = (overObj) => {
    // Rule 6: 2nd over checks
    // If run < 16, half (ceiling). Else double.
    // This function expects the Over object from DB to be passed

    if (overObj.overNumber !== 2) return overObj.totalRuns;

    const raw = overObj.rawRuns;
    let adjusted = raw;

    if (raw < 16) {
        adjusted = Math.ceil(raw / 2);
    } else {
        adjusted = raw * 2;
    }
    return adjusted;
};

module.exports = {
    calculateBallPoints,
    applySecondOverRule
};
