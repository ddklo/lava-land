// ─── PARTICLE EFFECTS ──────────────────────────────────────────
// All particle spawners live here. Drawing.js handles rendering only.

function spawnPlatformExplosion(plat) {
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 2 + Math.random() * 4;
    G.particles.push({
      x: plat.x + Math.random() * plat.w,
      y: plat.y + Math.random() * plat.h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      size: 3 + Math.random() * 5,
      color: ['#886655', '#775544', '#aa8866', '#665544', '#998877'][Math.floor(Math.random() * 5)],
      life: 0.7 + Math.random() * 0.4,
      gravity: 0.12,
    });
  }
}

function spawnLandDust(plat) {
  const cx = plat.x + plat.w / 2;
  const topY = plat.y;
  // Stone dust from top
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    G.particles.push({
      x: cx + (Math.random() - 0.5) * 16,
      y: topY + Math.random() * 2,
      vx: Math.cos(angle) * (1.2 + Math.random() * 1.5),
      vy: -Math.random() * 0.8 - 0.2,
      size: 2 + Math.random() * 4,
      color: ['#bbaa99', '#998877', '#ccbbaa'][Math.floor(Math.random() * 3)],
      life: 0.45 + Math.random() * 0.35,
      gravity: 0.03,
      round: true,
    });
  }
  // Lava splash from platform edges — simulates floating in lava
  const bottomY = plat.y + PLAT_H;
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const edgeX = side < 0 ? plat.x : plat.x + plat.w;
    G.particles.push({
      x: edgeX + side * (Math.random() * 4),
      y: bottomY + Math.random() * 4,
      vx: side * (1.5 + Math.random() * 2),
      vy: -(1.5 + Math.random() * 2.5),
      size: 1.5 + Math.random() * 2,
      color: ['#ff6600', '#ff8800', '#ffaa00', '#ff4400'][Math.floor(Math.random() * 4)],
      life: 0.35 + Math.random() * 0.25,
      gravity: 0.18,
      round: true,
    });
  }
}

function spawnCrumbleParticles(plat) {
  for (let i = 0; i < 12; i++) {
    G.particles.push({
      x: plat.x + Math.random() * plat.w,
      y: plat.y + Math.random() * plat.h,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2 - 1,
      size: 2 + Math.random() * 3,
      color: ['#886655', '#775544', '#aa8866'][Math.floor(Math.random() * 3)],
      life: 1,
    });
  }
}

function spawnLavaSplash(x, y) {
  for (let i = 0; i < 20; i++) {
    G.particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: -Math.random() * 5 - 2,
      size: 2 + Math.random() * 4,
      color: ['#ff4400', '#ff6600', '#ffaa00', '#ff2200'][Math.floor(Math.random() * 4)],
      life: 1,
    });
  }
}

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
      confetti: true,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 10,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 2 + Math.random() * 3,
      aspect: 0.4 + Math.random() * 0.3,
    });
  }
}

function spawnJumpTrail(x, y) {
  const colors = ['#ffdd88', '#ffaa44'];
  for (let i = 0; i < 2; i++) {
    G.particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + Math.random() * 4,
      vx: (Math.random() - 0.5) * 0.8,
      vy: Math.random() * 0.5,
      size: 2 + Math.random(),
      color: colors[i],
      life: 0.3 + Math.random() * 0.15,
      gravity: 0.02,
      round: true,
    });
  }
}

function spawnConfetti() {
  const colors = ['#ff0000', '#00ff00', '#0088ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#ffaa00',
                  '#ff6699', '#66ccff', '#ffcc00', '#cc44ff', '#ff4400', '#44ff88', '#ff88cc', '#88ff44',
                  '#ff3399', '#33ccff', '#ffee00', '#cc00ff', '#00ffcc', '#ff8800'];
  for (let i = 0; i < 80; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const r = Math.random();
    const isCircle = r < 0.25;
    const isStreamer = !isCircle && r < 0.45;
    G.particles.push({
      x: Math.random() * CANVAS_W,
      y: G.camera.y - 5 - Math.random() * CANVAS_H * 0.4,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 3 + 0.8,
      size: isStreamer ? (3 + Math.random() * 2) : (5 + Math.random() * 9),
      color: color,
      life: 3.5 + Math.random() * 2,
      gravity: 0.02,
      confetti: true,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 14,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 2 + Math.random() * 4,
      aspect: isStreamer ? 0.12 : (isCircle ? 1 : (0.4 + Math.random() * 0.45)),
      confettiShape: isCircle ? 'circle' : (isStreamer ? 'streamer' : 'rect'),
      streamerLen: isStreamer ? (14 + Math.random() * 22) : undefined,
    });
  }
}
