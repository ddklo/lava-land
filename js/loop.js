// ─── MAIN LOOP (Fixed Timestep) ─────────────────────────────────
// Physics/logic update at a fixed 60 Hz rate via accumulator.
// Rendering happens once per requestAnimationFrame.
const TICK = 1 / 60;
let _loopPaused = false;

function gameLoop(timestamp) {
  if (_loopPaused) return;
  requestAnimationFrame(gameLoop);

  let frameDt = Math.min((timestamp - G.lastTime) / 1000, 0.1);
  G.lastTime = timestamp;
  G.accumulator += frameDt;

  while (G.accumulator >= TICK) {
    SceneManager.update(TICK);
    G.accumulator -= TICK;
  }

  SceneManager.render();
}

// ─── VISIBILITY CHANGE ─────────────────────────────────────────
// Pause loop when tab is hidden to prevent accumulator build-up
// and physics stutter on resume.
document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    _loopPaused = true;
  } else {
    _loopPaused = false;
    G.lastTime = performance.now();
    G.accumulator = 0;
    requestAnimationFrame(gameLoop);
  }
});
