// ─── HUD & UI OVERLAYS ───────────────────────────────────────────
// All non-game-object overlays: level preview, transitions,
// streak popups, tutorial hints, urgency vignette.
// Depends on G (state.js) and constants from config.js.

// ─── SCENE TRANSITION (CSS GPU-accelerated) ──────────────────
// Uses a DOM overlay with CSS transitions for smooth, jank-free fades.
// The scene swap happens during the opaque frame, hiding any setup cost.

function transitionTo(scene) {
  if (G.transition.active) return; // prevent double-fire
  G.transition.active = true;
  G.transition.nextScene = scene;

  const overlay = document.getElementById('transition-overlay');
  if (!overlay) {
    // Fallback: instant swap if overlay missing (e.g. tests)
    SceneManager.replace(scene);
    G.transition.active = false;
    return;
  }

  // Phase 1: fade to black
  overlay.classList.add('fade-out');

  const doSwap = () => {
    // Swap scene while screen is black — hides all setup cost
    SceneManager.replace(G.transition.nextScene);
    // Phase 2: fade from black (rAF ensures scene has rendered once)
    requestAnimationFrame(() => {
      overlay.classList.remove('fade-out');
      const cleanup = () => {
        overlay.removeEventListener('transitionend', cleanup);
        G.transition.active = false;
      };
      overlay.addEventListener('transitionend', cleanup);
      // Safety: ensure cleanup even if transitionend doesn't fire
      setTimeout(cleanup, 400);
    });
  };

  const onFadedOut = () => {
    overlay.removeEventListener('transitionend', onFadedOut);
    doSwap();
  };
  overlay.addEventListener('transitionend', onFadedOut);
  // Safety: if transitionend doesn't fire (e.g. duration 0), force swap
  setTimeout(() => {
    if (G.transition.active && G.transition.nextScene === scene) {
      overlay.removeEventListener('transitionend', onFadedOut);
      doSwap();
    }
  }, 400);
}

// No-ops kept for backward compat — scenes still call these but they do nothing now
function updateTransition(dt) {}
function drawTransition() {}

// ─── STREAK POPUPS ────────────────────────────────────────────
function updateStreakPopups(dt) {
  for (let i = G.streakPopups.length - 1; i >= 0; i--) {
    G.streakPopups[i].timer -= dt;
    if (G.streakPopups[i].timer <= 0) G.streakPopups.splice(i, 1);
  }
}

function drawStreakPopups() {
  const ctx = G.ctx;
  for (const p of G.streakPopups) {
    const alpha = Math.max(0, p.timer);
    const rise = (1 - p.timer) * 40;
    const scale = 1 + (1 - p.timer) * 0.3;
    const screenY = p.y - G.camera.y - rise;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, screenY);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(p.text, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ─── URGENCY VIGNETTE (memorize countdown) ────────────────────
function drawUrgencyVignette(intensity) {
  if (intensity <= 0) return;
  const ctx = G.ctx;
  const gradient = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.2,
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.8
  );
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, `rgba(180,0,0,${intensity * 0.35})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

// ─── LEVEL PREVIEW CARD ──────────────────────────────────────
function drawLevelPreview() {
  if (!G.levelPreview || G.levelPreview.timer <= 0) return;
  const ctx = G.ctx;
  const t = G.levelPreview.timer;
  const alpha = t < 0.3 ? t / 0.3 : 1;

  ctx.save();
  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,100,0,0.6)';
  ctx.shadowBlur = 20;
  ctx.fillText(`Level ${G.level}`, CANVAS_W / 2, CANVAS_H / 2 - 30);

  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#ffaa55';
  ctx.shadowBlur = 0;
  ctx.fillText(G.levelConfig ? G.levelConfig.name : '', CANVAS_W / 2, CANVAS_H / 2 + 15);

  // Grid size + difficulty indicator
  if (G.levelConfig) {
    const fires = Math.min(5, Math.ceil(G.levelConfig.fake * 7));
    const fireStr = '\uD83D\uDD25'.repeat(fires);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#cc8855';
    ctx.fillText(`${G.levelConfig.cols}\u00D7${G.levelConfig.rows}  ${fireStr}`, CANVAS_W / 2, CANVAS_H / 2 + 55);
  }

  ctx.restore();
}

// ─── TUTORIAL ARROW ──────────────────────────────────────────
function drawTutorialArrow() {
  if (!G.tutorialActive) return;
  const ctx = G.ctx;
  if (!G.safePath || G.safePath.length < 2) return;

  const curRow = G.player.row;
  const nextRowIdx = curRow + 1;
  if (nextRowIdx >= G.platforms.length) return;
  const nextRow = G.platforms[nextRowIdx];
  if (!nextRow) return;

  // Find the platform the player would actually land on (same logic as tryJump)
  let nearest = 0;
  let nearestDist = Infinity;
  for (let i = 0; i < nextRow.length; i++) {
    const platCenter = nextRow[i].x + nextRow[i].w / 2;
    const dist = Math.abs(platCenter - G.player.x);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = i;
    }
  }

  const plat = nextRow[nearest];
  if (!plat) return;

  // Determine hint text based on whether the landing is safe
  let hint;
  if (plat.fake) {
    // Landing column is fake — need to sidestep first
    const safeCol = G.safePath[nextRowIdx];
    const dir = safeCol < G.player.col ? '\u2190' : '\u2192';
    hint = `Hop ${dir} first!`;
    // Point at the safe column in current row instead
    const safeInCurRow = G.platforms[curRow][safeCol];
    if (!safeInCurRow) return;
    const tx = safeInCurRow.x + safeInCurRow.w / 2;
    const ty = safeInCurRow.y - G.camera.y - 20;
    const bobY = Math.sin(G.lavaTime * 4) * 8;
    drawTutorialHint(ctx, tx, ty + bobY, hint);
  } else {
    hint = G.isTouchDevice ? 'Tap to jump!' : 'Press \u2193 to jump!';
    const tx = plat.x + plat.w / 2;
    const ty = plat.y - G.camera.y - 20;
    const bobY = Math.sin(G.lavaTime * 4) * 8;
    drawTutorialHint(ctx, tx, ty + bobY, hint);
  }
}

function drawTutorialHint(ctx, tx, ty, text) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#44ff88';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(text, tx, ty - 30);

  // Arrow pointing down
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - 10, ty - 15);
  ctx.lineTo(tx + 10, ty - 15);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.restore();
}
