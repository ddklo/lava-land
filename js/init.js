// ─── INIT ───────────────────────────────────────────────────────
G.canvas = document.getElementById('gameCanvas');
if (!G.canvas) {
  document.body.innerHTML = '<p style="color:#fff;text-align:center;padding:2em;">Failed to load game: canvas element not found.</p>';
  throw new Error('gameCanvas not found');
}

// ─── DYNAMIC CANVAS HEIGHT ─────────────────────────────────────
// On mobile portrait screens, expand canvas height to match the
// viewport aspect ratio so platforms use the full vertical space.
function resizeCanvas() {
  var isMobile = window.innerWidth <= 600;
  var hudH = isMobile ? 40 : 48;
  var availW = window.innerWidth;
  var availH = (window.visualViewport ? window.visualViewport.height : window.innerHeight) - hudH;

  if (isMobile && availW > 0 && availH > 0) {
    // Scale canvas height to match viewport aspect ratio
    CANVAS_H = Math.max(700, Math.round(CANVAS_W * (availH / availW)));
  } else {
    CANVAS_H = 700;
  }

  G.canvas.width = CANVAS_W;
  G.canvas.height = CANVAS_H;
}

resizeCanvas();
G.ctx = G.canvas.getContext('2d');
if (!G.ctx) {
  document.body.innerHTML = '<p style="color:#fff;text-align:center;padding:2em;">Failed to load game: 2D context unavailable.</p>';
  throw new Error('2D context unavailable');
}

// Set title from constants
document.title = GAME_TITLE + ' - Save Your Friend!';
document.getElementById('menu-title').textContent = GAME_TITLE;
document.getElementById('menu-credit').textContent = GAME_AUTHOR;
document.getElementById('hud-game-title').textContent = GAME_TITLE;
document.getElementById('hud-game-author').textContent = GAME_AUTHOR;

// ─── RESIZE HANDLING ────────────────────────────────────────────
// Recalculate canvas dimensions and invalidate lava cache when the
// viewport changes (orientation switch, window resize).
window.addEventListener('resize', function () {
  resizeCanvas();
  G.lavaCache = null;
  G.lavaCacheCtx = null;
});

setupInput();
setupMenu();
SceneManager.push(MenuScene);
requestAnimationFrame(gameLoop);
