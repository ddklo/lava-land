// ─── SHARED MUTABLE STATE ───────────────────────────────────────
const G = {
  // Configurable settings
  gridCols: 6,
  gridRows: 12,
  difficulty: 'easy',

  // Audio
  audioCtx: null,
  musicGain: null,
  currentMusic: null,
  musicTimerId: null,

  // Canvas
  canvas: null,
  ctx: null,

  // Selections
  heroChoice: null,
  rescueChoice: null,
  heroChar: null,
  rescueChar: null,
  selectedSize: 'medium',
  selectedMemTime: 'medium',

  // Mode & level progression
  gameMode: 'adventure',
  level: 1,
  levelConfig: null,
  levelScore: 0,
  totalScore: 0,
  levelStars: 0,
  levelScoreBreakdown: null,

  // Game state
  gameState: 'menu',
  platforms: [],
  player: {},
  camera: { y: 0 },
  memorizeTimer: 0,
  lavaTime: 0,
  fallY: 0,
  particles: [],
  shakeTimer: 0,
  jumpAnim: { active: false, startX: 0, startY: 0, endX: 0, endY: 0, t: 0 },
  safePath: [],
  trailMarks: [],
  winTimer: 0,
  playTimer: 0,
  jumpCount: 0,
  memTimeSaved: 0,

  // Managed timers (replaces setTimeout/setInterval in game logic)
  timers: [],

  // Input
  keys: {},
  isTouchDevice: false,

  // Loop
  lastTime: 0,
  accumulator: 0,
};
