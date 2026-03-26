// ─── ADDITIONAL SOUNDTRACKS ──────────────────────────────────────
// Retro (chiptune 8-bit) and Chill (ambient lo-fi) soundtrack variants.
// Depends on audio.js for initAudio, hasAudio, stopMusic, G.audioCtx, G.musicGain.

// ═══════════════════════════════════════════════════════════════
// RETRO SOUNDTRACK — Chiptune / 8-bit NES style
// ═══════════════════════════════════════════════════════════════

function playRetroMemorize() {
  initAudio();
  if (!hasAudio()) return;
  stopMusic();
  G.currentMusic = 'memorize';

  G.musicGain = G.audioCtx.createGain();
  G.musicGain.gain.value = 0.16;
  G.musicGain.connect(G.audioCtx.destination);

  // Minor key arpeggios for tension — Am: A C E, Dm: D F A, Em: E G B
  const arps = [
    [220, 261.63, 329.63],
    [293.66, 349.23, 440],
    [164.81, 196, 246.94],
    [220, 261.63, 329.63],
  ];
  let arpIdx = 0;
  let tickCount = 0;

  function playSection() {
    if (G.currentMusic !== 'memorize') return;
    const now = G.audioCtx.currentTime;
    const arp = arps[arpIdx % arps.length];
    arpIdx++;

    // Chiptune arpeggio — fast square wave cycling through notes
    for (let beat = 0; beat < 8; beat++) {
      const t = now + beat * 0.25;
      const freq = arp[beat % 3];
      const osc = G.audioCtx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const g = G.audioCtx.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.linearRampToValueAtTime(0, t + 0.2);
      osc.connect(g).connect(G.musicGain);
      osc.start(t);
      osc.stop(t + 0.22);
    }

    // Tick — simple noise burst every 0.5s
    for (let tick = 0; tick < 4; tick++) {
      const t = now + tick * 0.5;
      const osc = G.audioCtx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = (tickCount + tick) % 2 === 0 ? 2000 : 1600;
      const g = G.audioCtx.createGain();
      g.gain.setValueAtTime(0.08, t);
      g.gain.linearRampToValueAtTime(0, t + 0.03);
      osc.connect(g).connect(G.musicGain);
      osc.start(t);
      osc.stop(t + 0.04);
    }
    tickCount += 4;

    // Bass drone — triangle wave
    const bass = G.audioCtx.createOscillator();
    bass.type = 'triangle';
    bass.frequency.value = arp[0] / 2;
    const bg = G.audioCtx.createGain();
    bg.gain.setValueAtTime(0.15, now);
    bg.gain.setValueAtTime(0.15, now + 1.5);
    bg.gain.linearRampToValueAtTime(0, now + 2.0);
    bass.connect(bg).connect(G.musicGain);
    bass.start(now);
    bass.stop(now + 2.1);

    G.musicTimerId = setTimeout(playSection, 2000);
  }
  playSection();
}

function playRetroAction() {
  initAudio();
  if (!hasAudio()) return;
  stopMusic();
  G.currentMusic = 'action';

  G.musicGain = G.audioCtx.createGain();
  G.musicGain.gain.value = 0.14;
  G.musicGain.connect(G.audioCtx.destination);

  const BPM = 140;
  const beat = 60 / BPM;
  const eighth = beat / 2;
  const sixteenth = beat / 4;
  const barLen = beat * 4;

  // C minor pentatonic melody — [freq, start16th, dur16ths]
  const C4 = 261.63, Eb4 = 311.13, F4 = 349.23, G4 = 392, Bb4 = 466.16, C5 = 523.25;
  const melodyBars = [
    [[C5,0,2],[Bb4,2,2],[G4,4,2],[F4,6,2],[G4,8,4],[C5,12,4]],
    [[Bb4,0,2],[G4,2,2],[F4,4,2],[Eb4,6,2],[F4,8,2],[G4,10,2],[Bb4,12,4]],
    [[C5,0,3],[Bb4,3,1],[G4,4,4],[F4,8,2],[G4,10,2],[C5,12,4]],
    [[G4,0,2],[F4,2,2],[Eb4,4,4],[C4,8,2],[Eb4,10,2],[G4,12,4]],
  ];

  // Bass on downbeats — square wave
  const bassNotes = [
    [65.41,0],[65.41,4],[77.78,8],[87.31,12],
    [77.78,0],[77.78,4],[65.41,8],[65.41,12],
    [58.27,0],[58.27,4],[65.41,8],[77.78,12],
    [77.78,0],[65.41,4],[58.27,8],[65.41,12],
  ];

  let barIdx = 0;

  function playBar() {
    if (G.currentMusic !== 'action') return;
    const now = G.audioCtx.currentTime;
    const melody = melodyBars[barIdx % melodyBars.length];
    barIdx++;

    // Square wave lead melody
    melody.forEach(([freq, start, dur]) => {
      if (!freq) return;
      const t = now + start * sixteenth;
      const len = dur * sixteenth;
      const osc = G.audioCtx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const g = G.audioCtx.createGain();
      g.gain.setValueAtTime(0.1, t);
      g.gain.setValueAtTime(0.08, t + len * 0.7);
      g.gain.linearRampToValueAtTime(0, t + len * 0.95);
      osc.connect(g).connect(G.musicGain);
      osc.start(t);
      osc.stop(t + len);
    });

    // Triangle bass
    const bassBar = barIdx % 2 === 0 ? bassNotes.slice(0, 4) : bassNotes.slice(4, 8);
    bassBar.forEach(([freq, start]) => {
      const t = now + start * sixteenth;
      const osc = G.audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = G.audioCtx.createGain();
      g.gain.setValueAtTime(0.2, t);
      g.gain.linearRampToValueAtTime(0, t + sixteenth * 3);
      osc.connect(g).connect(G.musicGain);
      osc.start(t);
      osc.stop(t + sixteenth * 3.5);
    });

    // Noise drums — kick on 1,3 snare on 2,4
    for (let b = 0; b < 4; b++) {
      const t = now + b * beat;
      if (b % 2 === 0) {
        // Kick
        const kick = G.audioCtx.createOscillator();
        kick.type = 'square';
        kick.frequency.setValueAtTime(120, t);
        kick.frequency.exponentialRampToValueAtTime(30, t + 0.06);
        const kg = G.audioCtx.createGain();
        kg.gain.setValueAtTime(0.25, t);
        kg.gain.linearRampToValueAtTime(0, t + 0.08);
        kick.connect(kg).connect(G.musicGain);
        kick.start(t);
        kick.stop(t + 0.1);
      } else {
        // Snare — noise burst
        const buf = G.audioCtx.createBuffer(1, G.audioCtx.sampleRate * 0.06, G.audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let s = 0; s < data.length; s++) data[s] = (Math.random() * 2 - 1) * Math.exp(-s / (data.length * 0.3));
        const src = G.audioCtx.createBufferSource();
        src.buffer = buf;
        const sg = G.audioCtx.createGain();
        sg.gain.setValueAtTime(0.15, t);
        sg.gain.linearRampToValueAtTime(0, t + 0.05);
        src.connect(sg).connect(G.musicGain);
        src.start(t);
      }
    }

    // Hi-hat on 8ths
    for (let i = 0; i < 8; i++) {
      const t = now + i * eighth;
      const osc = G.audioCtx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 6000 + Math.random() * 2000;
      const g = G.audioCtx.createGain();
      g.gain.setValueAtTime(i % 2 === 1 ? 0.04 : 0.02, t);
      g.gain.linearRampToValueAtTime(0, t + 0.015);
      osc.connect(g).connect(G.musicGain);
      osc.start(t);
      osc.stop(t + 0.02);
    }

    G.musicTimerId = setTimeout(playBar, barLen * 1000 - 50);
  }
  playBar();
}

// ═══════════════════════════════════════════════════════════════
// CHILL SOUNDTRACK — Ambient lo-fi
// ═══════════════════════════════════════════════════════════════

function playChillMemorize() {
  initAudio();
  if (!hasAudio()) return;
  stopMusic();
  G.currentMusic = 'memorize';

  G.musicGain = G.audioCtx.createGain();
  G.musicGain.gain.value = 0.15;
  G.musicGain.connect(G.audioCtx.destination);

  // Gentle evolving pads — Cmaj7 / Am7 alternation
  const chords = [
    [261.63, 329.63, 392, 493.88],  // Cmaj7
    [220, 261.63, 329.63, 392],      // Am7
    [246.94, 293.66, 369.99, 440],   // Bm7b5 approx
    [220, 261.63, 329.63, 392],      // Am7
  ];
  let chordIdx = 0;

  function playSection() {
    if (G.currentMusic !== 'memorize') return;
    const now = G.audioCtx.currentTime;
    const chord = chords[chordIdx % chords.length];
    chordIdx++;

    // Warm sine pads with slow swell
    chord.forEach((freq) => {
      const osc = G.audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = G.audioCtx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.08, now + 1.0);
      g.gain.setValueAtTime(0.08, now + 2.5);
      g.gain.linearRampToValueAtTime(0, now + 3.5);
      osc.connect(g).connect(G.musicGain);
      osc.start(now);
      osc.stop(now + 3.6);

      // Detuned layer for warmth
      const d = G.audioCtx.createOscillator();
      d.type = 'sine';
      d.frequency.value = freq * 1.002;
      const dg = G.audioCtx.createGain();
      dg.gain.setValueAtTime(0, now);
      dg.gain.linearRampToValueAtTime(0.04, now + 1.2);
      dg.gain.linearRampToValueAtTime(0, now + 3.5);
      d.connect(dg).connect(G.musicGain);
      d.start(now);
      d.stop(now + 3.6);
    });

    // Gentle chime — single high note
    const chimeTime = now + 1.5;
    const chime = G.audioCtx.createOscillator();
    chime.type = 'sine';
    chime.frequency.value = chord[2] * 2;
    const cg = G.audioCtx.createGain();
    cg.gain.setValueAtTime(0, chimeTime);
    cg.gain.linearRampToValueAtTime(0.06, chimeTime + 0.02);
    cg.gain.linearRampToValueAtTime(0, chimeTime + 1.5);
    chime.connect(cg).connect(G.musicGain);
    chime.start(chimeTime);
    chime.stop(chimeTime + 1.6);

    // Soft tick — barely audible timekeeper
    for (let tick = 0; tick < 3; tick++) {
      const t = now + tick * 1.2;
      const osc = G.audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 800;
      const tg = G.audioCtx.createGain();
      tg.gain.setValueAtTime(0.03, t);
      tg.gain.linearRampToValueAtTime(0, t + 0.05);
      osc.connect(tg).connect(G.musicGain);
      osc.start(t);
      osc.stop(t + 0.06);
    }

    G.musicTimerId = setTimeout(playSection, 3500);
  }
  playSection();
}

function playChillAction() {
  initAudio();
  if (!hasAudio()) return;
  stopMusic();
  G.currentMusic = 'action';

  G.musicGain = G.audioCtx.createGain();
  G.musicGain.gain.value = 0.14;
  G.musicGain.connect(G.audioCtx.destination);

  const BPM = 85;
  const beat = 60 / BPM;
  const barLen = beat * 4;

  // Lo-fi chord progression: Fmaj7, Em7, Am7, Dm7
  const chords = [
    [174.61, 220, 261.63, 329.63],
    [164.81, 196, 246.94, 293.66],
    [110, 130.81, 164.81, 196],
    [146.83, 174.61, 220, 261.63],
  ];
  // Gentle melody notes
  const melodies = [
    [[523.25, 0],[493.88, 1.5],[440, 2.5]],
    [[392, 0],[440, 1],[493.88, 2.5]],
    [[523.25, 0.5],[440, 2],[392, 3]],
    [[349.23, 0],[392, 1.5],[440, 2.5]],
  ];

  let barIdx = 0;

  // Pre-create soft kick buffer
  const kickBuf = G.audioCtx.createBuffer(1, G.audioCtx.sampleRate * 0.1, G.audioCtx.sampleRate);
  const kickData = kickBuf.getChannelData(0);
  for (let s = 0; s < kickData.length; s++) {
    kickData[s] = Math.sin(s / (G.audioCtx.sampleRate * 0.002)) * Math.exp(-s / (G.audioCtx.sampleRate * 0.03));
  }

  function playBar() {
    if (G.currentMusic !== 'action') return;
    const now = G.audioCtx.currentTime;
    const chord = chords[barIdx % chords.length];
    const melody = melodies[barIdx % melodies.length];
    barIdx++;

    // Warm pad — sine waves with slow attack
    chord.forEach((freq) => {
      const osc = G.audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = G.audioCtx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.06, now + 0.5);
      g.gain.setValueAtTime(0.06, now + barLen * 0.7);
      g.gain.linearRampToValueAtTime(0, now + barLen);
      osc.connect(g).connect(G.musicGain);
      osc.start(now);
      osc.stop(now + barLen + 0.05);
    });

    // Sine bass — root note, warm and round
    const bass = G.audioCtx.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = chord[0] / 2;
    const bg = G.audioCtx.createGain();
    bg.gain.setValueAtTime(0.15, now);
    bg.gain.setValueAtTime(0.15, now + barLen * 0.7);
    bg.gain.linearRampToValueAtTime(0, now + barLen);
    bass.connect(bg).connect(G.musicGain);
    bass.start(now);
    bass.stop(now + barLen + 0.05);

    // Gentle melody — triangle wave
    melody.forEach(([freq, startBeat]) => {
      const t = now + startBeat * beat;
      const osc = G.audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = G.audioCtx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.05);
      g.gain.linearRampToValueAtTime(0, t + beat * 1.2);
      osc.connect(g).connect(G.musicGain);
      osc.start(t);
      osc.stop(t + beat * 1.3);
    });

    // Soft lo-fi drums — kick on 1 and 3, light
    [0, 2].forEach(b => {
      const t = now + b * beat;
      const src = G.audioCtx.createBufferSource();
      src.buffer = kickBuf;
      const kg = G.audioCtx.createGain();
      kg.gain.setValueAtTime(0.12, t);
      kg.gain.linearRampToValueAtTime(0, t + 0.08);
      src.connect(kg).connect(G.musicGain);
      src.start(t);
    });

    // Brushed snare on 2 and 4 — filtered noise
    [1, 3].forEach(b => {
      const t = now + b * beat;
      const buf = G.audioCtx.createBuffer(1, G.audioCtx.sampleRate * 0.08, G.audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let s = 0; s < data.length; s++) data[s] = (Math.random() * 2 - 1) * Math.exp(-s / (data.length * 0.4));
      const src = G.audioCtx.createBufferSource();
      src.buffer = buf;
      const sg = G.audioCtx.createGain();
      sg.gain.setValueAtTime(0.05, t);
      sg.gain.linearRampToValueAtTime(0, t + 0.06);
      src.connect(sg).connect(G.musicGain);
      src.start(t);
    });

    G.musicTimerId = setTimeout(playBar, barLen * 1000 - 50);
  }
  playBar();
}
