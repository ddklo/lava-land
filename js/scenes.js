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

// ─── PAUSE SCENE ────────────────────────────────────────────────
// Pushed on top of PlayingScene — the underlying scene is frozen.
const PauseScene = {
  onEnter() {
    G.gameState = 'paused';
    document.getElementById('pause-screen').style.display = 'flex';
    stopMusic();
  },
  onExit() {
    document.getElementById('pause-screen').style.display = 'none';
    if (G.gameState === 'paused') {
      // Resuming — restore gameState and music
      G.gameState = 'playing';
      playActionMusic();
    }
  },
  update() { /* frozen */ },
  render() {
    // No-op: pause overlay covers canvas, no need to re-render
  }
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
    document.body.style.backgroundPositionY = '0';
  },
  onExit() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('settings-screen').style.display = 'none';
  },
  update(dt) {
    G.lavaTime += dt;
    updateTransition(dt);
  },
  render() {
    const ctx = G.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawLava(0);
    drawTransition();
  }
};

// ═══════════════════════════════════════════════════════════════
// MEMORIZE SCENE
// ═══════════════════════════════════════════════════════════════
const MemorizeScene = {
  _lastSecs: -1,

  onEnter() {
    // Run deferred level setup (platform generation, player reset) during the
    // fade-to-black overlay so it doesn't block UI before the fade starts.
    if (G._pendingLevelSetup) {
      generatePlatforms();
      resetPlayer();
      G.particles = [];
      G.trailMarks = [];
      G.jumpCount = 0;
      G.memTimeSaved = 0;
      G.jumpStreak = 0;
      G.hopsThisRow = 0;
      G.streakBonus = 0;
      G.routeRevealed = false;
      G.almostThereShown = false;
      G.almostThereTimer = 0;
      G.victoryDanceActive = false;
      G.victoryDanceTimer = 0;
      // Invalidate memorize lava cache for new level height
      G.lavaCacheMem = null;
      G._pendingLevelSetup = false;
    }

    G.gameState = 'memorize';
    G.camera.y = 0;
    this._lastSecs = -1;
    G.memorizeInitialTime = G.memorizeTimer;
    G.pathRevealCount = 0;
    G.countdownTicksPlayed = {};
    document.getElementById('game-hud').style.display = 'block';
    document.getElementById('game-hud').classList.add('hud-memorize-mode');
    document.getElementById('lose-screen').style.display = 'none';

    // Level preview (adventure mode only)
    if (G.gameMode === 'adventure' && G.levelConfig) {
      G.levelPreview = { timer: 1.2 };
    } else {
      G.levelPreview = null;
    }

    // Populate HUD left panel with progress dots
    const hudLeft = document.getElementById('hud-left');
    if (G.gameMode === 'adventure' && G.levelConfig) {
      let dots = '';
      for (let i = 1; i <= LEVELS.length; i++) {
        dots += i <= G.level
          ? '<span class="dot-done">\u25CF</span>'
          : '\u25CB';
      }
      const levelName = t('level.' + G.levelConfig.name, { n: G.level });
      hudLeft.innerHTML =
        `<div class="hud-level-line">${t('hud.level_of', { level: G.level, total: LEVELS.length, name: levelName })}</div>` +
        `<div class="hud-total-score">${t('hud.score', { score: G.totalScore })}</div>` +
        `<div class="hud-progress-dots">${dots}</div>`;
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
    updateTransition(dt);

    // Level preview countdown
    if (G.levelPreview && G.levelPreview.timer > 0) {
      G.levelPreview.timer -= dt;
      return; // pause memorize timer while preview is showing
    }

    G.memorizeTimer -= dt;

    // Sequential path reveal: show one step at a time in first half; hide in second half
    const _initT = G.memorizeInitialTime;
    const _half  = _initT / 2;
    const _elapsed = _initT - G.memorizeTimer;
    if (_elapsed < _half && _half > 0) {
      const _route = G.optimalRoute && G.optimalRoute.length > 0 ? G.optimalRoute : G.safeRoute;
      const _totalSteps = _route.length;
      G.pathRevealCount = Math.min(_totalSteps, Math.floor(_elapsed / (_half / _totalSteps)) + 1);
    } else {
      G.pathRevealCount = 0;
    }

    const secs = Math.ceil(G.memorizeTimer);
    if (secs !== this._lastSecs) {
      this._lastSecs = secs;
      const hint = G.isTouchDevice
        ? t('memorize.hint.touch')
        : t('memorize.hint.keyboard');
      document.getElementById('hud-text').innerHTML =
        `<div class="timer-warn">${t('memorize.countdown', { secs: secs })}</div>` +
        `<div class="timer-hint">${hint}</div>`;
      // Countdown tick sounds in final seconds
      if (secs <= COUNTDOWN_TICK_START && secs > 0 && !G.countdownTicksPlayed[secs]) {
        G.countdownTicksPlayed[secs] = true;
        playCountdownTick(secs);
        haptic(secs === 1 ? [40, 20, 60] : [30]);
      }
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

    renderPlatforms(true);
    drawCoins();
    drawPathReveal(G.pathRevealCount);
    drawRescueCharacter(true);
    drawParticles();
    drawPlayer();

    ctx.restore();

    // Urgency vignette in last 3 seconds
    if (G.memorizeTimer < 3 && G.memorizeTimer > 0) {
      const urgency = 1 - (G.memorizeTimer / 3);
      const pulse = urgency * (0.7 + Math.sin(G.lavaTime * 6) * 0.3);
      drawUrgencyVignette(pulse);
    }

    // Level preview card on top of everything
    drawLevelPreview();
    drawTransition();
  }
};

function showStreakFlash(n) {
  const el = document.getElementById('streak-flash');
  if (!el) return;
  // Check for combo milestone callouts
  let callout = '';
  for (let i = COMBO_MILESTONES.length - 1; i >= 0; i--) {
    if (n >= COMBO_MILESTONES[i].streak) {
      callout = t(COMBO_MILESTONES[i].key);
      break;
    }
  }
  el.textContent = callout ? callout + ' ' + t('playing.streak', { n: n }) : t('playing.streak', { n: n });
  el.style.display = 'block';
  // Haptic feedback for combo milestones
  if (callout) haptic([30, 20, 50, 20, 30]);
  addTimer(1.8, () => { el.style.display = 'none'; });
}

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
  _lastStreak: -1,
  _trailFrameCount: 0,

  onEnter() {
    G.gameState = 'playing';
    G.playTimer = 0;
    G.streak = 0;
    G.streakPopups = [];
    G.revealRoute = false;
    G.revealRouteTimer = 0;
    G.almostThereShown = false;
    G.almostThereTimer = 0;
    G.idleTimer = 0;
    G.idleBobPhase = 0;
    this._lastRow = -1;
    this._lastCol = -1;
    this._lastTimerStr = '';
    this._lastJumps = -1;
    this._lastStreak = -1;
    this._trailFrameCount = 0;
    document.getElementById('game-hud').classList.remove('hud-memorize-mode');
    playActionMusic();

    // Tutorial on level 1 adventure mode
    if (G.gameMode === 'adventure' && G.level === 1 && !G.tutorialShown) {
      G.tutorialActive = true;
    }

    // Populate HUD left panel with progress dots
    const hudLeft = document.getElementById('hud-left');
    if (G.gameMode === 'adventure' && G.levelConfig) {
      let dots = '';
      for (let i = 1; i <= LEVELS.length; i++) {
        dots += i <= G.level
          ? '<span class="dot-done">\u25CF</span>'
          : '\u25CB';
      }
      const levelName = t('level.' + G.levelConfig.name, { n: G.level });
      hudLeft.innerHTML =
        `<div class="hud-level-line">${t('hud.level_of', { level: G.level, total: LEVELS.length, name: levelName })}</div>` +
        `<div class="hud-total-score">${t('hud.score', { score: G.totalScore })}</div>` +
        `<div class="hud-progress-dots">${dots}</div>`;
    } else {
      hudLeft.innerHTML = '';
    }

    // First trail mark on starting platform
    if (G.player.onPlatform) {
      const p = G.player.onPlatform;
      G.trailMarks.push({ x: p.x + p.w / 2, y: p.y + (PLAT_H - PLAT_DEPTH) / 2, life: 1.0 });
    }
    document.getElementById('hud-text').innerHTML = G.isTouchDevice
      ? `<div class="timer-hint">${t('playing.hint.touch')}</div>`
      : `<div class="timer-hint">${t('playing.hint.keyboard')}</div>`;

    document.getElementById('forfeit-btn').style.display = '';
    document.getElementById('pause-btn').style.display = '';
  },
  onExit() {
    clearTimers();
    document.getElementById('forfeit-btn').style.display = 'none';
    document.getElementById('pause-btn').style.display = 'none';
  },
  update(dt) {
    G.lavaTime += dt;
    G.playTimer += dt;
    updateParticles(dt);
    updateTimers(dt);
    updateCrumbleTimers(dt);
    updatePlatformBob(dt);
    updateTrailMarks(dt);
    updateStreakPopups(dt);
    updateTransition(dt);

    // Landing squash timer
    if (G.player.landTimer > 0) G.player.landTimer = Math.max(0, G.player.landTimer - dt);

    // Secret route reveal countdown
    if (G.revealRoute) {
      G.revealRouteTimer -= dt;
      if (G.revealRouteTimer <= 0) {
        G.revealRoute = false;
        G.revealRouteTimer = 0;
      }
    }

    // Jump animation + trail particles
    if (G.jumpAnim.active) {
      G.jumpAnim.t += dt * JUMP_SPEED;

      // Spawn jump trail particles every ~2 frames
      this._trailFrameCount++;
      if (this._trailFrameCount % 2 === 0) {
        const t = G.jumpAnim.t;
        const px = G.jumpAnim.startX + (G.jumpAnim.endX - G.jumpAnim.startX) * t;
        const linearY = G.jumpAnim.startY + (G.jumpAnim.endY - G.jumpAnim.startY) * t;
        const arcH = JUMP_ARC_HEIGHT * Math.sin(t * Math.PI);
        const py = linearY + arcH;
        spawnJumpTrail(px, py);
      }

      // Speed lines during jump (feature 1: animated character)
      if (this._trailFrameCount % 3 === 0) {
        const dx = G.jumpAnim.endX - G.jumpAnim.startX;
        const jt = G.jumpAnim.t;
        const jpx = G.jumpAnim.startX + (G.jumpAnim.endX - G.jumpAnim.startX) * jt;
        const jpy = G.jumpAnim.startY + (G.jumpAnim.endY - G.jumpAnim.startY) * jt + JUMP_ARC_HEIGHT * Math.sin(jt * Math.PI);
        spawnSpeedLines(jpx, jpy, dx);
      }

      if (G.jumpAnim.t >= 1) {
        G.jumpAnim.t = 1;
        G.jumpAnim.active = false;
        this._trailFrameCount = 0;
        landOnPlatform(G.jumpAnim.targetPlat, G.jumpAnim.targetRow, G.jumpAnim.targetCol);
      }
    }

    // Almost there encouragement
    if (!G.almostThereShown && G.platforms.length > 0) {
      const rowsFromEnd = G.platforms.length - 1 - G.player.row;
      if (rowsFromEnd <= ALMOST_THERE_ROWS && rowsFromEnd > 0) {
        G.almostThereShown = true;
        G.almostThereTimer = 2.5;
        playAlmostThereSound();
        haptic([20, 30, 20, 30, 40]);
      }
    }
    if (G.almostThereTimer > 0) {
      G.almostThereTimer -= dt;
    }

    // Camera tracking
    const targetCamY = G.player.y - CANVAS_H * CAMERA_PLAYER_OFFSET;
    G.camera.y += (targetCamY - G.camera.y) * CAMERA_SMOOTHING;
    G.camera.y = Math.max(0, G.camera.y);

    // Parallax background scrolling (throttled: only update DOM when >1px change)
    const parallaxY = -(G.camera.y * 0.15);
    if (Math.abs(parallaxY - G.lastParallaxY) > 1) {
      G.lastParallaxY = parallaxY;
      document.body.style.backgroundPositionY = parallaxY + 'px';
    }

    // Shake decay
    if (G.shakeTimer > 0) G.shakeTimer -= 1;

    // HUD — only update DOM when values change
    const curRow = G.player.row;
    const curCol = G.player.col;
    const curTimer = formatTime(G.playTimer);
    const curJumps = G.jumpCount;
    const curStreak = G.jumpStreak;
    if (curRow !== this._lastRow || curCol !== this._lastCol || curTimer !== this._lastTimerStr || curJumps !== this._lastJumps || curStreak !== this._lastStreak) {
      // Fire milestone flash before updating cache
      if (curStreak > this._lastStreak && (curStreak === 3 || curStreak === 5 || curStreak >= 7)) {
        showStreakFlash(curStreak);
      }
      this._lastRow = curRow;
      this._lastCol = curCol;
      this._lastTimerStr = curTimer;
      this._lastJumps = curJumps;
      this._lastStreak = curStreak;
      const streakPart = curStreak > 0
        ? `<span class="stat-item stat-streak">${curStreak}x<span class="stat-label">${t('hud.streak')}</span></span>`
        : '';
      document.getElementById('hud-text').innerHTML =
        `<div class="stat-row">` +
        `<span class="stat-item">${curTimer}<span class="stat-label">${t('hud.time')}</span></span>` +
        `<span class="stat-item">${curJumps}<span class="stat-label">${t('hud.jumps')}</span></span>` +
        streakPart +
        `</div>`;
    }
  },
  render() {
    const ctx = G.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    applyShake(ctx);

    drawLava(G.camera.y, CANVAS_H);
    renderPlatforms(G.revealRoute);
    drawCoins();
    drawTrailMarks();
    drawRescueCharacter();
    drawParticles();
    drawStreakPopups();
    drawPlayer();
    drawTutorialArrow();

    ctx.restore();

    // Almost there encouragement (drawn outside camera transform)
    drawAlmostThere();

    // Route reveal overlay hint
    if (G.revealRoute) {
      const secs = Math.ceil(G.revealRouteTimer);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_W, 36);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#44ff88';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t('playing.route_reveal', { secs: secs }), CANVAS_W / 2, 18);
      ctx.restore();
    }

    drawTransition();
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
    G.streak = 0;
    this._spoken = false;
    playFallSound();
    stopMusic();
    spawnLavaSplash(G.player.x, G.player.y + 40);

    // Check if player was close to winning
    const wasAlmostWin = G.player.row >= G.platforms.length - 2;

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
        const levelName = t('level.' + G.levelConfig.name, { n: G.level });
        loseLevelInfo.textContent = t('hud.level_of', { level: G.level, total: LEVELS.length, name: levelName });
        loseLevelInfo.style.display = '';
      } else {
        loseLevelInfo.style.display = 'none';
      }
      // Show lose screen
      document.getElementById('lose-emoji').textContent = G.heroChar.emoji + ' \uD83D\uDD25';
      const heroName = t('char.' + G.heroChar.name);
      const rescueName = t('char.' + G.rescueChar.name);
      let messages;
      if (wasAlmostWin) {
        messages = [
          t('lose.almost.1', { hero: heroName }),
          t('lose.almost.2'),
          t('lose.almost.3', { rescue: rescueName }),
        ];
      } else {
        messages = [
          t('lose.fell.1', { hero: heroName }),
          t('lose.fell.2', { hero: heroName, rescue: rescueName }),
          t('lose.fell.3', { hero: heroName }),
        ];
      }
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
    updateTransition(dt);
    G.fallY += 1.2;
    if (G.shakeTimer > 0) G.shakeTimer -= 1;

    // Parallax (throttled)
    const fallParallaxY = -(G.camera.y * 0.15);
    if (Math.abs(fallParallaxY - G.lastParallaxY) > 1) {
      G.lastParallaxY = fallParallaxY;
      document.body.style.backgroundPositionY = fallParallaxY + 'px';
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

    // Falling player emoji — shrinks and tumbles as it drops into lava
    const fallDist = Math.max(0, G.fallY - G.player.y);
    const shrink = Math.max(0, 1 - fallDist / 150);
    const tumble = fallDist * 0.05;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(G.player.x, G.fallY - G.camera.y);
    ctx.rotate(tumble);
    drawEmoji(ctx, G.heroChar.emoji, 0, 0, EMOJI_SIZE * shrink);
    ctx.restore();

    ctx.restore();
    drawTransition();
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
  _confettiTimer: 0,
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
    this._confettiTimer = 0;

    // Victory dance phase
    G.victoryDanceActive = true;
    G.victoryDanceTimer = 0;

    // Start fly-away from goal platform position
    let startX = CANVAS_W / 2, startY = CANVAS_H * 0.55;
    if (G.platforms.length > 0 && G.safePath.length > 0) {
      const goalPlat = G.platforms[G.platforms.length - 1][G.safePath[G.safePath.length - 1]];
      if (goalPlat) {
        startX = goalPlat.x + goalPlat.w / 2;
        startY = goalPlat.y - G.camera.y - 20;
      }
    }
    this._danceX = startX;
    this._danceY = startY;
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
    const heroName = t('char.' + G.heroChar.name);
    const rescueName = t('char.' + G.rescueChar.name);
    document.getElementById('win-msg').textContent =
      t('win.saved', { hero: heroName, rescue: rescueName });

    // Score & level display
    const winLevelInfo = document.getElementById('win-level-info');
    const winScoreSection = document.getElementById('win-score-section');
    const nextLevelBtn = document.getElementById('next-level-btn');

    if (G.gameMode === 'adventure' && G.levelConfig) {
      const breakdown = calculateScore(G.level, G.playTimer, G.jumpCount, G.gridRows, G.levelConfig.memTime, G.memTimeSaved, G.streakBonus, {
        routeRevealed: G.routeRevealed,
        totalCols: G.gridCols,
        fakeChance: G.levelConfig.fake,
      });
      // Add coin bonus to breakdown
      breakdown.coinBonus = G.coinScore || 0;
      breakdown.totalScore += breakdown.coinBonus;
      const stars = calculateStars(breakdown.totalScore, G.level);
      G.levelScore = breakdown.totalScore;
      G.levelStars = stars;
      G.levelScoreBreakdown = breakdown;
      G.totalScore += breakdown.totalScore;

      const winLevelName = t('level.' + G.levelConfig.name, { n: G.level });
      winLevelInfo.textContent = t('hud.level_of', { level: G.level, total: LEVELS.length, name: winLevelName });
      winLevelInfo.style.display = '';

      const starStr = Array.from({length: 3}, (_, i) => {
        const char = i < stars ? '\u2B50' : '\u2606';
        const delay = i * 0.3;
        return `<span class="star-pop" style="animation-delay:${delay}s">${char}</span>`;
      }).join('');
      let scoreHtml = `<div class="score-stars">${starStr}</div>`;
      if (breakdown.routeRevealed) {
        scoreHtml += `<div class="score-row bonus" style="color:#ff6644"><span>${t('win.route_revealed')}</span><span>0</span></div>`;
      } else {
        scoreHtml += `<div class="score-row"><span>${t('win.time_bonus')}</span><span>${breakdown.timeScore}</span></div>`;
        scoreHtml += `<div class="score-row"><span>${t('win.jump_efficiency')}</span><span>${breakdown.jumpScore}</span></div>`;
        scoreHtml += `<div class="score-row"><span>${t('win.level_bonus')}</span><span>${breakdown.levelBonus}</span></div>`;
        if (breakdown.difficultyBonus > 0) {
          scoreHtml += `<div class="score-row"><span>${t('win.difficulty_bonus')}</span><span>${breakdown.difficultyBonus}</span></div>`;
        }
        if (breakdown.perfectBonus > 0) {
          scoreHtml += `<div class="score-row bonus"><span>${t('win.perfect_path')}</span><span>+${breakdown.perfectBonus}</span></div>`;
        }
        if (breakdown.speedBonus > 0) {
          scoreHtml += `<div class="score-row bonus"><span>${t('win.speed_bonus')}</span><span>+${breakdown.speedBonus}</span></div>`;
        }
        if (breakdown.earlyMemBonus > 0) {
          scoreHtml += `<div class="score-row bonus"><span>${t('win.early_start')}</span><span>+${breakdown.earlyMemBonus}</span></div>`;
        }
        if (breakdown.streakBonus > 0) {
          scoreHtml += `<div class="score-row bonus"><span>${t('win.streak_bonus')}</span><span>+${breakdown.streakBonus}</span></div>`;
        }
        if (breakdown.coinBonus > 0) {
          scoreHtml += `<div class="score-row bonus"><span>${t('win.coins_bonus')} (${G.coinsCollected})</span><span>+${breakdown.coinBonus}</span></div>`;
        }
      }
      scoreHtml += `<div class="score-total"><span>${t('win.level_score')}</span><span>${breakdown.totalScore}</span></div>`;
      scoreHtml += `<div class="score-cumulative">${t('win.total_score', { score: G.totalScore })}</div>`;
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

    // Victory dance phase — characters dance before flying away
    if (G.victoryDanceActive) {
      G.victoryDanceTimer += dt;
      // Spawn sparkles during dance
      if (Math.random() < 0.3) {
        spawnVictorySparkle(this._danceX, this._danceY);
      }
      if (G.victoryDanceTimer >= VICTORY_DANCE_DURATION) {
        G.victoryDanceActive = false;
        // Initialize fly-away from dance position
        this._flyX1 = this._danceX + 20;
        this._flyY1 = this._danceY;
        this._flyX2 = this._danceX - 20;
        this._flyY2 = this._danceY;
      }
    }

    // Characters fly up and off screen (only after dance)
    if (!G.victoryDanceActive) {
      this._flyVY1 -= 120 * dt;
      this._flyVY2 -= 120 * dt;
      this._flyX1 += this._flyVX1 * dt;
      this._flyY1 += this._flyVY1 * dt;
      this._flyX2 += this._flyVX2 * dt;
      this._flyY2 += this._flyVY2 * dt;
      this._angle1 += dt * 3.5;
      this._angle2 -= dt * 2.8;
    }

    updateTransition(dt);

    // Fireworks sequence — 16 bursts with increasing density
    if (this._fwCount < 16) {
      this._fwTimer += dt;
      const interval = this._fwCount < 6 ? 0.18 : 0.22;
      if (this._fwTimer >= interval) {
        this._fwTimer -= interval;
        const burst = 1 + Math.floor(Math.random() * 3);
        for (let b = 0; b < burst; b++) {
          spawnFirework(
            60 + Math.random() * (CANVAS_W - 120),
            G.camera.y + 30 + Math.random() * (CANVAS_H - 100)
          );
        }
        spawnConfetti();
        this._fwCount++;

        if (this._fwCount === 3 && !this._spoken) {
          this._spoken = true;
          speakCongrats();
        }
        if (this._fwCount >= 16) {
          this._showScreenTimer = 0.5;
        }
      }
    }

    // Continuous confetti shower after fireworks are done
    if (this._fwCount >= 16) {
      this._confettiTimer += dt;
      if (this._confettiTimer >= 0.35) {
        this._confettiTimer -= 0.35;
        spawnConfetti();
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

    // Skip fireworks after a brief grace period
    if (G.winSkipRequested && G.winTimer > 0.5) {
      G.winSkipRequested = false;
      this._fwCount = 16;
      this._showScreenTimer = 0.01; // show on next tick
    }
  },
  render() {
    const ctx = G.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();

    drawLava(G.camera.y, CANVAS_H);
    renderPlatforms(false);
    drawParticles();

    // Victory dance phase
    if (G.victoryDanceActive) {
      drawVictoryDance(this._danceX, this._danceY, G.victoryDanceTimer);
      ctx.globalAlpha = 1;
      ctx.restore();
      drawTransition();
      return;
    }

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
    drawTransition();
  }
};
