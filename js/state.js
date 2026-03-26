// ─── SHARED MUTABLE STATE ───────────────────────────────────────
const G = {
  // Configurable settings
  gridCols: 6,
  gridRows: 12,
  difficulty: 'easy',
  language: 'en',
  soundtrack: 'classic',
  theme: 'volcano',

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
  lavaCacheMem: null,
  lavaCacheMemCtx: null,
  lavaMemFrameCount: 0,

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
  memorizeInitialTime: 0,  // snapshot of memorizeTimer at memorize scene start
  pathRevealCount: 0,      // number of safeRoute steps currently highlighted
  lavaTime: 0,
  fallY: 0,
  particles: [],
  shakeTimer: 0,
  jumpAnim: { active: false, startX: 0, startY: 0, endX: 0, endY: 0, t: 0 },
  safePath: [],
  safeRoute: [],       // ordered [{row, col}, ...] steps including backtracks
  optimalRoute: [],    // BFS-computed shortest safe route [{row, col}, ...]
  extraSafeCols: {},   // row -> [col, ...] additional safe columns for backtracks
  trailMarks: [],
  winTimer: 0,
  playTimer: 0,
  jumpCount: 0,
  memTimeSaved: 0,
  jumpStreak: 0,   // consecutive clean forward rows (no hops before jumping forward)
  hopsThisRow: 0,  // hops made since last forward landing
  streakBonus: 0,  // accumulated streak bonus points this level

  // Win sequence
  winSkipRequested: false,

  // Scene transitions
  transition: { active: false, nextScene: null },

  // Tutorial (level 1 adventure mode)
  tutorialShown: false,
  tutorialActive: false,

  // Combo streak
  streak: 0,
  streakPopups: [],

  // Collectible coins
  coins: [],             // [{row, col, collected}] placed during generation
  coinsCollected: 0,     // count collected this level
  coinScore: 0,          // total coin points this level

  // Character animation
  idleTimer: 0,          // accumulator for idle animations
  idleBobPhase: 0,       // phase for idle micro-hops

  // Almost there encouragement
  almostThereShown: false,
  almostThereTimer: 0,

  // Victory dance
  victoryDanceTimer: 0,
  victoryDanceActive: false,

  // Countdown ticks played (memorize phase)
  countdownTicksPlayed: {},

  // Level preview
  levelPreview: null,

  // Deferred level setup flag (heavy work deferred to scene onEnter)
  _pendingLevelSetup: false,

  // Managed timers (replaces setTimeout/setInterval in game logic)
  timers: [],

  // Secret route reveal (H key / long-press during playing)
  revealRoute: false,
  revealRouteTimer: 0,
  routeRevealed: false,  // true if player used hint this level (zeroes score)

  // Input
  keys: {},
  isTouchDevice: false,

  // Loop
  lastTime: 0,
  accumulator: 0,

  // Performance
  perfMode: 'high',  // 'high' (desktop) or 'low' (mobile)
  perf: { fps: 0, avgFps: 0, minFps: 60, frameTimes: new Float64Array(FPS_SAMPLE_SIZE), frameIdx: 0, frameCount: 0, showFps: false },
  lastParallaxY: -999,
};
