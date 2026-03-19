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

  // Lava offscreen canvas cache (drawing.js uses these for throttled re-render)
  lavaCache: null,
  lavaCacheCtx: null,
  lavaFrameCount: 0,

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
  safeRoute: [],       // ordered [{row, col}, ...] steps including backtracks
  extraSafeCols: {},   // row -> [col, ...] additional safe columns for backtracks
  trailMarks: [],
  winTimer: 0,
  playTimer: 0,
  jumpCount: 0,
  memTimeSaved: 0,
  jumpStreak: 0,   // consecutive clean forward rows (no hops before jumping forward)
  hopsThisRow: 0,  // hops made since last forward landing
  streakBonus: 0,  // accumulated streak bonus points this level

  // Scene transitions
  transition: { active: false, nextScene: null },

  // Tutorial (level 1 adventure mode)
  tutorialShown: false,
  tutorialActive: false,

  // Combo streak
  streak: 0,
  streakPopups: [],

  // Level preview
  levelPreview: null,

  // Managed timers (replaces setTimeout/setInterval in game logic)
  timers: [],

  // Secret route reveal (? key during playing)
  revealRoute: false,
  revealRouteTimer: 0,

  // Input
  keys: {},
  isTouchDevice: false,

  // Loop
  lastTime: 0,
  accumulator: 0,
};
