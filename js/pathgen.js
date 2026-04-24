// ─── PATH GENERATION ALGORITHMS ──────────────────────────────────
// Safe-path shaping functions — operate on column-index arrays,
// not on platform objects. Depends only on BOARD_RULES from config.js
// and G.extraSafeCols / G.safeRoute / G.levelConfig from state.js.

// Fill safePath[startRow..endRow-1] using the step-wise random walk.
// safePath[startRow - 1] must already be set before calling.
function _generatePathSegment(safePath, startRow, endRow, gridCols, maxShift) {
  let stayCount = 0;
  for (let row = startRow; row < endRow; row++) {
    const prevCol = safePath[row - 1];
    const forceSide = stayCount >= BOARD_RULES.maxConsecutiveStraight;
    const stayProb = maxShift === 1 ? 0.2 : maxShift === 2 ? 0.2 : 0.1;
    if (forceSide || Math.random() >= stayProb) {
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
      safePath[row] = Math.max(0, Math.min(gridCols - 1, prevCol + shift));
      // If clamped to same column, try opposite direction
      if (safePath[row] === prevCol) {
        safePath[row] = Math.max(0, Math.min(gridCols - 1, prevCol - shift));
      }
      stayCount = (safePath[row] === prevCol) ? stayCount + 1 : 0;
    } else {
      safePath[row] = prevCol;
      stayCount++;
    }
  }
}

// Enforce BOARD_RULES.maxConsecutiveSameDirection on a safe path.
// Scans for runs of consecutive same-direction moves (left or right)
// that exceed the limit and breaks them by reversing the direction
// at the boundary row.
function applyMaxConsecutiveDirectionRule(safePath, gridCols) {
  const maxRun = BOARD_RULES.maxConsecutiveSameDirection;
  let runDir = 0;   // -1 = left, +1 = right, 0 = straight
  let runLen = 0;

  for (let row = 1; row < safePath.length; row++) {
    const diff = safePath[row] - safePath[row - 1];
    const dir = diff > 0 ? 1 : diff < 0 ? -1 : 0;

    if (dir === 0) {
      // Straight move resets the lateral run
      runDir = 0;
      runLen = 0;
      continue;
    }

    if (dir === runDir) {
      runLen++;
    } else {
      // Direction changed — start a new run
      runDir = dir;
      runLen = 1;
    }

    if (runLen > maxRun) {
      // Break the run: shift this row in the opposite direction instead
      const oppositeShift = -runDir;
      const newCol = Math.max(0, Math.min(gridCols - 1, safePath[row - 1] + oppositeShift));
      if (newCol !== safePath[row - 1]) {
        safePath[row] = newCol;
        runDir = oppositeShift > 0 ? 1 : -1;
        runLen = 1;
      } else {
        // Can't go opposite (at edge) — stay in same column
        safePath[row] = safePath[row - 1];
        runDir = 0;
        runLen = 0;
      }
    }
  }
}

// ─── BACKTRACK INSERTION ────────────────────────────────────────
// Insert backtrack sections into the safe path for late-level difficulty.
// A backtrack at row R means:
//   1. Player arrives at (R, origCol) via forward jump from R-1
//   2. Hops sideways to (R, hopCol)
//   3. Jumps backward to (R-1, backCol) — different from the destroyed safePath[R-1]
//   4. Jumps forward to (R, returnCol) — different from destroyed origCol and hopCol
//   5. Forward path continues from returnCol
function insertBacktracks(safePath, gridCols, gridRows, numBacktracks) {
  const minRow = Math.max(2, Math.floor(gridRows * 0.3));
  const maxRow = Math.floor(gridRows * 0.7);
  const candidates = [];
  for (let r = minRow; r <= maxRow; r++) candidates.push(r);
  // Shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = candidates[i]; candidates[i] = candidates[j]; candidates[j] = tmp;
  }
  // Pick rows, at least 3 rows apart
  const backtrackRows = [];
  for (const r of candidates) {
    if (backtrackRows.length >= numBacktracks) break;
    if (!backtrackRows.some(br => Math.abs(br - r) < 3)) backtrackRows.push(r);
  }
  backtrackRows.sort((a, b) => a - b);

  // Store backtrack info for safeRoute building
  const btInfo = [];

  // Process last-to-first so path regen doesn't affect earlier backtracks
  for (let i = backtrackRows.length - 1; i >= 0; i--) {
    const R = backtrackRows[i];
    const origCol = safePath[R];
    const prevOrigCol = safePath[R - 1]; // destroyed during forward traversal

    // Hop direction: prefer side with more room
    let hopDir;
    if (origCol === 0) hopDir = 1;
    else if (origCol === gridCols - 1) hopDir = -1;
    else hopDir = (gridCols - 1 - origCol > origCol) ? 1 : -1;
    const hopCol = origCol + hopDir;

    // Backtrack target in row R-1: different from prevOrigCol, nearest to hopCol
    let backCol = -1, bestDist = Infinity;
    for (let c = 0; c < gridCols; c++) {
      if (c === prevOrigCol) continue;
      if (Math.abs(c - hopCol) < bestDist) { bestDist = Math.abs(c - hopCol); backCol = c; }
    }
    if (backCol === -1) continue;

    // Return column in row R: different from origCol AND hopCol, nearest to backCol
    let returnCol = -1;
    bestDist = Infinity;
    for (let c = 0; c < gridCols; c++) {
      if (c === origCol || c === hopCol) continue;
      if (Math.abs(c - backCol) < bestDist) { bestDist = Math.abs(c - backCol); returnCol = c; }
    }
    if (returnCol === -1) continue; // grid too narrow

    // Mark extra safe columns
    if (!G.extraSafeCols[R]) G.extraSafeCols[R] = [];
    G.extraSafeCols[R].push(origCol, hopCol, returnCol);
    if (!G.extraSafeCols[R - 1]) G.extraSafeCols[R - 1] = [];
    G.extraSafeCols[R - 1].push(backCol);

    btInfo.push({ row: R, origCol, hopCol, backCol, returnCol });

    // Regenerate path from R+1 onward starting from returnCol
    safePath[R] = returnCol;
    const maxShift = (G.levelConfig && G.levelConfig.maxShift) || 1;
    _generatePathSegment(safePath, R + 1, gridRows, gridCols, maxShift);
    applyMaxConsecutiveDirectionRule(safePath, gridCols);
  }

  // Build safeRoute from safePath + backtrack detours
  btInfo.reverse(); // put in forward order
  const btMap = {};
  for (const bt of btInfo) btMap[bt.row] = bt;

  G.safeRoute = [];
  for (let r = 0; r < gridRows; r++) {
    const bt = btMap[r];
    if (bt) {
      G.safeRoute.push({ row: r, col: bt.origCol });      // arrive from R-1
      G.safeRoute.push({ row: r, col: bt.hopCol });        // hop sideways
      G.safeRoute.push({ row: r - 1, col: bt.backCol });   // jump backward
      G.safeRoute.push({ row: r, col: bt.returnCol });     // jump forward (return)
    } else {
      G.safeRoute.push({ row: r, col: safePath[r] });
    }
  }
}
