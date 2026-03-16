// ─── MAIN LOOP (Fixed Timestep) ─────────────────────────────────
// Physics/logic update at a fixed 60 Hz rate via accumulator.
// Rendering happens once per requestAnimationFrame.
const TICK = 1 / 60;

function gameLoop(timestamp) {
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
