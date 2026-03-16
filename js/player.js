// ─── PLAYER ─────────────────────────────────────────────────────
function resetPlayer() {
  const startCol = G.safePath[0];
  const startPlat = G.platforms[0][startCol];
  G.player = {
    x: startPlat.x + startPlat.w / 2,
    y: startPlat.y - 16,
    row: 0,
    col: startCol,
    size: 16,
    onPlatform: startPlat,
  };
  startPlat.fake = false;
  G.camera.y = 0;
  G.jumpAnim.active = false;
  G.shakeTimer = 0;
}
