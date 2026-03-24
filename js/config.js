// ─── CONSTANTS ──────────────────────────────────────────────────
const GAME_TITLE = 'LAVA LAND';
const GAME_AUTHOR = 'made by Ellie Hellesvik Kloven';

// Canvas dimensions
const CANVAS_W = 800;
const CANVAS_H = 700;

// Platform appearance
const PLATFORM_REAL_COLOR = '#665544';
const PLATFORM_REAL_TOP = '#887766';
const PLAT_H = 48;
const PLAT_DEPTH = 7;

// Player rendering
const EMOJI_SIZE = 58;
const PLAYER_Y_OFFSET = 16;

// Physics
const JUMP_ARC_HEIGHT = -70;
const JUMP_SPEED = 3;
const CAMERA_SMOOTHING = 0.08;
const CAMERA_PLAYER_OFFSET = 0.35;

// Platform spring (damped spring: F = -k*x - b*v)
const SPRING_STIFFNESS = 280;
const SPRING_DAMPING = 14;
const SPRING_REST_THRESHOLD = 0.15;
const SPRING_VEL_THRESHOLD = 0.5;

// Landing impact
const LAND_BOB_OFFSET = 11;
const LAND_BOB_VEL = 80;

// Jump squash/stretch
const SQUASH_X = 0.20;
const STRETCH_Y = 0.28;
const LAND_SQUASH_DURATION = 0.25;

// Trail marks
const TRAIL_FADE_RATE = 0.12;

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
};

// ─── LEVELS ─────────────────────────────────────────────────────
// maxShift: max columns the safe path can shift per row (1=single hop, 2-3=multi-hop zigzag)
// decoys:   number of near-complete fake columns planted to create dead-end paths
const LEVELS = [
  { cols: 5, rows: 5,  fake: 0.35, memTime: 10, maxShift: 1, decoys: 0, name: 'The Crossing' },
  { cols: 5, rows: 6,  fake: 0.38, memTime: 10, maxShift: 1, decoys: 0, name: 'Stepping Stones' },
  { cols: 5, rows: 7,  fake: 0.40, memTime: 10, maxShift: 1, decoys: 0, name: 'Lava Creek' },
  { cols: 5, rows: 8,  fake: 0.42, memTime: 10, maxShift: 1, decoys: 0, name: 'Molten Path' },
  { cols: 6, rows: 8,  fake: 0.44, memTime: 9,  maxShift: 1, decoys: 0, name: 'Ember Trail' },
  { cols: 6, rows: 10, fake: 0.46, memTime: 9,  maxShift: 1, decoys: 0, name: 'Fire Walk' },
  { cols: 6, rows: 10, fake: 0.48, memTime: 9,  maxShift: 1, decoys: 0, name: 'Inferno Bridge' },
  { cols: 6, rows: 12, fake: 0.50, memTime: 9,  maxShift: 1, decoys: 0, name: 'Scorched Passage' },
  { cols: 7, rows: 12, fake: 0.53, memTime: 8,  maxShift: 2, decoys: 0, name: 'Magma Maze' },
  { cols: 7, rows: 14, fake: 0.55, memTime: 8,  maxShift: 2, decoys: 0, name: 'Obsidian Run' },
  { cols: 7, rows: 14, fake: 0.57, memTime: 8,  maxShift: 2, decoys: 0, name: 'Volcano Heart' },
  { cols: 7, rows: 15, fake: 0.60, memTime: 7,  maxShift: 2, decoys: 0, name: 'Dragon\'s Lair' },
  { cols: 7, rows: 16, fake: 0.64, memTime: 7,  maxShift: 2, decoys: 1, backtracks: 1, decoyFakes: 1, name: 'Hellfire Sprint' },
  { cols: 7, rows: 16, fake: 0.68, memTime: 6,  maxShift: 3, decoys: 2, backtracks: 1, decoyFakes: 2, name: 'Core Meltdown' },
  { cols: 7, rows: 16, fake: 0.72, memTime: 6,  maxShift: 3, decoys: 3, backtracks: 2, decoyFakes: 2, name: 'Final Descent' },
];

function getLevelConfig(levelNum) {
  if (levelNum <= LEVELS.length) return LEVELS[levelNum - 1];
  // Endless scaling for level 16+
  const n = levelNum - LEVELS.length; // how many beyond 15
  return {
    cols: 7,
    rows: Math.min(20, 16 + Math.floor(n / 2)),
    fake: Math.min(0.82, 0.72 + n * 0.015),
    memTime: Math.max(4, 6 - Math.floor(n / 2)),
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
const SCORE_LEVEL_MULT = 200;
const SCORE_PERFECT_BONUS = 1000;
const SCORE_SPEED_BONUS = 500;
const SCORE_EARLY_MEM_MULT = 80; // points per second of memorize time saved
const SCORE_STREAK_MULT = 50;    // points per streak-level per clean forward row
const SCORE_DIFFICULTY_MULT = 30;  // bonus points per grid cell (rows * cols) to reward harder grids
const SCORE_FAKE_MULT = 2000;      // bonus multiplied by fake chance to reward denser fake boards
const SPEED_BONUS_THRESHOLD = 0.5;
const STAR_TWO_THRESHOLD = 0.5;
const STAR_THREE_THRESHOLD = 0.8;

// Characters
const CHARACTERS = [
  { id: 'tortoise', emoji: '\u{1F422}', name: 'Tortoise', color: '#66aa44' },
  { id: 'wizard', emoji: '\u{1F9D9}', name: 'Wizard', color: '#aa44ff' },
  { id: 'koala', emoji: '\u{1F428}', name: 'Koala', color: '#aaaaaa' },
  { id: 'ninja',  emoji: '\u{1F977}', name: 'Ninja', color: '#888888' },
  { id: 'princess', emoji: '\u{1F478}', name: 'Princess', color: '#ff66aa' },
  { id: 'prince', emoji: '\u{1F934}', name: 'Prince', color: '#6688ff' },
  { id: 'cat', emoji: '\u{1F431}', name: 'Cat', color: '#ffaa44' },
  { id: 'dog', emoji: '\u{1F436}', name: 'Dog', color: '#cc8844' },
  { id: 'witch', emoji: '\u{1F9D9}\u200D\u2640\uFE0F', name: 'Witch', color: '#8844aa' },
  { id: 'dolphin', emoji: '\u{1F42C}', name: 'Dolphin', color: '#4499dd' },
];
