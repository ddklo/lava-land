# Lava Land - Architecture Document

## Overview

Lava Land is a browser-based memory-platformer. The player memorizes a grid of platforms (some real, some fake), then navigates across them jumping over animated lava to rescue a chosen character. Built with vanilla JavaScript, HTML5 Canvas, and Web Audio API -- no build tools, no frameworks, works on `file://`.

---

## File Structure

```
lava-land/
  index.html              HTML markup + <link> + 14 <script> tags
  css/
    theme.css             CSS custom properties (colors, fonts) — the design token file
    style.css             All CSS (responsive, mobile-friendly), uses theme.css variables
  images/
    background.svg        Volcanic cave background (referenced by style.css)
  js/
    config.js             Constants, physics tuning, CHARACTERS, LEVELS, getLevelConfig(), scoring constants
    state.js              Shared mutable state object (G)
    timers.js             Managed timer system (replaces setTimeout in game logic)
    audio.js              Procedural music generators + sound effects (with error guards)
    platforms.js          Grid generation + safe-path algorithm
    player.js             resetPlayer()
    drawing.js            Canvas draw functions (render-only) + particle update/render
    effects.js            All particle spawners (dust, explosions, lava, fireworks, confetti)
    scenes.js             SceneManager + 5 scene objects (pushdown automaton)
    logic.js              Jump + landing game rules
    input.js              Keyboard + touch event listeners
    loop.js               Fixed-timestep game loop
    menu.js               Menu/settings UI setup + startGame
    init.js               Bootstrap (canvas setup, starts loop)
  tests/
    test.html             Test runner HTML (opens in browser)
    tests.js              Test suite (config, state, platforms, logic, scenes, timers)
  docs/
    architecture.md       This file
    rules.md              Game rules documentation
  CLAUDE.md               Project quick reference
```

### Script Load Order

```
config -> state -> timers -> audio -> platforms -> player ->
drawing -> effects -> scenes -> logic -> input -> loop -> menu -> init
```

Only `init.js` executes code at parse time. All other files define functions/objects only.

---

## Core Architecture Patterns

### 1. Fixed Timestep Game Loop (loop.js)

Physics and logic update at a fixed 60 Hz rate via an accumulator. Rendering happens once per `requestAnimationFrame`. This guarantees deterministic physics regardless of display refresh rate.

```
TICK = 1/60

gameLoop(timestamp):
  frameDt = clamp(timestamp - lastTime, 0, 0.1)
  accumulator += frameDt
  while accumulator >= TICK:
    SceneManager.update(TICK)     // fixed-rate logic
    accumulator -= TICK
  SceneManager.render()            // variable-rate rendering
```

### 2. Scene Manager (scenes.js) -- Pushdown Automaton

Each game state is a scene object with `onEnter()`, `onExit()`, `update(dt)`, and `render()`. The `SceneManager` maintains a stack and delegates the loop's update/render calls to the current scene.

```javascript
SceneManager.push(scene)     // push onto stack, call onEnter
SceneManager.pop()           // pop + onExit, resume previous
SceneManager.replace(scene)  // swap current scene
```

**Scenes defined:** `MenuScene`, `MemorizeScene`, `PlayingScene`, `FallingScene`, `WonScene`

Each scene sets `G.gameState` in its `onEnter()` for backward compatibility with functions like `drawPlayer()` and `input.js` that check it.

### 3. Update/Render Separation

All state mutation happens in `update(dt)`. All drawing happens in `render()` as read-only operations.

- `updateParticles(dt)` -- advances particle physics (drawing.js)
- `updateCrumbleTimers(dt)` -- advances platform crumble state (scenes.js)
- `updatePlatformBob(dt)` -- damped spring animation (scenes.js)
- `updateTrailMarks(dt)` -- trail mark fade (drawing.js)
- `drawParticles()` -- renders particles without mutation (drawing.js)
- `drawLava()` -- reads `G.lavaTime` but never writes it

### 4. Managed Timers (timers.js)

Game logic timers (crumble delays, fall-to-lose transitions, firework scheduling) are managed inside the fixed-timestep update loop instead of using `setTimeout`/`setInterval`. This makes them:
- **Pausable** -- timers only tick when `update()` runs
- **Cancellable** -- `clearTimers()` on scene exit prevents stale callbacks
- **Deterministic** -- tied to game time, not wall-clock time

```javascript
addTimer(delay, callback)  // schedule callback after delay seconds
updateTimers(dt)           // tick all timers, fire expired ones
clearTimers()              // cancel all pending timers
```

### 5. Named Constants (config.js)

All physics tuning values, dimensions, and magic numbers are defined as named constants:

| Constant | Value | Purpose |
|----------|-------|---------|
| `JUMP_ARC_HEIGHT` | -70 | Parabolic jump height |
| `JUMP_SPEED` | 3 | Jump animation speed multiplier |
| `SPRING_STIFFNESS` | 280 | Platform bob spring constant |
| `SPRING_DAMPING` | 14 | Platform bob damping |
| `CAMERA_SMOOTHING` | 0.08 | Camera follow smoothing factor |
| `TRAIL_FADE_RATE` | 0.12 | Trail mark fade speed |
| `PLAT_DEPTH` | 7 | 3D platform depth face height |
| `EMOJI_SIZE` | 48 | Character emoji font size |
| `SCORE_TIME_BASE` | 5000 | Base time score |
| `SCORE_TIME_PENALTY` | 50 | Points lost per second |
| `SCORE_JUMP_BASE` | 3000 | Base jump efficiency score |
| `SCORE_JUMP_PENALTY` | 100 | Points lost per excess jump |
| `SCORE_LEVEL_MULT` | 200 | Points per level number |
| `SCORE_PERFECT_BONUS` | 1000 | Bonus for zero excess jumps |
| `SCORE_SPEED_BONUS` | 500 | Bonus for fast completion |
| `BOARD_RULES.maxConsecutiveStraight` | 1 | Max consecutive straight-down rows |
| `BOARD_RULES.maxConsecutiveSameDirection` | 5 | Max consecutive same lateral direction |
| `BOARD_RULES.minLateralMoveFraction` | 0.4 | Min fraction of rows with lateral moves |

### 6. Audio Error Handling (audio.js)

All audio functions are guarded with `hasAudio()` checks after `initAudio()`. The `initAudio()` function wraps `AudioContext` creation in a try-catch, so the game runs silently on browsers that don't support Web Audio.

---

## Shared State Model

All mutable state lives in a single global object `G` defined in `state.js`. Constants live as plain `const` globals in `config.js`. Functions are top-level globals.

### State Categories within G

| Category | Fields | Mutated by |
|----------|--------|------------|
| Settings | `gridCols`, `gridRows`, `difficulty`, `selectedSize`, `selectedMemTime` | menu.js |
| Mode/Level | `gameMode`, `level`, `levelConfig`, `levelScore`, `totalScore`, `levelStars`, `levelScoreBreakdown` | menu.js, WonScene |
| Audio | `audioCtx`, `musicGain`, `currentMusic`, `musicTimerId` | audio.js |
| Canvas | `canvas`, `ctx` | init.js (write-once) |
| Selections | `heroChoice`, `rescueChoice`, `heroChar`, `rescueChar` | menu.js (startGame caches lookups) |
| Game mode | `gameState` | scenes (set in onEnter) |
| Entities | `platforms`, `player`, `safePath`, `safeRoute`, `extraSafeCols` | platforms.js, player.js, logic.js |
| Camera | `camera` | player.js, PlayingScene |
| Effects | `particles`, `lavaTime`, `shakeTimer`, `fallY`, `trailMarks` | scenes, drawing.js |
| Animation | `jumpAnim` | logic.js, PlayingScene |
| Win/Play | `winTimer`, `playTimer` | WonScene, PlayingScene |
| Transitions | `transition` | drawing.js (updateTransition, transitionTo) |
| Tutorial | `tutorialShown`, `tutorialActive` | logic.js, PlayingScene |
| Streak | `streak`, `streakPopups` | logic.js, PlayingScene |
| Level Preview | `levelPreview` | MemorizeScene |
| Timers | `timers` | timers.js |
| Input | `keys`, `isTouchDevice` | input.js |
| Loop | `lastTime`, `accumulator` | loop.js |

---

## Game State Machine

```
          +------------+
          |  MenuScene  |<-----------------------+
          +-----+------+                         |
                | adventure / custom             | back-to-menu
                v                                |
          +--------------+            +----------+-----+
     +--->|MemorizeScene  |           |   WonScene      |
     |    +------+-------+           | (score + stars)  |
     |           | timer expires     +--+----------^----+
     |           v                      |          |
     |    +--------------+              |next      |
     |    | PlayingScene  |----win------+level     |
     |    +------+-------+                        |
     |           | land on fake / destroyed        |
     |           v                                 |
     |    +--------------+                         |
     +----| FallingScene  |  (retry restarts level)|
          +--------------+-------------------------+
```

**Two game modes:**
- **Adventure Mode**: levels progress via `startLevel()` / `advanceLevel()`, score accumulates
- **Custom Mode**: manual settings, no levels/scoring, uses `startGame()`

Most transitions use `transitionTo()` for smooth fades (menu↔memorize, retry, next level, return to menu). Instant transitions use `SceneManager.replace()` directly (memorize→playing, playing→falling, playing→won). Each scene's `onExit()` calls `clearTimers()`.

---

## Function Map

### timers.js (3 functions)
- `addTimer(delay, callback)` - Schedule callback after delay seconds
- `updateTimers(dt)` - Tick all timers, fire expired ones
- `clearTimers()` - Cancel all pending timers

### audio.js (17 functions)
- `initAudio()` - Lazy-create AudioContext (with try-catch)
- `hasAudio()` - Guard: returns true if AudioContext is available
- `stopMusic()` - Fade out + disconnect current music
- `playMemorizeMusic()` - Procedural tense chord loop + ticking clock
- `playActionMusic()` - Procedural 80s synth-funk 4-bar loops
- `playJumpSound()` / `playHopSound()` - Jump SFX
- `playLandSound()` / `playCrumbleSound()` / `playFallSound()` - Impact SFX
- `playWinSound()` - 10-second procedural victory fanfare
- `playLoseSound()` - Sad descending trombone
- `getEnglishVoice()` - Cached English voice lookup for speech synthesis
- `speakText(text, rate, pitch)` - Shared speech helper with English voice selection
- `speakCongrats()` / `speakLose()` - Speech synthesis (via speakText)

### platforms.js (3 functions)
- `applyMaxConsecutiveDirectionRule(safePath, gridCols)` - Enforce max consecutive same-direction moves on a path
- `insertBacktracks(safePath, gridCols, gridRows, numBacktracks)` - Insert backward-jump sections into the safe path for late-level difficulty
- `generatePlatforms()` - Create grid, build safe path (applying BOARD_RULES), insert backtracks, mark fakes

### player.js (1 function)
- `resetPlayer()` - Place player on first safe platform, reset camera

### drawing.js (19 functions)
- `drawEmoji(ctx, emoji, x, y, size)` - Shared emoji renderer with shadow pass
- `drawLava(offsetY, height)` - 7-layer animated lava background
- `drawPlatform(p, reveal)` - 3D stone block with brick texture + glow (memorize) + heat (lava proximity)
- `drawPlayer()` - Player emoji with squash/stretch and shadow
- `drawRescueCharacter()` - Floating rescue target with SOS rings, sparkles, and "Help!"
- `updateParticles(dt)` / `drawParticles()` - Particle physics and rendering
- `updateTrailMarks(dt)` / `drawTrailMarks()` - Trail breadcrumb system
- `drawRouteSteps()` - Draw numbered step markers and arrows on safeRoute during memorize (only when backtracks exist)
- `formatTime(seconds)` - Timer display formatter
- `updateTransition(dt)` / `drawTransition()` / `transitionTo(scene)` - Scene fade transition system
- `updateStreakPopups(dt)` / `drawStreakPopups()` - Combo streak counter display
- `drawUrgencyVignette(intensity)` - Red vignette pulse for memorize countdown
- `drawLevelPreview()` - Level name/info card overlay
- `drawTutorialArrow()` - Pulsing arrow pointing at first safe platform

### effects.js (7 functions)
- `spawnPlatformExplosion(plat)` - 18 stone debris particles on departure
- `spawnLandDust(plat)` - Radial dust cloud on landing
- `spawnCrumbleParticles(plat)` - Debris when fake platform breaks
- `spawnLavaSplash(x, y)` - Lava particles on fall
- `spawnJumpTrail(x, y)` - 2 glowing trail particles during jump arc
- `spawnFirework(x, y)` - Burst of 30 radial particles
- `spawnConfetti()` - 40 falling confetti particles

### scenes.js (SceneManager + 5 scenes + 5 helpers)
- `SceneManager` - push/pop/replace + update/render delegation
- `MenuScene` - Lava background, shows menu HTML overlay, resets parallax
- `MemorizeScene` - Zoom-out view, countdown, level preview card, urgency vignette, progress dots
- `PlayingScene` - Gameplay: jump animation, camera, platform bob, trail, HUD, jump trail particles, streak popups, tutorial arrow, parallax
- `FallingScene` - Fall animation, shake, "Almost!" feedback, lose screen after 1.8s, parallax
- `WonScene` - Firework sequence, character celebration walk, star pop-in animation, win screen
- `renderPlatforms(reveal)` / `applyShake(ctx)` / `updatePlatformBob(dt)` / `updateCrumbleTimers(dt)` / `startPlayingEarly()`

### logic.js (5 functions)
- `calculateScore(levelNum, timeSec, jumpCount, totalRows, memTime)` - Compute score breakdown
- `calculateStars(score, levelNum)` - Compute 1-3 star rating
- `destroyDeparturePlatform()` - Explode and mark current platform as destroyed
- `tryJump(direction)` - Handle left/right/forward/backward jump; uses destroyDeparturePlatform
- `landOnPlatform(plat, row, col)` - Process landing; check win/fake/destroyed

### input.js (2 functions)
- `findTappedPlatform(canvasX, canvasY)` - Hit-test canvas coordinates against adjacent platforms for touch input
- `setupInput()` - Register keyboard + touch event listeners

### loop.js (1 function + 1 constant)
- `TICK` - Fixed timestep interval (1/60 seconds)
- `gameLoop(timestamp)` - RAF loop

### menu.js (7 functions)
- `setupMenu()` - Build character cards, wire selectors + buttons
- `updateStartBtn()` - Enable/disable start and custom buttons
- `updateSettingsSummary()` - Update settings display text
- `returnToMenu()` - Reset level state and return to menu
- `startLevel()` - Apply level config, generate platforms, start memorize (adventure)
- `advanceLevel()` - Increment level and call startLevel
- `startGame()` - Apply manual settings, generate level, start game (custom mode)

### init.js (imperative bootstrap)
- Set up canvas, set title/author text, call `setupInput()`, `setupMenu()`, push `MenuScene`, start `gameLoop`

---

## Testing

The test suite lives in `tests/test.html` and `tests/tests.js`. Open `tests/test.html` in a browser to run all tests. No build tools or Node.js required.

### Resolved

- ~~Rendering mutates state~~ -- `drawParticles()` and `drawLava()` are now read-only. All physics run in `update()`.
- ~~Unmanaged timers~~ -- All game logic timers use `addTimer()`. Scene exits call `clearTimers()`.
- ~~Frame-rate dependent physics~~ -- Fixed timestep (TICK=1/60) guarantees deterministic updates. Values calibrated for 60Hz run at exactly 60Hz.
- ~~State transitions scattered~~ -- All transitions go through `SceneManager.replace()`. Each scene owns its own update/render.
- ~~HUD thrashing~~ -- Scenes only update HUD text when the displayed value changes.
- ~~Dead code (winFireworks)~~ -- Removed from state.js.
- ~~No mobile input~~ -- Touch input added: swipe for directional movement, tap-on-platform for targeted jumps.

### Test Coverage
- Config constants validation
- Grid sizes and difficulty configuration
- State initialization
- Platform generation (correct dimensions, safe path validity, fake marking)
- Board rules (BOARD_RULES config, max consecutive same-direction enforcement, bounds safety)
- Platform initialization (all properties including `destroyed` are explicit)
- Player reset (position, platform reference)
- Timer system (add, fire, clear, concurrent timers)
- Scene manager (push, pop, replace, delegation)
- Jump logic (forward, sideways, guards for wrong state/animation)
- Sideways jump boundaries (left at col 0, right at max col, out-of-bounds row)
- Single-column grid (sideways impossible, forward works)
- Forward jump uses PLAYER_Y_OFFSET constant
- Landing logic (safe, fake, destroyed platforms)
- Win condition (correct column required, tested on small/medium/large grids)
- Platform bob spring physics (settles to rest)
- Particle lifecycle (spawn and expire)
- Trail mark lifecycle (fade and cleanup)
- formatTime utility
- Audio safety (graceful degradation when AudioContext unavailable)
- Speech synthesis (English voice lookup, speakText safety)
- Character caching (`G.heroChar`, `G.rescueChar`)
- `destroyDeparturePlatform()` helper (with and without platform)
- `drawEmoji()` helper (renders without error, resets shadow state)
- PlayingScene HUD caching properties
- Level config validation (15 entries, ranges, difficulty increases)
- `getLevelConfig()` table and formula ranges
- `calculateScore()` basic, perfect, speed, floor at zero
- `calculateStars()` thresholds (1/2/3 stars)
- Backward compatibility (custom mode with null levelConfig)
- New state fields (level, levelConfig, gameMode, scoring fields)

---

## Still Open

1. **God object (G)** - All state in one flat mutable bag. Could be split into namespaced sub-objects.
2. **No object pool for particles** - Particles use push/splice. Could use pre-allocated pool.
3. **DOM manipulation in scenes** - Scenes directly show/hide HTML elements. Could use a UI manager.
4. **Dead data** - `CHARACTERS[*].color` defined but never read.
5. **Audio setTimeout** - Music loop scheduling in audio.js still uses `setTimeout`. Acceptable since music timing is independent of game logic.

## Future Improvements

### 1. Structured State Namespaces (Medium Impact, Low Effort)
Split `G` into `G.audio`, `G.input`, `G.game`, `G.ui` sub-objects.

### 2. Move Particle Spawners to effects.js (Low Impact, Low Effort)
Consolidate all particle spawning in one file.

### 3. ES Modules (Low Impact, Medium Effort)
Convert to `<script type="module">` with import/export. Requires HTTP server.

## Resolved

- ~~Hardcoded magic number~~ in forward jump — now uses `PLAYER_Y_OFFSET`
- ~~Missing `destroyed` property~~ in platform init — now explicitly set to `false`
- ~~HUD updates every frame~~ — PlayingScene now caches row/col/timer/jumps and only updates DOM on change
- ~~Unused `spawnJumpDust()`~~ — removed (replaced by `spawnPlatformExplosion`)
- ~~Unnecessary `startPlat.fake = false`~~ — removed (safe path never marked fake)
- ~~Duplicated emoji rendering~~ — extracted `drawEmoji()` helper
- ~~Duplicated departure destruction~~ — extracted `destroyDeparturePlatform()`
- ~~Repeated `CHARACTERS.find()` lookups~~ — cached as `G.heroChar`/`G.rescueChar` in `startGame()`
- ~~Hero === rescue allowed~~ — prevented in menu selection handlers
- ~~START button not debounced~~ — disabled immediately in `startGame()`
- ~~Missing bounds check~~ in sideways jump — added row bounds guard
- ~~Speech synthesis wrong voice~~ — now explicitly requests English voice via `getEnglishVoice()`
