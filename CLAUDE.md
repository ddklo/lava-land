# Lava Land - Project Guide

## What This Is

A browser-based memory-platformer game. Player memorizes safe platforms on a grid, then jumps across lava to rescue a character. Built with vanilla JS, HTML5 Canvas, and Web Audio API. No build tools, no frameworks -- opens directly via `file://`.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full architecture document including:
- File structure and dependency graph
- Core patterns: fixed timestep loop, scene manager, update/render split, managed timers
- Named constants for physics tuning
- Shared state model (the `G` object)
- Game state machine diagram
- Complete function map
- Test coverage summary
- Remaining issues

See [docs/rules.md](docs/rules.md) for complete game rules documentation.

## Quick Reference

### File Layout

```
index.html          HTML + 14 script tags (entry point)
css/theme.css       CSS custom properties (colors, fonts) — design tokens
css/style.css       All styles (responsive, mobile-friendly), references theme.css
js/config.js        Constants, physics tuning, LEVELS array, getLevelConfig(), scoring constants
js/state.js         Shared mutable state object: const G = {}
js/timers.js        Managed timer system (addTimer, updateTimers, clearTimers)
js/audio.js         Procedural music + sound effects (Web Audio API, with error guards)
js/platforms.js     Grid generation + safe-path algorithm
js/player.js        resetPlayer()
js/drawing.js       Canvas rendering (read-only) + particle/trail update/render
js/effects.js       All particle spawners (dust, explosions, lava, fireworks, confetti)
js/scenes.js        SceneManager + 5 scene objects (Menu/Memorize/Playing/Falling/Won)
js/logic.js         Core game rules (tryJump, landOnPlatform) + scoring (calculateScore, calculateStars)
js/input.js         Keyboard + touch event listeners
js/loop.js          Fixed-timestep game loop (TICK=1/60)
js/menu.js          Menu/settings UI + startGame/startLevel/advanceLevel/returnToMenu
js/init.js          Bootstrap (only file that runs at parse time)
tests/test.html     Browser-based test runner
tests/tests.js      Test suite
docs/architecture.md  Full architecture documentation
docs/rules.md       Game rules documentation
```

### Script Load Order

`config -> state -> timers -> audio -> platforms -> player -> drawing -> effects -> scenes -> logic -> input -> loop -> menu -> init`

### Key Patterns

- **Fixed timestep loop**: Physics update at 60 Hz via accumulator in loop.js. Rendering once per RAF.
- **Scene manager**: Pushdown automaton in scenes.js. Each game state (menu, memorize, playing, falling, won) is a scene with `onEnter`/`onExit`/`update(dt)`/`render()`. Transitions via `SceneManager.replace()`.
- **Update/render split**: All state mutation in `update()`, all drawing in `render()` (read-only).
- **Managed timers**: Game logic delays use `addTimer(seconds, callback)` instead of setTimeout. Timers tick inside the fixed-timestep loop and are cleared on scene exit.
- **Named constants**: All physics tuning and magic numbers in config.js (JUMP_ARC_HEIGHT, SPRING_STIFFNESS, etc.).
- **Audio guards**: All audio functions check `hasAudio()` after `initAudio()`. Game runs silently if Web Audio unavailable.
- **State**: All mutable globals live in `const G = {}` (state.js). Constants are plain `const` globals in config.js.
- **File responsibilities**: drawing.js = rendering only. effects.js = all particle spawning. scenes.js = state machine. logic.js = game rules.
- **No modules**: Plain `<script>` tags. All functions and constants are global. Load order matters.

### Game Modes

- **Adventure Mode** (default): 15 hand-tuned levels + infinite scaling. Score breakdown with stars on win. "Next Level" button advances.
- **Custom Mode**: Manual difficulty/grid/memorize settings. No levels or scoring. Original behavior.

### Game States (Scenes)

```
MenuScene -> MemorizeScene -> PlayingScene -> WonScene (score + next level)
                  ^                |                |
                  |          (fake/destroyed)    (next level loops back)
                  |                v                |
                  +--------- FallingScene ---------(retry restarts same level)
```

### Running

Open `index.html` in a browser. No server needed.

### Testing

Open `tests/test.html` in a browser. Tests cover: config, state, platform generation, player reset, timer system, scene manager, jump logic, landing/win/lose conditions, spring physics, particles, trail marks, formatTime, and audio safety.

### Manual Testing Checklist

- Menu: select hero, rescue character, open settings, change difficulty/grid/memorize time
- Memorize phase: zoomed-out view with countdown timer
- Playing: arrow keys to hop left/right, up/space to jump forward
- Mobile: swipe left/right to hop, tap/swipe up to jump forward
- Platforms explode when you leave them; trail marks show your path
- Fall on fake platform: crumble + shake + lose screen with retry/menu options
- Win: fireworks, character celebration walk, speech synthesis, play-again flow
- All 3 difficulties, all 3 grid sizes, all memorize times
- Win requires landing on rescue character's exact column on last row

## Documentation Maintenance

**When modifying code, always update the relevant docs:**

- **Adding/removing/renaming files** -> Update file structure in both this file and `docs/architecture.md`
- **Adding/removing functions** -> Update the function map in `docs/architecture.md`
- **Changing state fields in G** -> Update the state categories table in `docs/architecture.md`
- **Changing scene transitions** -> Update the game state machine diagram
- **Adding new constants** -> Document in config.js section of `docs/architecture.md`
- **Adding tests** -> Update test coverage section in `docs/architecture.md`
