// ─── SCORING ────────────────────────────────────────────────────
// Pure scoring functions — no game state side effects.
// Depends only on constants from config.js.

function calculateScore(levelNum, timeSec, jumpCount, totalRows, memTime, memTimeSaved, streakBonus, opts) {
  const { routeRevealed, totalCols, fakeChance } = opts || {};

  // If route was revealed, score is zero — you used the cheat
  if (routeRevealed) {
    return {
      timeScore: 0, jumpScore: 0, levelBonus: 0, perfectBonus: 0, speedBonus: 0,
      earlyMemBonus: 0, streakBonus: 0, difficultyBonus: 0, totalScore: 0,
      perfect: false, fast: false, routeRevealed: true,
    };
  }

  const minJumps = totalRows - 1;
  const excessJumps = Math.max(0, jumpCount - minJumps);
  const perfect = excessJumps === 0;
  const fast = timeSec < memTime * SPEED_BONUS_THRESHOLD;

  const timeScore = Math.max(0, SCORE_TIME_BASE - Math.floor(timeSec * SCORE_TIME_PENALTY));
  const jumpScore = Math.max(0, SCORE_JUMP_BASE - excessJumps * SCORE_JUMP_PENALTY);
  const levelBonus = levelNum * SCORE_LEVEL_MULT;
  const perfectBonus = perfect ? SCORE_PERFECT_BASE + levelNum * SCORE_PERFECT_LEVEL_MULT : 0;
  const speedBonus = fast ? SCORE_SPEED_BASE + levelNum * SCORE_SPEED_LEVEL_MULT : 0;
  const earlyMemBonus = Math.round((memTimeSaved || 0) * SCORE_EARLY_MEM_MULT);
  const streakBonusVal = streakBonus || 0;

  // Difficulty bonus: rewards larger grids and higher fake density
  const gridCells = (totalCols || 5) * totalRows;
  const fakePct = fakeChance || 0;
  const difficultyBonus = Math.round(gridCells * SCORE_DIFFICULTY_MULT * (1 + fakePct))
                        + Math.round(fakePct * SCORE_FAKE_MULT);

  const totalScore = timeScore + jumpScore + levelBonus + perfectBonus + speedBonus + earlyMemBonus + streakBonusVal + difficultyBonus;

  return { timeScore, jumpScore, levelBonus, perfectBonus, speedBonus, earlyMemBonus, streakBonus: streakBonusVal, difficultyBonus, totalScore, perfect, fast, routeRevealed: false };
}

function calculateStars(score, levelNum) {
  const cfg = getLevelConfig(levelNum);
  // Realistic max: use a fraction of theoretical max streak (perfect streaks are
  // impossible on large grids with multi-hop paths and backtracks)
  const theoreticalMaxStreak = ((cfg.rows - 1) * cfg.rows / 2) * SCORE_STREAK_MULT;
  const realisticMaxStreak = Math.round(theoreticalMaxStreak * STREAK_REALISM_FACTOR);
  const gridCells = cfg.cols * cfg.rows;
  const fakePct = cfg.fake || 0;
  const maxDifficultyBonus = Math.round(gridCells * SCORE_DIFFICULTY_MULT * (1 + fakePct))
                           + Math.round(fakePct * SCORE_FAKE_MULT);
  const maxPerfectBonus = SCORE_PERFECT_BASE + levelNum * SCORE_PERFECT_LEVEL_MULT;
  const maxSpeedBonus = SCORE_SPEED_BASE + levelNum * SCORE_SPEED_LEVEL_MULT;
  const maxScore = SCORE_TIME_BASE + SCORE_JUMP_BASE + levelNum * SCORE_LEVEL_MULT
                 + maxPerfectBonus + maxSpeedBonus
                 + cfg.memTime * SCORE_EARLY_MEM_MULT + realisticMaxStreak + maxDifficultyBonus;
  if (score >= maxScore * STAR_THREE_THRESHOLD) return 3;
  if (score >= maxScore * STAR_TWO_THRESHOLD) return 2;
  return 1;
}
