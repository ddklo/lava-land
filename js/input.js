// ─── INPUT ──────────────────────────────────────────────────────
function findNearestReachablePlatform(canvasX, canvasY) {
  const currentRow = G.player.row;
  // Check current row (left/right), next row (forward), and previous row (backward)
  const rowsToCheck = [currentRow - 1, currentRow, currentRow + 1];
  let best = null;
  let bestDist = Infinity;
  for (const row of rowsToCheck) {
    if (row < 0 || row >= G.platforms.length) continue;
    for (let col = 0; col < G.platforms[row].length; col++) {
      const plat = G.platforms[row][col];
      if (plat.destroyed) continue;
      // Skip the platform the player is already on
      if (row === currentRow && col === G.player.col) continue;
      // Only allow left/right neighbors on the same row
      if (row === currentRow && Math.abs(col - G.player.col) !== 1) continue;
      const cx = plat.x + plat.w / 2;
      const cy = plat.y + plat.h / 2;
      const dist = (canvasX - cx) * (canvasX - cx) + (canvasY - cy) * (canvasY - cy);
      if (dist < bestDist) {
        bestDist = dist;
        best = { row: row, col: col, plat: plat };
      }
    }
  }
  return best;
}

function setupInput() {
  // ── Keyboard ───────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (G.keys[e.code]) return;
    G.keys[e.code] = true;

    if (G.gameState === 'playing') {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        SceneManager.push(PauseScene);
        e.preventDefault();
        return;
      }
      if (e.code === 'ArrowLeft') tryJump('left');
      if (e.code === 'ArrowRight') tryJump('right');
      if (e.code === 'ArrowDown' || e.code === 'Space') tryJump('forward');
      if (e.code === 'ArrowUp') tryJump('backward');
      if (e.code === 'KeyH') {
        G.revealRoute = true;
        G.revealRouteTimer = 3;
        G.routeRevealed = true;
      }
      e.preventDefault();
    }
    if (G.gameState === 'paused') {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        SceneManager.pop();
        e.preventDefault();
      }
    }
    if (G.gameState === 'memorize') {
      startPlayingEarly();
      e.preventDefault();
    }
    if (G.gameState === 'won') {
      if (e.code === 'Enter' || e.code === 'Space') {
        if (document.getElementById('win-screen').style.display === 'block') {
          if (G.gameMode === 'adventure') advanceLevel();
          else returnToMenu();
        } else {
          G.winSkipRequested = true;
        }
        e.preventDefault();
      }
    }
  });

  document.addEventListener('keyup', (e) => { G.keys[e.code] = false; });

  // ── Touch ──────────────────────────────────────
  // Swipe left/right to hop, tap or swipe up to jump forward.
  // Long-press (~0.8s) to reveal the safe route.
  const SWIPE_THRESHOLD = 30;
  const LONG_PRESS_MS = 800;
  const LONG_PRESS_MOVE_CANCEL = 12; // px of movement that cancels long-press
  let touchStartX = 0;
  let touchStartY = 0;
  let touchId = null;
  let longPressTimer = null;
  let longPressTriggered = false;

  function cancelLongPress() {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  G.canvas.addEventListener('touchstart', (e) => {
    if (touchId !== null) return;
    const t = e.changedTouches[0];
    touchId = t.identifier;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    longPressTriggered = false;

    if (G.gameState === 'playing') {
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        if (G.gameState !== 'playing') return; // guard against scene change
        longPressTriggered = true;
        G.revealRoute = true;
        G.revealRouteTimer = 3;
        G.routeRevealed = true;
      }, LONG_PRESS_MS);
    }

    e.preventDefault();
  }, { passive: false });

  G.canvas.addEventListener('touchend', (e) => {
    cancelLongPress();
    let found = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        found = e.changedTouches[i];
        break;
      }
    }
    if (!found) return;
    touchId = null;

    // Long-press just fired — don't treat as a normal tap
    if (longPressTriggered) {
      longPressTriggered = false;
      e.preventDefault();
      return;
    }

    if (G.gameState === 'memorize') {
      startPlayingEarly();
      e.preventDefault();
      return;
    }
    if (G.gameState === 'won') {
      if (document.getElementById('win-screen').style.display === 'block') {
        if (G.gameMode === 'adventure') advanceLevel();
        else returnToMenu();
      } else {
        G.winSkipRequested = true;
      }
      e.preventDefault();
      return;
    }
    if (G.gameState !== 'playing') return;

    const dx = found.clientX - touchStartX;
    const dy = found.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > SWIPE_THRESHOLD && absDx > absDy * 1.2) {
      // Horizontal swipe (must clearly dominate vertical)
      tryJump(dx < 0 ? 'left' : 'right');
    } else if (absDy > SWIPE_THRESHOLD && absDy > absDx * 1.2) {
      // Vertical swipe (must clearly dominate horizontal)
      tryJump(dy > 0 ? 'forward' : 'backward');
    } else if (absDx > SWIPE_THRESHOLD || absDy > SWIPE_THRESHOLD) {
      // Diagonal-ish swipe — pick dominant axis
      if (absDx >= absDy) {
        tryJump(dx < 0 ? 'left' : 'right');
      } else {
        tryJump(dy > 0 ? 'forward' : 'backward');
      }
    } else {
      // Tap — find the nearest reachable platform to the tap point
      const rect = G.canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const canvasX = (found.clientX - rect.left) * scaleX;
      const canvasY = (found.clientY - rect.top) * scaleY + G.camera.y;

      const tapped = findNearestReachablePlatform(canvasX, canvasY);
      if (tapped) {
        const rowDiff = tapped.row - G.player.row;
        const colDiff = tapped.col - G.player.col;
        if (rowDiff === 1) {
          tryJump('forward');
        } else if (rowDiff === -1) {
          tryJump('backward');
        } else if (rowDiff === 0 && colDiff === -1) {
          tryJump('left');
        } else if (rowDiff === 0 && colDiff === 1) {
          tryJump('right');
        }
      }
    }
    e.preventDefault();
  }, { passive: false });

  G.canvas.addEventListener('touchmove', (e) => {
    // Only cancel long-press if finger moved significantly
    let movedTouch = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        movedTouch = e.changedTouches[i];
        break;
      }
    }
    if (movedTouch) {
      const moveDx = movedTouch.clientX - touchStartX;
      const moveDy = movedTouch.clientY - touchStartY;
      if (Math.sqrt(moveDx * moveDx + moveDy * moveDy) > LONG_PRESS_MOVE_CANCEL) {
        cancelLongPress();
      }
    }
    e.preventDefault();
  }, { passive: false });

  // Show correct instructions based on input type
  G.isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  if (G.isTouchDevice) {
    const kb = document.getElementById('instructions-keyboard');
    const tc = document.getElementById('instructions-touch');
    if (kb) kb.style.display = 'none';
    if (tc) tc.style.display = 'block';
  }
}
