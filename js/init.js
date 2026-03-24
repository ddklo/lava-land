// ─── INIT ───────────────────────────────────────────────────────
G.canvas = document.getElementById('gameCanvas');
if (!G.canvas) {
  document.body.innerHTML = '<p style="color:#fff;text-align:center;padding:2em;">Failed to load game: canvas element not found.</p>';
  throw new Error('gameCanvas not found');
}
G.canvas.width = CANVAS_W;
G.canvas.height = CANVAS_H;
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
// Invalidate lava cache when canvas container resizes so rendering
// stays correct after orientation changes or window resizes.
window.addEventListener('resize', function () {
  G.lavaCache = null;
  G.lavaCacheCtx = null;
});

setupInput();
setupMenu();
SceneManager.push(MenuScene);
requestAnimationFrame(gameLoop);
