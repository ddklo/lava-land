// ─── INPUT ──────────────────────────────────────────────────────
function findTappedPlatform(canvasX, canvasY) {
  const currentRow = G.player.row;
  // Only check current row (for left/right) and next row (for forward)
  const rowsToCheck = [currentRow, currentRow + 1];
  for (const row of rowsToCheck) {
    if (row < 0 || row >= G.platforms.length) continue;
    for (let col = 0; col < G.platforms[row].length; col++) {
      const plat = G.platforms[row][col];
      if (plat.destroyed) continue;
      if (canvasX >= plat.x && canvasX <= plat.x + plat.w &&
          canvasY >= plat.y && canvasY <= plat.y + plat.h) {
        return { row: row, col: col, plat: plat };
      }
    }
  }
  return null;
}

function setupInput() {
  // ── Keyboard ───────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (G.keys[e.code]) return;
    G.keys[e.code] = true;

    if (G.gameState === 'playing') {
      if (e.code === 'ArrowLeft') tryJump('left');
      if (e.code === 'ArrowRight') tryJump('right');
      if (e.code === 'ArrowDown' || e.code === 'Space') tryJump('forward');
      e.preventDefault();
    }
    if (G.gameState === 'memorize') {
      startPlayingEarly();
      e.preventDefault();
    }
    if (G.gameState === 'won' && (e.code === 'Enter' || e.code === 'Space')) {
      if (G.gameMode === 'adventure') advanceLevel();
      else returnToMenu();
      e.preventDefault();
    }
  });

  document.addEventListener('keyup', (e) => { G.keys[e.code] = false; });

  // ── Touch ──────────────────────────────────────
  // Swipe left/right to hop, tap or swipe up to jump forward.
  const SWIPE_THRESHOLD = 30;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchId = null;

  G.canvas.addEventListener('touchstart', (e) => {
    if (touchId !== null) return;
    const t = e.changedTouches[0];
    touchId = t.identifier;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    e.preventDefault();
  }, { passive: false });

  G.canvas.addEventListener('touchend', (e) => {
    let found = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        found = e.changedTouches[i];
        break;
      }
    }
    if (!found) return;
    touchId = null;

    if (G.gameState === 'memorize') {
      startPlayingEarly();
      e.preventDefault();
      return;
    }
    if (G.gameState !== 'playing') return;

    const dx = found.clientX - touchStartX;
    const dy = found.clientY - touchStartY;

    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      tryJump(dx < 0 ? 'left' : 'right');
    } else if (Math.abs(dy) > SWIPE_THRESHOLD && dy > 0) {
      // Downward swipe → jump forward
      tryJump('forward');
    } else {
      // Tap — check if tapping on a specific platform
      const rect = G.canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const canvasX = (found.clientX - rect.left) * scaleX;
      const canvasY = (found.clientY - rect.top) * scaleY + G.camera.y;

      const tapped = findTappedPlatform(canvasX, canvasY);
      if (tapped) {
        const rowDiff = tapped.row - G.player.row;
        const colDiff = tapped.col - G.player.col;
        if (rowDiff === 1) {
          tryJump('forward');
        } else if (rowDiff === 0 && colDiff === -1) {
          tryJump('left');
        } else if (rowDiff === 0 && colDiff === 1) {
          tryJump('right');
        }
      } else {
        // Tap on empty area → jump forward
        tryJump('forward');
      }
    }
    e.preventDefault();
  }, { passive: false });

  G.canvas.addEventListener('touchmove', (e) => {
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
