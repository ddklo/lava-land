// ─── DRAWING ────────────────────────────────────────────────────
// Pure rendering functions — no state mutation, no particle spawning.

// ─── COLOR STRING CACHES ────────────────────────────────────────
// Pre-built rgba/rgb strings to avoid per-frame string concatenation
// in hot rendering loops (lava layers, platform glow).
const _rgbCache = new Array(65536);
function _rgb(r, g) {
  const key = (r << 8) | g;
  return _rgbCache[key] || (_rgbCache[key] = `rgb(${r},${g},0)`);
}
const _rgbaCache = {};
function _rgba(r, g, b, a) {
  const key = `${r},${g},${b},${a}`;
  return _rgbaCache[key] || (_rgbaCache[key] = `rgba(${r},${g},${b},${a})`);
}
// Platform gradient cache — keyed by platform identity + screenY
const _platGradCache = new WeakMap();

// ─── FONT STRING CACHES ─────────────────────────────────────────
// Avoid per-frame string concatenation for commonly used fonts.
const _fontCache = {};
function _font(size, style) {
  const key = style + size;
  return _fontCache[key] || (_fontCache[key] = size + 'px ' + style);
}
const FONT_COIN = 'bold 19px "Nunito", sans-serif';
const FONT_HELP = 'bold 21px "Nunito", sans-serif';
const FONT_ALMOST = '800 38px "Nunito", sans-serif';
const FONT_ALMOST_SUB = '600 24px "Nunito", sans-serif';
const FONT_STEP = 'bold 15px "Nunito", sans-serif';
const FONT_STREAK = '800 29px "Nunito", sans-serif';
const FONT_TUTORIAL = '800 21px "Nunito", sans-serif';

// ─── PLATFORM TEXTURE CACHE ─────────────────────────────────────
// Pre-render static platform visuals to offscreen canvases once per level.
// During gameplay, drawImage() replaces expensive per-frame gradient creation
// and deterministic detail rendering (stone texture, mortar, cracks, moss).
const _PLAT_PAD = 6; // padding around cached platform for shadow overflow

function drawEmoji(ctx, emoji, x, y, size) {
  ctx.font = _font(size, 'serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (G.perfMode === 'minimal') {
    ctx.fillText(emoji, x, y);
  } else if (G.perfMode === 'low') {
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 2;
    ctx.fillText(emoji, x, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 8;
    ctx.fillText(emoji, x, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    // Double draw for stronger/crisper appearance
    ctx.fillText(emoji, x, y);
    ctx.fillText(emoji, x, y);
  }
}

// Internal: render all lava layers to the given context.
function _renderLavaLayers(ctx, drawH, t, offsetY) {
  const p = palette();

  // Layer 1: Deep dark base
  for (let y = 0; y < drawH; y += 3) {
    const r = Math.floor(p.lavaBaseR + Math.sin(y * 0.01 + t * 0.3) * 15);
    const g = Math.floor(p.lavaBaseG + Math.sin(y * 0.015 + t * 0.2) * 5);
    ctx.fillStyle = _rgb(r, g);
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
        const r = Math.floor(p.lavaFlowHotR + intensity * 55);
        const g = Math.floor(p.lavaFlowHotG + intensity * 140);
        const b = Math.floor(p.lavaFlowHotB + intensity * 30);
        const a = (0.4 + intensity * 0.6).toFixed(2);
        ctx.fillStyle = _rgba(r, g, b, a);
        ctx.fillRect(x, y, 9, 4);
      } else if (combined > -0.1) {
        const edge = (combined + 0.1) / 0.2;
        const r = Math.floor(p.lavaFlowEdgeR + edge * 60);
        ctx.fillStyle = _rgba(r, p.lavaFlowEdgeG, p.lavaFlowEdgeB, 0.5);
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

      // Outer glow
      ctx.strokeStyle = `rgba(${p.lavaCrackOuter},${(bright * 0.4).toFixed(2)})`;
      ctx.lineWidth = width + 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      // Hot core
      ctx.strokeStyle = `rgba(${p.lavaCrackCore},${Math.floor(200 + bright * 55)},${Math.floor(bright * 80)},${(bright * 0.7).toFixed(2)})`;
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
          ctx.strokeStyle = `rgba(${p.lavaBranch},${(bb * 0.5).toFixed(2)})`;
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

  // Layers 4-6 skipped in low/minimal perf mode (keep base + rivers + cracks)
  if (G.perfMode !== 'high') {
    if (G.perfMode !== 'minimal') {
      // Layer 7 only: Heat haze shimmer overlay (cheap)
      ctx.fillStyle = p.lavaHaze;
      for (let y = 0; y < drawH; y += 12) {
        const wobble = Math.sin(y * 0.05 + t * 2) * 8;
        ctx.fillRect(wobble, y, CANVAS_W, 6);
      }
    }
    return;
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
    ctx.fillStyle = `rgba(${p.lavaSpurtGlow},${(intensity * 0.15).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Rising droplets from spurt
    const _db = p.lavaDropletBase;
    for (let d = 0; d < 6; d++) {
      const dSeed = d * 37.1 + seed;
      const angle = Math.sin(dSeed) * 0.8 - Math.PI / 2;
      const dist = phase * (20 + Math.sin(dSeed * 2) * 10);
      const dx = sx + Math.cos(angle + Math.sin(dSeed * 0.5) * 0.5) * dist * 0.6;
      const dy = sy + Math.sin(angle) * dist + dist * dist * 0.02; // gravity arc
      const dAlpha = intensity * (1 - d / 6);
      ctx.fillStyle = _rgba(_db[0], Math.floor(_db[1] + d * 10), Math.floor(_db[2] + d * 8), (dAlpha * 0.8).toFixed(2));
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
    ctx.fillStyle = `rgba(${p.lavaEmberGlow},${(flicker * 0.3).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(ex, ey - offsetY * 0.3, sz + 3, 0, Math.PI * 2);
    ctx.fill();
    // Core
    ctx.fillStyle = `rgba(${p.lavaEmberCore},${(flicker * 0.8).toFixed(2)})`;
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
    ctx.strokeStyle = `rgba(${p.lavaBubbleStroke},${(alpha * 0.4).toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx, by - offsetY * 0.2, br, 0, Math.PI * 2);
    ctx.stroke();
    // Bright center
    ctx.fillStyle = `rgba(${p.lavaBubbleFill},${(alpha * 0.25).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(bx, by - offsetY * 0.2, br * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Pop flash at end
    if (growPhase > 0.85) {
      ctx.fillStyle = `rgba(${p.lavaBubblePop},${((growPhase - 0.85) * 6).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(bx, by - offsetY * 0.2, br * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Layer 7: Heat haze shimmer overlay
  ctx.fillStyle = p.lavaHaze;
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
    const _lavaSkip = G.perfMode === 'minimal' ? LAVA_FRAME_SKIP_MINIMAL : 3;
    if (G.lavaFrameCount % _lavaSkip === 0) {
      G.lavaCacheCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      _renderLavaLayers(G.lavaCacheCtx, drawH, t, offsetY);
    }
    G.ctx.drawImage(G.lavaCache, 0, 0);
    return;
  }

  // Memorize scene: cache at the level-specific height, re-render every 3 frames.
  if (!G.lavaCacheMem || G.lavaCacheMem.height !== drawH) {
    G.lavaCacheMem = document.createElement('canvas');
    G.lavaCacheMem.width = CANVAS_W;
    G.lavaCacheMem.height = drawH;
    G.lavaCacheMemCtx = G.lavaCacheMem.getContext('2d');
    G.lavaMemFrameCount = 0;
  }
  G.lavaMemFrameCount++;
  const _lavaMemSkip = G.perfMode === 'minimal' ? LAVA_FRAME_SKIP_MINIMAL : 3;
  if (G.lavaMemFrameCount % _lavaMemSkip === 0 || G.lavaMemFrameCount === 1) {
    G.lavaCacheMemCtx.clearRect(0, 0, CANVAS_W, drawH);
    _renderLavaLayers(G.lavaCacheMemCtx, drawH, t, offsetY);
  }
  G.ctx.drawImage(G.lavaCacheMem, 0, 0);
}

// ─── STATIC PLATFORM RENDERERS (for offscreen cache) ────────────
// These draw the deterministic/static parts of each platform type
// to an offscreen canvas. Called once per level by cachePlatformTextures().

function _drawFakeRevealedStatic(ctx, tp, x, y, w, h, depth) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 3, y + 5, w, h);
  ctx.fillStyle = tp.fakeDepth;
  ctx.fillRect(x, y + h - depth, w, depth);
  ctx.fillStyle = tp.fakeFace;
  ctx.fillRect(x, y, w, h - depth);
  ctx.strokeStyle = tp.fakeBorder;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.setLineDash([]);
  ctx.strokeStyle = tp.fakeCross;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 8);
  ctx.lineTo(x + w - 8, y + h - 8);
  ctx.moveTo(x + w - 8, y + 8);
  ctx.lineTo(x + 8, y + h - 8);
  ctx.stroke();
}

function _drawSafeRevealedStatic(ctx, tp, x, y, w, h, depth) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 3, y + depth + 3, w, h - depth);
  ctx.fillStyle = tp.safeDepth;
  ctx.fillRect(x, y + h - depth, w, depth);
  ctx.fillStyle = tp.safeFace;
  ctx.fillRect(x, y, w, h - depth);
  const topGrad = ctx.createLinearGradient(x, y, x, y + 10);
  topGrad.addColorStop(0, tp.safeHighlight);
  topGrad.addColorStop(1, tp.safeFace);
  ctx.fillStyle = topGrad;
  ctx.fillRect(x, y, w, 10);
  ctx.strokeStyle = tp.safeGlow;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
  ctx.strokeStyle = tp.safeCheck;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const cx = x + w / 2, cy = y + (h - depth) / 2;
  ctx.moveTo(cx - 8, cy);
  ctx.lineTo(cx - 2, cy + 7);
  ctx.lineTo(cx + 10, cy - 7);
  ctx.stroke();
}

function _drawNormalStatic(ctx, tp, x, y, w, h, depth, seed) {
  const faceH = h - depth;
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 3, y + depth + 3, w + 1, faceH + 1);
  // Depth gradient
  const depthGrad = ctx.createLinearGradient(x, y + h - depth, x, y + h);
  depthGrad.addColorStop(0, tp.platDepthTop);
  depthGrad.addColorStop(1, tp.platDepthBot);
  ctx.fillStyle = depthGrad;
  ctx.fillRect(x, y + h - depth, w, depth);
  // Main face gradient
  const mainGrad = ctx.createLinearGradient(x, y, x, y + faceH);
  mainGrad.addColorStop(0, tp.platFaceTop);
  mainGrad.addColorStop(0.15, tp.platFaceMain);
  mainGrad.addColorStop(0.85, tp.platFaceMid);
  mainGrad.addColorStop(1, tp.platFaceBot);
  ctx.fillStyle = mainGrad;
  ctx.fillRect(x, y, w, faceH);
  // Decorative details (high perf only)
  if (G.perfMode !== 'low') {
    for (let i = 0; i < 6; i++) {
      const ns = Math.sin(seed + i * 47.3) * 0.5 + 0.5;
      const nx = x + ns * (w - 10) + 2;
      const ny = y + (Math.cos(seed + i * 23.7) * 0.5 + 0.5) * (faceH - 8) + 2;
      const nw = 6 + ns * 10;
      const nh = 4 + Math.sin(seed + i * 11) * 3;
      ctx.fillStyle = Math.sin(seed + i * 31) > 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(nx, ny, nw, nh);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 1;
    if (faceH > 20) {
      const mortarY = y + Math.floor(faceH * 0.45);
      ctx.beginPath();
      ctx.moveTo(x + 3, mortarY);
      ctx.lineTo(x + w - 3, mortarY);
      ctx.stroke();
      for (let bx = x + 20; bx < x + w - 8; bx += 24) {
        ctx.beginPath();
        ctx.moveTo(bx, y + 4);
        ctx.lineTo(bx, mortarY);
        ctx.stroke();
      }
      for (let bx = x + 10; bx < x + w - 8; bx += 24) {
        ctx.beginPath();
        ctx.moveTo(bx, mortarY);
        ctx.lineTo(bx, y + faceH - 2);
        ctx.stroke();
      }
    }
    for (let i = 0; i < 3; i++) {
      const cs = Math.sin(seed + i * 67.1);
      if (cs < 0.1) continue;
      const cx1 = x + (cs * 0.5 + 0.5) * w;
      const cy1 = y + Math.abs(Math.cos(seed + i * 41)) * faceH * 0.3 + 4;
      const cx2 = cx1 + Math.sin(seed + i * 19) * 12;
      const cy2 = cy1 + 6 + Math.abs(Math.cos(seed + i * 53)) * 10;
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx1, cy1);
      ctx.lineTo(cx2, cy2);
      ctx.stroke();
    }
    if (Math.sin(seed * 3.7) > 0.3) {
      const mx = x + (Math.sin(seed * 5.1) * 0.5 + 0.5) * (w - 14) + 4;
      const my = y + 3 + Math.abs(Math.cos(seed * 2.3)) * 6;
      ctx.fillStyle = tp.platMoss;
      ctx.beginPath();
      ctx.ellipse(mx, my, 5 + Math.sin(seed) * 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Edge highlights and shadows
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 1, y + 0.5);
  ctx.lineTo(x + w - 1, y + 0.5);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + 1);
  ctx.lineTo(x + 0.5, y + faceH - 1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.moveTo(x + w - 0.5, y + 1);
  ctx.lineTo(x + w - 0.5, y + faceH - 1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(x, y + faceH - 0.5);
  ctx.lineTo(x + w, y + faceH - 0.5);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.moveTo(x, y + h - depth + 0.5);
  ctx.lineTo(x + w, y + h - depth + 0.5);
  ctx.stroke();
}

// Pre-render all platform textures to offscreen canvases.
// Called once after generatePlatforms() during the fade-to-black overlay.
function cachePlatformTextures() {
  const tp = palette();
  const depth = PLAT_DEPTH;
  for (const row of G.platforms) {
    for (const plat of row) {
      const w = plat.w, h = plat.h;
      const cw = w + _PLAT_PAD * 2 + 6;
      const ch = h + _PLAT_PAD * 2 + 6;

      // Normal appearance cache (gameplay)
      const nc = document.createElement('canvas');
      nc.width = cw;
      nc.height = ch;
      _drawNormalStatic(nc.getContext('2d'), tp, _PLAT_PAD, _PLAT_PAD, w, h, depth, plat.x * 7.3 + plat.y * 13.1);
      plat._cache = nc;

      // Revealed appearance cache (memorize phase)
      const rc = document.createElement('canvas');
      rc.width = cw;
      rc.height = ch;
      if (plat.fake) {
        _drawFakeRevealedStatic(rc.getContext('2d'), tp, _PLAT_PAD, _PLAT_PAD, w, h, depth);
      } else {
        _drawSafeRevealedStatic(rc.getContext('2d'), tp, _PLAT_PAD, _PLAT_PAD, w, h, depth);
      }
      plat._cacheRevealed = rc;
    }
  }
}

function drawPlatform(plat, reveal) {
  const ctx = G.ctx;
  const tp = palette();
  const idleBob = reveal ? 0 : Math.sin(G.lavaTime * 1.2 + plat.x * 0.03 + plat.y * 0.02) * 1.5;
  const screenY = plat.y - G.camera.y + (plat.bobOffset || 0) + idleBob;
  if (!reveal && (screenY < -80 || screenY > CANVAS_H + 80)) return;

  let ox = 0, oy = 0;
  let crumbleAlpha = 1;
  if (plat.crumbling || plat.dissolving) {
    const timer = plat.crumbling ? plat.crumbleTimer : plat.dissolveTimer;
    ox = (Math.random() - 0.5) * 6;
    oy = timer * 6;
    crumbleAlpha = Math.max(0, 1 - timer * 3.5);
  }

  ctx.save();
  ctx.globalAlpha = crumbleAlpha;
  ctx.translate(ox, oy);

  const x = plat.x, w = plat.w, h = plat.h;
  const depth = PLAT_DEPTH;

  if (plat.fake && reveal) {
    if (plat._cacheRevealed) {
      ctx.drawImage(plat._cacheRevealed, x - _PLAT_PAD, screenY - _PLAT_PAD);
    } else {
      _drawFakeRevealedStatic(ctx, tp, x, screenY, w, h, depth);
    }

  } else if (!plat.fake && reveal) {
    // Dynamic: pulsing green glow (applied to cached image via shadowBlur)
    const glowPulse = G.perfMode === 'minimal' ? 3
      : G.perfMode === 'low'
      ? 3 + Math.sin(G.lavaTime * 4 + plat.x * 0.01) * 2
      : 8 + Math.sin(G.lavaTime * 4 + plat.x * 0.01) * 5;
    ctx.shadowColor = tp.safeGlow;
    ctx.shadowBlur = glowPulse;

    if (plat._cacheRevealed) {
      ctx.drawImage(plat._cacheRevealed, x - _PLAT_PAD, screenY - _PLAT_PAD);
    } else {
      _drawSafeRevealedStatic(ctx, tp, x, screenY, w, h, depth);
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

  } else {
    // Normal stone platform
    const seed = plat.x * 7.3 + plat.y * 13.1;

    // Dynamic: lava underglow
    const underGlow = (0.15 + Math.sin(G.lavaTime * 2 + seed * 0.01) * 0.08).toFixed(2);
    ctx.fillStyle = _rgba(tp.platUnderGlowR, tp.platUnderGlowG, tp.platUnderGlowB, underGlow);
    ctx.fillRect(x - 3, screenY + h - 1, w + 6, 8);
    ctx.fillStyle = _rgba(tp.platUnderGlowR, tp.platUnderGlowG + 40, tp.platUnderGlowB + 20, (underGlow * 0.5).toFixed(2));
    ctx.fillRect(x - 5, screenY + h + 3, w + 10, 5);

    // Static cached part
    if (plat._cache) {
      ctx.drawImage(plat._cache, x - _PLAT_PAD, screenY - _PLAT_PAD);
    } else {
      _drawNormalStatic(ctx, tp, x, screenY, w, h, depth, seed);
    }

    // Dynamic: molten edge glow
    const edgeGlow = (0.2 + Math.sin(G.lavaTime * 3 + seed * 0.02) * 0.1).toFixed(2);
    ctx.strokeStyle = _rgba(tp.platEdgeGlowR, tp.platEdgeGlowG, tp.platEdgeGlowB, edgeGlow);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, screenY + h - 0.5);
    ctx.lineTo(x + w, screenY + h - 0.5);
    ctx.stroke();

    // Dynamic: heat proximity glow
    const heatFactor = Math.max(0, 1 - (CANVAS_H - screenY) / (CANVAS_H * 0.4));
    if (heatFactor > 0) {
      ctx.fillStyle = _rgba(tp.heatGlowR, tp.heatGlowG, tp.heatGlowB, (heatFactor * 0.3).toFixed(2));
      ctx.fillRect(x, screenY + h - depth - 2, w, depth + 4);
    }

    // Dynamic: crumble / dissolve animation
    if (plat.crumbling || plat.dissolving) {
      const _timer = plat.crumbling ? plat.crumbleTimer : plat.dissolveTimer;
      const crumbleProgress = Math.min(1, _timer * 3.5);
      ctx.fillStyle = `rgba(${tp.crumbleWash},${(crumbleProgress * 0.65).toFixed(2)})`;
      ctx.fillRect(x, screenY, w, h - depth);
      ctx.strokeStyle = `rgba(${tp.crumbleCrack},${(crumbleProgress * 0.9).toFixed(2)})`;
      ctx.lineWidth = 1.5;
      const cx2 = x + w / 2, cy2 = screenY + (h - depth) / 2;
      for (let ci = 0; ci < 6; ci++) {
        const angle = (ci / 6) * Math.PI * 2 + 0.4;
        const len = (8 + ci * 4) * crumbleProgress;
        ctx.beginPath();
        ctx.moveTo(cx2, cy2);
        ctx.lineTo(cx2 + Math.cos(angle) * len, cy2 + Math.sin(angle) * len);
        ctx.stroke();
      }
      ctx.shadowColor = tp.crumbleGlow;
      ctx.shadowBlur = 12 * crumbleProgress;
      ctx.strokeStyle = `rgba(${tp.crumbleBorder},${(crumbleProgress * 0.8).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, screenY + 1, w - 2, h - depth - 2);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
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

  let airPhase = 0;
  if (G.jumpAnim.active) {
    const t = G.jumpAnim.t;
    airPhase = Math.sin(t * Math.PI);
    px = G.jumpAnim.startX + (G.jumpAnim.endX - G.jumpAnim.startX) * t;
    const linearY = G.jumpAnim.startY + (G.jumpAnim.endY - G.jumpAnim.startY) * t;
    py = linearY + JUMP_ARC_HEIGHT * airPhase - G.camera.y;

    shadowY = linearY - G.camera.y + PLAYER_Y_OFFSET;

    scaleX = 1 - SQUASH_X * airPhase;
    scaleY = 1 + STRETCH_Y * airPhase;
  } else {
    shadowY = py + PLAYER_Y_OFFSET + bob;
  }

  // Ground shadow on platform surface
  const shadowScale = G.jumpAnim.active ? 0.4 + 0.6 * (1 - airPhase) : 1;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(px, shadowY, 14 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Character color glow — semi-transparent halo in the hero's color
  const glowPulse = 0.25 + Math.sin(G.lavaTime * 2.5) * 0.08;
  ctx.save();
  ctx.globalAlpha = glowPulse;
  ctx.fillStyle = G.heroChar.color;
  ctx.beginPath();
  ctx.arc(px, py + drawOffsetY + bob, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Lean rotation during jump / idle rocking
  let jumpRotation = 0;

  // Idle breathing scale when grounded (subtle size oscillation)
  if (!G.jumpAnim.active) {
    const breathe = 1 + Math.sin(G.lavaTime * 2.2) * 0.04;
    scaleX *= breathe;
    scaleY *= breathe;
    // Idle rocking — gentle side-to-side tilt
    G.idleTimer += 0.016;
    jumpRotation = Math.sin(G.idleTimer * 1.8) * 0.06;
    // Periodic micro-hop every ~3 seconds
    G.idleBobPhase += 0.016;
    if (G.idleBobPhase > 3) G.idleBobPhase -= 3;
    if (G.idleBobPhase < 0.15) {
      const hopPhase = G.idleBobPhase / 0.15;
      bob -= Math.sin(hopPhase * Math.PI) * 3;
    }
  }

  // Landing squash: apply squash for a brief window after landing
  if (!G.jumpAnim.active && G.player.landTimer > 0) {
    const squashPhase = G.player.landTimer / LAND_SQUASH_DURATION;
    const squashAmt = Math.sin(squashPhase * Math.PI) * 0.3;
    scaleX *= 1 + squashAmt;
    scaleY *= 1 - squashAmt * 0.6;
  }

  // Lean rotation during jump based on horizontal travel direction
  if (G.jumpAnim.active) {
    const dx = G.jumpAnim.endX - G.jumpAnim.startX;
    jumpRotation = (dx !== 0 ? Math.sign(dx) : 0) * 0.22 * airPhase;
  }

  // Player emoji — large, fully opaque, centered on platform face
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.translate(px, py + drawOffsetY + bob);
  ctx.rotate(jumpRotation);
  if (G.player.facing === 'left') ctx.scale(-1, 1);
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

  // Proximity: 0 at start row, 1 when adjacent to rescue character
  const totalRows = Math.max(1, G.platforms.length - 1);
  const rowsFromEnd = totalRows - G.player.row;
  const proximity = Math.max(0, Math.min(1, 1 - rowsFromEnd / totalRows));

  // Scale animation parameters by proximity
  const floatSpeed = 3 + proximity * 4;
  const floatAmp = 5 + proximity * RESCUE_PROXIMITY_BOUNCE_MULT;
  const floatY = Math.sin(G.lavaTime * floatSpeed) * floatAmp;

  // SOS expanding rings — speed and size scale with proximity
  const rescueColor = G.rescueChar.color;
  const ringSpeed = 0.8 + proximity * 1.2;
  const ringMaxR = 30 + proximity * 30;
  for (let i = 0; i < 3; i++) {
    const phase = (G.lavaTime * ringSpeed + i * 0.33) % 1;
    const ringR = 15 + phase * ringMaxR;
    const ringAlpha = (1 - phase) * (0.3 + proximity * 0.4);
    ctx.save();
    ctx.globalAlpha = ringAlpha;
    ctx.strokeStyle = rescueColor;
    ctx.lineWidth = 2 + proximity * 1.5;
    ctx.beginPath();
    ctx.arc(gx, gy + floatY, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Sparkle particles — intensity scales with proximity
  const sparkleSpeed = 1.5 + proximity * 2;
  for (let i = 0; i < 3; i++) {
    const angle = G.lavaTime * sparkleSpeed + i * (Math.PI * 2 / 3);
    const sparkR = 28 + Math.sin(G.lavaTime * 2 + i) * 6;
    const sx = gx + Math.cos(angle) * sparkR;
    const sy = gy + floatY + Math.sin(angle) * sparkR * 0.6;
    const sparkAlpha = (0.3 + proximity * 0.4) + Math.sin(G.lavaTime * 5 + i * 2) * 0.3;
    ctx.globalAlpha = sparkAlpha;
    drawEmoji(ctx, '\u2728', sx, sy, 12);
  }
  ctx.globalAlpha = 1;

  // Character glow — radius grows with proximity
  const glowR = 34 + proximity * 12 + Math.sin(G.lavaTime * (4 + proximity * 3)) * 6;
  ctx.save();
  ctx.globalAlpha = 0.3 + proximity * 0.2;
  ctx.fillStyle = rescueColor;
  ctx.beginPath();
  ctx.arc(gx, gy + floatY, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Emoji with excitement pulse when close
  ctx.globalAlpha = 1;
  if (proximity > 0.7) {
    const pulse = 1 + Math.sin(G.lavaTime * 8) * 0.08 * proximity;
    ctx.save();
    ctx.translate(gx, gy + floatY);
    ctx.scale(pulse, pulse);
    drawEmoji(ctx, G.rescueChar.emoji, 0, 0, EMOJI_SIZE);
    ctx.restore();
  } else {
    drawEmoji(ctx, G.rescueChar.emoji, gx, gy + floatY, EMOJI_SIZE);
  }

  // "Help!" speech bubble — only when player is close
  if (rowsFromEnd <= RESCUE_HELP_ROWS && rowsFromEnd > 0) {
    const helpFade = Math.min(1, (RESCUE_HELP_ROWS - rowsFromEnd + 1) / 2);
    const bubbleY = gy + floatY - 44;
    const helpText = t('rescue.help');

    // Speech bubble background
    ctx.save();
    ctx.globalAlpha = helpFade * 0.85;
    ctx.font = FONT_HELP;
    const textW = ctx.measureText(helpText).width;
    const padX = 10, padY = 6, bubbleH = 22;
    const bx = gx - textW / 2 - padX;
    const by = bubbleY - bubbleH / 2 - padY;
    const bw = textW + padX * 2;
    const bh = bubbleH + padY * 2;
    const cr = 8;

    // Rounded rect
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(bx + cr, by);
    ctx.lineTo(bx + bw - cr, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + cr);
    ctx.lineTo(bx + bw, by + bh - cr);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - cr, by + bh);
    ctx.lineTo(bx + cr, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - cr);
    ctx.lineTo(bx, by + cr);
    ctx.quadraticCurveTo(bx, by, bx + cr, by);
    ctx.closePath();
    ctx.fill();

    // Tail pointing down toward character
    ctx.beginPath();
    ctx.moveTo(gx - 5, by + bh);
    ctx.lineTo(gx, by + bh + 8);
    ctx.lineTo(gx + 5, by + bh);
    ctx.closePath();
    ctx.fill();

    // Text
    ctx.globalAlpha = helpFade;
    ctx.fillStyle = '#cc2200';
    ctx.font = FONT_HELP;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(helpText, gx, bubbleY);
    ctx.restore();
  }
}

// ─── COIN RENDERING ─────────────────────────────────────────────
let _coinGrad = null;
let _coinGradCtx = null;
function _getCoinGrad(ctx) {
  if (_coinGrad && _coinGradCtx === ctx) return _coinGrad;
  _coinGradCtx = ctx;
  _coinGrad = ctx.createRadialGradient(-3, -3, 1, 0, 0, COIN_SIZE);
  _coinGrad.addColorStop(0, '#FFF44F');
  _coinGrad.addColorStop(0.5, '#FFD700');
  _coinGrad.addColorStop(1, '#DAA520');
  return _coinGrad;
}
function drawCoins() {
  const ctx = G.ctx;
  if (!G.coins || G.coins.length === 0) return;
  for (const coin of G.coins) {
    if (coin.collected) continue;
    const plat = G.platforms[coin.row] && G.platforms[coin.row][coin.col];
    if (!plat || plat.destroyed) continue;
    const cx = plat.x + plat.w / 2;
    const platScreenY = plat.y - G.camera.y;
    if (platScreenY < -80 || platScreenY > CANVAS_H + 80) continue;
    const bobY = Math.sin(G.lavaTime * COIN_BOB_SPEED + coin.row * 2 + coin.col) * COIN_BOB_HEIGHT;
    const cy = plat.y + (PLAT_H - PLAT_DEPTH) / 2 - 18 + bobY - G.camera.y;
    const spin = Math.cos(G.lavaTime * COIN_SPIN_SPEED + coin.row + coin.col * 3);
    const scaleX = Math.abs(spin) * 0.7 + 0.3;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleX, 1);

    // Outer glow
    ctx.globalAlpha = 0.3 + Math.sin(G.lavaTime * 3 + coin.row) * 0.1;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, COIN_SIZE + 3, 0, Math.PI * 2);
    ctx.fill();

    // Coin body
    ctx.globalAlpha = 1;
    ctx.fillStyle = _getCoinGrad(ctx);
    ctx.beginPath();
    ctx.arc(0, 0, COIN_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // Coin border
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Star symbol in center
    ctx.fillStyle = '#B8860B';
    ctx.font = FONT_COIN;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2605', 0, 0);

    ctx.restore();
  }
}

// ─── ALMOST THERE ENCOURAGEMENT ─────────────────────────────────
function drawAlmostThere() {
  if (!G.almostThereShown || G.almostThereTimer <= 0) return;
  const ctx = G.ctx;
  const alpha = Math.min(1, G.almostThereTimer / 0.5) * (G.almostThereTimer < 0.5 ? G.almostThereTimer / 0.5 : 1);
  const rise = (1 - Math.min(1, G.almostThereTimer / 2)) * 15;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Glowing text banner
  const phrases = ['almost.there', 'almost.one_more', 'almost.you_got_this', 'almost.so_close'];
  const phrase = t(phrases[Math.floor(G.lavaTime * 0.3) % phrases.length]);

  ctx.shadowColor = '#44ff88';
  ctx.shadowBlur = 16 + Math.sin(G.lavaTime * 6) * 6;
  ctx.fillStyle = '#ffffff';
  ctx.font = FONT_ALMOST;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(phrase, CANVAS_W / 2, CANVAS_H * 0.25 - rise);

  // Smaller sub-text with rescue character emoji
  if (G.rescueChar) {
    ctx.shadowBlur = 8;
    ctx.font = FONT_ALMOST_SUB;
    ctx.fillStyle = '#ffcc44';
    ctx.fillText(G.rescueChar.emoji + ' ' + t('rescue.help'), CANVAS_W / 2, CANVAS_H * 0.25 + 28 - rise);
  }

  ctx.restore();
}

// ─── VICTORY DANCE RENDERING ────────────────────────────────────
function drawVictoryDance(x, y, timer) {
  const ctx = G.ctx;
  if (!G.heroChar || !G.rescueChar) return;

  // Characters bounce and spin
  const bounce = Math.abs(Math.sin(timer * 6)) * 15;
  const wobble = Math.sin(timer * 8) * 0.2;
  const heroX = x - 25;
  const rescueX = x + 25;

  // Draw hero doing victory dance
  ctx.save();
  ctx.translate(heroX, y - bounce);
  ctx.rotate(wobble);
  drawEmoji(ctx, G.heroChar.emoji, 0, 0, EMOJI_SIZE);
  ctx.restore();

  // Draw rescue character bouncing too
  ctx.save();
  ctx.translate(rescueX, y - Math.abs(Math.sin(timer * 6 + 1)) * 15);
  ctx.rotate(-wobble);
  drawEmoji(ctx, G.rescueChar.emoji, 0, 0, EMOJI_SIZE);
  ctx.restore();

  // Draw celebration emojis rotating around them
  const emojis = ['\u2B50', '\u{1F389}', '\u{1F38A}', '\u2728'];
  for (let i = 0; i < emojis.length; i++) {
    const angle = timer * 3 + (i / emojis.length) * Math.PI * 2;
    const orbitR = 45 + Math.sin(timer * 2 + i) * 10;
    const ex = x + Math.cos(angle) * orbitR;
    const ey = y + Math.sin(angle) * orbitR * 0.5 - 10;
    ctx.globalAlpha = 0.8;
    drawEmoji(ctx, emojis[i], ex, ey, 18);
  }
  ctx.globalAlpha = 1;
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
    } else if (p.ring) {
      const progress = 1 - p.life / p.startLife;
      const radius = p.maxR * progress;
      ctx.globalAlpha = (p.life / p.startLife) * 0.75;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4 * (1 - progress) + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y - G.camera.y, radius, 0, Math.PI * 2);
      ctx.stroke();
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
  // Cap trail marks to prevent unbounded growth
  while (G.trailMarks.length > MAX_TRAIL_MARKS) {
    G.trailMarks.shift();
  }
  // Swap-and-pop removal (O(1) per removal vs O(n) splice)
  let i = 0;
  while (i < G.trailMarks.length) {
    G.trailMarks[i].life -= dt * TRAIL_FADE_RATE;
    if (G.trailMarks[i].life <= 0) {
      G.trailMarks[i] = G.trailMarks[G.trailMarks.length - 1];
      G.trailMarks.pop();
    } else {
      i++;
    }
  }
}

function drawTrailMarks() {
  const ctx = G.ctx;
  const tp = palette();
  const minimal = G.perfMode === 'minimal';
  for (const m of G.trailMarks) {
    const screenY = m.y - G.camera.y;
    if (screenY < -30 || screenY > CANVAS_H + 30) continue;

    const a = m.life;
    const r = 8 + (1 - a) * 4;

    if (minimal) {
      // Single circle only
      ctx.globalAlpha = a * 0.6;
      ctx.fillStyle = tp.trailCore;
      ctx.beginPath();
      ctx.arc(m.x, screenY, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    const pulse = 0.8 + Math.sin(G.lavaTime * 4 + m.x * 0.05) * 0.2;

    // Outer glow
    ctx.globalAlpha = a * 0.25 * pulse;
    ctx.fillStyle = tp.trailOuter;
    ctx.beginPath();
    ctx.arc(m.x, screenY, r + 6, 0, Math.PI * 2);
    ctx.fill();

    // Mid glow
    ctx.globalAlpha = a * 0.4 * pulse;
    ctx.fillStyle = tp.trailMid;
    ctx.beginPath();
    ctx.arc(m.x, screenY, r, 0, Math.PI * 2);
    ctx.fill();

    // Bright core
    ctx.globalAlpha = a * 0.7;
    ctx.fillStyle = tp.trailCore;
    ctx.beginPath();
    ctx.arc(m.x, screenY, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── ROUTE STEP VISUALIZATION (memorize phase) ──────────────
// Draw numbered step markers and directional arrows on safeRoute platforms
// when reveal=true and safeRoute contains backtracks.
function drawRouteSteps() {
  if (!G.safeRoute || G.safeRoute.length === 0) return;
  // Only show step numbers if there are backtracks (route has more steps than rows)
  if (G.safeRoute.length <= G.gridRows) return;

  const ctx = G.ctx;
  for (let i = 0; i < G.safeRoute.length; i++) {
    const step = G.safeRoute[i];
    const plat = G.platforms[step.row][step.col];
    if (!plat) continue;
    const px = plat.x + plat.w / 2;
    const py = plat.y + (PLAT_H - PLAT_DEPTH) / 2;

    // Step number circle
    const isBackward = i > 0 && G.safeRoute[i].row < G.safeRoute[i - 1].row;
    const isHop = i > 0 && G.safeRoute[i].row === G.safeRoute[i - 1].row;

    // Background circle — orange for backtrack steps, blue for hops, green for normal
    let bgColor = 'rgba(40,180,80,0.85)';
    if (isBackward) bgColor = 'rgba(220,120,30,0.9)';
    else if (isHop) bgColor = 'rgba(60,120,200,0.85)';

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(px, py, 11, 0, Math.PI * 2);
    ctx.fill();

    // Step number text
    ctx.fillStyle = '#fff';
    ctx.font = FONT_STEP;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), px, py);

    // Arrow from previous step to this step
    if (i > 0) {
      const prev = G.safeRoute[i - 1];
      const prevPlat = G.platforms[prev.row][prev.col];
      if (!prevPlat) continue;
      const fromX = prevPlat.x + prevPlat.w / 2;
      const fromY = prevPlat.y + (PLAT_H - PLAT_DEPTH) / 2;

      // Draw arrow line (shortened to not overlap circles)
      const dx = px - fromX;
      const dy = py - fromY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) continue;
      const nx = dx / dist, ny = dy / dist;
      const ax = fromX + nx * 14;
      const ay = fromY + ny * 14;
      const bx = px - nx * 14;
      const by = py - ny * 14;

      ctx.strokeStyle = isBackward ? 'rgba(255,150,50,0.7)' : isHop ? 'rgba(100,160,255,0.7)' : 'rgba(80,255,120,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Arrowhead
      const headLen = 6;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - headLen * nx + headLen * 0.5 * ny, by - headLen * ny - headLen * 0.5 * nx);
      ctx.lineTo(bx - headLen * nx - headLen * 0.5 * ny, by - headLen * ny + headLen * 0.5 * nx);
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }
  }
}

// ─── PATH REVEAL (memorize phase) ───────────────────────────────────────────
// Highlights the first `revealCount` steps of optimalRoute one at a time.
// The latest step pulses; earlier steps are dimmer. Called from MemorizeScene.
function drawPathReveal(revealCount) {
  if (!revealCount || revealCount <= 0) return;
  const route = G.optimalRoute && G.optimalRoute.length > 0 ? G.optimalRoute : G.safeRoute;
  if (!route || route.length === 0) return;

  const ctx = G.ctx;
  const count = Math.min(revealCount, route.length);

  for (let i = 0; i < count; i++) {
    const step = route[i];
    const plat = G.platforms[step.row] && G.platforms[step.row][step.col];
    if (!plat) continue;

    const px = plat.x + plat.w / 2;
    const py = plat.y + (PLAT_H - PLAT_DEPTH) / 2;
    const isLatest = (i === count - 1);

    // Gold glow overlay on platform
    const pulse = isLatest ? 0.45 + 0.25 * Math.abs(Math.sin(G.lavaTime * 4)) : 0.25;
    ctx.save();
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur  = isLatest ? 24 : 12;
    ctx.globalAlpha = pulse;
    ctx.fillStyle   = '#ffe066';
    ctx.fillRect(plat.x - 2, plat.y - 2, plat.w + 4, PLAT_H + 4);
    ctx.restore();

    // Gold border
    ctx.save();
    ctx.strokeStyle = isLatest ? '#ffe066' : 'rgba(255,200,40,0.65)';
    ctx.lineWidth   = isLatest ? 3 : 2;
    ctx.strokeRect(plat.x - 1, plat.y - 1, plat.w + 2, PLAT_H + 2);
    ctx.restore();

    // Arrow from previous step
    if (i > 0) {
      const prev     = route[i - 1];
      const prevPlat = G.platforms[prev.row] && G.platforms[prev.row][prev.col];
      if (!prevPlat) continue;
      const fromX = prevPlat.x + prevPlat.w / 2;
      const fromY = prevPlat.y + (PLAT_H - PLAT_DEPTH) / 2;

      const dx = px - fromX, dy = py - fromY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) continue;
      const nx = dx / dist, ny = dy / dist;
      const ax = fromX + nx * 14, ay = fromY + ny * 14;
      const bx = px    - nx * 14, by = py    - ny * 14;

      ctx.save();
      ctx.globalAlpha = isLatest ? 0.9 : 0.5;
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();

      const headLen = 6;
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - headLen * nx + headLen * 0.5 * ny, by - headLen * ny - headLen * 0.5 * nx);
      ctx.lineTo(bx - headLen * nx - headLen * 0.5 * ny, by - headLen * ny + headLen * 0.5 * nx);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Step number badge
    ctx.save();
    ctx.fillStyle = isLatest ? 'rgba(255,200,20,0.95)' : 'rgba(200,150,20,0.80)';
    ctx.beginPath();
    ctx.arc(px, py, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0a00';
    ctx.font = FONT_STEP;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), px, py);
    ctx.restore();
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

// ─── FPS COUNTER ──────────────────────────────────────────────
function drawFpsCounter() {
  const ctx = G.ctx;
  const p = G.perf;
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#000';
  ctx.fillRect(4, 4, 110, 48);
  ctx.globalAlpha = 1;
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = p.fps >= 50 ? '#44ff44' : p.fps >= 30 ? '#ffcc00' : '#ff4444';
  ctx.fillText('FPS: ' + p.fps, 10, 9);
  ctx.fillStyle = '#cccccc';
  ctx.fillText('AVG: ' + p.avgFps, 10, 23);
  ctx.fillText('MIN: ' + p.minFps, 10, 37);
  ctx.restore();
}

