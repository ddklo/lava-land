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

  // ── Build guaranteed safe path ──────────────────────────────
  // maxShift controls how many columns the path can shift per row.
  const maxShift = (G.levelConfig && G.levelConfig.maxShift) || 1;
  G.safePath = new Array(G.gridRows);
  // Center-biased starting column (average of two randoms creates a bell curve)
  G.safePath[0] = Math.floor((Math.random() + Math.random()) / 2 * G.gridCols);
  let stayCount = 0; // consecutive rows staying in same column

  for (let row = 1; row < G.gridRows; row++) {
    const prevCol = G.safePath[row - 1];
    // Force sideways if we hit the max consecutive straight limit
    const forceSide = stayCount >= BOARD_RULES.maxConsecutiveStraight;

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

  // ── Rule: maxConsecutiveSameDirection ──────────────────────
  // Break up runs where the path moves in the same lateral direction
  // (left or right) for more than BOARD_RULES.maxConsecutiveSameDirection
  // consecutive rows. This prevents long diagonal lines that are too
  // easy to memorize.
  applyMaxConsecutiveDirectionRule(G.safePath, G.gridCols);

  // ── Rule: minLateralMoveFraction ──────────────────────────
  // Guarantee enough horizontal moves for variety.
  let sideMoves = G.safePath.reduce((n, col, i) => n + (i > 0 && col !== G.safePath[i - 1] ? 1 : 0), 0);
  const minSideMoves = Math.max(2, Math.floor(G.gridRows * BOARD_RULES.minLateralMoveFraction));
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

  // ── Insert backtrack sections (late levels only) ───────────
  const numBacktracks = (G.levelConfig && G.levelConfig.backtracks) || 0;
  G.extraSafeCols = {};
  G.safeRoute = [];

  if (numBacktracks > 0 && G.gridRows >= 8) {
    insertBacktracks(G.safePath, G.gridCols, G.gridRows, numBacktracks);
  } else {
    // No backtracks — build safeRoute with each individual move:
    // a forward jump always lands at the player's current column in the next row,
    // then hops bring the player to the destination column.
    for (let r = 0; r < G.gridRows; r++) {
      const destCol = G.safePath[r];
      if (r === 0) {
        G.safeRoute.push({ row: 0, col: destCol });
      } else {
        const prevCol = G.safePath[r - 1];
        // Forward jump lands at prevCol in this row (nearest column by x-position).
        // The bridge guarantees all columns [min(prevCol,destCol)..max(prevCol,destCol)]
        // in row r are real, so this landing spot is always safe.
        G.safeRoute.push({ row: r, col: prevCol });
        if (destCol !== prevCol) {
          const dir = destCol > prevCol ? 1 : -1;
          for (let c = prevCol + dir; c !== destCol + dir; c += dir) {
            G.safeRoute.push({ row: r, col: c });
          }
        }
      }
    }
  }

  // Mark non-path platforms as fake based on difficulty (adventure uses levelConfig)
  const fakeChance = G.levelConfig ? G.levelConfig.fake : DIFFICULTY_FAKE_CHANCE[G.difficulty];
  for (let row = 0; row < G.gridRows; row++) {
    const extras = G.extraSafeCols[row] || [];
    for (let i = 0; i < G.platforms[row].length; i++) {
      if (i === G.safePath[row]) continue; // never fake the path platform
      if (extras.indexOf(i) !== -1) continue; // never fake backtrack platforms
      if (Math.random() < fakeChance) {
        G.platforms[row][i].fake = true;
      }
    }
  }

  // Ensure all intermediate columns between prevCol and curCol are safe.
  // When the path shifts by N columns the player must hop through each one,
  // so every column in [min(prev,cur)..max(prev,cur)] at that row must be real.
  // Also bridges safeRoute steps (for backward jumps, the target row gets bridged).
  function applyBridge() {
    // Bridge the forward safePath
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
    // Bridge between consecutive safeRoute steps (handles backtracks)
    for (let i = 1; i < G.safeRoute.length; i++) {
      const prev = G.safeRoute[i - 1];
      const cur = G.safeRoute[i];
      // Only bridge when jumping to a different row (forward or backward)
      if (prev.row !== cur.row) {
        const lo = Math.min(prev.col, cur.col);
        const hi = Math.max(prev.col, cur.col);
        for (let c = lo; c <= hi; c++) {
          G.platforms[cur.row][c].fake = false;
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
    const numDecoyFakes = (G.levelConfig && G.levelConfig.decoyFakes) || 1;
    const decoyCols = candidates.slice(0, numDecoys);
    for (const dc of decoyCols) {
      // Make the whole column real (visible tempting path)
      for (let r = 0; r < G.gridRows; r++) {
        G.platforms[r][dc].fake = false;
      }
      // Block it with strategic fakes spread across depth ranges.
      const blockStart = Math.floor(G.gridRows * 0.35);
      const blockRange = Math.max(1, Math.floor(G.gridRows * 0.45));
      let placed = 0;
      const usedRows = new Set();
      for (let attempt = 0; attempt < numDecoyFakes * 10 && placed < numDecoyFakes; attempt++) {
        let blockRow = blockStart + Math.floor(Math.random() * blockRange);
        if (usedRows.has(blockRow)) continue;
        if (G.safePath[blockRow] === dc) {
          // Try to find a nearby row
          let found = false;
          for (let offset = 1; offset < blockRange; offset++) {
            const alt = blockStart + ((blockRow - blockStart + offset) % blockRange);
            if (G.safePath[alt] !== dc && !usedRows.has(alt)) { blockRow = alt; found = true; break; }
          }
          if (!found) continue;
        }
        // Also skip rows where dc is an extraSafeCol (backtrack platform)
        const extras = G.extraSafeCols[blockRow] || [];
        if (extras.indexOf(dc) !== -1) continue;
        if (G.safePath[blockRow] !== dc) {
          G.platforms[blockRow][dc].fake = true;
          usedRows.add(blockRow);
          placed++;
        }
      }
    }
    // Bridge always wins — safe path bridges override any decoy fake
    applyBridge();
  }

  // Lock down the last 2 rows: only platforms within the bridge range
  // (between the incoming safe column and the destination safe column)
  // are allowed to be real, with a minimum of 3 real platforms per row
  // for a meaningful final decision. This prevents players from ignoring
  // the safe path and hopping across at the end.
  const lockRows = Math.min(2, G.gridRows - 1);
  for (let ri = 0; ri < lockRows; ri++) {
    const row = G.gridRows - 1 - ri;
    const safeCol = G.safePath[row];
    const prevSafeCol = row > 0 ? G.safePath[row - 1] : safeCol;
    let lo = Math.min(safeCol, prevSafeCol);
    let hi = Math.max(safeCol, prevSafeCol);
    // Widen to minimum 3 real platforms so endgame isn't trivially narrow
    const minReal = 3;
    while (hi - lo + 1 < minReal && hi - lo + 1 < G.gridCols) {
      if (lo > 0) lo--;
      if (hi - lo + 1 < minReal && hi < G.gridCols - 1) hi++;
    }
    for (let c = 0; c < G.gridCols; c++) {
      if (c < lo || c > hi) {
        G.platforms[row][c].fake = true;
      }
    }
  }

  // ── Anti-straight-down exploit ──────────────────────────────
  // Ensure no single column is entirely real from row 0 to the last row.
  // Without this, a player could jump straight down one column to win
  // without needing to memorize the safe path at all.
  for (let c = 0; c < G.gridCols; c++) {
    let allReal = true;
    for (let r = 0; r < G.gridRows; r++) {
      if (G.platforms[r][c].fake || G.platforms[r][c].destroyed) {
        allReal = false;
        break;
      }
    }
    if (!allReal) continue;

    // This column is all-real — insert a fake in a non-safe row to block it.
    // Collect candidate rows where this column isn't on the safe path or
    // an extra-safe (backtrack) column.
    const candidates = [];
    for (let r = 1; r < G.gridRows - 1; r++) {
      if (G.safePath[r] === c) continue;
      const extras = G.extraSafeCols[r] || [];
      if (extras.indexOf(c) !== -1) continue;
      // Also skip rows where this column is a bridge between adjacent safe columns
      const prev = r > 0 ? G.safePath[r - 1] : G.safePath[r];
      const cur = G.safePath[r];
      const bridgeLo = Math.min(prev, cur);
      const bridgeHi = Math.max(prev, cur);
      if (c >= bridgeLo && c <= bridgeHi) continue;
      candidates.push(r);
    }
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      G.platforms[pick][c].fake = true;
    }
  }
}
