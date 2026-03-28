// ─── CONSTANTS ──────────────────────────────────────────────────
const GAME_TITLE = 'LAVA LAND';
const GAME_AUTHOR = 'made by Ellie Hellesvik Kloven';

// Canvas dimensions
const CANVAS_W = 800;
let CANVAS_H = 700;

// Platform appearance
const PLATFORM_REAL_COLOR = '#665544';
const PLATFORM_REAL_TOP = '#887766';
const PLAT_H = 48;
const PLAT_DEPTH = 7;

// Player rendering
const EMOJI_SIZE = 72;
const PLAYER_Y_OFFSET = 16;

// Physics
const JUMP_ARC_HEIGHT = -70;
const JUMP_SPEED = 3;
const CAMERA_SMOOTHING = 0.08;
const CAMERA_PLAYER_OFFSET = 0.35;
const ZOOM_IN_DURATION = 0.4;  // seconds for memorize→playing zoom animation

// Platform spring (damped spring: F = -k*x - b*v)
const SPRING_STIFFNESS = 280;
const SPRING_DAMPING = 14;
const SPRING_REST_THRESHOLD = 0.15;
const SPRING_VEL_THRESHOLD = 0.5;

// Dissolve timing (fake platforms disappear during play)
const DISSOLVE_INITIAL_DELAY = 3.0;  // seconds before first dissolve
const DISSOLVE_MIN_INTERVAL = 1.0;   // minimum seconds between dissolves
const DISSOLVE_MAX_INTERVAL = 3.0;   // maximum seconds between dissolves
const DISSOLVE_PACE_MULT = 1.8;      // multiplier on estimated completion time
const DISSOLVE_START_INTERVAL = 0.4; // fast initial interval between dissolves
const DISSOLVE_ACCEL_FACTOR = 1.15;  // interval multiplier after each dissolve (slows down)

// Landing impact
const LAND_BOB_OFFSET = 11;
const LAND_BOB_VEL = 80;

// Jump squash/stretch
const SQUASH_X = 0.20;
const STRETCH_Y = 0.28;
const LAND_SQUASH_DURATION = 0.25;

// Particle system cap (prevents memory growth on low-end devices)
const MAX_PARTICLES = 500;
const MAX_PARTICLES_LOW = 200;

// Trail marks
const TRAIL_FADE_RATE = 0.12;
const MAX_TRAIL_MARKS = 50;

// Performance monitoring
const FPS_SAMPLE_SIZE = 60;

// Memorize times (seconds)
const MEMORIZE_TIMES = {
  short:  5,
  medium: 10,
  long:   20,
};

// Grid sizes
const GRID_SIZES = {
  small:  { cols: 5, rows: 8 },
  medium: { cols: 6, rows: 12 },
  large:  { cols: 7, rows: 16 },
};

// Difficulty: chance a non-path platform is fake
const DIFFICULTY_FAKE_CHANCE = {
  easy:   0.2,
  medium: 0.45,
  hard:   0.7,
};

// ─── BOARD GENERATION RULES ────────────────────────────────────
// Named constraints applied to the safe path during board generation.
// Each rule is enforced as a post-processing pass on the generated path.
const BOARD_RULES = {
  // Max consecutive rows the path can stay in the same column (straight down)
  maxConsecutiveStraight: 1,
  // Max consecutive rows the path can move in the same lateral direction
  maxConsecutiveSameDirection: 5,
  // Minimum fraction of rows that must include a lateral (non-straight) move
  minLateralMoveFraction: 0.4,
  // Minimum fraction of available columns the safe path must visit
  // (e.g. 0.6 on a 5-col grid means path must touch at least 3 unique columns)
  minColumnSpreadFraction: 0.6,
};

// ─── LEVELS ─────────────────────────────────────────────────────
// maxShift: max columns the safe path can shift per row (1=single hop, 2-3=multi-hop zigzag)
// decoys:   number of near-complete fake columns planted to create dead-end paths
const LEVELS = [
  // Tier 1 (5-col): Learning — small grids, simple paths
  { cols: 5, rows: 5,  fake: 0.35, memTime: 10, maxShift: 1, decoys: 0, name: 'The Crossing' },
  { cols: 5, rows: 6,  fake: 0.38, memTime: 10, maxShift: 1, decoys: 0, name: 'Stepping Stones' },
  { cols: 5, rows: 7,  fake: 0.40, memTime: 10, maxShift: 1, decoys: 0, name: 'Lava Creek' },
  { cols: 5, rows: 8,  fake: 0.42, memTime: 10, maxShift: 1, decoys: 0, name: 'Molten Path' },
  // Tier 2 (6-col): Expansion — wider grid, introduce multi-hop at end of tier
  { cols: 6, rows: 8,  fake: 0.44, memTime: 10, maxShift: 1, decoys: 0, name: 'Ember Trail' },
  { cols: 6, rows: 10, fake: 0.46, memTime: 10, maxShift: 1, decoys: 0, name: 'Fire Walk' },
  { cols: 6, rows: 10, fake: 0.48, memTime: 9,  maxShift: 2, decoys: 0, name: 'Inferno Bridge' },
  { cols: 6, rows: 12, fake: 0.50, memTime: 9,  maxShift: 2, decoys: 0, name: 'Scorched Passage' },
  // Tier 3 (7-col): Complexity — larger grids, multi-hop, introduce decoys at end
  { cols: 7, rows: 12, fake: 0.52, memTime: 9,  maxShift: 2, decoys: 0, name: 'Magma Maze' },
  { cols: 7, rows: 13, fake: 0.54, memTime: 8,  maxShift: 2, decoys: 0, name: 'Obsidian Run' },
  { cols: 7, rows: 14, fake: 0.56, memTime: 8,  maxShift: 2, decoys: 1, decoyFakes: 1, name: 'Volcano Heart' },
  { cols: 7, rows: 15, fake: 0.58, memTime: 8,  maxShift: 2, decoys: 1, decoyFakes: 1, name: 'Dragon\'s Lair' },
  // Tier 4 (7-col): Mastery — backtracks, heavy decoys, tighter memorize time
  { cols: 7, rows: 15, fake: 0.62, memTime: 7,  maxShift: 2, decoys: 2, backtracks: 1, decoyFakes: 1, name: 'Hellfire Sprint' },
  { cols: 7, rows: 16, fake: 0.66, memTime: 7,  maxShift: 3, decoys: 2, backtracks: 1, decoyFakes: 2, name: 'Core Meltdown' },
  { cols: 7, rows: 16, fake: 0.72, memTime: 6,  maxShift: 3, decoys: 3, backtracks: 2, decoyFakes: 2, name: 'Final Descent' },
];

function getLevelConfig(levelNum) {
  if (levelNum <= LEVELS.length) return LEVELS[levelNum - 1];
  // Endless scaling for level 16+
  const n = levelNum - LEVELS.length; // how many beyond 15
  const rows = Math.min(20, 16 + Math.floor(n / 3));
  // memTime scales with grid size: larger grids get proportionally more time,
  // but still decreases as levels progress (minimum 4s)
  const baseMemTime = Math.max(4, 6 - Math.floor(n / 3));
  return {
    cols: 7,
    rows: rows,
    fake: Math.min(0.82, 0.72 + n * 0.012),
    memTime: baseMemTime,
    maxShift: 3,
    decoys: Math.min(4, 3 + Math.floor(n / 3)),
    backtracks: Math.min(3, 2 + Math.floor(n / 4)),
    decoyFakes: Math.min(3, 2 + Math.floor(n / 3)),
    name: 'Endless ' + levelNum,
  };
}

// ─── SCORING ────────────────────────────────────────────────────
const SCORE_TIME_BASE = 5000;
const SCORE_TIME_PENALTY = 50;
const SCORE_JUMP_BASE = 3000;
const SCORE_JUMP_PENALTY = 100;
const SCORE_LEVEL_MULT = 300;
const SCORE_PERFECT_BASE = 500;          // base perfect-path bonus (scales with level)
const SCORE_PERFECT_LEVEL_MULT = 100;    // perfect bonus = base + level × this
const SCORE_SPEED_BASE = 300;            // base speed bonus (scales with level)
const SCORE_SPEED_LEVEL_MULT = 60;       // speed bonus = base + level × this
const SCORE_EARLY_MEM_MULT = 80; // points per second of memorize time saved
const SCORE_STREAK_MULT = 50;    // points per streak-level per clean forward row
const SCORE_DIFFICULTY_MULT = 30;  // bonus points per grid cell (rows * cols) to reward harder grids
const SCORE_FAKE_MULT = 2000;      // bonus multiplied by fake chance to reward denser fake boards
const SPEED_BONUS_THRESHOLD = 0.5;
const STAR_TWO_THRESHOLD = 0.5;
const STAR_THREE_THRESHOLD = 0.75;
const STREAK_REALISM_FACTOR = 0.35; // fraction of theoretical max streak used for star thresholds

// ─── THEME PALETTES ──────────────────────────────────────────────
// Canvas color palettes for each visual theme.
// CSS custom properties handle UI colors; these handle canvas rendering.
const THEME_PALETTES = {
  volcano: {
    // Lava layers
    lavaBaseR: 60, lavaBaseG: 5,
    lavaFlowHotR: 200, lavaFlowHotG: 60, lavaFlowHotB: 0,
    lavaFlowEdgeR: 80, lavaFlowEdgeG: 8, lavaFlowEdgeB: 0,
    lavaCrackOuter: '255,120,20',
    lavaCrackCore: '255,200',
    lavaBranch: '255,160,40',
    lavaSpurtGlow: '255,100,0',
    lavaDropletBase: [255, 180, 30],
    lavaEmberGlow: '255,200,50',
    lavaEmberCore: '255,255,200',
    lavaBubbleStroke: '255,180,50',
    lavaBubbleFill: '255,220,100',
    lavaBubblePop: '255,255,200',
    lavaHaze: 'rgba(255,60,0,0.04)',
    // Platforms
    platDepthTop: '#4a3828',
    platDepthBot: '#5a3020',
    platFaceTop: '#887766',
    platFaceMain: '#665544',
    platFaceMid: '#5a4433',
    platFaceBot: '#4a3828',
    platUnderGlowR: 255, platUnderGlowG: 80, platUnderGlowB: 0,
    platEdgeGlowR: 255, platEdgeGlowG: 100, platEdgeGlowB: 20,
    platMoss: 'rgba(80,120,60,0.2)',
    // Revealed safe
    safeGlow: '#44ff88',
    safeDepth: '#3a5530',
    safeFace: '#4a7040',
    safeHighlight: '#5a8850',
    safeCheck: 'rgba(80,255,120,0.9)',
    // Fake platform
    fakeDepth: 'rgba(60,15,15,0.5)',
    fakeFace: 'rgba(80,30,30,0.55)',
    fakeBorder: '#ff4444',
    fakeCross: 'rgba(255,80,80,0.7)',
    // Crumble
    crumbleWash: '200,30,10',
    crumbleCrack: '255,80,30',
    crumbleGlow: '#ff2200',
    crumbleBorder: '255,60,20',
    // Heat glow
    heatGlowR: 255, heatGlowG: 80, heatGlowB: 0,
    // Trail marks
    trailOuter: '#ffaa44',
    trailMid: '#ffcc66',
    trailCore: '#ffeecc',
    // Particles
    explosionColors: ['#886655', '#775544', '#aa8866', '#665544', '#998877'],
    dustColors: ['#bbaa99', '#998877', '#ccbbaa'],
    lavaSplashColors: ['#ff6600', '#ff8800', '#ffaa00', '#ff4400'],
    crumbleColors: ['#886655', '#775544', '#aa8866'],
    lavaBurstColors: ['#ff4400', '#ff6600', '#ffaa00', '#ff2200'],
    trailColors: ['#ffdd88', '#ffaa44'],
    impactRingColor: '#ffcc66',
    cssClass: 'theme-volcano',
  },
  ocean: {
    lavaBaseR: 5, lavaBaseG: 20,
    lavaFlowHotR: 0, lavaFlowHotG: 100, lavaFlowHotB: 200,
    lavaFlowEdgeR: 0, lavaFlowEdgeG: 40, lavaFlowEdgeB: 80,
    lavaCrackOuter: '20,180,255',
    lavaCrackCore: '100,220',
    lavaBranch: '40,200,255',
    lavaSpurtGlow: '0,150,255',
    lavaDropletBase: [80, 200, 255],
    lavaEmberGlow: '50,200,255',
    lavaEmberCore: '200,240,255',
    lavaBubbleStroke: '50,180,255',
    lavaBubbleFill: '100,220,255',
    lavaBubblePop: '200,240,255',
    lavaHaze: 'rgba(0,60,255,0.04)',
    platDepthTop: '#2a4858',
    platDepthBot: '#1a3848',
    platFaceTop: '#6699aa',
    platFaceMain: '#557788',
    platFaceMid: '#4a6677',
    platFaceBot: '#3a5566',
    platUnderGlowR: 0, platUnderGlowG: 120, platUnderGlowB: 200,
    platEdgeGlowR: 20, platEdgeGlowG: 160, platEdgeGlowB: 255,
    platMoss: 'rgba(60,180,120,0.2)',
    safeGlow: '#44ffcc',
    safeDepth: '#2a5545',
    safeFace: '#3a7060',
    safeHighlight: '#4a8870',
    safeCheck: 'rgba(80,255,200,0.9)',
    fakeDepth: 'rgba(15,15,60,0.5)',
    fakeFace: 'rgba(30,30,80,0.55)',
    fakeBorder: '#4444ff',
    fakeCross: 'rgba(80,80,255,0.7)',
    crumbleWash: '10,30,200',
    crumbleCrack: '30,80,255',
    crumbleGlow: '#0022ff',
    crumbleBorder: '20,60,255',
    heatGlowR: 0, heatGlowG: 80, heatGlowB: 255,
    trailOuter: '#44aaff',
    trailMid: '#66ccff',
    trailCore: '#cceeFF',
    explosionColors: ['#556688', '#445577', '#6688aa', '#334466', '#778899'],
    dustColors: ['#99aabb', '#889aaa', '#aabbcc'],
    lavaSplashColors: ['#0066cc', '#0088ff', '#00aaff', '#0044aa'],
    crumbleColors: ['#556688', '#445577', '#6688aa'],
    lavaBurstColors: ['#0044aa', '#0066cc', '#00aaff', '#0022aa'],
    trailColors: ['#88ddff', '#44aaff'],
    impactRingColor: '#66ccff',
    cssClass: 'theme-ocean',
  },
  forest: {
    lavaBaseR: 15, lavaBaseG: 30,
    lavaFlowHotR: 80, lavaFlowHotG: 160, lavaFlowHotB: 20,
    lavaFlowEdgeR: 30, lavaFlowEdgeG: 60, lavaFlowEdgeB: 10,
    lavaCrackOuter: '120,200,40',
    lavaCrackCore: '180,230',
    lavaBranch: '140,210,50',
    lavaSpurtGlow: '80,180,20',
    lavaDropletBase: [140, 220, 60],
    lavaEmberGlow: '180,220,50',
    lavaEmberCore: '220,255,180',
    lavaBubbleStroke: '140,200,60',
    lavaBubbleFill: '180,230,80',
    lavaBubblePop: '220,255,200',
    lavaHaze: 'rgba(40,120,0,0.04)',
    platDepthTop: '#3a3020',
    platDepthBot: '#4a3a18',
    platFaceTop: '#998866',
    platFaceMain: '#776644',
    platFaceMid: '#665533',
    platFaceBot: '#554422',
    platUnderGlowR: 80, platUnderGlowG: 160, platUnderGlowB: 20,
    platEdgeGlowR: 100, platEdgeGlowG: 180, platEdgeGlowB: 40,
    platMoss: 'rgba(60,140,40,0.25)',
    safeGlow: '#88ff44',
    safeDepth: '#3a5520',
    safeFace: '#4a7030',
    safeHighlight: '#5a8840',
    safeCheck: 'rgba(120,255,80,0.9)',
    fakeDepth: 'rgba(40,20,10,0.5)',
    fakeFace: 'rgba(60,30,15,0.55)',
    fakeBorder: '#cc6622',
    fakeCross: 'rgba(200,100,40,0.7)',
    crumbleWash: '120,60,10',
    crumbleCrack: '180,100,30',
    crumbleGlow: '#cc4400',
    crumbleBorder: '160,80,20',
    heatGlowR: 80, heatGlowG: 160, heatGlowB: 20,
    trailOuter: '#aacc44',
    trailMid: '#ccdd66',
    trailCore: '#eeffcc',
    explosionColors: ['#665533', '#554422', '#887744', '#443322', '#776655'],
    dustColors: ['#aa9977', '#998866', '#bbaa88'],
    lavaSplashColors: ['#448800', '#66aa00', '#88cc00', '#336600'],
    crumbleColors: ['#665533', '#554422', '#887744'],
    lavaBurstColors: ['#336600', '#448800', '#88cc00', '#225500'],
    trailColors: ['#ccdd88', '#aacc44'],
    impactRingColor: '#ccdd66',
    cssClass: 'theme-forest',
  },
};

function palette() {
  return THEME_PALETTES[G.theme] || THEME_PALETTES.volcano;
}

// ─── COLLECTIBLE COINS ──────────────────────────────────────────
const COIN_CHANCE = 0.3;       // chance a safe non-path platform gets a coin
const COIN_POINTS = 150;       // points per coin collected
const COIN_SIZE = 14;          // radius of coin sprite
const COIN_BOB_SPEED = 3;     // bob animation speed
const COIN_BOB_HEIGHT = 4;    // bob amplitude in pixels
const COIN_SPIN_SPEED = 4;    // spin animation speed

// ─── COMBO CALLOUTS ─────────────────────────────────────────────
// Milestone streak thresholds and their i18n keys
const COMBO_MILESTONES = [
  { streak: 3,  key: 'combo.nice' },
  { streak: 5,  key: 'combo.awesome' },
  { streak: 7,  key: 'combo.incredible' },
  { streak: 10, key: 'combo.unstoppable' },
  { streak: 15, key: 'combo.legendary' },
];

// ─── ALMOST THERE ───────────────────────────────────────────────
const ALMOST_THERE_ROWS = 2;   // show encouragement when this many rows from end

// ─── RESCUE CHARACTER PROXIMITY ─────────────────────────────────
const RESCUE_HELP_ROWS = 4;           // rows from end at which "Help!" speech bubble appears
const RESCUE_PROXIMITY_BOUNCE_MULT = 8; // extra bounce pixels at max proximity

// ─── COUNTDOWN TICK ─────────────────────────────────────────────
const COUNTDOWN_TICK_START = 3; // seconds before memorize end to start ticking

// ─── VICTORY DANCE ──────────────────────────────────────────────
const VICTORY_DANCE_DURATION = 2.0; // seconds of dance before fly-away

// ─── FLY-AWAY EXIT ─────────────────────────────────────────────
const FLY_CHARGE_DURATION = 0.35;    // crouch/charge-up before launch (seconds)
const FLY_ACCEL_RATE = 650;          // upward acceleration (px/sec²)
const FLY_MAX_SCALE = 2.8;           // max emoji scale as they "approach camera"
const FLY_SCALE_RATE = 1.2;          // how fast scale grows per second
const FLY_SPIN_ACCEL = 2.0;          // spin acceleration (rad/sec²)
const FLY_SHAKE_INTENSITY = 6;       // screen shake intensity during launch
const FLY_EXHAUST_RATE = 0.02;       // seconds between exhaust particle spawns
const FLY_SPEED_LINE_COUNT = 8;      // number of speed lines drawn

// Characters
const CHARACTERS = [
  { id: 'tortoise', emoji: '\u{1F422}', name: 'Tortoise', color: '#6B8E23', soundPitch: 0.7,  soundType: 'triangle' },
  { id: 'wizard',   emoji: '\u{1F9D9}', name: 'Wizard',   color: '#7B68EE', soundPitch: 1.2,  soundType: 'sine' },
  { id: 'koala',    emoji: '\u{1F428}', name: 'Koala',     color: '#A0A0A0', soundPitch: 0.9,  soundType: 'sine' },
  { id: 'ninja',    emoji: '\u{1F977}', name: 'Ninja',     color: '#2F4F4F', soundPitch: 1.1,  soundType: 'square' },
  { id: 'princess', emoji: '\u{1F478}', name: 'Princess',  color: '#FF69B4', soundPitch: 1.3,  soundType: 'sine' },
  { id: 'prince',   emoji: '\u{1F934}', name: 'Prince',    color: '#4169E1', soundPitch: 1.0,  soundType: 'triangle' },
  { id: 'cat',      emoji: '\u{1F431}', name: 'Cat',       color: '#FF8C00', soundPitch: 1.4,  soundType: 'sine' },
  { id: 'dog',      emoji: '\u{1F436}', name: 'Dog',       color: '#CD853F', soundPitch: 0.85, soundType: 'sawtooth' },
  { id: 'witch',    emoji: '\u{1F9D9}\u200D\u2640\uFE0F', name: 'Witch', color: '#9932CC', soundPitch: 0.95, soundType: 'sawtooth' },
  { id: 'dolphin',  emoji: '\u{1F42C}', name: 'Dolphin',   color: '#00CED1', soundPitch: 1.5,  soundType: 'sine' },
];

// ─── LEVEL STORIES ──────────────────────────────────────────────
// Short narrative intro for each adventure level (i18n key)
const LEVEL_STORIES = [
  'story.1',  'story.2',  'story.3',  'story.4',  'story.5',
  'story.6',  'story.7',  'story.8',  'story.9',  'story.10',
  'story.11', 'story.12', 'story.13', 'story.14', 'story.15',
];
