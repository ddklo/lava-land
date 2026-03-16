# Lava Leap - Project Guide

## What This Is

A browser-based memory-platformer game. Player memorizes safe platforms on a grid, then jumps across lava to rescue a character. Built with vanilla JS, HTML5 Canvas, and Web Audio API. No build tools, no frameworks -- opens directly via `file://`.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full architecture document including:
- File structure and dependency graph
- Core patterns: fixed timestep loop, scene manager, update/render split, managed timers
- Shared state model (the `G` object)
- Game state machine diagram
- Complete function map
- Remaining issues and future recommendations

## Quick Reference

### File Layout

```
index.html          HTML + 14 script tags (entry point)
css/style.css       All styles
js/config.js        Constants (CANVAS_W, CHARACTERS, etc.)
js/state.js         Shared mutable state object: const G = {}
js/timers.js        Managed timer system (addTimer, updateTimers, clearTimers)
js/audio.js         Procedural music + sound effects (Web Audio API)
js/platforms.js     Grid generation + safe-path algorithm
js/player.js        resetPlayer()
js/drawing.js       Canvas rendering (read-only) + updateParticles()
js/effects.js       Win celebration spawners (fireworks, confetti)
js/scenes.js        SceneManager + 5 scene objects (Menu/Memorize/Playing/Falling/Won)
js/logic.js         Core game rules (tryJump, landOnPlatform)
js/input.js         Keyboard event listeners
js/loop.js          Fixed-timestep game loop (TICK=1/60)
js/menu.js          Menu UI setup + startGame()
js/init.js          Bootstrap (only file that runs at parse time)
docs/architecture.md  Full architecture documentation
```

### Script Load Order

`config -> state -> timers -> audio -> platforms -> player -> drawing -> effects -> scenes -> logic -> input -> loop -> menu -> init`

### Key Patterns

- **Fixed timestep loop**: Physics update at 60 Hz via accumulator in loop.js. Rendering once per RAF.
- **Scene manager**: Pushdown automaton in scenes.js. Each game state (menu, memorize, playing, falling, won) is a scene with `onEnter`/`onExit`/`update(dt)`/`render()`. Transitions via `SceneManager.replace()`.
- **Update/render split**: All state mutation in `update()`, all drawing in `render()` (read-only). `drawParticles()` and `drawLava()` never mutate state.
- **Managed timers**: Game logic delays use `addTimer(seconds, callback)` instead of setTimeout. Timers tick inside the fixed-timestep loop and are cleared on scene exit.
- **State**: All mutable globals live in `const G = {}` (state.js). Constants are plain `const` globals in config.js.
- **Drawing**: Functions use `const ctx = G.ctx;` as a local alias at the top.
- **No modules**: Plain `<script>` tags. All functions and constants are global. Load order matters.

### Game States (Scenes)

```
MenuScene -> MemorizeScene -> PlayingScene -> WonScene
                  ^                |
                  |          (fake platform)
                  |                v
                  +--------- FallingScene
```

### Running

Open `index.html` in a browser. No server needed.

### Testing Checklist

- Menu: select hero, rescue character, difficulty, grid size
- Memorize phase: zoomed-out view with countdown timer
- Playing: arrow keys to hop left/right, up/space to jump forward
- Fall on fake platform: shake + splash + reset to memorize
- Win: fireworks, speech synthesis, play-again flow
- All 3 difficulties (easy/medium/hard) and all 3 grid sizes (small/medium/large)
- Play Again mid-fireworks: should cleanly return to menu (no stale timers)

## Documentation Maintenance

**When modifying code, always update the relevant docs:**

- **Adding/removing/renaming files** -> Update file structure and script load order in both this file and `docs/architecture.md`
- **Adding/removing functions** -> Update the function map in `docs/architecture.md`
- **Changing state fields in G** -> Update the state categories table in `docs/architecture.md`
- **Changing scene transitions** -> Update the game state machine diagram in `docs/architecture.md`
- **Adding new architectural patterns** -> Document them in the "Core Architecture Patterns" section of `docs/architecture.md`
- **Resolving or introducing issues** -> Update the "Remaining Architectural Issues" section in `docs/architecture.md`
