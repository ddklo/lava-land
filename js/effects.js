// ─── WIN CELEBRATION ────────────────────────────────────────────
function spawnFirework(x, y) {
  const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ffaa00', '#ff66aa'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  for (let i = 0; i < 30; i++) {
    const angle = (Math.PI * 2 / 30) * i + Math.random() * 0.3;
    const speed = 2 + Math.random() * 4;
    G.particles.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      color: color,
      life: 1 + Math.random() * 0.5,
      gravity: 0.05,
      round: true,
    });
  }
}

function spawnConfetti() {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#ffaa00'];
  for (let i = 0; i < 40; i++) {
    G.particles.push({
      x: Math.random() * CANVAS_W,
      y: G.camera.y - 20,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2 + 1,
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1.5 + Math.random(),
      gravity: 0.02,
      round: Math.random() > 0.5,
    });
  }
}
