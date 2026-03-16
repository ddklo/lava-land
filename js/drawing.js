// ─── DRAWING ────────────────────────────────────────────────────
function drawLava(offsetY, height) {
  const ctx = G.ctx;
  const drawH = height || CANVAS_H;
  const t = G.lavaTime;

  // Layer 1: Deep dark base
  for (let y = 0; y < drawH; y += 3) {
    const r = 60 + Math.sin(y * 0.01 + t * 0.3) * 15;
    const g = 5 + Math.sin(y * 0.015 + t * 0.2) * 5;
    ctx.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},0)`;
    ctx.fillRect(0, y, CANVAS_W, 4);
  }

  // Layer 2: Flowing lava rivers — organic Perlin-like bands
  for (let y = 0; y < drawH; y += 2) {
    for (let x = 0; x < CANVAS_W; x += 6) {
      const flow1 = Math.sin(x * 0.008 + y * 0.012 + t * 1.2) *
                     Math.cos(y * 0.006 - t * 0.8 + x * 0.003);
      const flow2 = Math.sin(x * 0.015 - y * 0.009 + t * 0.7) *
                     Math.sin(y * 0.01 + t * 1.5 + x * 0.005);
      const flow3 = Math.cos(x * 0.005 + y * 0.018 + t * 0.4) *
                     Math.sin(x * 0.012 - t * 1.1);
      const combined = (flow1 + flow2 * 0.6 + flow3 * 0.4) / 2;

      if (combined > 0.1) {
        const intensity = (combined - 0.1) / 0.9;
        const r = Math.floor(200 + intensity * 55);
        const g = Math.floor(60 + intensity * 140);
        const b = Math.floor(intensity * 30);
        const a = 0.4 + intensity * 0.6;
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.fillRect(x, y, 7, 3);
      } else if (combined > -0.1) {
        const edge = (combined + 0.1) / 0.2;
        const r = Math.floor(80 + edge * 60);
        ctx.fillStyle = `rgba(${r},8,0,0.5)`;
        ctx.fillRect(x, y, 7, 3);
      }
    }
  }

  // Layer 3: Bright hotspot veins — slow moving bright cracks
  for (let i = 0; i < 6; i++) {
    const baseX = (Math.sin(t * 0.3 + i * 1.7) * 0.5 + 0.5) * CANVAS_W;
    const baseY = (Math.cos(t * 0.25 + i * 2.1) * 0.5 + 0.5) * drawH;
    for (let s = 0; s < 30; s++) {
      const angle = Math.sin(s * 0.4 + t * 0.5 + i) * Math.PI;
      const dist = s * 4;
      const vx = baseX + Math.cos(angle + s * 0.3) * dist;
      const vy = baseY + Math.sin(angle + s * 0.2) * dist * 0.6;
      if (vx < 0 || vx > CANVAS_W || vy < 0 || vy > drawH) continue;
      const bright = 1 - s / 30;
      const r = Math.floor(255);
      const g = Math.floor(150 + bright * 100);
      const b = Math.floor(bright * 60);
      ctx.fillStyle = `rgba(${r},${g},${b},${bright * 0.5})`;
      ctx.beginPath();
      ctx.arc(vx, vy, 2 + bright * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Layer 4: Glowing embers / sparks rising
  for (let i = 0; i < 15; i++) {
    const seed = i * 73.7;
    const ex = ((seed * 3.1 + t * 15 * (0.5 + (i % 3) * 0.3)) % CANVAS_W);
    const ey = drawH - ((t * 20 + seed * 2.7) % (drawH + 40)) + 20;
    if (ey < -10 || ey > drawH + 10) continue;
    const flicker = 0.5 + Math.sin(t * 8 + i * 5) * 0.5;
    const sz = 1.5 + flicker * 2;
    // Glow
    ctx.fillStyle = `rgba(255,200,50,${flicker * 0.3})`;
    ctx.beginPath();
    ctx.arc(ex, ey - offsetY * 0.3, sz + 3, 0, Math.PI * 2);
    ctx.fill();
    // Core
    ctx.fillStyle = `rgba(255,255,200,${flicker * 0.8})`;
    ctx.beginPath();
    ctx.arc(ex, ey - offsetY * 0.3, sz, 0, Math.PI * 2);
    ctx.fill();
  }

  // Layer 5: Large slow bubbles
  for (let i = 0; i < 10; i++) {
    const seed = i * 137.5;
    const cycle = (t * 0.4 + seed) % 6;
    if (cycle > 3) continue;
    const bx = (seed * 5.3) % CANVAS_W;
    const by = drawH * 0.3 + (seed * 1.7) % (drawH * 0.6);
    const growPhase = cycle / 3;
    const br = 4 + growPhase * 12;
    const alpha = growPhase < 0.8 ? growPhase : (1 - growPhase) * 5;
    // Bubble body
    ctx.strokeStyle = `rgba(255,180,50,${alpha * 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx, by - offsetY * 0.2, br, 0, Math.PI * 2);
    ctx.stroke();
    // Bright center
    ctx.fillStyle = `rgba(255,220,100,${alpha * 0.25})`;
    ctx.beginPath();
    ctx.arc(bx, by - offsetY * 0.2, br * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Pop flash at end
    if (growPhase > 0.85) {
      ctx.fillStyle = `rgba(255,255,200,${(growPhase - 0.85) * 6})`;
      ctx.beginPath();
      ctx.arc(bx, by - offsetY * 0.2, br * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Layer 6: Heat haze shimmer overlay
  ctx.fillStyle = 'rgba(255,60,0,0.04)';
  for (let y = 0; y < drawH; y += 12) {
    const wobble = Math.sin(y * 0.05 + t * 2) * 8;
    ctx.fillRect(wobble, y, CANVAS_W, 6);
  }
}

function drawPlatform(p, reveal) {
  const ctx = G.ctx;
  const screenY = p.y - G.camera.y + (p.bobOffset || 0);
  if (!reveal && (screenY < -80 || screenY > CANVAS_H + 80)) return;

  let ox = 0, oy = 0;
  if (p.crumbling) {
    ox = (Math.random() - 0.5) * 4;
    oy = p.crumbleTimer * 2;
  }

  ctx.save();
  ctx.translate(ox, oy);

  const x = p.x, w = p.w, h = p.h;
  const depth = 7;

  if (p.fake && reveal) {
    // Fake platform — translucent danger block
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 3, screenY + 5, w, h);

    // Bottom depth face
    ctx.fillStyle = 'rgba(60,15,15,0.5)';
    ctx.fillRect(x, screenY + h - depth, w, depth);

    // Main face
    ctx.fillStyle = 'rgba(80,30,30,0.55)';
    ctx.fillRect(x, screenY, w, h - depth);

    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x + 1, screenY + 1, w - 2, h - 2);
    ctx.setLineDash([]);

    // X cross
    ctx.strokeStyle = 'rgba(255,80,80,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, screenY + 8);
    ctx.lineTo(x + w - 8, screenY + h - 8);
    ctx.moveTo(x + w - 8, screenY + 8);
    ctx.lineTo(x + 8, screenY + h - 8);
    ctx.stroke();

  } else if (!p.fake && reveal) {
    // Revealed safe platform — green-tinted stone block
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 3, screenY + depth + 3, w, h - depth);

    // Bottom depth
    ctx.fillStyle = '#3a5530';
    ctx.fillRect(x, screenY + h - depth, w, depth);

    // Main face
    ctx.fillStyle = '#4a7040';
    ctx.fillRect(x, screenY, w, h - depth);

    // Top highlight
    const topGrad = ctx.createLinearGradient(x, screenY, x, screenY + 10);
    topGrad.addColorStop(0, '#5a8850');
    topGrad.addColorStop(1, '#4a7040');
    ctx.fillStyle = topGrad;
    ctx.fillRect(x, screenY, w, 10);

    // Green glow border
    ctx.strokeStyle = '#44ff88';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, screenY - 1, w + 2, h + 2);

    // Checkmark
    ctx.strokeStyle = 'rgba(80,255,120,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const cx = x + w / 2, cy = screenY + (h - depth) / 2;
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx - 2, cy + 7);
    ctx.lineTo(cx + 10, cy - 7);
    ctx.stroke();

  } else {
    // Normal stone platform — 3D block with brick texture

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 4, screenY + depth + 4, w, h - depth);

    // Bottom depth face — darkest
    ctx.fillStyle = '#4a3828';
    ctx.fillRect(x, screenY + h - depth, w, depth);

    // Main face
    ctx.fillStyle = PLATFORM_REAL_COLOR;
    ctx.fillRect(x, screenY, w, h - depth);

    // Top surface gradient highlight
    const topGrad = ctx.createLinearGradient(x, screenY, x, screenY + 12);
    topGrad.addColorStop(0, PLATFORM_REAL_TOP);
    topGrad.addColorStop(1, PLATFORM_REAL_COLOR);
    ctx.fillStyle = topGrad;
    ctx.fillRect(x, screenY, w, 12);

    // Brick mortar texture
    const faceH = h - depth;
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;

    // Horizontal mortar line
    if (faceH > 20) {
      const mortarY = screenY + Math.floor(faceH * 0.45);
      ctx.beginPath();
      ctx.moveTo(x + 3, mortarY);
      ctx.lineTo(x + w - 3, mortarY);
      ctx.stroke();

      // Top row brick dividers
      for (let bx = x + 20; bx < x + w - 8; bx += 24) {
        ctx.beginPath();
        ctx.moveTo(bx, screenY + 4);
        ctx.lineTo(bx, mortarY);
        ctx.stroke();
      }
      // Bottom row brick dividers (offset)
      for (let bx = x + 10; bx < x + w - 8; bx += 24) {
        ctx.beginPath();
        ctx.moveTo(bx, mortarY);
        ctx.lineTo(bx, screenY + faceH - 2);
        ctx.stroke();
      }
    }

    // Top edge highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 1, screenY + 0.5);
    ctx.lineTo(x + w - 1, screenY + 0.5);
    ctx.stroke();

    // Left edge subtle highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.moveTo(x + 0.5, screenY + 1);
    ctx.lineTo(x + 0.5, screenY + faceH - 1);
    ctx.stroke();

    // Bottom edge shadow on main face
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.moveTo(x, screenY + faceH - 0.5);
    ctx.lineTo(x + w, screenY + faceH - 0.5);
    ctx.stroke();

    // Depth face top edge (seam between front and bottom faces)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.moveTo(x, screenY + h - depth + 0.5);
    ctx.lineTo(x + w, screenY + h - depth + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer() {
  const ctx = G.ctx;
  if (G.gameState === 'falling') return;

  // Offset to center emoji on platform front face
  // G.player.y = plat.y - 16; platform face center = plat.y + (PLAT_H - 7) / 2
  const drawOffsetY = (PLAT_H - 7) / 2 + 16;

  let px = G.player.x;
  let py = G.player.y - G.camera.y;
  let scaleX = 1, scaleY = 1;
  let shadowY;

  // Platform bob when standing
  let bob = 0;
  if (!G.jumpAnim.active && G.player.onPlatform) {
    bob = G.player.onPlatform.bobOffset || 0;
  }

  if (G.jumpAnim.active) {
    const t = G.jumpAnim.t;
    px = G.jumpAnim.startX + (G.jumpAnim.endX - G.jumpAnim.startX) * t;
    const linearY = G.jumpAnim.startY + (G.jumpAnim.endY - G.jumpAnim.startY) * t;
    const arcH = -70 * Math.sin(t * Math.PI);
    py = linearY + arcH - G.camera.y;

    // Shadow stays at ground level (interpolated between platforms)
    shadowY = (G.jumpAnim.startY + (G.jumpAnim.endY - G.jumpAnim.startY) * t) - G.camera.y + 16;

    // Squash/stretch: stretch vertically at peak, squash on takeoff/landing
    const airPhase = Math.sin(t * Math.PI);
    scaleX = 1 - 0.12 * airPhase;
    scaleY = 1 + 0.18 * airPhase;
  } else {
    shadowY = py + 16 + bob;
  }

  const charData = CHARACTERS.find(c => c.id === G.heroChoice);

  // Ground shadow on platform surface
  const shadowScale = G.jumpAnim.active ? 0.4 + 0.6 * (1 - Math.sin(G.jumpAnim.t * Math.PI)) : 1;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(px, shadowY, 14 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Player emoji — bigger and fully opaque, centered on platform face
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.translate(px, py + drawOffsetY + bob);
  ctx.scale(scaleX, scaleY);
  ctx.font = '36px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(charData.emoji, 0, 0);
  ctx.restore();
}

function drawRescueCharacter() {
  const ctx = G.ctx;
  if (G.platforms.length === 0) return;
  const lastRow = G.platforms[G.platforms.length - 1];
  const goalPlat = lastRow[G.safePath[G.safePath.length - 1]];
  if (!goalPlat) return;
  const gx = goalPlat.x + goalPlat.w / 2;
  const gy = goalPlat.y - 20 - G.camera.y;
  if (gy < -50 || gy > CANVAS_H + 50) return;

  const charData = CHARACTERS.find(c => c.id === G.rescueChoice);
  const floatY = Math.sin(G.lavaTime * 3) * 5;

  ctx.fillStyle = 'rgba(255,100,100,0.3)';
  ctx.beginPath();
  ctx.arc(gx, gy + floatY, 25 + Math.sin(G.lavaTime * 4) * 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(charData.emoji, gx, gy + floatY);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('Help!', gx, gy + floatY - 24);
}

// Update particle physics — called from scene update(), not render
function updateParticles(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += (p.gravity !== undefined ? p.gravity : 0.15);
    p.life -= 0.02;
    if (p.life <= 0) { G.particles.splice(i, 1); }
  }
}

// Render particles — read-only, no state mutation
function drawParticles() {
  const ctx = G.ctx;
  for (let i = 0; i < G.particles.length; i++) {
    const p = G.particles[i];
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    if (p.round) {
      ctx.beginPath();
      ctx.arc(p.x, p.y - G.camera.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x, p.y - G.camera.y, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}

function spawnJumpDust(plat) {
  const cx = plat.x + plat.w / 2;
  const topY = plat.y;
  for (let i = 0; i < 6; i++) {
    G.particles.push({
      x: cx + (Math.random() - 0.5) * 24,
      y: topY + Math.random() * 3,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 1.2 - 0.3,
      size: 2 + Math.random() * 3,
      color: ['#998877', '#887766', '#aa9988'][Math.floor(Math.random() * 3)],
      life: 0.5 + Math.random() * 0.3,
      gravity: 0.02,
      round: true,
    });
  }
}

function spawnLandDust(plat) {
  const cx = plat.x + plat.w / 2;
  const topY = plat.y;
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
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
