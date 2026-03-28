// ─── HAPTIC FEEDBACK ────────────────────────────────────────────
function haptic(pattern) {
  if (G.hapticEnabled && navigator.vibrate) navigator.vibrate(pattern);
}

// ─── AUDIO ENGINE ───────────────────────────────────────────────
function initAudio() {
  if (G.audioCtx) {
    // Resume suspended context (browser autoplay policy)
    if (G.audioCtx.state === 'suspended') {
      G.audioCtx.resume().catch(function () {});
    }
    return;
  }
  try {
    G.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (G.audioCtx.state === 'suspended') {
      G.audioCtx.resume().catch(function () {});
    }
  } catch (e) {
    G.audioCtx = null;
  }
}

// Guard: returns true if audio is available
function hasAudio() {
  return G.audioCtx !== null;
}

function stopMusic() {
  if (!hasAudio()) return;
  G.currentMusic = null;
  if (G.musicTimerId) { clearTimeout(G.musicTimerId); G.musicTimerId = null; }
  if (G.musicGain) {
    G.musicGain.gain.linearRampToValueAtTime(0, G.audioCtx.currentTime + 0.3);
    setTimeout(() => {
      if (!G.currentMusic && G.musicGain) {
        G.musicGain.disconnect();
        G.musicGain = null;
      }
    }, 400);
  }
}

// ─── MEMORIZE MUSIC ─────────────────────────────────────────────
function playMemorizeMusic() {
  if (G.soundtrack === 'retro') return playRetroMemorize();
  if (G.soundtrack === 'chill') return playChillMemorize();
  playClassicMemorize();
}

// Classic: Loud ticking clock + thriller tension
function playClassicMemorize() {
  initAudio();
  if (!hasAudio()) return;
  stopMusic();
  G.currentMusic = 'memorize';

  G.musicGain = G.audioCtx.createGain();
  G.musicGain.gain.value = 0.18;
  G.musicGain.connect(G.audioCtx.destination);

  // Tense minor chords that shift slowly
  const chords = [
    [55, 130.81, 155.56, 196],     // Cm
    [51.91, 123.47, 155.56, 185],  // Ab
    [49, 116.54, 146.83, 174.61],  // Bbm
    [46.25, 110, 138.59, 164.81],  // Gdim
  ];
  let chordIdx = 0;
  let tickCount = 0;

  // Pre-create tick buffer — sharp metallic click
  const tickBuf = G.audioCtx.createBuffer(1, G.audioCtx.sampleRate * 0.06, G.audioCtx.sampleRate);
  const tickData = tickBuf.getChannelData(0);
  for (let s = 0; s < tickData.length; s++) {
    tickData[s] = Math.sin(s / (G.audioCtx.sampleRate * 0.0004)) *
                  Math.exp(-s / (G.audioCtx.sampleRate * 0.012));
  }

  function playSection() {
    if (G.currentMusic !== 'memorize') return;
    const now = G.audioCtx.currentTime;
    const chord = chords[chordIdx % chords.length];
    chordIdx++;

    // ── TICKING CLOCK — loud, prominent, every half second ──
    for (let tick = 0; tick < 4; tick++) {
      const t = now + tick * 0.5;

      // Main tick — high-pitched metallic click
      const tickSrc = G.audioCtx.createBufferSource();
      tickSrc.buffer = tickBuf;
      const tg = G.audioCtx.createGain();
      tg.gain.setValueAtTime(0.35, t);
      tg.gain.linearRampToValueAtTime(0, t + 0.05);
      tickSrc.connect(tg).connect(G.musicGain);
      tickSrc.start(t);

      // Resonant ping — alternating pitch for tick-tock feel
      const ping = G.audioCtx.createOscillator();
      ping.type = 'sine';
      ping.frequency.value = (tickCount + tick) % 2 === 0 ? 3200 : 2400;
      const pg = G.audioCtx.createGain();
      pg.gain.setValueAtTime(0.18, t);
      pg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      ping.connect(pg).connect(G.musicGain);
      ping.start(t);
      ping.stop(t + 0.09);

      // Woody knock body
      const knock = G.audioCtx.createOscillator();
      knock.type = 'triangle';
      knock.frequency.setValueAtTime(800, t);
      knock.frequency.exponentialRampToValueAtTime(300, t + 0.02);
      const kg = G.audioCtx.createGain();
      kg.gain.setValueAtTime(0.12, t);
      kg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      knock.connect(kg).connect(G.musicGain);
      knock.start(t);
      knock.stop(t + 0.05);
    }
    tickCount += 4;

    // ── THRILLER PAD — dark, slowly swelling, unsettling ──
    chord.slice(1).forEach((freq, i) => {
      const osc = G.audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // Eerie slow detune
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.005, now + 1);
      osc.frequency.linearRampToValueAtTime(freq * 0.995, now + 2);
      const g = G.audioCtx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.12, now + 0.5);
      g.gain.setValueAtTime(0.12, now + 1.5);
      g.gain.linearRampToValueAtTime(0, now + 2.0);
      osc.connect(g).connect(G.musicGain);
      osc.start(now);
      osc.stop(now + 2.1);

      // Detuned double for width/unease
      const d = G.audioCtx.createOscillator();
      d.type = 'sine';
      d.frequency.value = freq * 0.997;
      const dg = G.audioCtx.createGain();
      dg.gain.setValueAtTime(0, now);
      dg.gain.linearRampToValueAtTime(0.08, now + 0.6);
      dg.gain.linearRampToValueAtTime(0, now + 2.0);
      d.connect(dg).connect(G.musicGain);
      d.start(now);
      d.stop(now + 2.1);
    });

    // ── DEEP SUB RUMBLE — ominous low drone ──
    const sub = G.audioCtx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = chord[0];
    sub.frequency.setValueAtTime(chord[0], now);
    sub.frequency.linearRampToValueAtTime(chord[0] * 0.97, now + 2);
    const sg = G.audioCtx.createGain();
    sg.gain.setValueAtTime(0, now);
    sg.gain.linearRampToValueAtTime(0.2, now + 0.3);
    sg.gain.setValueAtTime(0.2, now + 1.5);
    sg.gain.linearRampToValueAtTime(0, now + 2.0);
    sub.connect(sg).connect(G.musicGain);
    sub.start(now);
    sub.stop(now + 2.1);

    // ── TENSION STINGER — dissonant hit every other cycle ──
    if (chordIdx % 2 === 0) {
      const t = now + 1.0;
      // Cluster of close frequencies = dissonance
      [chord[2], chord[2] * 1.06, chord[3] * 0.98].forEach(freq => {
        const osc = G.audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq * 2;
        const g = G.audioCtx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.05);
        g.gain.linearRampToValueAtTime(0, t + 0.6);
        osc.connect(g).connect(G.musicGain);
        osc.start(t);
        osc.stop(t + 0.65);
      });
    }

    // ── HEARTBEAT — deep thump every second ──
    for (let i = 0; i < 2; i++) {
      const t = now + i * 1.0;
      // Double-beat like a real heartbeat: thump-THUMP
      [0, 0.15].forEach((offset, j) => {
        const hb = G.audioCtx.createOscillator();
        hb.type = 'sine';
        hb.frequency.setValueAtTime(j === 0 ? 50 : 40, t + offset);
        hb.frequency.exponentialRampToValueAtTime(25, t + offset + 0.15);
        const hg = G.audioCtx.createGain();
        hg.gain.setValueAtTime(j === 0 ? 0.15 : 0.25, t + offset);
        hg.gain.linearRampToValueAtTime(0, t + offset + 0.2);
        hb.connect(hg).connect(G.musicGain);
        hb.start(t + offset);
        hb.stop(t + offset + 0.22);
      });
    }

    G.musicTimerId = setTimeout(playSection, 2000);
  }
  playSection();
}

// ─── ACTION MUSIC ───────────────────────────────────────────────
function playActionMusic() {
  if (G.soundtrack === 'retro') return playRetroAction();
  if (G.soundtrack === 'chill') return playChillAction();
  playClassicAction();
}

// Classic: 80s synth-funk, Beverly Hills Cop vibe
function playClassicAction() {
  initAudio();
  if (!hasAudio()) return;
  stopMusic();
  G.currentMusic = 'action';

  G.musicGain = G.audioCtx.createGain();
  G.musicGain.gain.value = 0.14;
  G.musicGain.connect(G.audioCtx.destination);

  const BPM = 108;
  const beat = 60 / BPM;
  const eighth = beat / 2;
  const sixteenth = beat / 4;
  const barLen = beat * 4;

  // Notes
  const F4 = 349.23, Ab4 = 415.30, Bb4 = 466.16, C5 = 523.25;
  const Eb4 = 311.13, Db4 = 277.18, C4 = 261.63, Ab3 = 207.65;
  const F3 = 174.61, Eb3 = 155.56, Db3 = 138.59, Bb3 = 233.08;

  // Melody: bouncy 80s synth hook in F minor — [freq, start16th, dur16ths]
  const melodyBars = [
    // Bar 1: iconic opening phrase
    [[F4,0,3],[Ab4,3,3],[F4,6,2],[F4,8,1],[Bb4,9,3],[F4,12,2],[Eb4,14,2]],
    // Bar 2: continuation
    [[F4,0,3],[C5,3,3],[F4,6,2],[Eb4,8,1],[Eb4,9,2],[C4,11,2],[Ab3,13,1],[F4,14,2]],
    // Bar 3: variation — descending
    [[F4,0,2],[Eb4,2,2],[Db4,4,2],[C4,6,2],[Db4,8,3],[Eb4,11,3],[F4,14,2]],
    // Bar 4: resolve with flair
    [[Ab4,0,2],[F4,2,2],[Eb4,4,1],[F4,5,3],[0,8,2],[C4,10,1],[Db4,11,1],[Eb4,12,2],[F4,14,2]],
  ];

  // Bass: syncopated F minor funk — 16th note grid (0 = rest)
  const bassF = F3 / 2, bassAb = Ab3 / 2, bassBb = Bb3 / 2, bassEb = Eb3 / 2, bassDb = Db3 / 2;
  const bassLines = [
    [bassF,0,bassF,0, 0,bassF,0,0, bassF,0,bassF,0, 0,0,bassAb,bassBb],
    [bassAb,0,bassAb,0, 0,bassAb,0,0, bassBb,0,bassAb,0, bassF,0,0,bassF],
    [bassDb,0,bassDb,0, 0,bassDb,0,bassEb, bassF,0,0,bassF, 0,bassEb,0,bassDb],
    [bassEb,0,bassEb,0, bassDb,0,0,bassDb, bassF,0,bassF,0, 0,0,bassF,0],
  ];

  let barIdx = 0;

  // Pre-create drum buffers
  const hatBuf = G.audioCtx.createBuffer(1, G.audioCtx.sampleRate * 0.05, G.audioCtx.sampleRate);
  const hatData = hatBuf.getChannelData(0);
  for (let s = 0; s < hatData.length; s++)
    hatData[s] = (Math.random() * 2 - 1) * Math.exp(-s / (G.audioCtx.sampleRate * 0.008));

  const snareBuf = G.audioCtx.createBuffer(1, G.audioCtx.sampleRate * 0.15, G.audioCtx.sampleRate);
  const snareData = snareBuf.getChannelData(0);
  for (let s = 0; s < snareData.length; s++)
    snareData[s] = (Math.random() * 2 - 1) * Math.exp(-s / (G.audioCtx.sampleRate * 0.05));

  function playBar() {
    if (G.currentMusic !== 'action') return;
    const now = G.audioCtx.currentTime;
    const melody = melodyBars[barIdx % melodyBars.length];
    const bass = bassLines[barIdx % bassLines.length];
    barIdx++;

    // ── Synth lead melody (bright, 80s poly-synth feel) ──
    melody.forEach(([freq, start, dur]) => {
      if (!freq) return;
      const t = now + start * sixteenth;
      const len = dur * sixteenth;

      // Layer 1: Square wave — classic 80s synth
      const sq = G.audioCtx.createOscillator();
      sq.type = 'square';
      sq.frequency.value = freq;
      const sqg = G.audioCtx.createGain();
      sqg.gain.setValueAtTime(0, t);
      sqg.gain.linearRampToValueAtTime(0.11, t + 0.008);
      sqg.gain.setValueAtTime(0.09, t + len * 0.6);
      sqg.gain.linearRampToValueAtTime(0, t + len * 0.95);
      sq.connect(sqg).connect(G.musicGain);
      sq.start(t);
      sq.stop(t + len);

      // Layer 2: Detuned sawtooth for thickness
      const saw = G.audioCtx.createOscillator();
      saw.type = 'sawtooth';
      saw.frequency.value = freq * 1.003;
      const sawg = G.audioCtx.createGain();
      sawg.gain.setValueAtTime(0, t);
      sawg.gain.linearRampToValueAtTime(0.05, t + 0.01);
      sawg.gain.linearRampToValueAtTime(0, t + len * 0.9);
      saw.connect(sawg).connect(G.musicGain);
      saw.start(t);
      saw.stop(t + len);

      // Layer 3: High octave sine shimmer
      const shi = G.audioCtx.createOscillator();
      shi.type = 'sine';
      shi.frequency.value = freq * 2;
      const shig = G.audioCtx.createGain();
      shig.gain.setValueAtTime(0, t);
      shig.gain.linearRampToValueAtTime(0.03, t + 0.01);
      shig.gain.linearRampToValueAtTime(0, t + len * 0.7);
      shi.connect(shig).connect(G.musicGain);
      shi.start(t);
      shi.stop(t + len);
    });

    // ── Synth bass (16th note grid, funky) ──
    bass.forEach((freq, i) => {
      if (!freq) return;
      const t = now + i * sixteenth;
      const osc = G.audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq * 1.015, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + sixteenth * 0.25);
      const g = G.audioCtx.createGain();
      g.gain.setValueAtTime(0.28, t);
      g.gain.linearRampToValueAtTime(0.12, t + sixteenth * 0.5);
      g.gain.linearRampToValueAtTime(0, t + sixteenth * 0.88);
      osc.connect(g).connect(G.musicGain);
      osc.start(t);
      osc.stop(t + sixteenth);

      // Sub sine for weight
      const sub = G.audioCtx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = freq;
      const sg = G.audioCtx.createGain();
      sg.gain.setValueAtTime(0.22, t);
      sg.gain.linearRampToValueAtTime(0, t + sixteenth * 0.8);
      sub.connect(sg).connect(G.musicGain);
      sub.start(t);
      sub.stop(t + sixteenth);
    });

    // ── LinnDrum-style kick: beats 1 and 3 ──
    [0, 2].forEach(b => {
      const t = now + b * beat;
      const kick = G.audioCtx.createOscillator();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(130, t);
      kick.frequency.exponentialRampToValueAtTime(35, t + 0.1);
      const kg = G.audioCtx.createGain();
      kg.gain.setValueAtTime(0.38, t);
      kg.gain.linearRampToValueAtTime(0, t + 0.15);
      kick.connect(kg).connect(G.musicGain);
      kick.start(t);
      kick.stop(t + 0.17);
    });

    // ── Snare clap: beats 2 and 4 ──
    [1, 3].forEach(b => {
      const t = now + b * beat;
      const snare = G.audioCtx.createBufferSource();
      snare.buffer = snareBuf;
      const sg = G.audioCtx.createGain();
      sg.gain.setValueAtTime(0.2, t);
      sg.gain.linearRampToValueAtTime(0, t + 0.12);
      snare.connect(sg).connect(G.musicGain);
      snare.start(t);
      // Body tone
      const body = G.audioCtx.createOscillator();
      body.type = 'triangle';
      body.frequency.setValueAtTime(180, t);
      body.frequency.exponentialRampToValueAtTime(100, t + 0.06);
      const bg = G.audioCtx.createGain();
      bg.gain.setValueAtTime(0.15, t);
      bg.gain.linearRampToValueAtTime(0, t + 0.07);
      body.connect(bg).connect(G.musicGain);
      body.start(t);
      body.stop(t + 0.09);
    });

    // ── Hi-hats: steady 8ths, accented offbeats (80s drum machine) ──
    for (let i = 0; i < 8; i++) {
      const t = now + i * eighth;
      const hat = G.audioCtx.createBufferSource();
      hat.buffer = hatBuf;
      const hg = G.audioCtx.createGain();
      hg.gain.setValueAtTime(i % 2 === 1 ? 0.13 : 0.06, t);
      hg.gain.linearRampToValueAtTime(0, t + 0.04);
      hat.connect(hg).connect(G.musicGain);
      hat.start(t);
    }

    // ── Synth pad: sustained Fm chord, warm background ──
    const padFreqs = [F3, Ab3, C4];
    padFreqs.forEach(freq => {
      const osc = G.audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = G.audioCtx.createGain();
      g.gain.setValueAtTime(0.04, now);
      g.gain.setValueAtTime(0.04, now + barLen * 0.8);
      g.gain.linearRampToValueAtTime(0.03, now + barLen);
      osc.connect(g).connect(G.musicGain);
      osc.start(now);
      osc.stop(now + barLen + 0.05);
    });

    G.musicTimerId = setTimeout(playBar, barLen * 1000 - 50);
  }
  playBar();
}

function playJumpSound() {
  initAudio();
  if (!hasAudio()) return;
  const now = G.audioCtx.currentTime;
  const pitch = G.heroChar ? G.heroChar.soundPitch : 1;
  const type = G.heroChar ? G.heroChar.soundType : 'sine';
  const osc = G.audioCtx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(300 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(500 * pitch, now + 0.1);
  const g = G.audioCtx.createGain();
  g.gain.setValueAtTime(0.2, now);
  g.gain.linearRampToValueAtTime(0, now + 0.15);
  osc.connect(g).connect(G.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

function playLandSound() {
  initAudio();
  if (!hasAudio()) return;
  const now = G.audioCtx.currentTime;
  const pitch = G.heroChar ? G.heroChar.soundPitch : 1;
  const type = G.heroChar ? G.heroChar.soundType : 'triangle';
  const osc = G.audioCtx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(200 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(80 * pitch, now + 0.1);
  const g = G.audioCtx.createGain();
  g.gain.setValueAtTime(0.25, now);
  g.gain.linearRampToValueAtTime(0, now + 0.12);
  osc.connect(g).connect(G.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

function playCrumbleSound() {
  initAudio();
  if (!hasAudio()) return;
  const now = G.audioCtx.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = G.audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80 + Math.random() * 60, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.4);
    const g = G.audioCtx.createGain();
    g.gain.setValueAtTime(0.15, now);
    g.gain.linearRampToValueAtTime(0, now + 0.4);
    osc.connect(g).connect(G.audioCtx.destination);
    osc.start(now + i * 0.05);
    osc.stop(now + 0.4);
  }
}

function playFallSound() {
  initAudio();
  if (!hasAudio()) return;
  const now = G.audioCtx.currentTime;
  const osc = G.audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.8);
  const g = G.audioCtx.createGain();
  g.gain.setValueAtTime(0.3, now);
  g.gain.linearRampToValueAtTime(0, now + 0.8);
  osc.connect(g).connect(G.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.8);

  // Splash
  const buf = G.audioCtx.createBuffer(1, G.audioCtx.sampleRate * 0.5, G.audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (G.audioCtx.sampleRate * 0.15));
  }
  const noise = G.audioCtx.createBufferSource();
  noise.buffer = buf;
  const ng = G.audioCtx.createGain();
  ng.gain.setValueAtTime(0.2, now + 0.3);
  ng.gain.linearRampToValueAtTime(0, now + 0.8);
  noise.connect(ng).connect(G.audioCtx.destination);
  noise.start(now + 0.3);
}

function playWinSound() {
  initAudio();
  if (!hasAudio()) return;
  const now = G.audioCtx.currentTime;
  const winGain = G.audioCtx.createGain();
  winGain.gain.value = 0.18;
  winGain.connect(G.audioCtx.destination);

  // ── Part 1: Opening fanfare (0s - 2s) ──
  const fanfare = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
  fanfare.forEach((freq, i) => {
    const osc = G.audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const g = G.audioCtx.createGain();
    g.gain.setValueAtTime(0, now + i * 0.2);
    g.gain.linearRampToValueAtTime(0.25, now + i * 0.2 + 0.05);
    g.gain.setValueAtTime(0.25, now + i * 0.2 + 0.2);
    g.gain.linearRampToValueAtTime(0, now + i * 0.2 + 0.4);
    osc.connect(g).connect(winGain);
    osc.start(now + i * 0.2);
    osc.stop(now + i * 0.2 + 0.4);

    const h = G.audioCtx.createOscillator();
    h.type = 'sine';
    h.frequency.value = freq * 1.5;
    const hg = G.audioCtx.createGain();
    hg.gain.setValueAtTime(0, now + i * 0.2);
    hg.gain.linearRampToValueAtTime(0.12, now + i * 0.2 + 0.05);
    hg.gain.linearRampToValueAtTime(0, now + i * 0.2 + 0.4);
    h.connect(hg).connect(winGain);
    h.start(now + i * 0.2);
    h.stop(now + i * 0.2 + 0.4);
  });

  // ── Part 2: Triumphant sustained chord (1.2s - 4s) ──
  const chordStart = now + 1.2;
  [523, 659, 784, 1047, 1319].forEach(freq => {
    const osc = G.audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = G.audioCtx.createGain();
    g.gain.setValueAtTime(0, chordStart);
    g.gain.linearRampToValueAtTime(0.15, chordStart + 0.3);
    g.gain.setValueAtTime(0.15, chordStart + 2.0);
    g.gain.linearRampToValueAtTime(0, chordStart + 2.8);
    osc.connect(g).connect(winGain);
    osc.start(chordStart);
    osc.stop(chordStart + 3);
  });

  // ── Part 3: Celebratory melody (2s - 6s) ──
  const melody = [
    [784, 0.25], [880, 0.25], [1047, 0.5], [880, 0.25], [784, 0.25],
    [659, 0.5], [784, 0.25], [880, 0.25], [1047, 0.25], [1175, 0.25],
    [1319, 0.75], [1047, 0.25], [1175, 0.5], [1047, 0.5],
    [880, 0.25], [784, 0.25], [880, 0.5], [1047, 1.0],
  ];
  let melTime = now + 2.5;
  melody.forEach(([freq, dur]) => {
    const osc = G.audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const g = G.audioCtx.createGain();
    g.gain.setValueAtTime(0, melTime);
    g.gain.linearRampToValueAtTime(0.2, melTime + 0.03);
    g.gain.setValueAtTime(0.18, melTime + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, melTime + dur * 0.95);
    osc.connect(g).connect(winGain);
    osc.start(melTime);
    osc.stop(melTime + dur);

    // Octave shimmer
    const sh = G.audioCtx.createOscillator();
    sh.type = 'sine';
    sh.frequency.value = freq * 2;
    const sg = G.audioCtx.createGain();
    sg.gain.setValueAtTime(0, melTime);
    sg.gain.linearRampToValueAtTime(0.06, melTime + 0.03);
    sg.gain.linearRampToValueAtTime(0, melTime + dur * 0.8);
    sh.connect(sg).connect(winGain);
    sh.start(melTime);
    sh.stop(melTime + dur);

    melTime += dur;
  });

  // ── Part 4: Bass celebration rhythm (2s - 8s) ──
  const bassStart = now + 2;
  for (let i = 0; i < 16; i++) {
    const t = bassStart + i * 0.375;
    const osc = G.audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = i % 4 === 0 ? 131 : (i % 2 === 0 ? 165 : 131);
    const g = G.audioCtx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.linearRampToValueAtTime(0, t + 0.2);
    osc.connect(g).connect(winGain);
    osc.start(t);
    osc.stop(t + 0.22);

    // Kick on downbeats
    if (i % 2 === 0) {
      const kick = G.audioCtx.createOscillator();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(100, t);
      kick.frequency.exponentialRampToValueAtTime(30, t + 0.08);
      const kg = G.audioCtx.createGain();
      kg.gain.setValueAtTime(0.25, t);
      kg.gain.linearRampToValueAtTime(0, t + 0.1);
      kick.connect(kg).connect(winGain);
      kick.start(t);
      kick.stop(t + 0.12);
    }
  }

  // ── Part 5: Grand finale chord (7s - 10s) ──
  const finaleStart = now + 7;
  // Build-up roll
  for (let i = 0; i < 8; i++) {
    const t = finaleStart + i * 0.08;
    const osc = G.audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 200 + i * 100;
    const g = G.audioCtx.createGain();
    g.gain.setValueAtTime(0.05 + i * 0.02, t);
    g.gain.linearRampToValueAtTime(0, t + 0.15);
    osc.connect(g).connect(winGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Final BIG major chord
  const bigChord = now + 7.8;
  [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(freq => {
    const osc = G.audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = G.audioCtx.createGain();
    g.gain.setValueAtTime(0, bigChord);
    g.gain.linearRampToValueAtTime(0.12, bigChord + 0.15);
    g.gain.setValueAtTime(0.12, bigChord + 1.5);
    g.gain.linearRampToValueAtTime(0, bigChord + 3.0);
    osc.connect(g).connect(winGain);
    osc.start(bigChord);
    osc.stop(bigChord + 3.1);
  });

  // Shimmering sparkle arpeggios over final chord
  const sparkleNotes = [1047, 1319, 1568, 2093, 1568, 1319, 1047, 1319, 1568, 2093];
  sparkleNotes.forEach((freq, i) => {
    const t = bigChord + 0.3 + i * 0.15;
    const osc = G.audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = G.audioCtx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.02);
    g.gain.linearRampToValueAtTime(0, t + 0.25);
    osc.connect(g).connect(winGain);
    osc.start(t);
    osc.stop(t + 0.25);
  });
}

// Find the best voice for the current language, cached after first lookup
let _cachedVoice = undefined; // undefined = not searched yet, null = not found
let _cachedVoiceLang = '';
function getSpeechVoice() {
  const targetLang = SPEECH_LANG[G.language] || 'en-US';
  if (_cachedVoice !== undefined && _cachedVoiceLang === targetLang) return _cachedVoice;
  if (!('speechSynthesis' in window)) { _cachedVoice = null; _cachedVoiceLang = targetLang; return null; }
  const voices = window.speechSynthesis.getVoices();
  const prefix = targetLang.split('-')[0];
  _cachedVoice = voices.find(v => v.lang === targetLang)
    || voices.find(v => v.lang.startsWith(prefix))
    || null;
  _cachedVoiceLang = targetLang;
  return _cachedVoice;
}
// Voices load async on some browsers — re-cache when ready
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { _cachedVoice = undefined; _cachedVoiceLang = ''; };
}

function speakText(text, rate, pitch) {
  if (!('speechSynthesis' in window)) return;
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = SPEECH_LANG[G.language] || 'en-US';
  const voice = getSpeechVoice();
  if (voice) msg.voice = voice;
  msg.rate = rate;
  msg.pitch = pitch;
  msg.volume = 1.0;
  window.speechSynthesis.speak(msg);
}

function speakCongrats() {
  speakText(t('speech.congrats'), 0.9, 1.1);
}

function playLoseSound() {
  initAudio();
  if (!hasAudio()) return;
  const now = G.audioCtx.currentTime;
  const loseGain = G.audioCtx.createGain();
  loseGain.gain.value = 0.22;
  loseGain.connect(G.audioCtx.destination);

  // Sad descending trombone "wah wah wah wahhh"
  const notes = [293.66, 277.18, 261.63, 220];
  const durations = [0.4, 0.4, 0.4, 1.0];
  let t = now;
  notes.forEach((freq, i) => {
    const osc = G.audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    if (i === notes.length - 1) {
      osc.frequency.linearRampToValueAtTime(freq * 0.85, t + durations[i]);
    }
    const g = G.audioCtx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.04);
    g.gain.setValueAtTime(0.25, t + durations[i] * 0.7);
    g.gain.linearRampToValueAtTime(0, t + durations[i] * 0.95);
    osc.connect(g).connect(loseGain);
    osc.start(t);
    osc.stop(t + durations[i]);

    // Harmony a fifth below
    const h = G.audioCtx.createOscillator();
    h.type = 'triangle';
    h.frequency.value = freq * 0.667;
    const hg = G.audioCtx.createGain();
    hg.gain.setValueAtTime(0, t);
    hg.gain.linearRampToValueAtTime(0.12, t + 0.04);
    hg.gain.linearRampToValueAtTime(0, t + durations[i] * 0.9);
    h.connect(hg).connect(loseGain);
    h.start(t);
    h.stop(t + durations[i]);

    t += durations[i];
  });
}

function speakLose() {
  const phrases = [
    t('speech.lose.1'),
    t('speech.lose.2'),
    t('speech.lose.3'),
  ];
  speakText(phrases[Math.floor(Math.random() * phrases.length)], 0.9, 0.8);
}

function playHopSound() {
  initAudio();
  if (!hasAudio()) return;
  const now = G.audioCtx.currentTime;
  const pitch = G.heroChar ? G.heroChar.soundPitch : 1;
  const type = G.heroChar ? G.heroChar.soundType : 'sine';
  const osc = G.audioCtx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(250 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(300 * pitch, now + 0.08);
  const g = G.audioCtx.createGain();
  g.gain.setValueAtTime(0.15, now);
  g.gain.linearRampToValueAtTime(0, now + 0.1);
  osc.connect(g).connect(G.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

// ─── COIN COLLECT SOUND ─────────────────────────────────────────
function playCoinSound() {
  initAudio();
  if (!hasAudio()) return;
  const now = G.audioCtx.currentTime;
  // Bright ascending chime
  const osc = G.audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);
  const g = G.audioCtx.createGain();
  g.gain.setValueAtTime(0.2, now);
  g.gain.linearRampToValueAtTime(0, now + 0.2);
  osc.connect(g).connect(G.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
  // Sparkle harmonic
  const osc2 = G.audioCtx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1320, now + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.15);
  const g2 = G.audioCtx.createGain();
  g2.gain.setValueAtTime(0.1, now + 0.05);
  g2.gain.linearRampToValueAtTime(0, now + 0.25);
  osc2.connect(g2).connect(G.audioCtx.destination);
  osc2.start(now + 0.05);
  osc2.stop(now + 0.25);
}

// ─── COUNTDOWN TICK SOUND ───────────────────────────────────────
function playCountdownTick(secsLeft) {
  initAudio();
  if (!hasAudio()) return;
  const now = G.audioCtx.currentTime;
  // Higher pitch for fewer seconds remaining
  const basePitch = secsLeft === 1 ? 1200 : secsLeft === 2 ? 900 : 700;
  const osc = G.audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(basePitch, now);
  osc.frequency.exponentialRampToValueAtTime(basePitch * 0.5, now + 0.15);
  const g = G.audioCtx.createGain();
  g.gain.setValueAtTime(0.25, now);
  g.gain.linearRampToValueAtTime(0, now + 0.15);
  osc.connect(g).connect(G.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
  // Resonant click
  const click = G.audioCtx.createOscillator();
  click.type = 'square';
  click.frequency.setValueAtTime(basePitch * 2, now);
  click.frequency.exponentialRampToValueAtTime(basePitch, now + 0.03);
  const cg = G.audioCtx.createGain();
  cg.gain.setValueAtTime(0.12, now);
  cg.gain.linearRampToValueAtTime(0, now + 0.05);
  click.connect(cg).connect(G.audioCtx.destination);
  click.start(now);
  click.stop(now + 0.05);
}

// ─── DENIED / EDGE BUMP SOUND ──────────────────────────────────
function playDeniedSound() {
  initAudio();
  if (!hasAudio()) return;
  const now = G.audioCtx.currentTime;
  // Short low buzz to indicate blocked movement
  const osc = G.audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
  const g = G.audioCtx.createGain();
  g.gain.setValueAtTime(0.12, now);
  g.gain.linearRampToValueAtTime(0, now + 0.12);
  osc.connect(g).connect(G.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

// ─── ALMOST THERE SOUND ────────────────────────────────────────
function playAlmostThereSound() {
  initAudio();
  if (!hasAudio()) return;
  const now = G.audioCtx.currentTime;
  // Hopeful ascending two-note chime
  [523, 659].forEach((freq, i) => {
    const osc = G.audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = G.audioCtx.createGain();
    g.gain.setValueAtTime(0, now + i * 0.12);
    g.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.03);
    g.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.25);
    osc.connect(g).connect(G.audioCtx.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.25);
  });
}
