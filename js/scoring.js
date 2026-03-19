// ─── SCORING ────────────────────────────────────────────────────
// Pure scoring functions — no game state side effects.
// Depends only on constants from config.js.

function calculateScore(levelNum, timeSec, jumpCount, totalRows, memTime, memTimeSaved, streakBonus) {
  const minJumps = totalRows - 1;
  const excessJumps = Math.max(0, jumpCount - minJumps);
  const perfect = excessJumps === 0;
  const fast = timeSec < memTime * SPEED_BONUS_THRESHOLD;

  const timeScore = Math.max(0, SCORE_TIME_BASE - Math.floor(timeSec * SCORE_TIME_PENALTY));
  const jumpScore = Math.max(0, SCORE_JUMP_BASE - excessJumps * SCORE_JUMP_PENALTY);
  const levelBonus = levelNum * SCORE_LEVEL_MULT;
  const perfectBonus = perfect ? SCORE_PERFECT_BONUS : 0;
  const speedBonus = fast ? SCORE_SPEED_BONUS : 0;
  const earlyMemBonus = Math.round((memTimeSaved || 0) * SCORE_EARLY_MEM_MULT);
  const streakBonusVal = streakBonus || 0;
  const totalScore = timeScore + jumpScore + levelBonus + perfectBonus + speedBonus + earlyMemBonus + streakBonusVal;

  return { timeScore, jumpScore, levelBonus, perfectBonus, speedBonus, earlyMemBonus, streakBonus: streakBonusVal, totalScore, perfect, fast };
}

function calculateStars(score, levelNum) {
  const cfg = getLevelConfig(levelNum);
  // Max possible: perfect path, zero time, all bonuses + full early mem + max streak
  const maxStreakBonus = ((cfg.rows - 1) * cfg.rows / 2) * SCORE_STREAK_MULT;
  const maxScore = SCORE_TIME_BASE + SCORE_JUMP_BASE + levelNum * SCORE_LEVEL_MULT
                 + SCORE_PERFECT_BONUS + SCORE_SPEED_BONUS
                 + cfg.memTime * SCORE_EARLY_MEM_MULT + maxStreakBonus;
  if (score >= maxScore * STAR_THREE_THRESHOLD) return 3;
  if (score >= maxScore * STAR_TWO_THRESHOLD) return 2;
  return 1;
}
