// ─── GAME LOGIC ─────────────────────────────────────────────────
function tryJump(direction) {
  if (G.jumpAnim.active) return;
  if (G.gameState !== 'playing') return;

  const currentRow = G.player.row;
  const currentCol = G.player.col;

  if (direction === 'left' || direction === 'right') {
    // Stay in same row, move to adjacent platform
    const row = G.platforms[currentRow];
    let targetCol = currentCol;
    if (direction === 'left') targetCol = Math.max(0, currentCol - 1);
    if (direction === 'right') targetCol = Math.min(row.length - 1, currentCol + 1);
    if (targetCol === currentCol) return;

    const targetPlat = row[targetCol];
    G.jumpCount++;
    playHopSound();

    // Departure: explode and destroy current platform
    const departurePlat = G.player.onPlatform;
    if (departurePlat) {
      spawnPlatformExplosion(departurePlat);
      departurePlat.destroyed = true;
    }

    G.jumpAnim = {
      active: true,
      startX: G.player.x,
      startY: G.player.y,
      endX: targetPlat.x + targetPlat.w / 2,
      endY: targetPlat.y - 16,
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

  // Departure: explode and destroy current platform
  const departurePlat = G.player.onPlatform;
  if (departurePlat) {
    spawnPlatformExplosion(departurePlat);
    departurePlat.destroyed = true;
  }

  G.jumpAnim = {
    active: true,
    startX: G.player.x,
    startY: G.player.y,
    endX: targetPlat.x + targetPlat.w / 2,
    endY: targetPlat.y - 16,
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
    plat.crumbling = true;
    spawnCrumbleParticles(plat);
    playCrumbleSound();
    addTimer(0.3, () => { SceneManager.replace(FallingScene); });
  } else {
    playLandSound();
    G.player.x = plat.x + plat.w / 2;
    G.player.y = plat.y - 16;
    G.player.row = row;
    G.player.col = col;
    G.player.onPlatform = plat;

    // Landing impact effects
    spawnLandDust(plat);
    plat.bobOffset = 5;
    plat.bobVel = 60;

    // Trail mark
    G.trailMarks.push({
      x: plat.x + plat.w / 2,
      y: plat.y + (PLAT_H - 7) / 2,
      life: 1.0,
    });

    // Win only when landing on the rescue character's platform
    const rescueCol = G.safePath[G.safePath.length - 1];
    if (row === G.platforms.length - 1 && col === rescueCol) {
      SceneManager.replace(WonScene);
    }
  }
}
