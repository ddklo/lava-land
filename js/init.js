// ─── INIT ───────────────────────────────────────────────────────
G.canvas = document.getElementById('gameCanvas');
G.canvas.width = CANVAS_W;
G.canvas.height = CANVAS_H;
G.ctx = G.canvas.getContext('2d');

// Set title from constants
document.title = GAME_TITLE + ' - Save Your Friend!';
document.getElementById('menu-title').textContent = GAME_TITLE;
document.getElementById('bg-title').textContent = GAME_TITLE;
document.getElementById('bg-author').textContent = GAME_AUTHOR;

setupInput();
setupMenu();
SceneManager.push(MenuScene);
requestAnimationFrame(gameLoop);
