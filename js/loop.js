// ─── ADAPTIVE PERFORMANCE ───────────────────────────────────────
// Monitor rolling average FPS and shift between quality tiers
// ('high' → 'low' → 'minimal') to maintain a playable frame rate.
const _PERF_TIERS = ['minimal', 'low', 'high'];

function adaptPerf() {
  const perf = G.perf;
  if (perf.frameCount < FPS_SAMPLE_SIZE) return; // need full buffer

  perf.adaptFrames++;
  if (perf.adaptFrames < PERF_WARMUP_FRAMES) return;
  if ((perf.adaptFrames - PERF_WARMUP_FRAMES) % PERF_CHECK_INTERVAL !== 0) return;

  const currentIdx = _PERF_TIERS.indexOf(G.perfMode);
  const ceilingIdx = _PERF_TIERS.indexOf(G.perfInitial);

  if (perf.avgFps < PERF_DOWNGRADE_FPS && currentIdx > 0) {
    perf.lowCount++;
    perf.highCount = 0;
    if (perf.lowCount >= PERF_DOWNGRADE_COUNT) {
      G.perfMode = _PERF_TIERS[currentIdx - 1];
      perf.lowCount = 0;
      perf.adaptFrames = 0; // restart warmup as cooldown
    }
  } else if (perf.avgFps > PERF_UPGRADE_FPS && currentIdx < ceilingIdx) {
    perf.highCount++;
    perf.lowCount = 0;
    if (perf.highCount >= PERF_UPGRADE_COUNT) {
      G.perfMode = _PERF_TIERS[currentIdx + 1];
      perf.highCount = 0;
      perf.adaptFrames = 0; // restart warmup as cooldown
    }
  } else {
    perf.lowCount = Math.max(0, perf.lowCount - 1);
    perf.highCount = Math.max(0, perf.highCount - 1);
  }
}

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

  // FPS tracking (circular buffer — no push/shift allocations)
  if (frameDt > 0) {
    const perf = G.perf;
    perf.fps = Math.round(1 / frameDt);
    perf.frameTimes[perf.frameIdx] = frameDt;
    perf.frameIdx = (perf.frameIdx + 1) % FPS_SAMPLE_SIZE;
    if (perf.frameCount < FPS_SAMPLE_SIZE) perf.frameCount++;
    let sum = 0;
    let worst = 0;
    for (let i = 0; i < perf.frameCount; i++) {
      sum += perf.frameTimes[i];
      if (perf.frameTimes[i] > worst) worst = perf.frameTimes[i];
    }
    perf.avgFps = Math.round(perf.frameCount / sum);
    perf.minFps = Math.round(1 / worst);
    adaptPerf();
    if (perf.showFps) drawFpsCounter();
  }
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
