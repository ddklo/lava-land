# Lava Land - Project Guide

## What This Is

A browser-based memory-platformer game. Player memorizes safe platforms on a grid, then jumps across lava to rescue a character. Built with vanilla JS, HTML5 Canvas, and Web Audio API. No build tools, no frameworks — opens directly via `file://`.

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
index.html          HTML + 17 script tags + service worker registration (entry point)
manifest.json       PWA web app manifest (name, icons, display, orientation)
sw.js               Service worker — cache-first offline support
css/theme.css       CSS custom properties (colors, fonts) — design tokens
css/style.css       All styles (responsive, mobile-friendly), references theme.css
images/             Static assets
  background.svg    Volcanic cave background (referenced by css/style.css)
  icon-192.png      App icon 192×192 (PWA / Android)
  icon-512.png      App icon 512×512 (PWA / splash)
js/config.js        Constants, physics tuning, LEVELS array, getLevelConfig(), scoring constants
js/i18n.js          Internationalization — translation strings + t() lookup + applyLanguage()
js/state.js         Shared mutable state object: const G = {}
js/timers.js        Managed timer system (addTimer, updateTimers, clearTimers)
js/audio.js         Procedural music + sound effects (Web Audio API, with error guards)
js/soundtracks.js   Soundtrack variants (classic, retro, chill music generators)
js/pathgen.js       Safe-path shaping algorithms (applyMaxConsecutiveDirectionRule, insertBacktracks)
js/platforms.js     Grid generation + fake seeding (uses pathgen.js for path algorithms)
js/player.js        resetPlayer()
js/drawing.js       Core canvas rendering (lava, platforms, player, particles, trail, route) + formatTime()
js/hud.js           UI overlays (level preview, transitions, streak popups, tutorial, urgency vignette)
js/effects.js       All particle spawners (dust, explosions, lava, fireworks, confetti)
js/scenes.js        SceneManager + 5 scene objects (Menu/Memorize/Playing/Falling/Won)
js/scoring.js       Pure scoring functions (calculateScore, calculateStars)
js/logic.js         Core game rules (tryJump, landOnPlatform, destroyDeparturePlatform)
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

`config -> i18n -> state -> timers -> audio -> soundtracks -> pathgen -> platforms -> player -> drawing -> hud -> effects -> scenes -> scoring -> logic -> input -> loop -> menu -> init`

Only `init.js` executes code at parse time. All other files only define functions/objects.

### Key Patterns

- **Fixed timestep loop**: Physics update at 60 Hz via accumulator in loop.js. Rendering once per RAF.
- **Scene manager**: Pushdown automaton in scenes.js. Each game state (menu, memorize, playing, falling, won) is a scene with `onEnter`/`onExit`/`update(dt)`/`render()`. Transitions via `SceneManager.replace()`.
- **`G.gameState` values**: Set in each scene's `onEnter()`. Possible values: `'menu'`, `'memorize'`, `'playing'`, `'falling'`, `'won'`. Read by `drawPlayer()` and input.js.
- **Update/render split**: All state mutation in `update()`, all drawing in `render()` (read-only).
- **Managed timers**: Game logic delays use `addTimer(seconds, callback)` instead of setTimeout. Timers tick inside the fixed-timestep loop and are cleared on scene exit.
- **Named constants**: All physics tuning and magic numbers in config.js (JUMP_ARC_HEIGHT, SPRING_STIFFNESS, etc.).
- **Audio guards**: All audio functions check `hasAudio()` after `initAudio()`. Game runs silently if Web Audio unavailable.
- **State**: All mutable globals live in `const G = {}` (state.js). Constants are plain `const` globals in config.js.
- **File responsibilities**: drawing.js = rendering only. effects.js = all particle spawning. scenes.js = state machine. logic.js = game rules.
- **No modules**: Plain `<script>` tags. All functions and constants are global. Load order matters.

### Game Modes

- **Adventure Mode** (default): 15 hand-tuned levels + infinite scaling from level 16+. Score breakdown with stars on win. "Next Level" button advances.
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

Open `index.html` in a browser. No server needed. For PWA/service worker testing, serve via HTTP (e.g. `python3 -m http.server`).

### Testing

Open `tests/test.html` in a browser. Tests cover: config, state, platform generation, player reset, timer system, scene manager, jump logic, landing/win/lose conditions, spring physics, particles, trail marks, formatTime, and audio safety.

### Manual Testing Checklist

- Menu: select hero, rescue character, open settings, change difficulty/grid/memorize time
- Memorize phase: zoomed-out view with countdown timer
- Playing: arrow keys to move in all 4 directions — left/right hop, down/space to jump forward, up to go backward
- Mobile: swipe left/right to hop, swipe down to jump forward, swipe up to go backward
- Platforms explode when you leave them; trail marks show your path
- Fall on fake platform: crumble + shake + lose screen with retry/menu options
- Win: fireworks, character celebration walk, speech synthesis, play-again flow
- All 3 difficulties, all 3 grid sizes, all memorize times
- Win requires landing on rescue character's exact column on last row

## Where to Add New Code

| Task | File |
|------|------|
| New game constant or physics value | `js/config.js` |
| New particle effect | `js/effects.js` (spawner) + `js/drawing.js` (renderer if needed) |
| New game rule (jump/land) | `js/logic.js` |
| Scoring formula change | `js/scoring.js` |
| New scene / game state | `js/scenes.js` |
| New UI element or button | `js/menu.js` |
| New HUD overlay or transition | `js/hud.js` |
| New audio sound | `js/audio.js` |
| New keyboard/touch control | `js/input.js` |
| New visual rendering | `js/drawing.js` |
| New path generation rule | `js/pathgen.js` |
| New state field | `js/state.js` (add to `G`) |
| New test | `tests/tests.js` |
| Cached assets for offline | `sw.js` (ASSETS array) |
| PWA metadata | `manifest.json` |

## Deploying a New Version

**When making any code changes that will be deployed, bump the version in two places:**

1. `sw.js` line 4 — `const VERSION = '1.0.0';` → increment (e.g. `'1.0.1'`)
2. `index.html` — update every `?v=1.0.0` query param on `<script>` and `<link>` tags to match

Use [semver](https://semver.org/) conventions:
- Patch (`1.0.x`): bug fixes, minor tweaks
- Minor (`1.x.0`): new features, gameplay changes
- Major (`x.0.0`): breaking changes or major rewrites

Both values must stay in sync. Bumping `VERSION` in `sw.js` causes the service worker to install fresh and purge the old offline cache. Bumping `?v=` in `index.html` forces browsers to re-fetch JS/CSS files that may be cached at the HTTP level.

## Documentation Maintenance

**When modifying code, always update the relevant docs:**

- **Adding/removing/renaming files** → Update file structure in both this file and `docs/architecture.md`
- **Adding/removing functions** → Update the function map in `docs/architecture.md`
- **Changing state fields in G** → Update the state categories table in `docs/architecture.md`
- **Changing scene transitions** → Update the game state machine diagram in both files
- **Adding new constants** → Document in the constants table in `docs/architecture.md`
- **Adding tests** → Update test coverage section in `docs/architecture.md`
