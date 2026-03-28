// ─── GAME LOGIC ─────────────────────────────────────────────────
function destroyDeparturePlatform() {
  const departurePlat = G.player.onPlatform;
  if (departurePlat) {
    spawnPlatformExplosion(departurePlat);
    departurePlat.destroyed = true;
  }
}

function _denyJump() {
  // Rate-limit denied feedback to avoid buzzing on key repeat
  const now = performance.now();
  if (G._lastDeniedTime && now - G._lastDeniedTime < 200) return;
  G._lastDeniedTime = now;
  playDeniedSound();
  G.shakeTimer = 2;
  haptic(15);
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
    if (direction === 'left') { targetCol = Math.max(0, currentCol - 1); G.player.facing = 'left'; }
    if (direction === 'right') { targetCol = Math.min(row.length - 1, currentCol + 1); G.player.facing = 'right'; }
    if (targetCol === currentCol) { _denyJump(); return; }

    const targetPlat = row[targetCol];
    G.jumpCount++;
    G.hopsThisRow++;
    playHopSound();
    haptic(45);
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

  // Backward jump — go back one row
  if (direction === 'backward') {
    const targetRow = currentRow - 1;
    if (targetRow < 0) { _denyJump(); return; }

    const prevRowPlats = G.platforms[targetRow];
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < prevRowPlats.length; i++) {
      const platCenter = prevRowPlats[i].x + prevRowPlats[i].w / 2;
      const dist = Math.abs(platCenter - G.player.x);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    }

    const targetPlat = prevRowPlats[nearest];
    G.jumpCount++;
    playJumpSound();
    haptic(55);
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
    return;
  }

  // Forward jump — advance one row
  const targetRow = currentRow + 1;
  if (targetRow >= G.platforms.length) {
    _denyJump();
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
  haptic(55);
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
    haptic([150, 50, 200]);
    spawnLavaSplash(plat.x + plat.w / 2, plat.y + 40);
    SceneManager.replace(FallingScene); // instant — already in lava
    return;
  }
  if (plat.fake) {
    G.player.x = plat.x + plat.w / 2;
    G.player.y = plat.y - PLAYER_Y_OFFSET;
    plat.crumbling = true;
    spawnCrumbleParticles(plat);
    playCrumbleSound();
    haptic([100, 60, 180]);
    addTimer(0.3, () => { SceneManager.replace(FallingScene); }); // instant — crumble animation handles it
  } else {
    playLandSound();
    haptic(40);

    // Streak tracking: a clean forward row = no hops made before jumping forward
    if (row > G.player.row) {
      if (G.hopsThisRow === 0) {
        G.jumpStreak++;
        G.streakBonus += G.jumpStreak * SCORE_STREAK_MULT;
      } else {
        G.jumpStreak = 0;
      }
      G.hopsThisRow = 0;
    } else if (row < G.player.row) {
      // Backward jump resets streak
      G.jumpStreak = 0;
      G.hopsThisRow = 0;
    }

    G.player.x = plat.x + plat.w / 2;
    G.player.y = plat.y - PLAYER_Y_OFFSET;
    G.player.row = row;
    G.player.col = col;
    G.player.onPlatform = plat;

    // Landing impact effects
    G.player.landTimer = LAND_SQUASH_DURATION;
    spawnImpactRing(plat);
    spawnLandDust(plat);
    plat.bobOffset = LAND_BOB_OFFSET;
    plat.bobVel = LAND_BOB_VEL;
    G.shakeTimer = 3; // micro-shake on landing

    // Combo streak
    G.streak++;
    if (G.streak >= 3) {
      G.streakPopups.push({
        x: plat.x + plat.w / 2,
        y: plat.y - 20,
        text: 'x' + G.streak,
        timer: 1.0,
      });
    }

    // Tutorial deactivation
    if (G.tutorialActive) {
      G.tutorialActive = false;
      G.tutorialShown = true;
    }

    // Coin collection
    for (const coin of G.coins) {
      if (!coin.collected && coin.row === row && coin.col === col) {
        coin.collected = true;
        G.coinsCollected++;
        G.coinScore += COIN_POINTS;
        playCoinSound();
        haptic([30, 15, 50]);
        spawnCoinSparkle(plat.x + plat.w / 2, plat.y + (PLAT_H - PLAT_DEPTH) / 2 - 18);
        // Coin popup
        G.streakPopups.push({
          x: plat.x + plat.w / 2,
          y: plat.y - 35,
          text: '+' + COIN_POINTS,
          timer: 1.0,
        });
        break;
      }
    }

    // Trail mark
    G.trailMarks.push({
      x: plat.x + plat.w / 2,
      y: plat.y + (PLAT_H - PLAT_DEPTH) / 2,
      life: 1.0,
    });

    // Win only when landing on the rescue character's platform
    const rescueCol = G.safePath[G.safePath.length - 1];
    if (row === G.platforms.length - 1 && col === rescueCol) {
      spawnPlatformExplosion(plat);
      plat.destroyed = true;
      SceneManager.replace(WonScene);
    }
  }
}
