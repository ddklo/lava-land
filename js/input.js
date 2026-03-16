// ─── INPUT ──────────────────────────────────────────────────────
function setupInput() {
  // ── Keyboard ───────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (G.keys[e.code]) return;
    G.keys[e.code] = true;

    if (G.gameState === 'playing') {
      if (e.code === 'ArrowLeft') tryJump('left');
      if (e.code === 'ArrowRight') tryJump('right');
      if (e.code === 'ArrowUp' || e.code === 'Space') tryJump('forward');
      e.preventDefault();
    }
    if (G.gameState === 'memorize') e.preventDefault();
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

    if (G.gameState !== 'playing') return;

    const dx = found.clientX - touchStartX;
    const dy = found.clientY - touchStartY;

    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      tryJump(dx < 0 ? 'left' : 'right');
    } else {
      // Tap or upward swipe → jump forward
      tryJump('forward');
    }
    e.preventDefault();
  }, { passive: false });

  G.canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });

  // Show correct instructions based on input type
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    const kb = document.getElementById('instructions-keyboard');
    const tc = document.getElementById('instructions-touch');
    if (kb) kb.style.display = 'none';
    if (tc) tc.style.display = 'block';
  }
}
