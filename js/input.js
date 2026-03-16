// ─── INPUT ──────────────────────────────────────────────────────
function setupInput() {
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
}
