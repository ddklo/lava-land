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

  // Build guaranteed safe path — biased toward sideways movement
  G.safePath = new Array(G.gridRows);
  G.safePath[0] = Math.floor(Math.random() * G.gridCols);

  for (let row = 1; row < G.gridRows; row++) {
    const prevCol = G.safePath[row - 1];
    // 70% chance to move sideways, 30% to stay in same column
    if (Math.random() < 0.7) {
      // Pick -1 or +1 only — no diagonal jumps allowed
      let shift = Math.random() < 0.5 ? 1 : -1;
      G.safePath[row] = Math.max(0, Math.min(G.gridCols - 1, prevCol + shift));
      // If clamped to same column, force opposite direction
      if (G.safePath[row] === prevCol) {
        G.safePath[row] = Math.max(0, Math.min(G.gridCols - 1, prevCol - shift));
      }
    } else {
      G.safePath[row] = prevCol;
    }
  }

  // Guarantee at least one horizontal move (safety net)
  const hasSideMove = G.safePath.some((col, i) => i > 0 && col !== G.safePath[i - 1]);
  if (!hasSideMove) {
    const row = 1 + Math.floor(Math.random() * (G.gridRows - 1));
    const prev = G.safePath[row - 1];
    G.safePath[row] = prev > 0 ? prev - 1 : prev + 1;
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

  // Ensure bridge platforms are safe when the path shifts sideways.
  // When the path moves from col A (row N) to col B (row N+1) with A != B,
  // the player jumps forward to col A in row N+1, then sidesteps to col B.
  // So col A in row N+1 must also be safe.
  for (let row = 1; row < G.gridRows; row++) {
    const prevCol = G.safePath[row - 1];
    const curCol = G.safePath[row];
    if (prevCol !== curCol) {
      G.platforms[row][prevCol].fake = false;
    }
  }
}
