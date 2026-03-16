// ─── MANAGED TIMERS ─────────────────────────────────────────────
// Replaces setTimeout/setInterval in game logic. Timers tick inside
// the fixed-timestep update loop, making them pausable and cancellable.

function addTimer(delay, callback) {
  G.timers.push({ remaining: delay, callback });
}

function updateTimers(dt) {
  // Snapshot current timers — callbacks may add new timers or call clearTimers
  const processing = G.timers;
  G.timers = [];
  for (let i = 0; i < processing.length; i++) {
    processing[i].remaining -= dt;
    if (processing[i].remaining <= 0) {
      processing[i].callback();
    } else {
      G.timers.push(processing[i]);
    }
  }
}

function clearTimers() {
  G.timers.length = 0;
}
