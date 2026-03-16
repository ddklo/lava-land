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
    document.getElementById('settings-screen').style.display = 'none';
    document.getElementById('win-screen').style.display = 'none';
    document.getElementById('lose-screen').style.display = 'none';
    document.getElementById('game-hud').style.display = 'none';
  },
  onExit() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('settings-screen').style.display = 'none';
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
    document.getElementById('lose-screen').style.display = 'none';
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
    G.playTimer = 0;
    this._lastRow = -1;
    playActionMusic();

    // First trail mark on starting platform
    if (G.player.onPlatform) {
      const p = G.player.onPlatform;
      G.trailMarks.push({ x: p.x + p.w / 2, y: p.y + (PLAT_H - 7) / 2, life: 1.0 });
    }
    document.getElementById('hud-text').innerHTML =
      '<div style="color:#ffcc88;">&larr; &rarr; move sideways &nbsp; | &nbsp; &uarr; / Space jump forward</div>';
  },
  onExit() {
    clearTimers();
  },
  update(dt) {
    G.lavaTime += dt;
    G.playTimer += dt;
    updateParticles(dt);
    updateTimers(dt);
    updateCrumbleTimers(dt);
    updatePlatformBob(dt);
    updateTrailMarks(dt);

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

    // HUD — update row, col + timer
    document.getElementById('hud-text').innerHTML =
      `<div style="color:#ffcc88;">Row ${G.player.row + 1}/${G.platforms.length} &nbsp; Col ${G.player.col + 1}/${G.platforms[0].length}</div>` +
      `<div style="color:#ff9966;font-size:13px;">${formatTime(G.playTimer)}</div>`;
  },
  render() {
    const ctx = G.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    applyShake(ctx);

    drawLava(G.camera.y, CANVAS_H);
    renderPlatforms(false);
    drawTrailMarks();
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
  _spoken: false,

  onEnter() {
    G.gameState = 'falling';
    G.shakeTimer = 15;
    G.fallY = G.player.y;
    this._spoken = false;
    playFallSound();
    stopMusic();
    spawnLavaSplash(G.player.x, G.player.y + 40);

    addTimer(1.0, () => {
      playLoseSound();
    });
    addTimer(1.8, () => {
      if (!this._spoken) {
        this._spoken = true;
        speakLose();
      }
      // Show lose screen
      const heroChar = CHARACTERS.find(c => c.id === G.heroChoice);
      const rescueChar = CHARACTERS.find(c => c.id === G.rescueChoice);
      document.getElementById('lose-emoji').textContent = heroChar.emoji + ' \uD83D\uDD25';
      const messages = [
        `${heroChar.name} fell into the lava!`,
        `${heroChar.name} couldn't save ${rescueChar.name}!`,
        `The lava got ${heroChar.name}!`,
      ];
      document.getElementById('lose-msg').textContent = messages[Math.floor(Math.random() * messages.length)];
      document.getElementById('lose-screen').style.display = 'block';
      document.getElementById('game-hud').style.display = 'none';
    });
  },
  onExit() {
    clearTimers();
    document.getElementById('lose-screen').style.display = 'none';
  },
  update(dt) {
    G.lavaTime += dt;
    updateParticles(dt);
    updateTimers(dt);
    updateCrumbleTimers(dt);
    updateTrailMarks(dt);
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
    drawTrailMarks();
    drawRescueCharacter();
    drawParticles();

    // Falling player emoji
    const charData = CHARACTERS.find(c => c.id === G.heroChoice);
    ctx.globalAlpha = 1;
    ctx.font = '48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 6;
    ctx.fillText(charData.emoji, G.player.x, G.fallY - G.camera.y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

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
  _walkX: 0,

  onEnter() {
    G.gameState = 'won';
    G.winTimer = 0;
    this._fwCount = 0;
    this._fwTimer = 0;
    this._spoken = false;
    this._showScreenTimer = -1;
    this._walkX = -80;

    stopMusic();
    playWinSound();

    const rescueChar = CHARACTERS.find(c => c.id === G.rescueChoice);
    const heroChar = CHARACTERS.find(c => c.id === G.heroChoice);
    document.getElementById('win-emojis').textContent =
      `${heroChar.emoji} \u{1F91D} ${rescueChar.emoji}`;
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

    // Characters walk across the screen
    this._walkX += dt * 80;
    if (this._walkX > CANVAS_W + 80) this._walkX = -80;

    // Fireworks sequence
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

    // Celebrating characters walking across screen
    const heroChar = CHARACTERS.find(c => c.id === G.heroChoice);
    const rescueChar = CHARACTERS.find(c => c.id === G.rescueChoice);
    const t = G.winTimer;
    const walkY = CANVAS_H * 0.55;
    const bounce1 = Math.abs(Math.sin(t * 5)) * 25;
    const bounce2 = Math.abs(Math.sin(t * 5 + 1.2)) * 25;

    ctx.globalAlpha = 1;
    ctx.font = '52px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 6;

    // Hero leading
    ctx.fillText(heroChar.emoji, this._walkX, walkY - bounce1);
    // Rescued friend following
    ctx.fillText(rescueChar.emoji, this._walkX - 60, walkY - bounce2);

    // Stars/sparkles trail
    ctx.font = '20px serif';
    for (let i = 1; i <= 3; i++) {
      const sx = this._walkX - 60 - i * 30;
      const sy = walkY - 10 + Math.sin(t * 8 + i * 2) * 8;
      ctx.globalAlpha = Math.max(0, 0.7 - i * 0.2);
      ctx.fillText('\u2728', sx, sy);
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    ctx.restore();
  }
};
