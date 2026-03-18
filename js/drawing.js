// ─── DRAWING ────────────────────────────────────────────────────
// Pure rendering functions — no state mutation, no particle spawning.

function drawEmoji(ctx, emoji, x, y, size) {
  ctx.font = size + 'px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 8;
  ctx.fillText(emoji, x, y);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  // Double draw for stronger/crisper appearance
  ctx.fillText(emoji, x, y);
  ctx.fillText(emoji, x, y);
}

// Internal: render all lava layers to the given context.
function _renderLavaLayers(ctx, drawH, t, offsetY) {
  // Layer 1: Deep dark base
  for (let y = 0; y < drawH; y += 3) {
    const r = 60 + Math.sin(y * 0.01 + t * 0.3) * 15;
    const g = 5 + Math.sin(y * 0.015 + t * 0.2) * 5;
    ctx.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},0)`;
    ctx.fillRect(0, y, CANVAS_W, 4);
  }

  // Layer 2: Flowing lava rivers — organic Perlin-like bands
  // Step sizes increased (x: 6→8, y: 2→3) to halve iteration count.
  // Rect size expanded (7×3 → 9×4) so tiles remain gap-free.
  for (let y = 0; y < drawH; y += 3) {
    for (let x = 0; x < CANVAS_W; x += 8) {
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
        ctx.fillRect(x, y, 9, 4);
      } else if (combined > -0.1) {
        const edge = (combined + 0.1) / 0.2;
        const r = Math.floor(80 + edge * 60);
        ctx.fillStyle = `rgba(${r},8,0,0.5)`;
        ctx.fillRect(x, y, 9, 4);
      }
    }
  }

  // Layer 3: Jagged lava cracks — lava oozes through branching fissures
  for (let i = 0; i < 8; i++) {
    const seed = i * 47.3;
    // Crack origin drifts slowly
    let cx = (Math.sin(t * 0.15 + seed) * 0.3 + 0.5) * CANVAS_W;
    let cy = (Math.cos(t * 0.12 + seed * 1.3) * 0.3 + 0.5) * drawH;
    // Main crack direction drifts over time
    let dir = Math.sin(t * 0.2 + seed * 2.1) * Math.PI * 0.8;
    const segments = 25 + Math.floor(Math.sin(seed) * 10);

    ctx.lineWidth = 1;
    for (let s = 0; s < segments; s++) {
      // Jagged direction changes
      dir += (Math.sin(s * 1.7 + seed + t * 0.3) * 0.8 +
              Math.cos(s * 0.9 + seed * 3) * 0.4);
      const stepLen = 4 + Math.sin(s * 0.5 + seed) * 2;
      const nx = cx + Math.cos(dir) * stepLen;
      const ny = cy + Math.sin(dir) * stepLen;
      if (nx < -10 || nx > CANVAS_W + 10 || ny < -10 || ny > drawH + 10) break;

      // Pulsing ooze brightness
      const pulse = 0.5 + Math.sin(t * 1.5 + s * 0.3 + seed) * 0.5;
      const bright = (1 - s / segments) * pulse;
      const width = 1.5 + bright * 3;

      // Outer glow (orange)
      ctx.strokeStyle = `rgba(255,120,20,${bright * 0.4})`;
      ctx.lineWidth = width + 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      // Hot core (bright yellow-white)
      ctx.strokeStyle = `rgba(255,${Math.floor(200 + bright * 55)},${Math.floor(bright * 80)},${bright * 0.7})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      // Branch off occasionally
      if (s > 3 && s % 5 === 0 && i < 6) {
        const branchDir = dir + (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.sin(seed + s) * 0.5);
        let bx = nx, by = ny;
        for (let b = 0; b < 8; b++) {
          const bnx = bx + Math.cos(branchDir + Math.sin(b * 1.2 + seed) * 0.6) * 3.5;
          const bny = by + Math.sin(branchDir + Math.cos(b * 0.8 + seed) * 0.6) * 3.5;
          const bb = bright * (1 - b / 8) * 0.6;
          ctx.strokeStyle = `rgba(255,160,40,${bb * 0.5})`;
          ctx.lineWidth = 1 + bb * 2;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bnx, bny);
          ctx.stroke();
          bx = bnx;
          by = bny;
        }
      }

      cx = nx;
      cy = ny;
    }
  }

  // Layer 4: Lava spurts — small eruptions from crack points
  for (let i = 0; i < 5; i++) {
    const seed = i * 91.3;
    const cycle = (t * 0.6 + seed) % 4; // 4-second cycle
    if (cycle > 1.2) continue; // active for 1.2s of each 4s cycle
    const phase = cycle / 1.2;
    const sx = (Math.sin(seed * 3.7) * 0.5 + 0.5) * CANVAS_W;
    const sy = (Math.cos(seed * 2.3) * 0.5 + 0.5) * drawH;
    const intensity = phase < 0.3 ? phase / 0.3 : (1 - phase) / 0.7;

    // Spurt glow
    const glowR = 15 + intensity * 20;
    ctx.fillStyle = `rgba(255,100,0,${intensity * 0.15})`;
    ctx.beginPath();
    ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Rising droplets from spurt
    for (let d = 0; d < 6; d++) {
      const dSeed = d * 37.1 + seed;
      const angle = Math.sin(dSeed) * 0.8 - Math.PI / 2;
      const dist = phase * (20 + Math.sin(dSeed * 2) * 10);
      const dx = sx + Math.cos(angle + Math.sin(dSeed * 0.5) * 0.5) * dist * 0.6;
      const dy = sy + Math.sin(angle) * dist + dist * dist * 0.02; // gravity arc
      const dAlpha = intensity * (1 - d / 6);
      ctx.fillStyle = `rgba(255,${Math.floor(180 + d * 10)},${Math.floor(30 + d * 8)},${dAlpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(dx, dy, 1.5 + intensity * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Layer 5: Glowing embers / sparks rising
  for (let i = 0; i < 20; i++) {
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

  // Layer 6: Large slow bubbles
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

  // Layer 7: Heat haze shimmer overlay
  ctx.fillStyle = 'rgba(255,60,0,0.04)';
  for (let y = 0; y < drawH; y += 12) {
    const wobble = Math.sin(y * 0.05 + t * 2) * 8;
    ctx.fillRect(wobble, y, CANVAS_W, 6);
  }
}

function drawLava(offsetY, height) {
  const drawH = height || CANVAS_H;
  const t = G.lavaTime;

  // For the standard viewport height (playing/falling/won/menu scenes), render lava
  // to an offscreen canvas and only re-draw every 3 frames. The animation runs at
  // ~20fps instead of 60fps — imperceptible for slow-moving lava — saving ~66% of
  // the most expensive per-frame work.
  if (drawH === CANVAS_H) {
    if (!G.lavaCache) {
      G.lavaCache = document.createElement('canvas');
      G.lavaCache.width = CANVAS_W;
      G.lavaCache.height = CANVAS_H;
      G.lavaCacheCtx = G.lavaCache.getContext('2d');
    }
    G.lavaFrameCount++;
    if (G.lavaFrameCount % 3 === 0) {
      G.lavaCacheCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      _renderLavaLayers(G.lavaCacheCtx, drawH, t, offsetY);
    }
    G.ctx.drawImage(G.lavaCache, 0, 0);
    return;
  }

  // Memorize scene or non-standard height: render directly (scaled context).
  _renderLavaLayers(G.ctx, drawH, t, offsetY);
}

function drawPlatform(p, reveal) {
  const ctx = G.ctx;
  // Idle float — each platform gently bobs as if floating on lava
  const idleBob = reveal ? 0 : Math.sin(G.lavaTime * 1.2 + p.x * 0.03 + p.y * 0.02) * 1.5;
  const screenY = p.y - G.camera.y + (p.bobOffset || 0) + idleBob;
  if (!reveal && (screenY < -80 || screenY > CANVAS_H + 80)) return;

  let ox = 0, oy = 0;
  if (p.crumbling) {
    ox = (Math.random() - 0.5) * 4;
    oy = p.crumbleTimer * 2;
  }

  ctx.save();
  ctx.translate(ox, oy);

  const x = p.x, w = p.w, h = p.h;
  const depth = PLAT_DEPTH;

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
    // Revealed safe platform — green-tinted stone block with pulsing glow
    const glowPulse = 8 + Math.sin(G.lavaTime * 4 + p.x * 0.01) * 5;
    ctx.shadowColor = '#44ff88';
    ctx.shadowBlur = glowPulse;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 3, screenY + depth + 3, w, h - depth);

    // Bottom depth
    ctx.fillStyle = '#3a5530';
    ctx.fillRect(x, screenY + h - depth, w, depth);

    // Main face
    ctx.fillStyle = '#4a7040';
    ctx.fillRect(x, screenY, w, h - depth);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

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
    // Normal stone platform — realistic 3D floating stone block

    // Seed for deterministic per-platform variation
    const seed = p.x * 7.3 + p.y * 13.1;

    // Lava glow from underneath — platform is floating in lava
    const underGlow = 0.15 + Math.sin(G.lavaTime * 2 + seed * 0.01) * 0.08;
    ctx.fillStyle = `rgba(255,80,0,${underGlow})`;
    ctx.fillRect(x - 3, screenY + h - 1, w + 6, 8);
    ctx.fillStyle = `rgba(255,120,20,${underGlow * 0.5})`;
    ctx.fillRect(x - 5, screenY + h + 3, w + 10, 5);

    // Drop shadow (softened by lava glow)
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 3, screenY + depth + 3, w + 1, h - depth + 1);

    // Bottom depth face — darkest, with lava-lit warmth
    const depthGrad = ctx.createLinearGradient(x, screenY + h - depth, x, screenY + h);
    depthGrad.addColorStop(0, '#4a3828');
    depthGrad.addColorStop(1, '#5a3020');
    ctx.fillStyle = depthGrad;
    ctx.fillRect(x, screenY + h - depth, w, depth);

    // Main face — vertical gradient for natural stone look
    const faceH = h - depth;
    const mainGrad = ctx.createLinearGradient(x, screenY, x, screenY + faceH);
    mainGrad.addColorStop(0, PLATFORM_REAL_TOP);
    mainGrad.addColorStop(0.15, PLATFORM_REAL_COLOR);
    mainGrad.addColorStop(0.85, '#5a4433');
    mainGrad.addColorStop(1, '#4a3828');
    ctx.fillStyle = mainGrad;
    ctx.fillRect(x, screenY, w, faceH);

    // Rough stone noise texture — deterministic patches
    for (let i = 0; i < 6; i++) {
      const ns = Math.sin(seed + i * 47.3) * 0.5 + 0.5;
      const nx = x + ns * (w - 10) + 2;
      const ny = screenY + (Math.cos(seed + i * 23.7) * 0.5 + 0.5) * (faceH - 8) + 2;
      const nw = 6 + ns * 10;
      const nh = 4 + Math.sin(seed + i * 11) * 3;
      const dark = Math.sin(seed + i * 31) > 0;
      ctx.fillStyle = dark ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(nx, ny, nw, nh);
    }

    // Brick mortar lines
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 1;

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

    // Weathering cracks — thin dark lines for worn stone look
    for (let i = 0; i < 3; i++) {
      const cs = Math.sin(seed + i * 67.1);
      if (cs < 0.1) continue; // skip some cracks
      const cx1 = x + (cs * 0.5 + 0.5) * w;
      const cy1 = screenY + Math.abs(Math.cos(seed + i * 41)) * faceH * 0.3 + 4;
      const cx2 = cx1 + Math.sin(seed + i * 19) * 12;
      const cy2 = cy1 + 6 + Math.abs(Math.cos(seed + i * 53)) * 10;
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx1, cy1);
      ctx.lineTo(cx2, cy2);
      ctx.stroke();
    }

    // Small moss/lichen patches on some platforms
    if (Math.sin(seed * 3.7) > 0.3) {
      const mx = x + (Math.sin(seed * 5.1) * 0.5 + 0.5) * (w - 14) + 4;
      const my = screenY + 3 + Math.abs(Math.cos(seed * 2.3)) * 6;
      ctx.fillStyle = 'rgba(80,120,60,0.2)';
      ctx.beginPath();
      ctx.ellipse(mx, my, 5 + Math.sin(seed) * 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top edge highlight — bright rim light
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 1, screenY + 0.5);
    ctx.lineTo(x + w - 1, screenY + 0.5);
    ctx.stroke();

    // Left edge subtle highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(x + 0.5, screenY + 1);
    ctx.lineTo(x + 0.5, screenY + faceH - 1);
    ctx.stroke();

    // Right edge shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.moveTo(x + w - 0.5, screenY + 1);
    ctx.lineTo(x + w - 0.5, screenY + faceH - 1);
    ctx.stroke();

    // Bottom edge shadow on main face
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.moveTo(x, screenY + faceH - 0.5);
    ctx.lineTo(x + w, screenY + faceH - 0.5);
    ctx.stroke();

    // Depth face top edge (seam between front and bottom)
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.moveTo(x, screenY + h - depth + 0.5);
    ctx.lineTo(x + w, screenY + h - depth + 0.5);
    ctx.stroke();

    // Molten edge glow — lava seeping along the bottom edges
    const edgeGlow = 0.2 + Math.sin(G.lavaTime * 3 + seed * 0.02) * 0.1;
    ctx.strokeStyle = `rgba(255,100,20,${edgeGlow})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, screenY + h - 0.5);
    ctx.lineTo(x + w, screenY + h - 0.5);
    ctx.stroke();

    // Lava proximity heat glow on lower platforms
    const heatFactor = Math.max(0, 1 - (CANVAS_H - screenY) / (CANVAS_H * 0.4));
    if (heatFactor > 0) {
      ctx.fillStyle = `rgba(255,80,0,${heatFactor * 0.3})`;
      ctx.fillRect(x, screenY + h - depth - 2, w, depth + 4);
    }
  }
  ctx.restore();
}

function drawPlayer() {
  const ctx = G.ctx;
  if (G.gameState === 'falling') return;

  const drawOffsetY = (PLAT_H - PLAT_DEPTH) / 2 + PLAYER_Y_OFFSET;

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
    const arcH = JUMP_ARC_HEIGHT * Math.sin(t * Math.PI);
    py = linearY + arcH - G.camera.y;

    // Shadow stays at ground level (interpolated between platforms)
    shadowY = (G.jumpAnim.startY + (G.jumpAnim.endY - G.jumpAnim.startY) * t) - G.camera.y + PLAYER_Y_OFFSET;

    // Squash/stretch: stretch vertically at peak, squash on takeoff/landing
    const airPhase = Math.sin(t * Math.PI);
    scaleX = 1 - SQUASH_X * airPhase;
    scaleY = 1 + STRETCH_Y * airPhase;
  } else {
    shadowY = py + PLAYER_Y_OFFSET + bob;
  }

  // Ground shadow on platform surface
  const shadowScale = G.jumpAnim.active ? 0.4 + 0.6 * (1 - Math.sin(G.jumpAnim.t * Math.PI)) : 1;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(px, shadowY, 14 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Player emoji — large, fully opaque, centered on platform face
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.translate(px, py + drawOffsetY + bob);
  ctx.scale(scaleX, scaleY);
  drawEmoji(ctx, G.heroChar.emoji, 0, 0, EMOJI_SIZE);
  ctx.restore();
}

function drawRescueCharacter(noClip) {
  const ctx = G.ctx;
  if (G.platforms.length === 0) return;
  const lastRow = G.platforms[G.platforms.length - 1];
  const goalPlat = lastRow[G.safePath[G.safePath.length - 1]];
  if (!goalPlat) return;
  const gx = goalPlat.x + goalPlat.w / 2;
  const gy = goalPlat.y + (PLAT_H - PLAT_DEPTH) / 2 - G.camera.y;
  if (!noClip && (gy < -50 || gy > CANVAS_H + 50)) return;

  const floatY = Math.sin(G.lavaTime * 3) * 5;

  // SOS expanding rings
  for (let i = 0; i < 3; i++) {
    const phase = (G.lavaTime * 0.8 + i * 0.33) % 1;
    const ringR = 20 + phase * 40;
    const ringAlpha = (1 - phase) * 0.4;
    ctx.strokeStyle = `rgba(255,100,100,${ringAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gx, gy + floatY, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Sparkle particles around rescue character
  for (let i = 0; i < 3; i++) {
    const angle = G.lavaTime * 1.5 + i * (Math.PI * 2 / 3);
    const sparkR = 28 + Math.sin(G.lavaTime * 2 + i) * 6;
    const sx = gx + Math.cos(angle) * sparkR;
    const sy = gy + floatY + Math.sin(angle) * sparkR * 0.6;
    const sparkAlpha = 0.5 + Math.sin(G.lavaTime * 5 + i * 2) * 0.3;
    ctx.globalAlpha = sparkAlpha;
    drawEmoji(ctx, '\u2728', sx, sy, 12);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(255,100,100,0.5)';
  ctx.beginPath();
  ctx.arc(gx, gy + floatY, 34 + Math.sin(G.lavaTime * 4) * 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  drawEmoji(ctx, G.rescueChar.emoji, gx, gy + floatY, EMOJI_SIZE);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Help!', gx, gy + floatY - 36);
}

// Update particle physics — called from scene update(), not render
function updateParticles(dt) {
  let i = 0;
  while (i < G.particles.length) {
    const p = G.particles[i];
    if (p.confetti) {
      p.rotation += p.rotSpeed * dt;
      p.wobble += p.wobbleSpeed * dt;
      p.vx += Math.sin(p.wobble) * 0.15;
      p.vx *= 0.98;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.vy += (p.gravity !== undefined ? p.gravity : 0.15);
    p.life -= 0.02;
    if (p.life <= 0) {
      // Swap with last element and pop — O(1) removal vs O(n) splice
      G.particles[i] = G.particles[G.particles.length - 1];
      G.particles.pop();
      // Don't increment i: the swapped element at position i needs to be checked
    } else {
      i++;
    }
  }
}

// Render particles — read-only, no state mutation
function drawParticles() {
  const ctx = G.ctx;
  for (let i = 0; i < G.particles.length; i++) {
    const p = G.particles[i];
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    if (p.confetti) {
      const sx = p.y - G.camera.y;
      ctx.save();
      ctx.translate(p.x, sx);
      if (p.confettiShape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.confettiShape === 'streamer') {
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.streamerLen / 2, -p.size / 2, p.streamerLen, p.size);
      } else {
        const scaleX = Math.cos(p.rotation);
        ctx.scale(scaleX, 1);
        ctx.fillRect(-p.size / 2, -p.size * p.aspect / 2, p.size, p.size * p.aspect);
      }
      ctx.restore();
    } else if (p.round) {
      ctx.beginPath();
      ctx.arc(p.x, p.y - G.camera.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x, p.y - G.camera.y, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}

function updateTrailMarks(dt) {
  for (let i = G.trailMarks.length - 1; i >= 0; i--) {
    G.trailMarks[i].life -= dt * TRAIL_FADE_RATE;
    if (G.trailMarks[i].life <= 0) G.trailMarks.splice(i, 1);
  }
}

function drawTrailMarks() {
  const ctx = G.ctx;
  for (const m of G.trailMarks) {
    const screenY = m.y - G.camera.y;
    if (screenY < -30 || screenY > CANVAS_H + 30) continue;

    const a = m.life;
    const pulse = 0.8 + Math.sin(G.lavaTime * 4 + m.x * 0.05) * 0.2;
    const r = 8 + (1 - a) * 4;

    // Outer glow
    ctx.globalAlpha = a * 0.25 * pulse;
    ctx.fillStyle = '#ffaa44';
    ctx.beginPath();
    ctx.arc(m.x, screenY, r + 6, 0, Math.PI * 2);
    ctx.fill();

    // Mid glow
    ctx.globalAlpha = a * 0.4 * pulse;
    ctx.fillStyle = '#ffcc66';
    ctx.beginPath();
    ctx.arc(m.x, screenY, r, 0, Math.PI * 2);
    ctx.fill();

    // Bright core
    ctx.globalAlpha = a * 0.7;
    ctx.fillStyle = '#ffeecc';
    ctx.beginPath();
    ctx.arc(m.x, screenY, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

// ─── SCENE TRANSITION (CSS GPU-accelerated) ──────────────────
// Uses a DOM overlay with CSS transitions for smooth, jank-free fades.
// The scene swap happens during the opaque frame, hiding any setup cost.

function transitionTo(scene) {
  if (G.transition.active) return; // prevent double-fire
  G.transition.active = true;
  G.transition.nextScene = scene;

  const overlay = document.getElementById('transition-overlay');
  if (!overlay) {
    // Fallback: instant swap if overlay missing (e.g. tests)
    SceneManager.replace(scene);
    G.transition.active = false;
    return;
  }

  // Phase 1: fade to black
  overlay.classList.add('fade-out');

  const doSwap = () => {
    // Swap scene while screen is black — hides all setup cost
    SceneManager.replace(G.transition.nextScene);
    // Phase 2: fade from black (rAF ensures scene has rendered once)
    requestAnimationFrame(() => {
      overlay.classList.remove('fade-out');
      const cleanup = () => {
        overlay.removeEventListener('transitionend', cleanup);
        G.transition.active = false;
      };
      overlay.addEventListener('transitionend', cleanup);
      // Safety: ensure cleanup even if transitionend doesn't fire
      setTimeout(cleanup, 400);
    });
  };

  const onFadedOut = () => {
    overlay.removeEventListener('transitionend', onFadedOut);
    doSwap();
  };
  overlay.addEventListener('transitionend', onFadedOut);
  // Safety: if transitionend doesn't fire (e.g. duration 0), force swap
  setTimeout(() => {
    if (G.transition.active && G.transition.nextScene === scene) {
      overlay.removeEventListener('transitionend', onFadedOut);
      doSwap();
    }
  }, 400);
}

// No-ops kept for backward compat — scenes still call these but they do nothing now
function updateTransition(dt) {}
function drawTransition() {}

// ─── STREAK POPUPS ────────────────────────────────────────────
function updateStreakPopups(dt) {
  for (let i = G.streakPopups.length - 1; i >= 0; i--) {
    G.streakPopups[i].timer -= dt;
    if (G.streakPopups[i].timer <= 0) G.streakPopups.splice(i, 1);
  }
}

function drawStreakPopups() {
  const ctx = G.ctx;
  for (const p of G.streakPopups) {
    const alpha = Math.max(0, p.timer);
    const rise = (1 - p.timer) * 40;
    const scale = 1 + (1 - p.timer) * 0.3;
    const screenY = p.y - G.camera.y - rise;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, screenY);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(p.text, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ─── URGENCY VIGNETTE (memorize countdown) ────────────────────
function drawUrgencyVignette(intensity) {
  if (intensity <= 0) return;
  const ctx = G.ctx;
  const gradient = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.2,
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.8
  );
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, `rgba(180,0,0,${intensity * 0.35})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

// ─── LEVEL PREVIEW CARD ──────────────────────────────────────
function drawLevelPreview() {
  if (!G.levelPreview || G.levelPreview.timer <= 0) return;
  const ctx = G.ctx;
  const t = G.levelPreview.timer;
  const alpha = t < 0.3 ? t / 0.3 : 1;

  ctx.save();
  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,100,0,0.6)';
  ctx.shadowBlur = 20;
  ctx.fillText(`Level ${G.level}`, CANVAS_W / 2, CANVAS_H / 2 - 30);

  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#ffaa55';
  ctx.shadowBlur = 0;
  ctx.fillText(G.levelConfig ? G.levelConfig.name : '', CANVAS_W / 2, CANVAS_H / 2 + 15);

  // Grid size + difficulty indicator
  if (G.levelConfig) {
    const fires = Math.min(5, Math.ceil(G.levelConfig.fake * 7));
    const fireStr = '\uD83D\uDD25'.repeat(fires);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#cc8855';
    ctx.fillText(`${G.levelConfig.cols}\u00D7${G.levelConfig.rows}  ${fireStr}`, CANVAS_W / 2, CANVAS_H / 2 + 55);
  }

  ctx.restore();
}

// ─── TUTORIAL ARROW ──────────────────────────────────────────
function drawTutorialArrow() {
  if (!G.tutorialActive) return;
  const ctx = G.ctx;
  if (!G.safePath || G.safePath.length < 2) return;

  const curRow = G.player.row;
  const nextRowIdx = curRow + 1;
  if (nextRowIdx >= G.platforms.length) return;
  const nextRow = G.platforms[nextRowIdx];
  if (!nextRow) return;

  // Find the platform the player would actually land on (same logic as tryJump)
  let nearest = 0;
  let nearestDist = Infinity;
  for (let i = 0; i < nextRow.length; i++) {
    const platCenter = nextRow[i].x + nextRow[i].w / 2;
    const dist = Math.abs(platCenter - G.player.x);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = i;
    }
  }

  const plat = nextRow[nearest];
  if (!plat) return;

  // Determine hint text based on whether the landing is safe
  let hint;
  if (plat.fake) {
    // Landing column is fake — need to sidestep first
    const safeCol = G.safePath[nextRowIdx];
    const dir = safeCol < G.player.col ? '\u2190' : '\u2192';
    hint = `Hop ${dir} first!`;
    // Point at the safe column in current row instead
    const safeInCurRow = G.platforms[curRow][safeCol];
    if (!safeInCurRow) return;
    const tx = safeInCurRow.x + safeInCurRow.w / 2;
    const ty = safeInCurRow.y - G.camera.y - 20;
    const bobY = Math.sin(G.lavaTime * 4) * 8;
    drawTutorialHint(ctx, tx, ty + bobY, hint);
  } else {
    hint = G.isTouchDevice ? 'Tap to jump!' : 'Press \u2193 to jump!';
    const tx = plat.x + plat.w / 2;
    const ty = plat.y - G.camera.y - 20;
    const bobY = Math.sin(G.lavaTime * 4) * 8;
    drawTutorialHint(ctx, tx, ty + bobY, hint);
  }
}

function drawTutorialHint(ctx, tx, ty, text) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#44ff88';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(text, tx, ty - 30);

  // Arrow pointing down
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - 10, ty - 15);
  ctx.lineTo(tx + 10, ty - 15);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.restore();
}
