// ─── AUDIO ENGINE ───────────────────────────────────────────────
function initAudio() {
  if (G.audioCtx) return;
  G.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function stopMusic() {
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

// ─── MEMORIZE MUSIC: Dramatic, tense, slow, suspenseful ────────
function playMemorizeMusic() {
  initAudio();
  stopMusic();
  G.currentMusic = 'memorize';

  G.musicGain = G.audioCtx.createGain();
  G.musicGain.gain.value = 0.15;
  G.musicGain.connect(G.audioCtx.destination);

  // Deep dramatic minor chord progression
  const chords = [
    [55, 130.81, 155.56, 196],    // Cm: C2, C3, Eb3, G3
    [51.91, 123.47, 155.56, 185], // Abmaj: Ab1, B2, Eb3, Gb3
    [49, 116.54, 146.83, 174.61], // Bbm: Bb1, Bb2, D3, F3
    [46.25, 110, 138.59, 164.81], // G dim-ish
  ];
  let chordIdx = 0;

  function playChord() {
    if (G.currentMusic !== 'memorize') return;
    const now = G.audioCtx.currentTime;
    const chord = chords[chordIdx % chords.length];
    chordIdx++;

    // Deep rumbling bass
    const bass = G.audioCtx.createOscillator();
    bass.type = 'sawtooth';
    bass.frequency.value = chord[0];
    const bassG = G.audioCtx.createGain();
    bassG.gain.setValueAtTime(0, now);
    bassG.gain.linearRampToValueAtTime(0.35, now + 0.8);
    bassG.gain.setValueAtTime(0.35, now + 2.5);
    bassG.gain.linearRampToValueAtTime(0, now + 3.2);
    bass.connect(bassG).connect(G.musicGain);
    bass.start(now);
    bass.stop(now + 3.3);

    // Sustained minor chord pads
    chord.slice(1).forEach((freq, i) => {
      const osc = G.audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // Slow vibrato for tension
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.003, now + 1.5);
      osc.frequency.linearRampToValueAtTime(freq * 0.997, now + 3);
      const g = G.audioCtx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.15);
      g.gain.linearRampToValueAtTime(0.2, now + 0.6 + i * 0.15);
      g.gain.setValueAtTime(0.2, now + 2.2);
      g.gain.linearRampToValueAtTime(0, now + 3.2);
      osc.connect(g).connect(G.musicGain);
      osc.start(now);
      osc.stop(now + 3.3);
    });

    // Dramatic string-like high tone
    const high = G.audioCtx.createOscillator();
    high.type = 'triangle';
    high.frequency.setValueAtTime(chord[3] * 2, now);
    high.frequency.linearRampToValueAtTime(chord[3] * 2 * 1.02, now + 3);
    const hg = G.audioCtx.createGain();
    hg.gain.setValueAtTime(0, now);
    hg.gain.linearRampToValueAtTime(0.08, now + 1);
    hg.gain.linearRampToValueAtTime(0.1, now + 2);
    hg.gain.linearRampToValueAtTime(0, now + 3.2);
    high.connect(hg).connect(G.musicGain);
    high.start(now);
    high.stop(now + 3.3);

    // Heartbeat-like low pulse
    for (let beat = 0; beat < 2; beat++) {
      const pulse = G.audioCtx.createOscillator();
      pulse.type = 'sine';
      pulse.frequency.value = 40;
      const pg = G.audioCtx.createGain();
      const t = now + beat * 1.5;
      pg.gain.setValueAtTime(0, t);
      pg.gain.linearRampToValueAtTime(0.3, t + 0.05);
      pg.gain.linearRampToValueAtTime(0, t + 0.3);
      pulse.connect(pg).connect(G.musicGain);
      pulse.start(t);
      pulse.stop(t + 0.35);
    }

    // Ticking clock sound for urgency
    for (let tick = 0; tick < 6; tick++) {
      const t = now + tick * 0.5;
      const tickOsc = G.audioCtx.createOscillator();
      tickOsc.type = 'sine';
      tickOsc.frequency.value = 800 + (tick % 2) * 200;
      const tg = G.audioCtx.createGain();
      tg.gain.setValueAtTime(0, t);
      tg.gain.linearRampToValueAtTime(0.06, t + 0.01);
      tg.gain.linearRampToValueAtTime(0, t + 0.06);
      tickOsc.connect(tg).connect(G.musicGain);
      tickOsc.start(t);
      tickOsc.stop(t + 0.07);
    }

    G.musicTimerId = setTimeout(playChord, 3000);
  }
  playChord();
}

// ─── ACTION MUSIC: Up-tempo, driving, energetic ────────────────
function playActionMusic() {
  initAudio();
  stopMusic();
  G.currentMusic = 'action';

  G.musicGain = G.audioCtx.createGain();
  G.musicGain.gain.value = 0.13;
  G.musicGain.connect(G.audioCtx.destination);

  // Driving bass patterns in minor key
  const bassPatterns = [
    [110, 110, 130.81, 110, 146.83, 110, 130.81, 123.47],  // Am riff
    [98, 98, 116.54, 98, 130.81, 98, 116.54, 110],          // Gm riff
    [82.41, 82.41, 98, 82.41, 110, 98, 82.41, 98],          // Em riff
    [92.5, 92.5, 110, 92.5, 123.47, 110, 92.5, 110],        // F#m riff
  ];
  let patternIdx = 0;
  const BPM = 160;
  const beatLen = 60 / BPM;

  function playBar() {
    if (G.currentMusic !== 'action') return;
    const now = G.audioCtx.currentTime;
    const pattern = bassPatterns[patternIdx % bassPatterns.length];
    patternIdx++;

    // Driving bass line — 8 eighth notes per bar
    pattern.forEach((freq, i) => {
      const t = now + i * beatLen;
      const osc = G.audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const g = G.audioCtx.createGain();
      g.gain.setValueAtTime(0.3, t);
      g.gain.linearRampToValueAtTime(0.15, t + beatLen * 0.7);
      g.gain.linearRampToValueAtTime(0, t + beatLen * 0.95);
      osc.connect(g).connect(G.musicGain);
      osc.start(t);
      osc.stop(t + beatLen);
    });

    // Punchy kick-like hits on beats 1, 3, 5, 7
    for (let beat = 0; beat < 8; beat += 2) {
      const t = now + beat * beatLen;
      const kick = G.audioCtx.createOscillator();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(120, t);
      kick.frequency.exponentialRampToValueAtTime(35, t + 0.08);
      const kg = G.audioCtx.createGain();
      kg.gain.setValueAtTime(0.35, t);
      kg.gain.linearRampToValueAtTime(0, t + 0.1);
      kick.connect(kg).connect(G.musicGain);
      kick.start(t);
      kick.stop(t + 0.12);
    }

    // Hi-hat-like noise on every beat
    const hatBuf = G.audioCtx.createBuffer(1, G.audioCtx.sampleRate * 0.03, G.audioCtx.sampleRate);
    const hatData = hatBuf.getChannelData(0);
    for (let s = 0; s < hatData.length; s++) {
      hatData[s] = (Math.random() * 2 - 1) * Math.exp(-s / (G.audioCtx.sampleRate * 0.008));
    }
    for (let beat = 0; beat < 8; beat++) {
      const t = now + beat * beatLen;
      const hat = G.audioCtx.createBufferSource();
      hat.buffer = hatBuf;
      const hg = G.audioCtx.createGain();
      hg.gain.setValueAtTime(beat % 2 === 0 ? 0.12 : 0.06, t);
      hg.gain.linearRampToValueAtTime(0, t + 0.03);
      hat.connect(hg).connect(G.musicGain);
      hat.start(t);
    }

    // Synth melody stabs — short aggressive notes on offbeats
    const melodyNotes = [330, 392, 349, 294, 330, 440, 392, 349];
    for (let i = 1; i < 8; i += 2) {
      const t = now + i * beatLen;
      const mel = G.audioCtx.createOscillator();
      mel.type = 'square';
      mel.frequency.value = melodyNotes[i];
      const mg = G.audioCtx.createGain();
      mg.gain.setValueAtTime(0, t);
      mg.gain.linearRampToValueAtTime(0.1, t + 0.02);
      mg.gain.setValueAtTime(0.1, t + beatLen * 0.3);
      mg.gain.linearRampToValueAtTime(0, t + beatLen * 0.6);
      mel.connect(mg).connect(G.musicGain);
      mel.start(t);
      mel.stop(t + beatLen);
    }

    // Power chord stab on beat 1 and 5
    [0, 4].forEach(beat => {
      const t = now + beat * beatLen;
      [pattern[beat], pattern[beat] * 1.5, pattern[beat] * 2].forEach(freq => {
        const osc = G.audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const g = G.audioCtx.createGain();
        g.gain.setValueAtTime(0.08, t);
        g.gain.linearRampToValueAtTime(0, t + beatLen * 1.5);
        osc.connect(g).connect(G.musicGain);
        osc.start(t);
        osc.stop(t + beatLen * 1.6);
      });
    });

    const barLen = 8 * beatLen * 1000;
    G.musicTimerId = setTimeout(playBar, barLen - 50);
  }
  playBar();
}

function playJumpSound() {
  initAudio();
  const now = G.audioCtx.currentTime;
  const osc = G.audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
  const g = G.audioCtx.createGain();
  g.gain.setValueAtTime(0.2, now);
  g.gain.linearRampToValueAtTime(0, now + 0.15);
  osc.connect(g).connect(G.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

function playLandSound() {
  initAudio();
  const now = G.audioCtx.currentTime;
  const osc = G.audioCtx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
  const g = G.audioCtx.createGain();
  g.gain.setValueAtTime(0.25, now);
  g.gain.linearRampToValueAtTime(0, now + 0.12);
  osc.connect(g).connect(G.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

function playCrumbleSound() {
  initAudio();
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

function speakCongrats() {
  if ('speechSynthesis' in window) {
    const msg = new SpeechSynthesisUtterance('You did a great job!');
    msg.rate = 0.9;
    msg.pitch = 1.1;
    msg.volume = 1.0;
    window.speechSynthesis.speak(msg);
  }
}

function playHopSound() {
  initAudio();
  const now = G.audioCtx.currentTime;
  const osc = G.audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(250, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
  const g = G.audioCtx.createGain();
  g.gain.setValueAtTime(0.15, now);
  g.gain.linearRampToValueAtTime(0, now + 0.1);
  osc.connect(g).connect(G.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}
