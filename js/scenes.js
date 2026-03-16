// ─── SCENE MANAGER (Pushdown Automaton) ─────────────────────────
// Each game state is a scene with onEnter/onExit/update/render.
// The loop delegates to SceneManager instead of switching on G.gameState.

const SceneManager = {
  stack: [],

  get current() { return this.stack[this.stack.length - 1]; },

  push(scene) {
    if (this.current) this.current.onPause?.();
    this.stack.push(scene);
    scene.onEnter();
  },

  pop() {
    const scene = this.stack.pop();
    scene.onExit?.();
    if (this.current) this.current.onResume?.();
    return scene;
  },

  replace(scene) {
    if (this.current) this.current.onExit?.();
    if (this.stack.length > 0) {
      this.stack[this.stack.length - 1] = scene;
    } else {
      this.stack.push(scene);
    }
    scene.onEnter();
  },

  update(dt) { this.current?.update(dt); },
  render()   { this.current?.render(); }
};

// ─── HELPER: render platforms ───────────────────────────────────
function renderPlatforms(reveal) {
  for (const row of G.platforms) {
    for (const plat of row) {
      if (plat.destroyed) continue;
      if (plat.crumbling && plat.crumbleTimer > 0.5) continue;
      drawPlatform(plat, reveal);
    }
  }
}

// ─── HELPER: apply shake transform ─────────────────────────────
function applyShake(ctx) {
  let sx = 0, sy = 0;
  if (G.shakeTimer > 0) {
    sx = (Math.random() - 0.5) * G.shakeTimer * 0.8;
    sy = (Math.random() - 0.5) * G.shakeTimer * 0.8;
  }
  ctx.translate(sx, sy);
}

// ─── HELPER: advance platform bob spring animation ──────────────
function updatePlatformBob(dt) {
  for (const row of G.platforms) {
    for (const plat of row) {
      if (plat.bobOffset === 0 && plat.bobVel === 0) continue;
      // Damped spring: F = -kx - bv
      plat.bobVel += (-280 * plat.bobOffset - 14 * plat.bobVel) * dt;
      plat.bobOffset += plat.bobVel * dt;
      if (Math.abs(plat.bobOffset) < 0.15 && Math.abs(plat.bobVel) < 0.5) {
        plat.bobOffset = 0;
        plat.bobVel = 0;
      }
    }
  }
}

// ─── HELPER: advance crumble timers ────────────────────────────
function updateCrumbleTimers(dt) {
  for (const row of G.platforms) {
    for (const plat of row) {
      if (plat.crumbling) plat.crumbleTimer += dt;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// MENU SCENE
// ═══════════════════════════════════════════════════════════════
const MenuScene = {
  onEnter() {
    G.gameState = 'menu';
    document.getElementById('menu-screen').style.display = 'block';
    document.getElementById('win-screen').style.display = 'none';
    document.getElementById('game-hud').style.display = 'none';
  },
  onExit() {
    document.getElementById('menu-screen').style.display = 'none';
  },
  update(dt) {
    G.lavaTime += dt;
  },
  render() {
    const ctx = G.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawLava(0);
  }
};

// ═══════════════════════════════════════════════════════════════
// MEMORIZE SCENE
// ═══════════════════════════════════════════════════════════════
const MemorizeScene = {
  _lastSecs: -1,

  onEnter() {
    G.gameState = 'memorize';
    G.camera.y = 0;
    this._lastSecs = -1;
    document.getElementById('game-hud').style.display = 'block';
    playMemorizeMusic();
  },
  onExit() {
    clearTimers();
  },
  update(dt) {
    G.lavaTime += dt;
    updateParticles(dt);
    updateTimers(dt);

    G.memorizeTimer -= dt;
    const secs = Math.ceil(G.memorizeTimer);
    if (secs !== this._lastSecs) {
      this._lastSecs = secs;
      document.getElementById('hud-text').innerHTML =
        `<div class="timer-warn">MEMORIZE! ${secs}s</div>` +
        `<div style="color:#ffcc88;font-size:13px;margin-top:4px;">Remember which platforms are safe!</div>`;
    }
    if (G.memorizeTimer <= 0) {
      SceneManager.replace(PlayingScene);
    }
  },
  render() {
    const ctx = G.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();

    // Zoom-out transform to show entire level
    let levelTotalH = CANVAS_H;
    if (G.platforms.length > 0) {
      const lastPlat = G.platforms[G.platforms.length - 1][0];
      levelTotalH = lastPlat.y + lastPlat.h + 60;
      const scale = Math.min(1, CANVAS_H / levelTotalH);
      const offsetX = (CANVAS_W - CANVAS_W * scale) / 2;
      const offsetY = (CANVAS_H - levelTotalH * scale) / 2;
      ctx.translate(offsetX, Math.max(0, offsetY));
      ctx.scale(scale, scale);
    }

    drawLava(0, levelTotalH);
    renderPlatforms(true);
    drawRescueCharacter();
    drawParticles();
    drawPlayer();

    ctx.restore();
  }
};

// ═══════════════════════════════════════════════════════════════
// PLAYING SCENE
// ═══════════════════════════════════════════════════════════════
const PlayingScene = {
  _lastRow: -1,

  onEnter() {
    G.gameState = 'playing';
    this._lastRow = -1;
    playActionMusic();
    document.getElementById('hud-text').innerHTML =
      '<div style="color:#ffcc88;">&larr; &rarr; move sideways &nbsp; | &nbsp; &uarr; / Space jump forward</div>';
  },
  onExit() {
    clearTimers();
  },
  update(dt) {
    G.lavaTime += dt;
    updateParticles(dt);
    updateTimers(dt);
    updateCrumbleTimers(dt);
    updatePlatformBob(dt);

    // Jump animation
    if (G.jumpAnim.active) {
      G.jumpAnim.t += dt * 3;
      if (G.jumpAnim.t >= 1) {
        G.jumpAnim.t = 1;
        G.jumpAnim.active = false;
        landOnPlatform(G.jumpAnim.targetPlat, G.jumpAnim.targetRow, G.jumpAnim.targetCol);
      }
    }

    // Camera tracking
    const targetCamY = G.player.y - CANVAS_H * 0.35;
    G.camera.y += (targetCamY - G.camera.y) * 0.08;
    G.camera.y = Math.max(0, G.camera.y);

    // Shake decay
    if (G.shakeTimer > 0) G.shakeTimer -= 1;

    // HUD — only update when row changes
    if (G.player.row !== this._lastRow) {
      this._lastRow = G.player.row;
      document.getElementById('hud-text').innerHTML =
        `<div style="color:#ffcc88;">Row ${G.player.row + 1} / ${G.platforms.length}</div>`;
    }
  },
  render() {
    const ctx = G.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    applyShake(ctx);

    drawLava(G.camera.y, CANVAS_H);
    renderPlatforms(false);
    drawRescueCharacter();
    drawParticles();
    drawPlayer();

    ctx.restore();
  }
};

// ═══════════════════════════════════════════════════════════════
// FALLING SCENE
// ═══════════════════════════════════════════════════════════════
const FallingScene = {
  onEnter() {
    G.gameState = 'falling';
    G.shakeTimer = 15;
    G.fallY = G.player.y;
    playFallSound();
    spawnLavaSplash(G.player.x, G.player.y + 40);

    addTimer(1.2, () => {
      resetPlayer();
      G.platforms.forEach(row => row.forEach(p => { p.crumbling = false; p.crumbleTimer = 0; }));
      SceneManager.replace(MemorizeScene);
    });
  },
  onExit() {
    clearTimers();
  },
  update(dt) {
    G.lavaTime += dt;
    updateParticles(dt);
    updateTimers(dt);
    updateCrumbleTimers(dt);
    G.fallY += 5;
    if (G.shakeTimer > 0) G.shakeTimer -= 1;
  },
  render() {
    const ctx = G.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    applyShake(ctx);

    drawLava(G.camera.y, CANVAS_H);
    renderPlatforms(false);
    drawRescueCharacter();
    drawParticles();

    // Falling player emoji
    const charData = CHARACTERS.find(c => c.id === G.heroChoice);
    ctx.globalAlpha = 1;
    ctx.font = '36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(charData.emoji, G.player.x, G.fallY - G.camera.y);

    ctx.restore();
  }
};

// ═══════════════════════════════════════════════════════════════
// WON SCENE
// ═══════════════════════════════════════════════════════════════
const WonScene = {
  _fwCount: 0,
  _fwTimer: 0,
  _spoken: false,
  _showScreenTimer: -1,

  onEnter() {
    G.gameState = 'won';
    G.winTimer = 0;
    this._fwCount = 0;
    this._fwTimer = 0;
    this._spoken = false;
    this._showScreenTimer = -1;

    stopMusic();
    playWinSound();

    const rescueChar = CHARACTERS.find(c => c.id === G.rescueChoice);
    const heroChar = CHARACTERS.find(c => c.id === G.heroChoice);
    document.getElementById('win-emojis').textContent =
      `${heroChar.emoji} \u2764\uFE0F ${rescueChar.emoji}`;
    document.getElementById('win-msg').textContent =
      `${heroChar.name} saved ${rescueChar.name}!`;
  },
  onExit() {
    clearTimers();
  },
  update(dt) {
    G.lavaTime += dt;
    updateParticles(dt);
    updateTimers(dt);
    G.winTimer += dt;

    // Fireworks sequence — replaces old setInterval
    if (this._fwCount < 25) {
      this._fwTimer += dt;
      if (this._fwTimer >= 0.32) {
        this._fwTimer -= 0.32;
        const burst = 1 + Math.floor(Math.random() * 2);
        for (let b = 0; b < burst; b++) {
          spawnFirework(
            80 + Math.random() * (CANVAS_W - 160),
            G.camera.y + 40 + Math.random() * (CANVAS_H - 150)
          );
        }
        spawnConfetti();
        this._fwCount++;

        if (this._fwCount === 6 && !this._spoken) {
          this._spoken = true;
          speakCongrats();
        }
        if (this._fwCount >= 25) {
          this._showScreenTimer = 1.2;
        }
      }
    }

    // Show win screen after fireworks + delay
    if (this._showScreenTimer > 0) {
      this._showScreenTimer -= dt;
      if (this._showScreenTimer <= 0) {
        document.getElementById('win-screen').style.display = 'block';
        document.getElementById('game-hud').style.display = 'none';
      }
    }
  },
  render() {
    const ctx = G.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();

    drawLava(G.camera.y, CANVAS_H);
    renderPlatforms(false);
    drawParticles();
    drawPlayer();

    ctx.restore();
  }
};
