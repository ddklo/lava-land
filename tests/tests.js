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

  // ═══════════════════════════════════════════════════════════════
  // BOARD RULES TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Board Rules — BOARD_RULES Config Exists', () => {
    assertEqual(typeof BOARD_RULES, 'object', 'BOARD_RULES is an object');
    assertEqual(BOARD_RULES.maxConsecutiveStraight, 1, 'maxConsecutiveStraight = 1');
    assertEqual(BOARD_RULES.maxConsecutiveSameDirection, 5, 'maxConsecutiveSameDirection = 5');
    assertInRange(BOARD_RULES.minLateralMoveFraction, 0, 1, 'minLateralMoveFraction between 0 and 1');
  });

  suite('Board Rules — Max Consecutive Same Direction', () => {
    // Test the rule directly with a controlled path
    const testPath = [3, 2, 1, 0, 0, 0, 1, 2, 3, 4, 5, 6, 6];
    // testPath has a run of 5 rights (cols 1,2,3,4,5,6) at rows 6-11
    applyMaxConsecutiveDirectionRule(testPath, 7);

    // Count max consecutive same-direction run
    let maxRun = 0;
    let runDir = 0;
    let runLen = 0;
    for (let i = 1; i < testPath.length; i++) {
      const diff = testPath[i] - testPath[i - 1];
      const dir = diff > 0 ? 1 : diff < 0 ? -1 : 0;
      if (dir !== 0 && dir === runDir) {
        runLen++;
      } else if (dir !== 0) {
        runDir = dir;
        runLen = 1;
      } else {
        runDir = 0;
        runLen = 0;
      }
      if (runLen > maxRun) maxRun = runLen;
    }
    assert(maxRun <= BOARD_RULES.maxConsecutiveSameDirection,
      `Max same-direction run <= ${BOARD_RULES.maxConsecutiveSameDirection} (got ${maxRun})`);
  });

  suite('Board Rules — Generated Path Respects Max Same Direction', () => {
    // Run many trials across different grid sizes to verify the rule holds
    const configs = [
      { cols: 5, rows: 8 },
      { cols: 7, rows: 16 },
      { cols: 7, rows: 20 },
    ];
    let violation = null;
    for (const cfg of configs) {
      G.gridCols = cfg.cols;
      G.gridRows = cfg.rows;
      G.difficulty = 'easy';
      G.levelConfig = null;
      for (let trial = 0; trial < 20; trial++) {
        generatePlatforms();
        let runDir = 0;
        let runLen = 0;
        for (let r = 1; r < G.safePath.length; r++) {
          const diff = G.safePath[r] - G.safePath[r - 1];
          const dir = diff > 0 ? 1 : diff < 0 ? -1 : 0;
          if (dir !== 0 && dir === runDir) {
            runLen++;
          } else if (dir !== 0) {
            runDir = dir;
            runLen = 1;
          } else {
            runDir = 0;
            runLen = 0;
          }
          if (runLen > BOARD_RULES.maxConsecutiveSameDirection) {
            violation = `${cfg.cols}x${cfg.rows} trial ${trial}: run of ${runLen} at row ${r}`;
            break;
          }
        }
        if (violation) break;
      }
      if (violation) break;
    }
    assert(violation === null,
      violation ? `Same-direction violation: ${violation}` : 'No same-direction violations in 60 trials');
  });

  suite('Board Rules — applyMaxConsecutiveDirectionRule Keeps Path In Bounds', () => {
    // Path that runs left to edge
    const testPath = [6, 5, 4, 3, 2, 1, 0, 0, 0, 1, 2, 3, 4, 5, 6, 6];
    applyMaxConsecutiveDirectionRule(testPath, 7);
    for (let i = 0; i < testPath.length; i++) {
      assertInRange(testPath[i], 0, 6, `Path[${i}] in bounds after rule (got ${testPath[i]})`);
    }
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
  // LEVEL CONFIG TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Level Config — LEVELS Array', () => {
    assertEqual(LEVELS.length, 15, 'LEVELS has 15 entries');
    for (let i = 0; i < LEVELS.length; i++) {
      const lvl = LEVELS[i];
      assert(lvl.cols >= 5 && lvl.cols <= 7, `Level ${i + 1} cols in range (got ${lvl.cols})`);
      assert(lvl.rows >= 5 && lvl.rows <= 16, `Level ${i + 1} rows in range (got ${lvl.rows})`);
      assert(lvl.fake >= 0.35 && lvl.fake <= 0.80, `Level ${i + 1} fake in range (got ${lvl.fake})`);
      assert(lvl.memTime >= 6 && lvl.memTime <= 10, `Level ${i + 1} memTime in range (got ${lvl.memTime})`);
      assert(typeof lvl.name === 'string' && lvl.name.length > 0, `Level ${i + 1} has a name`);
      assert(lvl.maxShift >= 1 && lvl.maxShift <= 3, `Level ${i + 1} maxShift in range (got ${lvl.maxShift})`);
      assert(typeof lvl.decoys === 'number' && lvl.decoys >= 0, `Level ${i + 1} decoys is non-negative (got ${lvl.decoys})`);
    }
  });

  suite('Level Config — Difficulty Increases', () => {
    // Fake chance never decreases across the 15 levels
    for (let i = 1; i < LEVELS.length; i++) {
      assert(LEVELS[i].fake >= LEVELS[i - 1].fake,
        `Level ${i + 1} fake >= level ${i} fake`);
    }
    // Rows never decrease
    for (let i = 1; i < LEVELS.length; i++) {
      assert(LEVELS[i].rows >= LEVELS[i - 1].rows,
        `Level ${i + 1} rows >= level ${i} rows`);
    }
  });

  suite('getLevelConfig — Table Levels', () => {
    const cfg1 = getLevelConfig(1);
    assertEqual(cfg1.cols, 5, 'Level 1 cols = 5');
    assertEqual(cfg1.rows, 5, 'Level 1 rows = 5');
    assertEqual(cfg1.name, 'The Crossing', 'Level 1 name');

    const cfg15 = getLevelConfig(15);
    assertEqual(cfg15.cols, 7, 'Level 15 cols = 7');
    assertEqual(cfg15.rows, 16, 'Level 15 rows = 16');
    assertEqual(cfg15.name, 'Final Descent', 'Level 15 name');
  });

  suite('getLevelConfig — Endless Scaling', () => {
    const cfg16 = getLevelConfig(16);
    assertEqual(cfg16.cols, 7, 'Level 16 cols = 7');
    assert(cfg16.rows >= 16 && cfg16.rows <= 20, `Level 16 rows in range (got ${cfg16.rows})`);
    // Level 16 fake continues smoothly from level 15 (0.72), not a big jump
    assert(cfg16.fake >= 0.72 && cfg16.fake <= 0.82, `Level 16 fake continues from 0.72 (got ${cfg16.fake})`);
    assert(cfg16.memTime >= 4, `Level 16 memTime >= 4 (got ${cfg16.memTime})`);
    assertEqual(cfg16.name, 'Endless 16', 'Level 16 name');
    assertEqual(cfg16.maxShift, 3, 'Level 16 maxShift = 3');
    assert(typeof cfg16.decoys === 'number', 'Level 16 has decoys field');

    const cfg30 = getLevelConfig(30);
    assert(cfg30.rows <= 20, `Level 30 rows capped at 20 (got ${cfg30.rows})`);
    assert(cfg30.fake <= 0.82, `Level 30 fake capped at 0.82 (got ${cfg30.fake})`);
    assert(cfg30.memTime >= 4, `Level 30 memTime >= 4 (got ${cfg30.memTime})`);
  });

  // ═══════════════════════════════════════════════════════════════
  // SCORING TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('calculateScore — Basic', () => {
    // Level 1, 10s, minimum jumps (4 for 5 rows), memTime 10, no streak
    const result = calculateScore(1, 10, 4, 5, 10);
    assertEqual(result.timeScore, 5000 - 10 * 50, 'Time score = 5000 - 500 = 4500');
    assertEqual(result.jumpScore, 3000, 'Jump score = 3000 (no excess)');
    assertEqual(result.levelBonus, 300, 'Level bonus = 1 * 300');
    assertEqual(result.perfectBonus, SCORE_PERFECT_BASE + 1 * SCORE_PERFECT_LEVEL_MULT, 'Perfect bonus awarded');
    assertEqual(result.speedBonus, 0, 'No speed bonus (10s >= 10 * 0.5)');
    assertEqual(result.streakBonus, 0, 'No streak bonus (not passed)');
    assert(result.perfect === true, 'Perfect flag set');
    assert(result.fast === false, 'Fast flag not set');
    assert(result.routeRevealed === false, 'Route not revealed');
    // difficultyBonus = 0 when no opts passed (totalCols defaults to 5, fakeChance defaults to 0)
    const expectedDiff = Math.round(5 * 5 * SCORE_DIFFICULTY_MULT * 1) + 0;
    assertEqual(result.difficultyBonus, expectedDiff, 'Difficulty bonus with defaults');
    assertEqual(result.totalScore, 4500 + 3000 + 300 + (SCORE_PERFECT_BASE + 1 * SCORE_PERFECT_LEVEL_MULT) + expectedDiff, 'Total includes difficulty bonus');
  });

  suite('calculateScore — Speed Bonus', () => {
    // Level 5, 2s (< 9 * 0.5 = 4.5s), 9 jumps for 10 rows
    const result = calculateScore(5, 2, 9, 10, 9);
    assert(result.fast === true, 'Fast flag set');
    assertEqual(result.speedBonus, SCORE_SPEED_BASE + 5 * SCORE_SPEED_LEVEL_MULT, 'Speed bonus scales with level');
  });

  suite('calculateScore — Excess Jumps', () => {
    // Level 1, 5s, 10 jumps for 5 rows (min = 4, excess = 6)
    const result = calculateScore(1, 5, 10, 5, 10, 0, 0);
    assertEqual(result.jumpScore, 3000 - 6 * 100, 'Jump score = 2400 (6 excess)');
    assertEqual(result.perfectBonus, 0, 'No perfect bonus');
    assert(result.perfect === false, 'Perfect flag not set');
  });

  suite('calculateScore — Floors at Zero', () => {
    // Very slow, many excess jumps
    const result = calculateScore(1, 200, 100, 5, 10);
    assertEqual(result.timeScore, 0, 'Time score floors at 0');
    assertEqual(result.jumpScore, 0, 'Jump score floors at 0');
  });

  suite('calculateScore — Streak Bonus', () => {
    // Level 1, streak bonus = 250 passed in
    const result = calculateScore(1, 10, 4, 5, 10, 0, 250);
    assertEqual(result.streakBonus, 250, 'Streak bonus included in result');
    const expectedDiff = Math.round(5 * 5 * SCORE_DIFFICULTY_MULT * 1) + 0;
    assertEqual(result.totalScore, (5000 - 500) + 3000 + 300 + (SCORE_PERFECT_BASE + 1 * SCORE_PERFECT_LEVEL_MULT) + 250 + expectedDiff, 'Streak bonus added to total');
  });

  suite('calculateStars — Thresholds', () => {
    const cfg1 = getLevelConfig(1);
    const theoreticalMaxStreak = ((cfg1.rows - 1) * cfg1.rows / 2) * SCORE_STREAK_MULT;
    const realisticMaxStreak = Math.round(theoreticalMaxStreak * STREAK_REALISM_FACTOR);
    const gridCells = cfg1.cols * cfg1.rows;
    const fakePct = cfg1.fake || 0;
    const maxDiffBonus = Math.round(gridCells * SCORE_DIFFICULTY_MULT * (1 + fakePct))
                       + Math.round(fakePct * SCORE_FAKE_MULT);
    const maxPerfect = SCORE_PERFECT_BASE + 1 * SCORE_PERFECT_LEVEL_MULT;
    const maxSpeed = SCORE_SPEED_BASE + 1 * SCORE_SPEED_LEVEL_MULT;
    const maxScore = 5000 + 3000 + 300 + maxPerfect + maxSpeed + cfg1.memTime * 80 + realisticMaxStreak + maxDiffBonus;
    const stars3 = calculateStars(Math.ceil(maxScore * STAR_THREE_THRESHOLD), 1);
    assertEqual(stars3, 3, '3 stars at threshold');

    const stars2 = calculateStars(Math.ceil(maxScore * STAR_TWO_THRESHOLD), 1);
    assertEqual(stars2, 2, '2 stars at threshold');

    const stars1 = calculateStars(Math.floor(maxScore * 0.3), 1);
    assertEqual(stars1, 1, '1 star below 50% of max');
  });

  suite('calculateScore — Route Revealed Zeroes Score', () => {
    const result = calculateScore(5, 2, 9, 10, 9, 5, 300, { routeRevealed: true, totalCols: 7, fakeChance: 0.5 });
    assertEqual(result.totalScore, 0, 'Total score is 0 when route revealed');
    assertEqual(result.timeScore, 0, 'Time score is 0');
    assertEqual(result.jumpScore, 0, 'Jump score is 0');
    assertEqual(result.levelBonus, 0, 'Level bonus is 0');
    assertEqual(result.perfectBonus, 0, 'Perfect bonus is 0');
    assertEqual(result.speedBonus, 0, 'Speed bonus is 0');
    assertEqual(result.earlyMemBonus, 0, 'Early mem bonus is 0');
    assertEqual(result.streakBonus, 0, 'Streak bonus is 0');
    assertEqual(result.difficultyBonus, 0, 'Difficulty bonus is 0');
    assert(result.routeRevealed === true, 'routeRevealed flag set');
  });

  suite('calculateScore — Difficulty Bonus Scales With Grid', () => {
    // Small easy level
    const small = calculateScore(1, 10, 4, 5, 10, 0, 0, { totalCols: 5, fakeChance: 0.35 });
    // Large hard level
    const large = calculateScore(15, 10, 15, 16, 6, 0, 0, { totalCols: 7, fakeChance: 0.72 });
    assert(large.difficultyBonus > small.difficultyBonus,
      `Large grid diff bonus (${large.difficultyBonus}) > small (${small.difficultyBonus})`);
  });

  suite('calculateScore — Difficulty Bonus Calculation', () => {
    const result = calculateScore(1, 10, 4, 5, 10, 0, 0, { totalCols: 6, fakeChance: 0.5 });
    const expectedDiff = Math.round(6 * 5 * SCORE_DIFFICULTY_MULT * (1 + 0.5))
                       + Math.round(0.5 * SCORE_FAKE_MULT);
    assertEqual(result.difficultyBonus, expectedDiff, 'Difficulty bonus matches formula');
  });

  suite('calculateScore — Perfect Bonus Scales With Level', () => {
    const low = calculateScore(1, 5, 4, 5, 10, 0, 0, { totalCols: 5, fakeChance: 0.35 });
    const high = calculateScore(15, 5, 15, 16, 6, 0, 0, { totalCols: 7, fakeChance: 0.72 });
    assert(high.perfectBonus > low.perfectBonus,
      `Level 15 perfect (${high.perfectBonus}) > Level 1 perfect (${low.perfectBonus})`);
    assertEqual(low.perfectBonus, SCORE_PERFECT_BASE + 1 * SCORE_PERFECT_LEVEL_MULT, 'Level 1 perfect bonus');
    assertEqual(high.perfectBonus, SCORE_PERFECT_BASE + 15 * SCORE_PERFECT_LEVEL_MULT, 'Level 15 perfect bonus');
  });

  suite('calculateScore — Speed Bonus Scales With Level', () => {
    const low = calculateScore(1, 2, 4, 5, 10, 0, 0, { totalCols: 5, fakeChance: 0.35 });
    const high = calculateScore(15, 2, 15, 16, 6, 0, 0, { totalCols: 7, fakeChance: 0.72 });
    assert(high.speedBonus > low.speedBonus,
      `Level 15 speed (${high.speedBonus}) > Level 1 speed (${low.speedBonus})`);
    assertEqual(low.speedBonus, SCORE_SPEED_BASE + 1 * SCORE_SPEED_LEVEL_MULT, 'Level 1 speed bonus');
    assertEqual(high.speedBonus, SCORE_SPEED_BASE + 15 * SCORE_SPEED_LEVEL_MULT, 'Level 15 speed bonus');
  });

  suite('calculateStars — 3 Stars Achievable on Level 15', () => {
    // Simulate an excellent level 15 run: fast (4s), perfect path, good streak
    const result = calculateScore(15, 4, 15, 16, 6, 3, 1500, { totalCols: 7, fakeChance: 0.72 });
    const stars = calculateStars(result.totalScore, 15);
    assertEqual(stars, 3, '3 stars achievable on level 15 with excellent play');
  });

  // ═══════════════════════════════════════════════════════════════
  // BACKWARD COMPATIBILITY
  // ═══════════════════════════════════════════════════════════════
  suite('Backward Compat — Custom Mode No LevelConfig', () => {
    // When levelConfig is null, platforms should use DIFFICULTY_FAKE_CHANCE
    const saved = G.levelConfig;
    G.levelConfig = null;
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    generatePlatforms();

    // Should not crash and platforms should exist
    assertEqual(G.platforms.length, 12, 'Platforms generated without levelConfig');
    G.levelConfig = saved;
  });

  suite('State — New Level Fields', () => {
    assert('level' in G, 'G has level field');
    assert('levelConfig' in G, 'G has levelConfig field');
    assert('gameMode' in G, 'G has gameMode field');
    assert('levelScore' in G, 'G has levelScore field');
    assert('totalScore' in G, 'G has totalScore field');
    assert('levelStars' in G, 'G has levelStars field');
    assert('levelScoreBreakdown' in G, 'G has levelScoreBreakdown field');
    assert('jumpStreak' in G, 'G has jumpStreak field');
    assert('hopsThisRow' in G, 'G has hopsThisRow field');
    assert('streakBonus' in G, 'G has streakBonus field');
    assert('routeRevealed' in G, 'G has routeRevealed field');
  });

  // ═══════════════════════════════════════════════════════════════
  // STREAK MECHANICS TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Streak — Clean Forward Jump Increments Streak', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();
    G.jumpStreak = 0;
    G.hopsThisRow = 0;
    G.streakBonus = 0;

    SceneManager.stack = [];
    SceneManager.stack.push(PlayingScene);

    // No hops before forward landing → streak should increment
    const targetRow = 1;
    const targetCol = G.safePath[1];
    const plat = G.platforms[targetRow][targetCol];
    plat.fake = false;
    plat.destroyed = false;

    // hopsThisRow is 0, so landing should increment streak
    landOnPlatform(plat, targetRow, targetCol);

    assertEqual(G.jumpStreak, 1, 'Streak increments on clean forward landing');
    assertEqual(G.streakBonus, 1 * SCORE_STREAK_MULT, 'Streak bonus accumulates');
    assertEqual(G.hopsThisRow, 0, 'hopsThisRow reset to 0 after forward landing');
  });

  suite('Streak — Hop Before Forward Jump Resets Streak', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();
    G.jumpStreak = 3;
    G.hopsThisRow = 1; // one hop already made
    G.streakBonus = 150;

    SceneManager.stack = [];
    SceneManager.stack.push(PlayingScene);

    const targetRow = 1;
    const targetCol = G.safePath[1];
    const plat = G.platforms[targetRow][targetCol];
    plat.fake = false;
    plat.destroyed = false;

    // hopsThisRow = 1, so streak should reset on forward landing
    landOnPlatform(plat, targetRow, targetCol);

    assertEqual(G.jumpStreak, 0, 'Streak resets when hop was made before forward jump');
    assertEqual(G.hopsThisRow, 0, 'hopsThisRow reset after forward landing');
  });

  suite('Streak — Hop Increments hopsThisRow', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();
    G.hopsThisRow = 0;

    // Force player to middle column
    const midCol = Math.floor(G.gridCols / 2);
    G.player.col = midCol;
    G.player.x = G.platforms[0][midCol].x + G.platforms[0][midCol].w / 2;
    G.player.onPlatform = G.platforms[0][midCol];
    G.jumpAnim.active = false;

    tryJump('right');
    assertEqual(G.hopsThisRow, 1, 'hopsThisRow increments on hop');
  });

  suite('Streak — Consecutive Clean Rows Accumulate Bonus', () => {
    // Simulate 3 consecutive clean forward rows manually
    G.jumpStreak = 0;
    G.streakBonus = 0;
    G.hopsThisRow = 0;

    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    generatePlatforms();
    resetPlayer();

    SceneManager.stack = [];
    SceneManager.stack.push(PlayingScene);

    // 3 consecutive clean landings (row 1, 2, 3)
    for (let r = 1; r <= 3; r++) {
      G.hopsThisRow = 0;
      const col = G.safePath[r];
      const plat = G.platforms[r][col];
      plat.fake = false;
      plat.destroyed = false;
      landOnPlatform(plat, r, col);
    }

    assertEqual(G.jumpStreak, 3, '3 consecutive clean rows = streak 3');
    // Bonus: 1*50 + 2*50 + 3*50 = 300
    assertEqual(G.streakBonus, (1 + 2 + 3) * SCORE_STREAK_MULT, 'Streak bonus triangular accumulation');
  });

  // ═══════════════════════════════════════════════════════════════
  // PLATFORM GENERATION — MAXSHIFT AND DECOY TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Platform Generation — MaxShift Bridge Safety', () => {
    // With maxShift=2, all intermediate columns between prevCol and curCol must be safe
    G.gridCols = 7;
    G.gridRows = 12;
    G.levelConfig = { cols: 7, rows: 12, fake: 0.53, memTime: 8, maxShift: 2, decoys: 0, name: 'Test' };
    G.gridCols = G.levelConfig.cols;
    G.gridRows = G.levelConfig.rows;

    // Run multiple times to catch cases with 2-col shifts
    let bridgeAlwaysSafe = true;
    for (let trial = 0; trial < 10; trial++) {
      generatePlatforms();
      for (let row = 1; row < G.gridRows; row++) {
        const prevCol = G.safePath[row - 1];
        const curCol  = G.safePath[row];
        if (prevCol !== curCol) {
          const lo = Math.min(prevCol, curCol);
          const hi = Math.max(prevCol, curCol);
          for (let c = lo; c <= hi; c++) {
            if (G.platforms[row][c].fake) {
              bridgeAlwaysSafe = false;
            }
          }
        }
      }
    }
    assert(bridgeAlwaysSafe, 'All bridge columns are real (not fake) with maxShift=2');

    G.levelConfig = null;
  });

  suite('Platform Generation — Decoy Paths', () => {
    // With decoys=2, two near-complete columns should exist with exactly one fake each
    G.levelConfig = { cols: 7, rows: 12, fake: 0.64, memTime: 7, maxShift: 2, decoys: 2, name: 'Test' };
    G.gridCols = G.levelConfig.cols;
    G.gridRows = G.levelConfig.rows;

    generatePlatforms();

    const rescueCol = G.safePath[G.gridRows - 1];
    // Count columns that have all-real platforms
    let nearCompleteCount = 0;
    for (let c = 0; c < G.gridCols; c++) {
      if (c === rescueCol) continue;
      const realCount = G.platforms.filter(row => !row[c].fake).length;
      // A decoy column should have gridRows-1 real platforms (one fake)
      if (realCount >= G.gridRows - 1) nearCompleteCount++;
    }
    // We expect at least 1 decoy-like column (safe path col + decoys)
    assert(nearCompleteCount >= 1, 'At least one near-complete decoy column exists');

    G.levelConfig = null;
  });

  suite('Platform Generation — Decoy Does Not Block Safe Path', () => {
    // Safe path must never be blocked by a decoy
    G.levelConfig = { cols: 7, rows: 16, fake: 0.72, memTime: 6, maxShift: 3, decoys: 3, name: 'Test' };
    G.gridCols = G.levelConfig.cols;
    G.gridRows = G.levelConfig.rows;

    for (let trial = 0; trial < 5; trial++) {
      generatePlatforms();
      for (let r = 0; r < G.gridRows; r++) {
        assert(!G.platforms[r][G.safePath[r]].fake,
          `Safe path row ${r} not fake (decoys=3, trial ${trial})`);
      }
      // Bridge platforms must also be safe
      for (let r = 1; r < G.gridRows; r++) {
        const prev = G.safePath[r - 1];
        const cur  = G.safePath[r];
        const lo = Math.min(prev, cur);
        const hi = Math.max(prev, cur);
        for (let c = lo; c <= hi; c++) {
          assert(!G.platforms[r][c].fake,
            `Bridge col ${c} at row ${r} not fake (decoys=3, trial ${trial})`);
        }
      }
    }

    G.levelConfig = null;
  });

  // ═══════════════════════════════════════════════════════════════
  // BACKTRACK PATH GENERATION TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Backtrack — SafeRoute Generated for Backtrack Levels', () => {
    G.levelConfig = { cols: 7, rows: 16, fake: 0.64, memTime: 7, maxShift: 2, decoys: 1, backtracks: 1, decoyFakes: 1, name: 'Test' };
    G.gridCols = G.levelConfig.cols;
    G.gridRows = G.levelConfig.rows;

    generatePlatforms();

    // safeRoute should have more steps than gridRows (extra steps for backtrack)
    assert(G.safeRoute.length > G.gridRows, 'safeRoute has extra steps for backtrack');
    // Should contain at least one backward step
    let hasBackward = false;
    for (let i = 1; i < G.safeRoute.length; i++) {
      if (G.safeRoute[i].row < G.safeRoute[i - 1].row) { hasBackward = true; break; }
    }
    assert(hasBackward, 'safeRoute contains at least one backward step');

    G.levelConfig = null;
  });

  suite('Backtrack — All SafeRoute Platforms Are Real', () => {
    G.levelConfig = { cols: 7, rows: 16, fake: 0.72, memTime: 6, maxShift: 3, decoys: 3, backtracks: 2, decoyFakes: 2, name: 'Test' };
    G.gridCols = G.levelConfig.cols;
    G.gridRows = G.levelConfig.rows;

    for (let trial = 0; trial < 5; trial++) {
      generatePlatforms();
      for (let i = 0; i < G.safeRoute.length; i++) {
        const step = G.safeRoute[i];
        assert(!G.platforms[step.row][step.col].fake,
          `safeRoute step ${i} (row=${step.row}, col=${step.col}) not fake (trial ${trial})`);
      }
    }

    G.levelConfig = null;
  });

  suite('No Backtracks — All SafeRoute Platforms Are Real', () => {
    G.levelConfig = { cols: 5, rows: 8, fake: 0.6, memTime: 10, maxShift: 2, decoys: 0, name: 'Test' };
    G.gridCols = G.levelConfig.cols;
    G.gridRows = G.levelConfig.rows;

    for (let trial = 0; trial < 5; trial++) {
      generatePlatforms();
      for (let i = 0; i < G.safeRoute.length; i++) {
        const step = G.safeRoute[i];
        assert(!G.platforms[step.row][step.col].fake,
          `safeRoute step ${i} (row=${step.row}, col=${step.col}) not fake (trial ${trial})`);
      }
    }

    G.levelConfig = null;
  });

  suite('Backtrack — ExtraSafeCols Are Not Fake', () => {
    G.levelConfig = { cols: 7, rows: 16, fake: 0.68, memTime: 6, maxShift: 3, decoys: 2, backtracks: 1, decoyFakes: 2, name: 'Test' };
    G.gridCols = G.levelConfig.cols;
    G.gridRows = G.levelConfig.rows;

    generatePlatforms();

    for (const rowStr of Object.keys(G.extraSafeCols)) {
      const row = parseInt(rowStr);
      for (const col of G.extraSafeCols[row]) {
        assert(!G.platforms[row][col].fake,
          `extraSafeCols row=${row} col=${col} is not fake`);
      }
    }

    G.levelConfig = null;
  });

  suite('Backtrack — No Backtracks on Early Levels', () => {
    G.levelConfig = { cols: 5, rows: 8, fake: 0.42, memTime: 10, maxShift: 1, decoys: 0, name: 'Test' };
    G.gridCols = G.levelConfig.cols;
    G.gridRows = G.levelConfig.rows;

    generatePlatforms();

    // safeRoute should have at least one entry per row (may have more due to intermediate hops)
    assert(G.safeRoute.length >= G.gridRows, 'safeRoute covers all rows');
    // No backward steps
    let hasBackward = false;
    for (let i = 1; i < G.safeRoute.length; i++) {
      if (G.safeRoute[i].row < G.safeRoute[i - 1].row) { hasBackward = true; break; }
    }
    assert(!hasBackward, 'No backward steps on early level');
    // First entry is at row 0; last entry is at the final row's safe column
    assertEqual(G.safeRoute[0].row, 0, 'safeRoute starts at row 0');
    assertEqual(G.safeRoute[G.safeRoute.length - 1].row, G.gridRows - 1, 'safeRoute ends at last row');
    assertEqual(G.safeRoute[G.safeRoute.length - 1].col, G.safePath[G.gridRows - 1], 'safeRoute ends at safe column');
    // Every consecutive pair must be a legal move: hop (same row ±1 col) or forward jump (next row, same col)
    let illegalMove = false;
    for (let i = 1; i < G.safeRoute.length; i++) {
      const prev = G.safeRoute[i - 1], cur = G.safeRoute[i];
      const rowDiff = cur.row - prev.row;
      const colDiff = Math.abs(cur.col - prev.col);
      const isHop = rowDiff === 0 && colDiff === 1;
      const isForwardJump = rowDiff === 1 && colDiff === 0;
      if (!isHop && !isForwardJump) { illegalMove = true; break; }
    }
    assert(!illegalMove, 'All safeRoute moves are legal (hop ±1 or forward jump same col)');

    G.levelConfig = null;
  });

  // ═══════════════════════════════════════════════════════════════
  // BACKWARD JUMP TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Backward Jump — Cannot Jump Past Row 0', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    G.levelConfig = null;
    generatePlatforms();
    resetPlayer();
    G.jumpAnim.active = false;

    // Player starts at row 0
    assertEqual(G.player.row, 0, 'Player starts at row 0');
    const jumpsBefore = G.jumpCount;
    tryJump('backward');
    // Should not jump (no row -1)
    assertEqual(G.jumpCount, jumpsBefore, 'No jump when at row 0');
    assert(!G.jumpAnim.active, 'No jump animation started');
  });

  suite('Backward Jump — Jumps to Previous Row', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    G.levelConfig = null;
    generatePlatforms();
    resetPlayer();

    SceneManager.stack = [];
    SceneManager.stack.push(PlayingScene);

    // Move player to row 1 first
    const row1Col = G.safePath[1];
    const row1Plat = G.platforms[1][row1Col];
    row1Plat.fake = false;
    row1Plat.destroyed = false;
    G.player.row = 1;
    G.player.col = row1Col;
    G.player.x = row1Plat.x + row1Plat.w / 2;
    G.player.y = row1Plat.y - PLAYER_Y_OFFSET;
    G.player.onPlatform = row1Plat;
    G.jumpAnim.active = false;

    tryJump('backward');
    assert(G.jumpAnim.active, 'Backward jump animation started');
    assertEqual(G.jumpAnim.targetRow, 0, 'Target row is 0 (backward)');
  });

  suite('Backward Jump — Resets Streak', () => {
    G.gridCols = 6;
    G.gridRows = 12;
    G.difficulty = 'easy';
    G.gameState = 'playing';
    G.levelConfig = null;
    generatePlatforms();
    resetPlayer();
    G.jumpStreak = 5;
    G.hopsThisRow = 0;

    SceneManager.stack = [];
    SceneManager.stack.push(PlayingScene);

    // Move player to row 2
    G.player.row = 2;
    G.player.col = G.safePath[2];
    const plat2 = G.platforms[2][G.safePath[2]];
    G.player.x = plat2.x + plat2.w / 2;
    G.player.y = plat2.y - PLAYER_Y_OFFSET;
    G.player.onPlatform = plat2;

    // Land on row 1 (backward)
    const backCol = G.safePath[1] === G.safePath[2] ? (G.safePath[1] + 1) % G.gridCols : G.safePath[1];
    const backPlat = G.platforms[1][backCol];
    backPlat.fake = false;
    backPlat.destroyed = false;
    landOnPlatform(backPlat, 1, backCol);

    assertEqual(G.jumpStreak, 0, 'Streak resets on backward landing');
  });

  // ═══════════════════════════════════════════════════════════════
  // DECOY FAKES SCALING TEST
  // ═══════════════════════════════════════════════════════════════
  suite('Decoy Fakes — Multiple Fakes Per Decoy Column', () => {
    G.levelConfig = { cols: 7, rows: 16, fake: 0.72, memTime: 6, maxShift: 3, decoys: 2, backtracks: 0, decoyFakes: 3, name: 'Test' };
    G.gridCols = G.levelConfig.cols;
    G.gridRows = G.levelConfig.rows;

    // Run a few times and check that at least one decoy has >1 fake
    let foundMultiFake = false;
    for (let trial = 0; trial < 10; trial++) {
      generatePlatforms();
      const rescueCol = G.safePath[G.gridRows - 1];
      for (let c = 0; c < G.gridCols; c++) {
        if (c === rescueCol) continue;
        // Count fakes in this column
        let fakes = 0;
        let reals = 0;
        for (let r = 0; r < G.gridRows; r++) {
          if (G.platforms[r][c].fake) fakes++;
          else reals++;
        }
        // A decoy column with multiple fakes: mostly real but 2+ fakes
        if (reals >= G.gridRows - 4 && fakes >= 2) { foundMultiFake = true; break; }
      }
      if (foundMultiFake) break;
    }
    assert(foundMultiFake, 'At least one decoy column has multiple fakes with decoyFakes=3');

    G.levelConfig = null;
  });

  // ═══════════════════════════════════════════════════════════════
  // LAST ROW LOCKDOWN — MIN 3 REAL TEST
  // ═══════════════════════════════════════════════════════════════
  suite('Last Row Lockdown — At Least 3 Real Platforms', () => {
    G.levelConfig = { cols: 7, rows: 16, fake: 0.72, memTime: 6, maxShift: 3, decoys: 0, name: 'Test' };
    G.gridCols = G.levelConfig.cols;
    G.gridRows = G.levelConfig.rows;

    for (let trial = 0; trial < 10; trial++) {
      generatePlatforms();
      const lastRow = G.platforms[G.gridRows - 1];
      let realCount = 0;
      for (let c = 0; c < G.gridCols; c++) {
        if (!lastRow[c].fake) realCount++;
      }
      assert(realCount >= 3, `Last row has at least 3 real platforms (got ${realCount}, trial ${trial})`);
    }

    G.levelConfig = null;
  });

  // ═══════════════════════════════════════════════════════════════
  // NO STRAIGHT-DOWN COLUMN EXPLOIT TEST
  // ═══════════════════════════════════════════════════════════════
  suite('No Straight-Down Column — Anti-Exploit', () => {
    const configs = [
      { cols: 5, rows: 5, fake: 0.35, memTime: 10, maxShift: 1, decoys: 0, name: 'Test Easy' },
      { cols: 5, rows: 8, fake: 0.42, memTime: 10, maxShift: 1, decoys: 0, name: 'Test Med' },
      { cols: 7, rows: 16, fake: 0.72, memTime: 6, maxShift: 3, decoys: 3, backtracks: 2, decoyFakes: 2, name: 'Test Hard' },
    ];

    let violation = null;
    for (const cfg of configs) {
      G.levelConfig = cfg;
      G.gridCols = cfg.cols;
      G.gridRows = cfg.rows;
      for (let trial = 0; trial < 20; trial++) {
        generatePlatforms();
        for (let c = 0; c < G.gridCols; c++) {
          let allReal = true;
          for (let r = 0; r < G.gridRows; r++) {
            if (G.platforms[r][c].fake) { allReal = false; break; }
          }
          if (allReal) {
            violation = `${cfg.cols}x${cfg.rows} trial ${trial}: column ${c} is all-real`;
            break;
          }
        }
        if (violation) break;
      }
      if (violation) break;
    }
    assert(violation === null,
      violation ? `Straight-down exploit: ${violation}` : 'No column is all-real across all rows (60 trials)');

    G.levelConfig = null;
  });

  // ═══════════════════════════════════════════════════════════════
  // CENTER-BIASED START TEST
  // ═══════════════════════════════════════════════════════════════
  suite('Center-Biased Start — Distribution Skews Center', () => {
    G.levelConfig = null;
    G.gridCols = 7;
    G.gridRows = 8;
    G.difficulty = 'easy';

    const counts = new Array(7).fill(0);
    for (let trial = 0; trial < 200; trial++) {
      generatePlatforms();
      counts[G.safePath[0]]++;
    }
    // Center columns (2,3,4) should have more starts than edges (0,6)
    const centerTotal = counts[2] + counts[3] + counts[4];
    const edgeTotal = counts[0] + counts[6];
    assert(centerTotal > edgeTotal, `Center starts (${centerTotal}) > edge starts (${edgeTotal})`);
  });

  // ═══════════════════════════════════════════════════════════════
  // STATE FIELDS — NEW FIELDS
  // ═══════════════════════════════════════════════════════════════
  suite('State — Backtrack Fields', () => {
    assert('safeRoute' in G, 'G has safeRoute field');
    assert('extraSafeCols' in G, 'G has extraSafeCols field');
  });

  // ═══════════════════════════════════════════════════════════════
  // PARTICLE CAP TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Particle Cap — MAX_PARTICLES Enforced', () => {
    G.particles = [];
    G.gridCols = 6;
    G.gridRows = 12;
    generatePlatforms();
    const plat = G.platforms[0][0];

    // Spam particles well beyond the cap
    for (let i = 0; i < 40; i++) {
      spawnFirework(100, 100);
    }
    assert(G.particles.length <= MAX_PARTICLES,
      'Particles capped at MAX_PARTICLES (' + G.particles.length + ' <= ' + MAX_PARTICLES + ')');
    G.particles = [];
  });

  suite('pushParticle — Respects Cap', () => {
    G.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      G.particles.push({ x: 0, y: 0, vx: 0, vy: 0, size: 1, color: '#fff', life: 1 });
    }
    assertEqual(G.particles.length, MAX_PARTICLES, 'Array at cap');

    pushParticle({ x: 0, y: 0, vx: 0, vy: 0, size: 1, color: '#fff', life: 1 });
    assertEqual(G.particles.length, MAX_PARTICLES, 'pushParticle rejects when at cap');
    G.particles = [];
  });

  // ═══════════════════════════════════════════════════════════════
  // VISIBILITY CHANGE / LOOP PAUSE TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Loop Pause Variable', () => {
    assertEqual(typeof _loopPaused, 'boolean', '_loopPaused variable exists');
    assertEqual(_loopPaused, false, '_loopPaused defaults to false');
  });

  // ═══════════════════════════════════════════════════════════════
  // AUDIO CONTEXT RESUME TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Audio — initAudio Does Not Crash Twice', () => {
    const savedCtx = G.audioCtx;
    G.audioCtx = null;

    let threw = false;
    try {
      initAudio();
      initAudio(); // second call should be safe
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'Calling initAudio twice does not throw');

    G.audioCtx = savedCtx;
  });

  // ═══════════════════════════════════════════════════════════════
  // INIT ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════
  suite('Canvas Init — Canvas and Context Present', () => {
    assert(G.canvas !== null, 'G.canvas is not null after init');
    assert(G.ctx !== null, 'G.ctx is not null after init');
    assertEqual(G.canvas.width, CANVAS_W, 'Canvas width matches CANVAS_W');
    assertEqual(G.canvas.height, CANVAS_H, 'Canvas height matches CANVAS_H');
  });

  // ═══════════════════════════════════════════════════════════════
  // MAX_PARTICLES CONFIG
  // ═══════════════════════════════════════════════════════════════
  suite('Config — MAX_PARTICLES', () => {
    assertEqual(typeof MAX_PARTICLES, 'number', 'MAX_PARTICLES is a number');
    assert(MAX_PARTICLES > 0, 'MAX_PARTICLES is positive');
    assert(MAX_PARTICLES <= 1000, 'MAX_PARTICLES is reasonable (<=1000)');
  });

  // ═══════════════════════════════════════════════════════════════
  // LEVEL DIFFICULTY BALANCE TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Level Difficulty — Monotonic Progression', () => {
    // fake chance should never decrease between consecutive levels
    for (let i = 1; i < LEVELS.length; i++) {
      assert(LEVELS[i].fake >= LEVELS[i - 1].fake,
        `Level ${i + 1} fake (${LEVELS[i].fake}) >= level ${i} fake (${LEVELS[i - 1].fake})`);
    }
    // grid area (cols*rows) should never decrease
    for (let i = 1; i < LEVELS.length; i++) {
      const areaPrev = LEVELS[i - 1].cols * LEVELS[i - 1].rows;
      const areaCur = LEVELS[i].cols * LEVELS[i].rows;
      assert(areaCur >= areaPrev,
        `Level ${i + 1} area (${areaCur}) >= level ${i} area (${areaPrev})`);
    }
    // memTime should never increase
    for (let i = 1; i < LEVELS.length; i++) {
      assert(LEVELS[i].memTime <= LEVELS[i - 1].memTime,
        `Level ${i + 1} memTime (${LEVELS[i].memTime}) <= level ${i} memTime (${LEVELS[i - 1].memTime})`);
    }
  });

  suite('Level Difficulty — No Excessive Fake Jumps', () => {
    // Between consecutive levels, fake chance should not jump by more than 0.06
    const maxFakeJump = 0.06;
    for (let i = 1; i < LEVELS.length; i++) {
      const jump = LEVELS[i].fake - LEVELS[i - 1].fake;
      assert(jump <= maxFakeJump + 0.001,
        `Level ${i}→${i + 1} fake jump (${jump.toFixed(3)}) <= ${maxFakeJump}`);
    }
  });

  suite('Level Difficulty — Endless Scaling Continuity', () => {
    // Level 16 (first endless) should be close to level 15 in difficulty
    const last = LEVELS[LEVELS.length - 1];
    const endless1 = getLevelConfig(LEVELS.length + 1);
    assert(endless1.fake >= last.fake, 'Endless level 16 fake >= level 15 fake');
    assert(endless1.fake - last.fake <= 0.05, 'Endless level 16 fake within 0.05 of level 15');
    assert(endless1.rows >= last.rows, 'Endless level 16 rows >= level 15 rows');
    assert(endless1.memTime <= last.memTime, 'Endless level 16 memTime <= level 15');
  });

  suite('Level Difficulty — BOARD_RULES Has Column Spread', () => {
    assertEqual(typeof BOARD_RULES.minColumnSpreadFraction, 'number',
      'minColumnSpreadFraction is defined');
    assertInRange(BOARD_RULES.minColumnSpreadFraction, 0.3, 1.0,
      'minColumnSpreadFraction between 0.3 and 1.0');
  });

  // ═══════════════════════════════════════════════════════════════
  // STATISTICAL BOARD GENERATION TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Statistical — Column Spread (50 trials per level tier)', () => {
    const tiers = [
      { cols: 5, rows: 8,  maxShift: 1, label: '5-col tier' },
      { cols: 6, rows: 12, maxShift: 2, label: '6-col tier' },
      { cols: 7, rows: 16, maxShift: 2, label: '7-col tier' },
    ];
    const trials = 50;
    const minSpreadFrac = BOARD_RULES.minColumnSpreadFraction;

    for (const tier of tiers) {
      let violations = 0;
      for (let t = 0; t < trials; t++) {
        G.gridCols = tier.cols;
        G.gridRows = tier.rows;
        G.difficulty = 'medium';
        G.levelConfig = { fake: 0.5, maxShift: tier.maxShift };
        generatePlatforms();
        const uniqueCols = new Set(G.safePath).size;
        const minCols = Math.max(2, Math.ceil(tier.cols * minSpreadFrac));
        if (uniqueCols < minCols) violations++;
      }
      assert(violations === 0,
        `${tier.label}: all ${trials} boards hit min column spread (${violations} violations)`);
    }
  });

  suite('Statistical — Lateral Move Fraction (50 trials per level tier)', () => {
    const tiers = [
      { cols: 5, rows: 8,  maxShift: 1, label: '5-col tier' },
      { cols: 6, rows: 12, maxShift: 2, label: '6-col tier' },
      { cols: 7, rows: 16, maxShift: 2, label: '7-col tier' },
    ];
    const trials = 50;

    for (const tier of tiers) {
      let violations = 0;
      for (let t = 0; t < trials; t++) {
        G.gridCols = tier.cols;
        G.gridRows = tier.rows;
        G.difficulty = 'medium';
        G.levelConfig = { fake: 0.5, maxShift: tier.maxShift };
        generatePlatforms();
        const lateralMoves = G.safePath.reduce(
          (n, col, i) => n + (i > 0 && col !== G.safePath[i - 1] ? 1 : 0), 0);
        const minMoves = Math.max(2, Math.floor(tier.rows * BOARD_RULES.minLateralMoveFraction));
        if (lateralMoves < minMoves) violations++;
      }
      assert(violations === 0,
        `${tier.label}: all ${trials} boards hit min lateral fraction (${violations} violations)`);
    }
  });

  suite('Statistical — Fake Density Within Tolerance (50 trials)', () => {
    // Generate boards at different fake chances and verify actual fake % is reasonable
    const configs = [
      { fake: 0.35, cols: 5, rows: 8,  label: 'low fake (0.35)' },
      { fake: 0.55, cols: 7, rows: 14, label: 'mid fake (0.55)' },
      { fake: 0.72, cols: 7, rows: 16, label: 'high fake (0.72)' },
    ];
    const trials = 50;
    const tolerance = 0.20; // actual fake % should be within ±20% of target

    for (const cfg of configs) {
      let totalFakeFrac = 0;
      for (let t = 0; t < trials; t++) {
        G.gridCols = cfg.cols;
        G.gridRows = cfg.rows;
        G.difficulty = 'medium';
        G.levelConfig = { fake: cfg.fake, maxShift: 2 };
        generatePlatforms();
        let totalNonPath = 0, fakeCount = 0;
        for (let r = 0; r < G.gridRows; r++) {
          for (let c = 0; c < G.gridCols; c++) {
            if (c === G.safePath[r]) continue;
            totalNonPath++;
            if (G.platforms[r][c].fake) fakeCount++;
          }
        }
        if (totalNonPath > 0) totalFakeFrac += fakeCount / totalNonPath;
      }
      const avgFakeFrac = totalFakeFrac / trials;
      assertInRange(avgFakeFrac, cfg.fake - tolerance, cfg.fake + tolerance,
        `${cfg.label}: avg fake fraction ${avgFakeFrac.toFixed(3)} near target`);
    }
  });

  suite('Statistical — Adventure Levels Generate Valid Boards (10 trials each)', () => {
    const trials = 10;
    for (let lvl = 1; lvl <= LEVELS.length; lvl++) {
      const cfg = getLevelConfig(lvl);
      let failures = 0;
      for (let t = 0; t < trials; t++) {
        G.gridCols = cfg.cols;
        G.gridRows = cfg.rows;
        G.levelConfig = cfg;
        generatePlatforms();
        // Verify safe path is never fake
        for (let r = 0; r < G.gridRows; r++) {
          if (G.platforms[r][G.safePath[r]].fake) { failures++; break; }
        }
      }
      assert(failures === 0,
        `Level ${lvl} (${cfg.name}): all ${trials} boards have valid safe path`);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // I18N / TRANSLATION TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('i18n — Translation System', () => {
    const origLang = G.language;

    // t() returns English by default
    G.language = 'en';
    assertEqual(t('menu.title'), 'LAVA LAND', 't() returns English menu title');
    assertEqual(t('rescue.help'), 'Help!', 't() returns English rescue.help');

    // t() returns Norwegian when language is set
    G.language = 'no';
    assertEqual(t('menu.title'), 'LAVALAND', 't() returns Norwegian menu title');
    assertEqual(t('rescue.help'), 'Hjelp!', 't() returns Norwegian rescue.help');

    // t() falls back to English for missing keys
    G.language = 'no';
    assertEqual(t('nonexistent.key'), 'nonexistent.key', 't() returns key for missing translation');

    // t() with parameter substitution
    G.language = 'en';
    assertEqual(t('win.saved', { hero: 'Cat', rescue: 'Dog' }), 'Cat saved Dog!', 't() substitutes params');

    // Norwegian param substitution
    G.language = 'no';
    assertEqual(t('win.saved', { hero: 'Katt', rescue: 'Hund' }), 'Katt reddet Hund!', 't() substitutes params in Norwegian');

    // SPEECH_LANG mapping
    assertEqual(SPEECH_LANG.en, 'en-US', 'SPEECH_LANG.en is en-US');
    assertEqual(SPEECH_LANG.no, 'nb-NO', 'SPEECH_LANG.no is nb-NO');

    // Character name translations exist
    G.language = 'no';
    assertEqual(t('char.Cat'), 'Katt', 'Norwegian Cat translation');
    assertEqual(t('char.Wizard'), 'Trollmann', 'Norwegian Wizard translation');

    G.language = origLang;
  });

  // ═══════════════════════════════════════════════════════════════
  // THEME PALETTE TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Theme Palettes', () => {
    const origTheme = G.theme;

    // palette() returns volcano by default
    G.theme = 'volcano';
    const vp = palette();
    assertEqual(vp.safeGlow, '#44ff88', 'Volcano safeGlow is green');
    assert(Array.isArray(vp.explosionColors), 'Volcano has explosionColors array');
    assertEqual(vp.explosionColors.length, 5, 'Volcano has 5 explosion colors');

    // palette() returns ocean palette
    G.theme = 'ocean';
    const op = palette();
    assertEqual(op.safeGlow, '#44ffcc', 'Ocean safeGlow is teal');
    assertEqual(op.cssClass, 'theme-ocean', 'Ocean cssClass is correct');
    assert(op.lavaBaseR < 20, 'Ocean lavaBaseR is low (blue theme)');

    // palette() returns forest palette
    G.theme = 'forest';
    const fp = palette();
    assertEqual(fp.safeGlow, '#88ff44', 'Forest safeGlow is lime');
    assertEqual(fp.cssClass, 'theme-forest', 'Forest cssClass is correct');

    // palette() falls back to volcano for unknown theme
    G.theme = 'unknown';
    const up = palette();
    assertEqual(up.safeGlow, '#44ff88', 'Unknown theme falls back to volcano');

    // All three palettes have required keys
    ['volcano', 'ocean', 'forest'].forEach(theme => {
      G.theme = theme;
      const p = palette();
      assert(typeof p.lavaBaseR === 'number', theme + ' has lavaBaseR');
      assert(typeof p.platDepthTop === 'string', theme + ' has platDepthTop');
      assert(typeof p.trailOuter === 'string', theme + ' has trailOuter');
      assert(typeof p.impactRingColor === 'string', theme + ' has impactRingColor');
      assert(Array.isArray(p.dustColors), theme + ' has dustColors array');
      assert(Array.isArray(p.lavaSplashColors), theme + ' has lavaSplashColors array');
    });

    G.theme = origTheme;
  });

  // ═══════════════════════════════════════════════════════════════
  // SOUNDTRACK DISPATCH TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Soundtrack Dispatch', () => {
    // Verify dispatch functions exist
    assertEqual(typeof playRetroMemorize, 'function', 'playRetroMemorize exists');
    assertEqual(typeof playRetroAction, 'function', 'playRetroAction exists');
    assertEqual(typeof playChillMemorize, 'function', 'playChillMemorize exists');
    assertEqual(typeof playChillAction, 'function', 'playChillAction exists');
    assertEqual(typeof playClassicMemorize, 'function', 'playClassicMemorize exists');
    assertEqual(typeof playClassicAction, 'function', 'playClassicAction exists');
    // Dispatcher functions exist
    assertEqual(typeof playMemorizeMusic, 'function', 'playMemorizeMusic dispatcher exists');
    assertEqual(typeof playActionMusic, 'function', 'playActionMusic dispatcher exists');
  });

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS STATE TESTS
  // ═══════════════════════════════════════════════════════════════
  suite('Settings State Fields', () => {
    // New state fields exist with correct defaults
    assert('language' in G, 'G.language exists');
    assert('soundtrack' in G, 'G.soundtrack exists');
    assert('theme' in G, 'G.theme exists');
    assert(['en', 'no'].includes(G.language), 'G.language is valid');
    assert(['classic', 'retro', 'chill'].includes(G.soundtrack), 'G.soundtrack is valid');
    assert(['volcano', 'ocean', 'forest'].includes(G.theme), 'G.theme is valid');
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
