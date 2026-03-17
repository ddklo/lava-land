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
      plat.bobVel += (-SPRING_STIFFNESS * plat.bobOffset - SPRING_DAMPING * plat.bobVel) * dt;
      plat.bobOffset += plat.bobVel * dt;
      if (Math.abs(plat.bobOffset) < SPRING_REST_THRESHOLD && Math.abs(plat.bobVel) < SPRING_VEL_THRESHOLD) {
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

    // Populate HUD left panel
    const hudLeft = document.getElementById('hud-left');
    if (G.gameMode === 'adventure' && G.levelConfig) {
      hudLeft.innerHTML =
        `<div class="hud-level-line">Level ${G.level} of ${LEVELS.length}: ${G.levelConfig.name}</div>` +
        `<div class="hud-total-score">Score ${G.totalScore}</div>`;
    } else {
      hudLeft.innerHTML = '';
    }

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
      const hint = G.isTouchDevice
        ? 'Tap to start early for bonus points!'
        : 'Press any key to start early for bonus points!';
      document.getElementById('hud-text').innerHTML =
        `<div class="timer-warn">MEMORIZE! ${secs}s</div>` +
        `<div class="timer-hint">${hint}</div>`;
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
    let scale = 1;
    if (G.platforms.length > 0) {
      const lastPlat = G.platforms[G.platforms.length - 1][0];
      levelTotalH = lastPlat.y + lastPlat.h + 60;
      scale = Math.min(1, CANVAS_H / levelTotalH);
      const offsetX = (CANVAS_W - CANVAS_W * scale) / 2;
      const offsetY = (CANVAS_H - levelTotalH * scale) / 2;
      ctx.translate(offsetX, Math.max(0, offsetY));
      ctx.scale(scale, scale);
    }

    drawLava(0, levelTotalH);

    // Draw goal column highlight so rescue position is obvious
    if (G.platforms.length > 0 && G.safePath.length > 0) {
      const goalCol = G.safePath[G.safePath.length - 1];
      const goalPlat = G.platforms[G.platforms.length - 1][goalCol];
      if (goalPlat) {
        const pulse = 0.35 + 0.2 * Math.abs(Math.sin(G.lavaTime * 3));
        ctx.fillStyle = `rgba(255, 220, 80, ${pulse})`;
        ctx.fillRect(goalPlat.x - 4, 0, goalPlat.w + 8, levelTotalH);
      }
    }

    renderPlatforms(true);
    drawRescueCharacter(true);
    drawParticles();
    drawPlayer();

    ctx.restore();
  }
};

function startPlayingEarly() {
  if (G.gameState !== 'memorize') return;
  G.memTimeSaved = Math.max(0, G.memorizeTimer);
  G.memorizeTimer = 0;
  SceneManager.replace(PlayingScene);
}

// ═══════════════════════════════════════════════════════════════
// PLAYING SCENE
// ═══════════════════════════════════════════════════════════════
const PlayingScene = {
  _lastRow: -1,
  _lastCol: -1,
  _lastTimerStr: '',
  _lastJumps: -1,

  onEnter() {
    G.gameState = 'playing';
    G.playTimer = 0;
    this._lastRow = -1;
    this._lastCol = -1;
    this._lastTimerStr = '';
    this._lastJumps = -1;
    playActionMusic();

    // Populate HUD left panel
    const hudLeft = document.getElementById('hud-left');
    if (G.gameMode === 'adventure' && G.levelConfig) {
      hudLeft.innerHTML =
        `<div class="hud-level-line">Level ${G.level} of ${LEVELS.length}: ${G.levelConfig.name}</div>` +
        `<div class="hud-total-score">Score ${G.totalScore}</div>`;
    } else {
      hudLeft.innerHTML = '';
    }

    // First trail mark on starting platform
    if (G.player.onPlatform) {
      const p = G.player.onPlatform;
      G.trailMarks.push({ x: p.x + p.w / 2, y: p.y + (PLAT_H - PLAT_DEPTH) / 2, life: 1.0 });
    }
    document.getElementById('hud-text').innerHTML = G.isTouchDevice
      ? '<div class="timer-hint">Tap platform to move &nbsp;|&nbsp; Swipe to jump</div>'
      : '<div class="timer-hint">&larr; &rarr; move sideways &nbsp;|&nbsp; &darr; / Space jump forward</div>';
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
      G.jumpAnim.t += dt * JUMP_SPEED;
      if (G.jumpAnim.t >= 1) {
        G.jumpAnim.t = 1;
        G.jumpAnim.active = false;
        landOnPlatform(G.jumpAnim.targetPlat, G.jumpAnim.targetRow, G.jumpAnim.targetCol);
      }
    }

    // Camera tracking
    const targetCamY = G.player.y - CANVAS_H * CAMERA_PLAYER_OFFSET;
    G.camera.y += (targetCamY - G.camera.y) * CAMERA_SMOOTHING;
    G.camera.y = Math.max(0, G.camera.y);

    // Shake decay
    if (G.shakeTimer > 0) G.shakeTimer -= 1;

    // HUD — only update DOM when values change
    const curRow = G.player.row;
    const curCol = G.player.col;
    const curTimer = formatTime(G.playTimer);
    const curJumps = G.jumpCount;
    if (curRow !== this._lastRow || curCol !== this._lastCol || curTimer !== this._lastTimerStr || curJumps !== this._lastJumps) {
      this._lastRow = curRow;
      this._lastCol = curCol;
      this._lastTimerStr = curTimer;
      this._lastJumps = curJumps;
      document.getElementById('hud-text').innerHTML =
        `<div class="stat-row">` +
        `<span class="stat-item">${curRow + 1}/${G.platforms.length}<span class="stat-label">ROW</span></span>` +
        `<span class="stat-item">${curCol + 1}/${G.platforms[0].length}<span class="stat-label">COL</span></span>` +
        `<span class="stat-item">${curTimer}<span class="stat-label">TIME</span></span>` +
        `<span class="stat-item">${curJumps}<span class="stat-label">JUMPS</span></span>` +
        `</div>`;
    }
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
      // Show level info on lose screen (adventure mode)
      const loseLevelInfo = document.getElementById('lose-level-info');
      if (G.gameMode === 'adventure' && G.levelConfig) {
        loseLevelInfo.textContent = `Level ${G.level} of ${LEVELS.length}: ${G.levelConfig.name}`;
        loseLevelInfo.style.display = '';
      } else {
        loseLevelInfo.style.display = 'none';
      }
      // Show lose screen
      document.getElementById('lose-emoji').textContent = G.heroChar.emoji + ' \uD83D\uDD25';
      const messages = [
        `${G.heroChar.name} fell into the lava!`,
        `${G.heroChar.name} couldn't save ${G.rescueChar.name}!`,
        `The lava got ${G.heroChar.name}!`,
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
    G.fallY += 1.2;
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

    // Falling player emoji — shrinks as it drops into lava
    const fallDist = Math.max(0, G.fallY - G.player.y);
    const shrink = Math.max(0, 1 - fallDist / 80);
    ctx.globalAlpha = 1;
    drawEmoji(ctx, G.heroChar.emoji, G.player.x, G.fallY - G.camera.y, EMOJI_SIZE * shrink);

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
  _flyX1: 0, _flyY1: 0,
  _flyX2: 0, _flyY2: 0,
  _flyVX1: 0, _flyVY1: 0,
  _flyVX2: 0, _flyVY2: 0,
  _angle1: 0, _angle2: 0,

  onEnter() {
    G.gameState = 'won';
    G.winTimer = 0;
    this._fwCount = 0;
    this._fwTimer = 0;
    this._spoken = false;
    this._showScreenTimer = -1;

    // Start fly-away from goal platform position
    let startX = CANVAS_W / 2, startY = CANVAS_H * 0.55;
    if (G.platforms.length > 0 && G.safePath.length > 0) {
      const goalPlat = G.platforms[G.platforms.length - 1][G.safePath[G.safePath.length - 1]];
      if (goalPlat) {
        startX = goalPlat.x + goalPlat.w / 2;
        startY = goalPlat.y - G.camera.y - 20;
      }
    }
    this._flyX1 = startX + 20;
    this._flyY1 = startY;
    this._flyX2 = startX - 20;
    this._flyY2 = startY;
    this._flyVX1 = 55 + Math.random() * 25;
    this._flyVY1 = -260;
    this._flyVX2 = -(55 + Math.random() * 25);
    this._flyVY2 = -230;
    this._angle1 = 0;
    this._angle2 = 0;

    stopMusic();
    playWinSound();

    document.getElementById('win-emojis').textContent =
      `${G.heroChar.emoji} \u{1F91D} ${G.rescueChar.emoji}`;
    document.getElementById('win-msg').textContent =
      `${G.heroChar.name} saved ${G.rescueChar.name}!`;

    // Score & level display
    const winLevelInfo = document.getElementById('win-level-info');
    const winScoreSection = document.getElementById('win-score-section');
    const nextLevelBtn = document.getElementById('next-level-btn');

    if (G.gameMode === 'adventure' && G.levelConfig) {
      const breakdown = calculateScore(G.level, G.playTimer, G.jumpCount, G.gridRows, G.levelConfig.memTime, G.memTimeSaved);
      const stars = calculateStars(breakdown.totalScore, G.level);
      G.levelScore = breakdown.totalScore;
      G.levelStars = stars;
      G.levelScoreBreakdown = breakdown;
      G.totalScore += breakdown.totalScore;

      winLevelInfo.textContent = `Level ${G.level} of ${LEVELS.length}: ${G.levelConfig.name}`;
      winLevelInfo.style.display = '';

      const starStr = '\u2B50'.repeat(stars) + '\u2606'.repeat(3 - stars);
      let scoreHtml = `<div class="score-stars">${starStr}</div>`;
      scoreHtml += `<div class="score-row"><span>Time bonus</span><span>${breakdown.timeScore}</span></div>`;
      scoreHtml += `<div class="score-row"><span>Jump efficiency</span><span>${breakdown.jumpScore}</span></div>`;
      scoreHtml += `<div class="score-row"><span>Level bonus</span><span>${breakdown.levelBonus}</span></div>`;
      if (breakdown.perfectBonus > 0) {
        scoreHtml += `<div class="score-row bonus"><span>Perfect path!</span><span>+${breakdown.perfectBonus}</span></div>`;
      }
      if (breakdown.speedBonus > 0) {
        scoreHtml += `<div class="score-row bonus"><span>Speed bonus!</span><span>+${breakdown.speedBonus}</span></div>`;
      }
      if (breakdown.earlyMemBonus > 0) {
        scoreHtml += `<div class="score-row bonus"><span>Early start bonus!</span><span>+${breakdown.earlyMemBonus}</span></div>`;
      }
      scoreHtml += `<div class="score-total"><span>Level Score</span><span>${breakdown.totalScore}</span></div>`;
      scoreHtml += `<div class="score-cumulative">Total Score: ${G.totalScore}</div>`;
      winScoreSection.innerHTML = scoreHtml;
      winScoreSection.style.display = '';

      nextLevelBtn.style.display = '';
    } else {
      winLevelInfo.style.display = 'none';
      winScoreSection.style.display = 'none';
      nextLevelBtn.style.display = 'none';
    }
  },
  onExit() {
    clearTimers();
    document.getElementById('win-screen').style.display = 'none';
    document.getElementById('game-hud').style.display = 'none';
  },
  update(dt) {
    G.lavaTime += dt;
    updateParticles(dt);
    updateTimers(dt);
    G.winTimer += dt;

    // Characters fly up and off screen
    this._flyVY1 -= 120 * dt;
    this._flyVY2 -= 120 * dt;
    this._flyX1 += this._flyVX1 * dt;
    this._flyY1 += this._flyVY1 * dt;
    this._flyX2 += this._flyVX2 * dt;
    this._flyY2 += this._flyVY2 * dt;
    this._angle1 += dt * 3.5;
    this._angle2 -= dt * 2.8;

    // Fireworks sequence
    if (this._fwCount < 10) {
      this._fwTimer += dt;
      if (this._fwTimer >= 0.25) {
        this._fwTimer -= 0.25;
        const burst = 1 + Math.floor(Math.random() * 2);
        for (let b = 0; b < burst; b++) {
          spawnFirework(
            80 + Math.random() * (CANVAS_W - 160),
            G.camera.y + 40 + Math.random() * (CANVAS_H - 150)
          );
        }
        spawnConfetti();
        this._fwCount++;

        if (this._fwCount === 3 && !this._spoken) {
          this._spoken = true;
          speakCongrats();
        }
        if (this._fwCount >= 10) {
          this._showScreenTimer = 0.6;
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

    // Characters fly up and off screen
    const drawFlyChar = (emoji, x, y, angle, vx, vy) => {
      // Sparkle trail in the wake
      const speed = Math.sqrt(vx * vx + vy * vy);
      const nx = -vx / speed, ny = -vy / speed;
      for (let i = 1; i <= 4; i++) {
        ctx.globalAlpha = 0.6 - i * 0.13;
        drawEmoji(ctx, '\u2728', x + nx * i * 18, y + ny * i * 18, 18 - i * 3);
      }
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      drawEmoji(ctx, emoji, 0, 0, 52);
      ctx.restore();
    };

    drawFlyChar(G.heroChar.emoji,   this._flyX1, this._flyY1, this._angle1, this._flyVX1, this._flyVY1);
    drawFlyChar(G.rescueChar.emoji, this._flyX2, this._flyY2, this._angle2, this._flyVX2, this._flyVY2);

    ctx.globalAlpha = 1;
    ctx.restore();
  }
};
