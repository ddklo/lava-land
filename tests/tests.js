// ─── LAVA LAND TEST SUITE ───────────────────────────────────────
// Minimal test runner — no dependencies, runs in browser via file://

(function () {
  const results = [];
  let totalPass = 0, totalFail = 0;

  function assert(condition, message) {
    if (condition) {
      results.push({ pass: true, message });
      totalPass++;
    } else {
      results.push({ pass: false, message });
      totalFail++;
    }
  }

  function assertEqual(actual, expected, message) {
    const pass = actual === expected;
    if (!pass) message += ` (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`;
    assert(pass, message);
  }

  function assertInRange(val, min, max, message) {
    const pass = val >= min && val <= max;
    if (!pass) message += ` (got ${val}, expected ${min}..${max})`;
    assert(pass, message);
  }

  function suite(name, fn) {
    results.push({ suite: name });
    fn();
  }

  // Bootstrap canvas (required by drawing functions)
  G.canvas = document.getElementById('gameCanvas');
  G.canvas.width = CANVAS_W;
  G.canvas.height = CANVAS_H;
  G.ctx = G.canvas.getContext('2d');

  // ═══════════════════════════════════════════════════════════════
  // CONFIG TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Config Constants', () => {
    assertEqual(typeof CANVAS_W, 'number', 'CANVAS_W is a number');
    assertEqual(typeof CANVAS_H, 'number', 'CANVAS_H is a number');
    assertEqual(typeof PLAT_H, 'number', 'PLAT_H is a number');
    assertEqual(typeof PLAT_DEPTH, 'number', 'PLAT_DEPTH is a number');
    assert(PLAT_DEPTH < PLAT_H, 'PLAT_DEPTH < PLAT_H');
    assertEqual(typeof GAME_TITLE, 'string', 'GAME_TITLE is a string');
    assertEqual(typeof GAME_AUTHOR, 'string', 'GAME_AUTHOR is a string');
    assert(CHARACTERS.length >= 2, 'At least 2 characters defined');
    assert(CHARACTERS.every(c => c.id && c.emoji && c.name), 'All characters have id, emoji, name');

    // Physics constants exist
    assertEqual(typeof JUMP_ARC_HEIGHT, 'number', 'JUMP_ARC_HEIGHT defined');
    assertEqual(typeof JUMP_SPEED, 'number', 'JUMP_SPEED defined');
    assertEqual(typeof SPRING_STIFFNESS, 'number', 'SPRING_STIFFNESS defined');
    assertEqual(typeof SPRING_DAMPING, 'number', 'SPRING_DAMPING defined');
    assertEqual(typeof CAMERA_SMOOTHING, 'number', 'CAMERA_SMOOTHING defined');
    assertEqual(typeof TRAIL_FADE_RATE, 'number', 'TRAIL_FADE_RATE defined');
  });

  suite('Grid Sizes Config', () => {
    for (const [key, val] of Object.entries(GRID_SIZES)) {
      assert(val.cols > 0 && val.rows > 0, `GRID_SIZES.${key} has valid cols/rows`);
    }
  });

  suite('Difficulty Config', () => {
    for (const [key, val] of Object.entries(DIFFICULTY_FAKE_CHANCE)) {
      assertInRange(val, 0, 1, `DIFFICULTY_FAKE_CHANCE.${key} between 0 and 1`);
    }
  });

  suite('Memorize Times Config', () => {
    for (const [key, val] of Object.entries(MEMORIZE_TIMES)) {
      assert(val > 0, `MEMORIZE_TIMES.${key} is positive`);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // STATE TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('State Initialization', () => {
    assertEqual(typeof G, 'object', 'G object exists');
    assert(Array.isArray(G.platforms), 'G.platforms is an array');
    assert(Array.isArray(G.particles), 'G.particles is an array');
    assert(Array.isArray(G.timers), 'G.timers is an array');
    assert(Array.isArray(G.trailMarks), 'G.trailMarks is an array');
    assertEqual(typeof G.player, 'object', 'G.player is an object');
    assertEqual(typeof G.camera, 'object', 'G.camera has y property');
    assertEqual(G.gameState, 'menu', 'Initial gameState is menu');
  });

  // ═══════════════════════════════════════════════════════════════
  // PLATFORM GENERATION TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Platform Generation — Small Grid', () => {
    G.gridCols = 5;
    G.gridRows = 8;
    G.difficulty = 'easy';
    generatePlatforms();

    assertEqual(G.platforms.length, 8, 'Generates correct number of rows');
    assertEqual(G.platforms[0].length, 5, 'Correct columns per row');
    assertEqual(G.safePath.length, 8, 'Safe path has entry for each row');

    // Safe path stays in bounds
    for (let r = 0; r < G.safePath.length; r++) {
      assertInRange(G.safePath[r], 0, G.gridCols - 1, `Safe path row ${r} in column bounds`);
    }

    // Safe path platforms are never fake
    for (let r = 0; r < G.gridRows; r++) {
      assert(!G.platforms[r][G.safePath[r]].fake, `Safe path platform row ${r} is not fake`);
    }
  });

  suite('Platform Generation — Large Grid', () => {
    G.gridCols = 7;
    G.gridRows = 16;
    G.difficulty = 'hard';
    generatePlatforms();

    assertEqual(G.platforms.length, 16, 'Generates 16 rows');
    assertEqual(G.platforms[0].length, 7, '7 columns per row');

    // On hard difficulty, at least some platforms should be fake
    let fakeCount = 0;
    for (const row of G.platforms) {
      for (const plat of row) {
        if (plat.fake) fakeCount++;
      }
    }
    assert(fakeCount > 0, 'Hard difficulty has fake platforms');
  });

  suite('Platform Generation — Safe Path Has Lateral Movement', () => {
    // Run multiple times to test the safety-net logic
    let hasLateral = false;
    for (let trial = 0; trial < 20; trial++) {
      G.gridCols = 5;
      G.gridRows = 8;
      G.difficulty = 'easy';
      generatePlatforms();
      if (G.safePath.some((col, i) => i > 0 && col !== G.safePath[i - 1])) {
        hasLateral = true;
        break;
      }
    }
    assert(hasLateral, 'Safe path includes at least one lateral move (20 trials)');
  });

  suite('Platform Properties', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'medium';
    generatePlatforms();

    const plat = G.platforms[0][0];
    assert(typeof plat.x === 'number', 'Platform has x position');
    assert(typeof plat.y === 'number', 'Platform has y position');
    assert(typeof plat.w === 'number', 'Platform has width');
    assertEqual(plat.h, PLAT_H, 'Platform height matches PLAT_H');
    assertEqual(plat.crumbling, false, 'Platform starts not crumbling');
    assertEqual(plat.crumbleTimer, 0, 'Crumble timer starts at 0');
    assertEqual(plat.bobOffset, 0, 'Bob offset starts at 0');
    assertEqual(plat.bobVel, 0, 'Bob velocity starts at 0');
  });

  // ═══════════════════════════════════════════════════════════════
  // PLAYER TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Player Reset', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    generatePlatforms();
    resetPlayer();

    assertEqual(G.player.row, 0, 'Player starts on row 0');
    assertEqual(G.player.col, G.safePath[0], 'Player starts on safe path column');
    assert(G.player.onPlatform !== null, 'Player has a platform reference');
    assertEqual(G.camera.y, 0, 'Camera starts at 0');
    assertEqual(G.jumpAnim.active, false, 'No jump animation on start');
    assertEqual(G.shakeTimer, 0, 'No screen shake on start');

    // Player position matches starting platform
    const startPlat = G.platforms[0][G.safePath[0]];
    assertEqual(G.player.x, startPlat.x + startPlat.w / 2, 'Player X centered on platform');
    assertEqual(G.player.y, startPlat.y - PLAYER_Y_OFFSET, 'Player Y offset from platform');
  });

  // ═══════════════════════════════════════════════════════════════
  // TIMER SYSTEM TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Timer System', () => {
    clearTimers();
    assertEqual(G.timers.length, 0, 'Timers cleared');

    let fired = false;
    addTimer(0.5, () => { fired = true; });
    assertEqual(G.timers.length, 1, 'Timer added');

    // Tick halfway — should not fire
    updateTimers(0.3);
    assertEqual(fired, false, 'Timer not fired at 0.3s');

    // Tick past deadline — should fire
    updateTimers(0.3);
    assertEqual(fired, true, 'Timer fires at 0.6s');
    assertEqual(G.timers.length, 0, 'Fired timer removed');
  });

  suite('Timer — clearTimers cancels pending', () => {
    clearTimers();
    let fired = false;
    addTimer(1.0, () => { fired = true; });
    clearTimers();
    updateTimers(2.0);
    assertEqual(fired, false, 'Cleared timer does not fire');
  });

  suite('Timer — multiple concurrent timers', () => {
    clearTimers();
    const order = [];
    addTimer(0.1, () => order.push('A'));
    addTimer(0.2, () => order.push('B'));
    addTimer(0.3, () => order.push('C'));

    updateTimers(0.15);
    assertEqual(order.join(''), 'A', 'Only first timer fires at 0.15s');

    updateTimers(0.1);
    assertEqual(order.join(''), 'AB', 'Second timer fires at 0.25s');

    updateTimers(0.1);
    assertEqual(order.join(''), 'ABC', 'Third timer fires at 0.35s');
  });

  // ═══════════════════════════════════════════════════════════════
  // SCENE MANAGER TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('SceneManager', () => {
    // Reset stack
    SceneManager.stack = [];

    const log = [];
    const sceneA = {
      onEnter() { log.push('A:enter'); },
      onExit()  { log.push('A:exit'); },
      onPause() { log.push('A:pause'); },
      onResume(){ log.push('A:resume'); },
      update(dt){ log.push('A:update'); },
      render()  { log.push('A:render'); },
    };
    const sceneB = {
      onEnter() { log.push('B:enter'); },
      onExit()  { log.push('B:exit'); },
      update(dt){ log.push('B:update'); },
      render()  { log.push('B:render'); },
    };

    SceneManager.push(sceneA);
    assertEqual(log.join(','), 'A:enter', 'Push calls onEnter');
    assertEqual(SceneManager.current, sceneA, 'Current is sceneA');

    log.length = 0;
    SceneManager.push(sceneB);
    assertEqual(log.join(','), 'A:pause,B:enter', 'Push pauses A, enters B');
    assertEqual(SceneManager.current, sceneB, 'Current is sceneB');

    log.length = 0;
    SceneManager.update(1/60);
    assertEqual(log.join(','), 'B:update', 'Update delegates to current');

    log.length = 0;
    SceneManager.render();
    assertEqual(log.join(','), 'B:render', 'Render delegates to current');

    log.length = 0;
    SceneManager.pop();
    assertEqual(log.join(','), 'B:exit,A:resume', 'Pop exits B, resumes A');
    assertEqual(SceneManager.current, sceneA, 'Current is sceneA again');

    log.length = 0;
    SceneManager.replace(sceneB);
    assertEqual(log.join(','), 'A:exit,B:enter', 'Replace exits old, enters new');
    assertEqual(SceneManager.current, sceneB, 'Current is sceneB after replace');

    // Clean up
    SceneManager.stack = [];
  });

  // ═══════════════════════════════════════════════════════════════
  // GAME LOGIC TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Jump Logic — Forward Jump Setup', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    const startRow = G.player.row;
    const startCol = G.player.col;
    tryJump('forward');

    assert(G.jumpAnim.active, 'Forward jump starts animation');
    assertEqual(G.jumpAnim.targetRow, startRow + 1, 'Target is next row');
  });

  suite('Jump Logic — Sideways Jump', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    // Force player to middle column so both directions work
    const midCol = Math.floor(G.gridCols / 2);
    G.player.col = midCol;
    G.player.x = G.platforms[0][midCol].x + G.platforms[0][midCol].w / 2;
    G.player.onPlatform = G.platforms[0][midCol];
    G.jumpAnim.active = false;

    tryJump('right');
    assert(G.jumpAnim.active, 'Right jump starts animation');
    assertEqual(G.jumpAnim.targetCol, midCol + 1, 'Target column is +1');
  });

  suite('Jump Logic — Cannot Jump While Animating', () => {
    G.gameState = 'playing';
    G.jumpAnim.active = true;
    const prevTarget = G.jumpAnim.targetRow;

    tryJump('forward');
    assertEqual(G.jumpAnim.targetRow, prevTarget, 'Jump ignored while animating');

    G.jumpAnim.active = false;
  });

  suite('Jump Logic — Cannot Jump in Wrong State', () => {
    G.gameState = 'menu';
    G.jumpAnim.active = false;

    tryJump('forward');
    assertEqual(G.jumpAnim.active, false, 'No jump from menu state');

    G.gameState = 'memorize';
    tryJump('forward');
    assertEqual(G.jumpAnim.active, false, 'No jump from memorize state');
  });

  suite('Jump Logic — Cannot Jump Past Last Row', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    // Place player on last row
    const lastRow = G.gridRows - 1;
    G.player.row = lastRow;
    G.player.col = 0;
    G.player.onPlatform = G.platforms[lastRow][0];
    G.jumpAnim.active = false;

    tryJump('forward');
    assertEqual(G.jumpAnim.active, false, 'Cannot jump forward from last row');
  });

  suite('Landing — Safe Platform', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    // Push a scene so SceneManager.replace works
    SceneManager.stack = [];
    SceneManager.stack.push(PlayingScene);

    const targetRow = 1;
    const targetCol = G.safePath[1];
    const plat = G.platforms[targetRow][targetCol];
    plat.fake = false;
    plat.destroyed = false;

    landOnPlatform(plat, targetRow, targetCol);

    assertEqual(G.player.row, targetRow, 'Player moves to target row');
    assertEqual(G.player.col, targetCol, 'Player moves to target col');
    assertEqual(G.player.onPlatform, plat, 'Player references landed platform');
  });

  suite('Landing — Fake Platform Triggers Crumble', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();
    clearTimers();

    SceneManager.stack = [];
    SceneManager.stack.push(PlayingScene);

    const plat = G.platforms[1][0];
    plat.fake = true;
    plat.destroyed = false;
    plat.crumbling = false;

    landOnPlatform(plat, 1, 0);

    assertEqual(plat.crumbling, true, 'Fake platform starts crumbling');
    assert(G.timers.length > 0, 'Timer added for fall transition');
  });

  suite('Landing — Destroyed Platform Triggers Fall', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    SceneManager.stack = [];
    SceneManager.stack.push(PlayingScene);

    const plat = G.platforms[1][0];
    plat.destroyed = true;

    landOnPlatform(plat, 1, 0);

    assertEqual(G.gameState, 'falling', 'Landing on destroyed platform triggers fall');
  });

  // ═══════════════════════════════════════════════════════════════
  // WIN CONDITION TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Win Condition — Correct Column', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    SceneManager.stack = [];
    SceneManager.stack.push(PlayingScene);

    G.heroChoice = CHARACTERS[0].id;
    G.rescueChoice = CHARACTERS[1].id;
    G.heroChar = CHARACTERS[0];
    G.rescueChar = CHARACTERS[1];

    const lastRow = G.gridRows - 1;
    const rescueCol = G.safePath[G.safePath.length - 1];
    const plat = G.platforms[lastRow][rescueCol];
    plat.fake = false;
    plat.destroyed = false;

    landOnPlatform(plat, lastRow, rescueCol);

    assertEqual(G.gameState, 'won', 'Landing on rescue column on last row wins');
  });

  suite('Win Condition — Wrong Column', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    SceneManager.stack = [];
    SceneManager.stack.push(PlayingScene);

    const lastRow = G.gridRows - 1;
    const rescueCol = G.safePath[G.safePath.length - 1];
    const wrongCol = rescueCol === 0 ? 1 : 0;
    const plat = G.platforms[lastRow][wrongCol];
    plat.fake = false;
    plat.destroyed = false;

    landOnPlatform(plat, lastRow, wrongCol);

    assertEqual(G.gameState, 'playing', 'Landing on wrong column on last row does not win');
  });

  // ═══════════════════════════════════════════════════════════════
  // PLATFORM BOB SPRING PHYSICS TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Platform Bob Spring', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    generatePlatforms();

    const plat = G.platforms[0][0];
    plat.bobOffset = LAND_BOB_OFFSET;
    plat.bobVel = LAND_BOB_VEL;

    // Simulate many ticks — spring should settle to rest
    for (let i = 0; i < 300; i++) {
      updatePlatformBob(1 / 60);
    }

    assertEqual(plat.bobOffset, 0, 'Spring settles to 0 offset');
    assertEqual(plat.bobVel, 0, 'Spring settles to 0 velocity');
  });

  // ═══════════════════════════════════════════════════════════════
  // PARTICLE SYSTEM TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Particle Spawning', () => {
    G.particles = [];
    G.gridCols = 6;
    G.gridRows = 12;
    generatePlatforms();

    const plat = G.platforms[0][0];

    spawnLandDust(plat);
    assert(G.particles.length > 0, 'spawnLandDust creates particles');
    const dustCount = G.particles.length;

    spawnPlatformExplosion(plat);
    assert(G.particles.length > dustCount, 'spawnPlatformExplosion creates more particles');

    spawnLavaSplash(100, 200);
    assert(G.particles.length > dustCount + 18, 'spawnLavaSplash creates particles');

    spawnFirework(100, 100);
    assert(G.particles.length > 50, 'spawnFirework creates particles');
  });

  suite('Particle Lifecycle', () => {
    G.particles = [];
    G.particles.push({
      x: 100, y: 100, vx: 1, vy: 0, life: 0.03, gravity: 0.1, size: 3, color: '#fff',
    });

    assertEqual(G.particles.length, 1, 'One particle exists');

    // Tick twice — particle should die (life decreases by 0.02 per tick)
    updateParticles(1 / 60);
    updateParticles(1 / 60);

    assertEqual(G.particles.length, 0, 'Expired particle removed');
  });

  // ═══════════════════════════════════════════════════════════════
  // TRAIL MARKS TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Trail Marks', () => {
    G.trailMarks = [];
    G.trailMarks.push({ x: 100, y: 200, life: 1.0 });

    assertEqual(G.trailMarks.length, 1, 'Trail mark added');

    // Fade partially
    updateTrailMarks(1.0);
    assert(G.trailMarks[0].life < 1.0, 'Trail mark fades over time');
    assert(G.trailMarks[0].life > 0, 'Trail mark still alive after 1s');

    // Fade to death
    updateTrailMarks(100);
    assertEqual(G.trailMarks.length, 0, 'Fully faded trail mark removed');
  });

  // ═══════════════════════════════════════════════════════════════
  // FORMAT TIME TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('formatTime', () => {
    assertEqual(formatTime(0), '0s', '0 seconds');
    assertEqual(formatTime(5), '5s', '5 seconds');
    assertEqual(formatTime(59), '59s', '59 seconds');
    assertEqual(formatTime(60), '1:00', '60 seconds = 1:00');
    assertEqual(formatTime(90), '1:30', '90 seconds = 1:30');
    assertEqual(formatTime(125), '2:05', '125 seconds = 2:05');
  });

  // ═══════════════════════════════════════════════════════════════
  // AUDIO GUARD TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Audio Safety', () => {
    // Test that audio functions don't crash when AudioContext unavailable
    const savedCtx = G.audioCtx;
    G.audioCtx = null;

    let threw = false;
    try {
      playJumpSound();
      playHopSound();
      playLandSound();
      playCrumbleSound();
      playFallSound();
      stopMusic();
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'Audio functions safe when AudioContext is null');

    G.audioCtx = savedCtx;
  });

  suite('Speech Synthesis — English Voice Lookup', () => {
    // getEnglishVoice should not crash even without speechSynthesis
    let threw = false;
    try {
      const voice = getEnglishVoice();
      assert(voice === null || typeof voice === 'object', 'getEnglishVoice returns voice or null');
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'getEnglishVoice does not throw');
  });

  suite('Speech Synthesis — speakText Safety', () => {
    let threw = false;
    try {
      speakText('test', 1.0, 1.0);
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'speakText does not throw');
  });

  // ═══════════════════════════════════════════════════════════════
  // PLATFORM INITIALIZATION — destroyed PROPERTY
  // ═══════════════════════════════════════════════════════════════
  suite('Platform Initialization — destroyed property', () => {
    G.gridCols = 5;
    G.gridRows = 8;
    G.difficulty = 'easy';
    generatePlatforms();

    const plat = G.platforms[0][0];
    assertEqual(plat.destroyed, false, 'Platform explicitly initialized with destroyed: false');

    // Check every platform has the property
    let allHaveDestroyed = true;
    for (const row of G.platforms) {
      for (const p of row) {
        if (typeof p.destroyed !== 'boolean') { allHaveDestroyed = false; break; }
      }
      if (!allHaveDestroyed) break;
    }
    assert(allHaveDestroyed, 'All platforms have explicit destroyed property');
  });

  // ═══════════════════════════════════════════════════════════════
  // CHARACTER CACHING
  // ═══════════════════════════════════════════════════════════════
  suite('Character Caching', () => {
    assertEqual(G.heroChar, null, 'G.heroChar starts null');
    assertEqual(G.rescueChar, null, 'G.rescueChar starts null');

    // Simulate what startGame does (without calling startGame which needs DOM)
    G.heroChoice = CHARACTERS[0].id;
    G.rescueChoice = CHARACTERS[1].id;
    G.heroChar = CHARACTERS.find(c => c.id === G.heroChoice);
    G.rescueChar = CHARACTERS.find(c => c.id === G.rescueChoice);

    assertEqual(G.heroChar.id, CHARACTERS[0].id, 'G.heroChar cached correctly');
    assertEqual(G.rescueChar.id, CHARACTERS[1].id, 'G.rescueChar cached correctly');
    assert(G.heroChar.emoji !== undefined, 'Cached heroChar has emoji');
    assert(G.rescueChar.emoji !== undefined, 'Cached rescueChar has emoji');

    // Clean up
    G.heroChoice = null;
    G.rescueChoice = null;
    G.heroChar = null;
    G.rescueChar = null;
  });

  // ═══════════════════════════════════════════════════════════════
  // SIDEWAYS JUMP BOUNDARY TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Sideways Jump — Left Boundary', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    // Place player at column 0
    G.player.col = 0;
    G.player.x = G.platforms[0][0].x + G.platforms[0][0].w / 2;
    G.player.onPlatform = G.platforms[0][0];
    G.jumpAnim.active = false;

    tryJump('left');
    assertEqual(G.jumpAnim.active, false, 'Cannot jump left from column 0');
  });

  suite('Sideways Jump — Right Boundary', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    const maxCol = G.gridCols - 1;
    G.player.col = maxCol;
    G.player.x = G.platforms[0][maxCol].x + G.platforms[0][maxCol].w / 2;
    G.player.onPlatform = G.platforms[0][maxCol];
    G.jumpAnim.active = false;

    tryJump('right');
    assertEqual(G.jumpAnim.active, false, 'Cannot jump right from last column');
  });

  suite('Sideways Jump — Out-of-bounds Row Guard', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    // Force player row to be beyond platforms array
    G.player.row = G.platforms.length;
    G.jumpAnim.active = false;

    tryJump('left');
    assertEqual(G.jumpAnim.active, false, 'Sideways jump guards against out-of-bounds row');
  });

  // ═══════════════════════════════════════════════════════════════
  // SINGLE-COLUMN GRID
  // ═══════════════════════════════════════════════════════════════
  suite('Single-Column Grid — Sideways Jumps Impossible', () => {
    G.gridCols = 1;
    G.gridRows = 4;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    assertEqual(G.platforms[0].length, 1, 'Single column grid generated');
    G.jumpAnim.active = false;

    tryJump('left');
    assertEqual(G.jumpAnim.active, false, 'Cannot jump left on single-column grid');

    G.jumpAnim.active = false;
    tryJump('right');
    assertEqual(G.jumpAnim.active, false, 'Cannot jump right on single-column grid');

    // Forward jump should still work
    G.jumpAnim.active = false;
    tryJump('forward');
    assert(G.jumpAnim.active, 'Forward jump works on single-column grid');
  });

  // ═══════════════════════════════════════════════════════════════
  // WIN CONDITION — DIFFERENT GRID SIZES
  // ═══════════════════════════════════════════════════════════════
  suite('Win Condition — Small Grid (5x8)', () => {
    G.gridCols = 5;
    G.gridRows = 8;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    SceneManager.stack = [];
    SceneManager.stack.push(PlayingScene);

    G.heroChoice = CHARACTERS[0].id;
    G.rescueChoice = CHARACTERS[1].id;
    G.heroChar = CHARACTERS.find(c => c.id === G.heroChoice);
    G.rescueChar = CHARACTERS.find(c => c.id === G.rescueChoice);

    const lastRow = G.gridRows - 1;
    const rescueCol = G.safePath[G.safePath.length - 1];
    const plat = G.platforms[lastRow][rescueCol];
    plat.fake = false;
    plat.destroyed = false;

    landOnPlatform(plat, lastRow, rescueCol);
    assertEqual(G.gameState, 'won', 'Win on small grid (5x8)');

    // Clean up
    G.heroChar = null;
    G.rescueChar = null;
  });

  suite('Win Condition — Large Grid (7x16)', () => {
    G.gridCols = 7;
    G.gridRows = 16;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    SceneManager.stack = [];
    SceneManager.stack.push(PlayingScene);

    G.heroChoice = CHARACTERS[0].id;
    G.rescueChoice = CHARACTERS[1].id;
    G.heroChar = CHARACTERS.find(c => c.id === G.heroChoice);
    G.rescueChar = CHARACTERS.find(c => c.id === G.rescueChoice);

    const lastRow = G.gridRows - 1;
    const rescueCol = G.safePath[G.safePath.length - 1];
    const plat = G.platforms[lastRow][rescueCol];
    plat.fake = false;
    plat.destroyed = false;

    landOnPlatform(plat, lastRow, rescueCol);
    assertEqual(G.gameState, 'won', 'Win on large grid (7x16)');

    // Clean up
    G.heroChar = null;
    G.rescueChar = null;
  });

  // ═══════════════════════════════════════════════════════════════
  // FORWARD JUMP USES PLAYER_Y_OFFSET
  // ═══════════════════════════════════════════════════════════════
  suite('Forward Jump — Uses PLAYER_Y_OFFSET', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    tryJump('forward');
    assert(G.jumpAnim.active, 'Forward jump started');

    const targetPlat = G.jumpAnim.targetPlat;
    assertEqual(G.jumpAnim.endY, targetPlat.y - PLAYER_Y_OFFSET,
      'Forward jump endY uses PLAYER_Y_OFFSET constant');
  });

  // ═══════════════════════════════════════════════════════════════
  // HUD CACHING
  // ═══════════════════════════════════════════════════════════════
  suite('PlayingScene HUD Caching', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    // Verify PlayingScene has cache properties
    assertEqual(typeof PlayingScene._lastRow, 'number', 'PlayingScene has _lastRow cache');
    assertEqual(typeof PlayingScene._lastCol, 'number', 'PlayingScene has _lastCol cache');
    assertEqual(typeof PlayingScene._lastTimerStr, 'string', 'PlayingScene has _lastTimerStr cache');
  });

  // ═══════════════════════════════════════════════════════════════
  // DESTROY DEPARTURE PLATFORM HELPER
  // ═══════════════════════════════════════════════════════════════
  suite('destroyDeparturePlatform Helper', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    generatePlatforms();
    resetPlayer();
    G.particles = [];

    const plat = G.player.onPlatform;
    assertEqual(plat.destroyed, false, 'Platform starts not destroyed');

    destroyDeparturePlatform();

    assertEqual(plat.destroyed, true, 'Platform marked destroyed after call');
    assert(G.particles.length > 0, 'Explosion particles spawned');
  });

  suite('destroyDeparturePlatform — No Platform', () => {
    G.player.onPlatform = null;
    G.particles = [];

    let threw = false;
    try {
      destroyDeparturePlatform();
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'Safe when player has no platform');
  });

  // ═══════════════════════════════════════════════════════════════
  // drawEmoji HELPER
  // ═══════════════════════════════════════════════════════════════
  suite('drawEmoji Helper', () => {
    let threw = false;
    try {
      drawEmoji(G.ctx, '\u{1F9D9}', 100, 100, 48);
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'drawEmoji renders without error');
    // Verify shadow was reset
    assertEqual(G.ctx.shadowBlur, 0, 'Shadow blur reset after drawEmoji');
    assertEqual(G.ctx.shadowColor, 'transparent', 'Shadow color reset after drawEmoji');
  });

  // ═══════════════════════════════════════════════════════════════
  // RENDER RESULTS
  // ═══════════════════════════════════════════════════════════════
  const container = document.getElementById('results');
  let currentSuite = null;

  for (const r of results) {
    if (r.suite) {
      const div = document.createElement('div');
      div.className = 'suite';
      const title = document.createElement('div');
      title.className = 'suite-name';
      title.textContent = r.suite;
      div.appendChild(title);
      container.appendChild(div);
      currentSuite = div;
    } else {
      const div = document.createElement('div');
      div.className = 'test ' + (r.pass ? 'pass' : 'fail');
      div.textContent = (r.pass ? '\u2713 ' : '\u2717 ') + r.message;
      currentSuite.appendChild(div);
    }
  }

  const summary = document.getElementById('summary');
  summary.textContent = `${totalPass} passed, ${totalFail} failed, ${totalPass + totalFail} total`;
  summary.className = totalFail === 0 ? 'all-pass' : 'has-fail';

  // Reset game state for clean state
  SceneManager.stack = [];
  G.gameState = 'menu';
})();
