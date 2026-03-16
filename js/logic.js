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
    SceneManager.replace(WonScene);
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

    if (row === G.platforms.length - 1) {
      SceneManager.replace(WonScene);
    }
  }
}
