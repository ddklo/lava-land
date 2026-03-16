// ─── PLATFORM GENERATION ────────────────────────────────────────
function generatePlatforms() {
  G.platforms = [];

  // Fixed column count — platform width adapts to fit
  const platW = Math.min(70, (CANVAS_W - (G.gridCols + 1) * 20) / G.gridCols);
  const totalGap = CANVAS_W - G.gridCols * platW;
  const gap = totalGap / (G.gridCols + 1);
  const rowSpacing = Math.max(PLAT_H + 28, Math.min(90, (CANVAS_H - 100) / G.gridRows));

  for (let row = 0; row < G.gridRows; row++) {
    const rowPlatforms = [];
    for (let i = 0; i < G.gridCols; i++) {
      rowPlatforms.push({
        x: gap + i * (platW + gap),
        y: 80 + row * rowSpacing,
        w: platW,
        h: PLAT_H,
        fake: false,
        crumbling: false,
        crumbleTimer: 0,
        bobOffset: 0,
        bobVel: 0,
      });
    }
    G.platforms.push(rowPlatforms);
  }

  // Build guaranteed safe path (forward = nearest)
  G.safePath = new Array(G.gridRows);
  G.safePath[0] = Math.floor(Math.random() * G.gridCols);

  for (let row = 1; row < G.gridRows; row++) {
    const prevPlat = G.platforms[row - 1][G.safePath[row - 1]];
    const prevCenter = prevPlat.x + prevPlat.w / 2;
    let nearestCol = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < G.platforms[row].length; i++) {
      const center = G.platforms[row][i].x + G.platforms[row][i].w / 2;
      const dist = Math.abs(center - prevCenter);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestCol = i;
      }
    }
    G.safePath[row] = nearestCol;
  }

  // Mark non-path as fake based on difficulty
  const fakeChance = DIFFICULTY_FAKE_CHANCE[G.difficulty];
  for (let row = 0; row < G.gridRows; row++) {
    for (let i = 0; i < G.platforms[row].length; i++) {
      if (i === G.safePath[row]) continue; // never make path platform fake
      if (Math.random() < fakeChance) {
        G.platforms[row][i].fake = true;
      }
    }
  }
}
