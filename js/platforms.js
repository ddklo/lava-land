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
        destroyed: false,
        crumbling: false,
        crumbleTimer: 0,
        bobOffset: 0,
        bobVel: 0,
      });
    }
    G.platforms.push(rowPlatforms);
  }

  // Build guaranteed safe path — biased toward sideways movement,
  // never allows more than 1 consecutive straight-down jump.
  // maxShift controls how many columns the path can shift per row.
  const maxShift = (G.levelConfig && G.levelConfig.maxShift) || 1;
  G.safePath = new Array(G.gridRows);
  G.safePath[0] = Math.floor(Math.random() * G.gridCols);
  let stayCount = 0; // consecutive rows staying in same column

  for (let row = 1; row < G.gridRows; row++) {
    const prevCol = G.safePath[row - 1];
    // Force sideways if we just went straight down
    const forceSide = stayCount >= 1;

    // Determine probability of staying based on maxShift
    const stayProb = maxShift === 1 ? 0.2 : maxShift === 2 ? 0.2 : 0.1;
    if (forceSide || Math.random() >= stayProb) {
      // Pick shift amount based on maxShift
      let shift;
      const r = Math.random();
      if (maxShift === 1) {
        shift = Math.random() < 0.5 ? 1 : -1;
      } else if (maxShift === 2) {
        // 55% shift±1, 25% shift±2 (out of the 80% that shift)
        shift = (r < 0.69 ? 1 : 2) * (Math.random() < 0.5 ? 1 : -1);
      } else {
        // maxShift === 3: 40%→±1, 30%→±2, 20%→±3 (out of the 90% that shift)
        shift = (r < 0.44 ? 1 : r < 0.78 ? 2 : 3) * (Math.random() < 0.5 ? 1 : -1);
      }
      G.safePath[row] = Math.max(0, Math.min(G.gridCols - 1, prevCol + shift));
      // If clamped to same column, try opposite direction
      if (G.safePath[row] === prevCol) {
        G.safePath[row] = Math.max(0, Math.min(G.gridCols - 1, prevCol - shift));
      }
      stayCount = (G.safePath[row] === prevCol) ? stayCount + 1 : 0;
    } else {
      G.safePath[row] = prevCol;
      stayCount++;
    }
  }

  // Guarantee enough horizontal moves for variety
  let sideMoves = G.safePath.reduce((n, col, i) => n + (i > 0 && col !== G.safePath[i - 1] ? 1 : 0), 0);
  const minSideMoves = Math.max(2, Math.floor(G.gridRows * 0.4));
  while (sideMoves < minSideMoves) {
    // Pick a random row that currently goes straight and force a side move
    const candidates = [];
    for (let r = 1; r < G.gridRows; r++) {
      if (G.safePath[r] === G.safePath[r - 1]) candidates.push(r);
    }
    if (candidates.length === 0) break;
    const row = candidates[Math.floor(Math.random() * candidates.length)];
    const prev = G.safePath[row - 1];
    const shift = Math.random() < 0.5 ? 1 : -1;
    const newCol = Math.max(0, Math.min(G.gridCols - 1, prev + shift));
    if (newCol !== prev) {
      G.safePath[row] = newCol;
      sideMoves++;
    }
  }

  // Mark non-path platforms as fake based on difficulty (adventure uses levelConfig)
  const fakeChance = G.levelConfig ? G.levelConfig.fake : DIFFICULTY_FAKE_CHANCE[G.difficulty];
  for (let row = 0; row < G.gridRows; row++) {
    for (let i = 0; i < G.platforms[row].length; i++) {
      if (i === G.safePath[row]) continue; // never fake the path platform
      if (Math.random() < fakeChance) {
        G.platforms[row][i].fake = true;
      }
    }
  }

  // Ensure all intermediate columns between prevCol and curCol are safe.
  // When the path shifts by N columns the player must hop through each one,
  // so every column in [min(prev,cur)..max(prev,cur)] at that row must be real.
  function applyBridge() {
    for (let row = 1; row < G.gridRows; row++) {
      const prevCol = G.safePath[row - 1];
      const curCol  = G.safePath[row];
      if (prevCol !== curCol) {
        const lo = Math.min(prevCol, curCol);
        const hi = Math.max(prevCol, curCol);
        for (let c = lo; c <= hi; c++) {
          G.platforms[row][c].fake = false;
        }
      }
    }
  }
  applyBridge();

  // Plant decoy paths — columns that look almost complete but have one
  // strategic fake that blocks the route (dead-end columns).
  const numDecoys = (G.levelConfig && G.levelConfig.decoys) || 0;
  if (numDecoys > 0) {
    const rescueCol = G.safePath[G.gridRows - 1];
    // Candidate columns: anything except the rescue column
    const candidates = [];
    for (let c = 0; c < G.gridCols; c++) {
      if (c !== rescueCol) candidates.push(c);
    }
    // Fisher-Yates shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const decoyCols = candidates.slice(0, numDecoys);
    for (const dc of decoyCols) {
      // Make the whole column real (visible tempting path)
      for (let r = 0; r < G.gridRows; r++) {
        G.platforms[r][dc].fake = false;
      }
      // Block it with exactly one strategic fake in the middle-to-late rows.
      // Skip rows where dc is on the safe path (to avoid invalidating the safe route).
      const blockStart = Math.floor(G.gridRows * 0.35);
      const blockRange = Math.max(1, Math.floor(G.gridRows * 0.45));
      let blockRow = blockStart + Math.floor(Math.random() * blockRange);
      if (G.safePath[blockRow] === dc) {
        // Try to find a nearby safe row to place the fake
        for (let offset = 1; offset < blockRange; offset++) {
          const alt = blockStart + ((blockRow - blockStart + offset) % blockRange);
          if (G.safePath[alt] !== dc) { blockRow = alt; break; }
        }
      }
      if (G.safePath[blockRow] !== dc) {
        G.platforms[blockRow][dc].fake = true;
      }
    }
    // Bridge always wins — safe path bridges override any decoy fake
    applyBridge();
  }
}
