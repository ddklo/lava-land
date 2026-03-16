// ─── INIT ───────────────────────────────────────────────────────
G.canvas = document.getElementById('gameCanvas');
G.canvas.width = CANVAS_W;
G.canvas.height = CANVAS_H;
G.ctx = G.canvas.getContext('2d');

setupInput();
setupMenu();
SceneManager.push(MenuScene);
requestAnimationFrame(gameLoop);
