// ─── SCORING ────────────────────────────────────────────────────
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

// ─── GAME LOGIC ─────────────────────────────────────────────────
function destroyDeparturePlatform() {
  const departurePlat = G.player.onPlatform;
  if (departurePlat) {
    spawnPlatformExplosion(departurePlat);
    departurePlat.destroyed = true;
  }
}

function tryJump(direction) {
  if (G.jumpAnim.active) return;
  if (G.gameState !== 'playing') return;

  const currentRow = G.player.row;
  const currentCol = G.player.col;

  if (direction === 'left' || direction === 'right') {
    // Stay in same row, move to adjacent platform
    if (currentRow >= G.platforms.length) return;
    const row = G.platforms[currentRow];
    let targetCol = currentCol;
    if (direction === 'left') targetCol = Math.max(0, currentCol - 1);
    if (direction === 'right') targetCol = Math.min(row.length - 1, currentCol + 1);
    if (targetCol === currentCol) return;

    const targetPlat = row[targetCol];
    G.jumpCount++;
    G.hopsThisRow++;
    playHopSound();
    destroyDeparturePlatform();

    G.jumpAnim = {
      active: true,
      startX: G.player.x,
      startY: G.player.y,
      endX: targetPlat.x + targetPlat.w / 2,
      endY: targetPlat.y - PLAYER_Y_OFFSET,
      t: 0,
      targetRow: currentRow,
      targetCol: targetCol,
      targetPlat: targetPlat,
    };
    return;
  }

  // Forward jump — advance one row
  const targetRow = currentRow + 1;
  if (targetRow >= G.platforms.length) {
    // Can't jump past the last row
    return;
  }

  const nextRowPlats = G.platforms[targetRow];
  let nearest = 0;
  let nearestDist = Infinity;
  for (let i = 0; i < nextRowPlats.length; i++) {
    const platCenter = nextRowPlats[i].x + nextRowPlats[i].w / 2;
    const dist = Math.abs(platCenter - G.player.x);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = i;
    }
  }

  const targetPlat = nextRowPlats[nearest];
  G.jumpCount++;
  playJumpSound();
  destroyDeparturePlatform();

  G.jumpAnim = {
    active: true,
    startX: G.player.x,
    startY: G.player.y,
    endX: targetPlat.x + targetPlat.w / 2,
    endY: targetPlat.y - PLAYER_Y_OFFSET,
    t: 0,
    targetRow: targetRow,
    targetCol: nearest,
    targetPlat: targetPlat,
  };
}

function landOnPlatform(plat, row, col) {
  if (plat.destroyed) {
    playFallSound();
    spawnLavaSplash(plat.x + plat.w / 2, plat.y + 40);
    SceneManager.replace(FallingScene);
    return;
  }
  if (plat.fake) {
    G.player.x = plat.x + plat.w / 2;
    G.player.y = plat.y - PLAYER_Y_OFFSET;
    plat.crumbling = true;
    spawnCrumbleParticles(plat);
    playCrumbleSound();
    addTimer(0.3, () => { SceneManager.replace(FallingScene); });
  } else {
    playLandSound();

    const prevRow = G.player.row;

    // Streak tracking: a clean forward row = no hops made before jumping forward
    if (row > prevRow) {
      if (G.hopsThisRow === 0) {
        G.jumpStreak++;
        G.streakBonus += G.jumpStreak * SCORE_STREAK_MULT;
      } else {
        G.jumpStreak = 0;
      }
      G.hopsThisRow = 0;
    }

    G.player.x = plat.x + plat.w / 2;
    G.player.y = plat.y - PLAYER_Y_OFFSET;
    G.player.row = row;
    G.player.col = col;
    G.player.onPlatform = plat;

    // Landing impact effects
    spawnLandDust(plat);
    plat.bobOffset = LAND_BOB_OFFSET;
    plat.bobVel = LAND_BOB_VEL;

    // Trail mark
    G.trailMarks.push({
      x: plat.x + plat.w / 2,
      y: plat.y + (PLAT_H - PLAT_DEPTH) / 2,
      life: 1.0,
    });

    // Win only when jumping forward onto the rescue character's platform (not hopping sideways)
    const rescueCol = G.safePath[G.safePath.length - 1];
    if (row === G.platforms.length - 1 && col === rescueCol && row > prevRow) {
      spawnPlatformExplosion(plat);
      plat.destroyed = true;
      SceneManager.replace(WonScene);
    }
  }
}
