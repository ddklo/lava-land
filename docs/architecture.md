# Lava Leap - Architecture Document

## Overview

Lava Leap is a browser-based memory-platformer. The player memorizes a grid of platforms (some real, some fake), then navigates from top to bottom jumping between platforms over animated lava to rescue a chosen character. Built with vanilla JavaScript, HTML5 Canvas, and Web Audio API -- no build tools, no frameworks.

---

## File Structure

```
ellie-game-v1/
  index.html              HTML markup + <link> + 14 <script> tags
  css/
    style.css             All CSS (~221 lines)
  js/
    config.js             Constants, CHARACTERS, lookup tables
    state.js              Shared mutable state object (G)
    timers.js             Managed timer system (replaces setTimeout in game logic)
    audio.js              Procedural music generators + sound effects
    platforms.js           Grid generation + safe-path algorithm
    player.js              resetPlayer()
    drawing.js             Canvas draw functions (render-only) + update helpers
    effects.js             Win celebration particle spawners
    scenes.js              SceneManager + 5 scene objects (pushdown automaton)
    logic.js               Jump + landing game rules
    input.js               Keyboard event listeners
    loop.js                Fixed-timestep game loop
    menu.js                Menu UI setup + startGame
    init.js                Bootstrap (canvas setup, starts loop)
  docs/
    architecture.md        This file
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
- `drawParticles()` -- renders particles without mutation (drawing.js)
- `drawLava()` -- reads `G.lavaTime` but never writes it (scenes update lavaTime)

### 4. Managed Timers (timers.js)

Game logic timers (crumble delays, fall-to-memorize transitions, firework scheduling) are managed inside the fixed-timestep update loop instead of using `setTimeout`/`setInterval`. This makes them:
- **Pausable** -- timers only tick when `update()` runs
- **Cancellable** -- `clearTimers()` on scene exit prevents stale callbacks
- **Deterministic** -- tied to game time, not wall-clock time

```javascript
addTimer(delay, callback)  // schedule callback after delay seconds
updateTimers(dt)           // tick all timers (called per scene update)
clearTimers()              // cancel all pending timers
```

---

## Shared State Model

All mutable state lives in a single global object `G` defined in `state.js`. Constants live as plain `const` globals in `config.js`. Functions are top-level globals.

### State Categories within G

| Category | Fields | Mutated by |
|----------|--------|------------|
| Settings | `gridCols`, `gridRows`, `difficulty`, `selectedSize` | menu.js |
| Audio | `audioCtx`, `musicGain`, `currentMusic`, `musicTimerId` | audio.js |
| Canvas | `canvas`, `ctx` | init.js (write-once) |
| Selections | `heroChoice`, `rescueChoice` | menu.js |
| Game mode | `gameState` | scenes (set in onEnter) |
| Entities | `platforms`, `player`, `safePath` | platforms.js, player.js, logic.js |
| Camera | `camera` | player.js, PlayingScene |
| Effects | `particles`, `lavaTime`, `shakeTimer`, `fallY` | scenes, drawing.js (updateParticles) |
| Animation | `jumpAnim` | logic.js, PlayingScene |
| Win | `winTimer` | WonScene |
| Timers | `timers` | timers.js |
| Input | `keys`, `isTouchDevice` | input.js |
| Loop | `lastTime`, `accumulator` | loop.js |

### Constants (config.js)

| Name | Value | Used by |
|------|-------|---------|
| `CANVAS_W` | 800 | drawing, scenes, effects, init |
| `CANVAS_H` | 700 | drawing, scenes, platforms, init |
| `PLATFORM_REAL_COLOR` | `#665544` | drawing |
| `PLATFORM_REAL_TOP` | `#887766` | drawing |
| `MEMORIZE_TIME` | 10 | menu |
| `PLAT_H` | 48 | platforms |
| `GRID_SIZES` | {small, medium, large} | menu |
| `DIFFICULTY_FAKE_CHANCE` | {easy, medium, hard} | platforms |
| `CHARACTERS` | 8 character defs | drawing, scenes, logic, menu |

---

## Dependency Graph

```
config.js ──────────────────────────────────────────────┐
state.js ───────────────────────────────────────────────┐│
timers.js ◄──── state                                   ││
audio.js ◄──── state                                    ││
platforms.js ◄──── config, state                        ││
player.js ◄──── state                                   ││
drawing.js ◄──── config, state                          ││
effects.js ◄──── config, state                          ││
scenes.js ◄──── config, state, timers, audio,           ││
                platforms, player, drawing, effects      ││
logic.js ◄──── state, audio, drawing, scenes            ││
input.js ◄──── state, logic                             ││
loop.js ◄──── state, scenes                             ││
menu.js ◄──── config, state, audio, platforms,          ││
              player, scenes                            ││
init.js ◄──── config, state, input, menu, scenes, loop  ┘│
                                                         ┘
```

`scenes.js` is now the most connected node (8 dependencies), which is expected since each scene orchestrates update + render for its game state.

---

## Game State Machine

```
          ┌────────────┐
          │  MenuScene  │◄─────────────────┐
          └─────┬──────┘                   │
                │ startGame()              │ play-again click
                ▼                          │
          ┌──────────────┐                 │
     ┌───►│MemorizeScene │        ┌────────┴─────┐
     │    └──────┬───────┘        │   WonScene    │
     │           │ timer expires  └────────▲─────┘
     │           ▼                         │
     │    ┌──────────────┐                 │
     │    │ PlayingScene  │────────────────┘
     │    └──────┬───────┘   last row reached
     │           │ land on fake platform
     │           ▼
     │    ┌──────────────┐
     └────┤ FallingScene  │
          └──────────────┘
           (1.2s managed timer -> MemorizeScene)
```

All transitions go through `SceneManager.replace()`. Each scene's `onExit()` calls `clearTimers()` to prevent stale callbacks.

---

## Function Map

### timers.js (3 functions)
- `addTimer(delay, callback)` - Schedule callback after delay seconds
- `updateTimers(dt)` - Tick all timers, fire expired ones
- `clearTimers()` - Cancel all pending timers

### audio.js (11 functions)
- `initAudio()` - Lazy-create AudioContext
- `stopMusic()` - Fade out + disconnect current music
- `playMemorizeMusic()` - Procedural tense chord loop
- `playActionMusic()` - Procedural driving bass + drums
- `playJumpSound()` - Forward jump SFX
- `playHopSound()` - Sideways hop SFX
- `playLandSound()` - Landing SFX
- `playCrumbleSound()` - Fake platform crumble SFX
- `playFallSound()` - Fall + lava splash SFX
- `playWinSound()` - 10-second procedural victory fanfare
- `speakCongrats()` - Speech synthesis "You did a great job!"

### platforms.js (1 function)
- `generatePlatforms()` - Create grid, build safe path, mark fakes

### player.js (1 function)
- `resetPlayer()` - Place player on first safe platform, reset camera

### drawing.js (11 functions)
- `updateParticles(dt)` - Advance particle physics (called from scene update)
- `drawLava(offsetY, height)` - 6-layer animated lava background (read-only)
- `drawPlatform(p, reveal)` - Single platform as 3D stone block with depth face, brick texture, and highlights
- `drawPlayer()` - Player emoji with jump arc animation, squash/stretch, and dynamic shadow
- `drawRescueCharacter()` - Floating rescue target with "Help!" text
- `drawParticles()` - Render all particles (read-only, no physics)
- `spawnJumpDust(plat)` - Spawn dust puff when jumping off a platform
- `spawnLandDust(plat)` - Spawn radial dust cloud on landing impact
- `spawnCrumbleParticles(plat)` - Spawn debris when fake platform crumbles
- `spawnLavaSplash(x, y)` - Spawn lava particles on fall

### effects.js (2 functions)
- `spawnFirework(x, y)` - Burst of 30 radial particles
- `spawnConfetti()` - 40 falling confetti particles

### scenes.js (SceneManager + 5 scenes + 4 helpers)
- `SceneManager` - Pushdown automaton: push/pop/replace + update/render delegation
- `MenuScene` - Draws lava background, shows menu HTML overlay
- `MemorizeScene` - Zoom-out view, countdown timer, transitions to PlayingScene
- `PlayingScene` - Normal gameplay: jump animation, camera, platform bob, HUD updates
- `FallingScene` - Fall animation, shake, managed timer to MemorizeScene
- `WonScene` - Firework sequence, speech, show win screen
- `renderPlatforms(reveal)` - Helper: draw all platforms
- `applyShake(ctx)` - Helper: apply shake transform
- `updatePlatformBob(dt)` - Helper: damped spring animation for platform bounce on jump/land
- `updateCrumbleTimers(dt)` - Helper: advance platform crumble state

### logic.js (2 functions)
- `tryJump(direction)` - Handle left/right/forward jump input
- `landOnPlatform(plat, row, col)` - Process landing; triggers scene transitions

### input.js (2 functions)
- `findTappedPlatform(canvasX, canvasY)` - Hit-test canvas coordinates against adjacent platforms for touch input
- `setupInput()` - Register keyboard + touch event listeners

### loop.js (1 function + 1 constant)
- `TICK` - Fixed timestep interval (1/60 seconds)
- `gameLoop(timestamp)` - Fixed-timestep RAF loop: accumulate, update, render

### menu.js (3 functions)
- `setupMenu()` - Build character cards, wire selectors + buttons
- `updateStartBtn()` - Enable/disable start button based on selections
- `startGame()` - Apply settings, generate level, SceneManager.replace(MemorizeScene)

### init.js (no functions - imperative bootstrap)
- Set up canvas, call `setupInput()`, `setupMenu()`, push `MenuScene`, start `gameLoop`

---

## Remaining Architectural Issues

Issues resolved by the improvements above are marked with ~~strikethrough~~.

### Resolved

- ~~Rendering mutates state~~ -- `drawParticles()` and `drawLava()` are now read-only. All physics run in `update()`.
- ~~Unmanaged timers~~ -- All game logic timers use `addTimer()`. Scene exits call `clearTimers()`.
- ~~Frame-rate dependent physics~~ -- Fixed timestep (TICK=1/60) guarantees deterministic updates. Values calibrated for 60Hz run at exactly 60Hz.
- ~~State transitions scattered~~ -- All transitions go through `SceneManager.replace()`. Each scene owns its own update/render.
- ~~HUD thrashing~~ -- Scenes only update HUD text when the displayed value changes.
- ~~Dead code (winFireworks)~~ -- Removed from state.js.

### Still Open

1. **God object (G)** - All state in one flat mutable bag. Could be split into namespaced sub-objects.
2. **Particle spawners split** - `spawnJumpDust`/`spawnLandDust`/`spawnCrumbleParticles`/`spawnLavaSplash` in drawing.js; `spawnFirework`/`spawnConfetti` in effects.js.
3. **No object pool for particles** - Particles use push/splice. Could use pre-allocated pool.
4. ~~**No mobile input**~~ - Touch input added: swipe for directional movement, tap-on-platform for targeted jumps.
5. **DOM manipulation in scenes** - Scenes directly show/hide HTML elements. Could use a UI manager.
6. **Dead data** - `CHARACTERS[*].color` defined but never read.
7. **Audio setTimeout** - Music loop scheduling in audio.js still uses `setTimeout`. This is acceptable since music timing is independent of game logic, but could be improved.

---

## Future Improvement Recommendations

Ranked by impact-to-effort ratio.

### 1. Object Pool for Particles (Medium Impact, Low Effort)
Replace `particles.push({...})` / `particles.splice(i, 1)` with a pre-allocated pool. Avoids GC pressure during fireworks.

### 2. Structured State Namespaces (Medium Impact, Low Effort)
Split `G` into `G.audio`, `G.input`, `G.game`, `G.ui` sub-objects.

### 3. Move Particle Spawners to effects.js (Low Impact, Low Effort)
Consolidate all particle spawning in one file.

### 4. ES Modules (Low Impact, Medium Effort)
Convert to `<script type="module">` with import/export. Requires HTTP server.

### 5. ~~Touch/Mobile Input~~ (Implemented)
Touch input now supports swipe gestures and tap-on-platform navigation.
