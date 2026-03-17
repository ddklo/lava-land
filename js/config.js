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
const EMOJI_SIZE = 48;
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
const LAND_BOB_OFFSET = 5;
const LAND_BOB_VEL = 60;

// Jump squash/stretch
const SQUASH_X = 0.12;
const STRETCH_Y = 0.18;

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

// ─── LEVELS ─────────────────────────────────────────────────────
const LEVELS = [
  { cols: 5, rows: 5,  fake: 0.15, memTime: 12, name: 'The Crossing' },
  { cols: 5, rows: 6,  fake: 0.20, memTime: 10, name: 'Stepping Stones' },
  { cols: 5, rows: 8,  fake: 0.25, memTime: 10, name: 'Lava Creek' },
  { cols: 6, rows: 8,  fake: 0.25, memTime: 10, name: 'Molten Path' },
  { cols: 6, rows: 10, fake: 0.30, memTime: 10, name: 'Ember Trail' },
  { cols: 6, rows: 12, fake: 0.35, memTime: 10, name: 'Fire Walk' },
  { cols: 6, rows: 12, fake: 0.40, memTime: 8,  name: 'Inferno Bridge' },
  { cols: 7, rows: 12, fake: 0.40, memTime: 8,  name: 'Scorched Passage' },
  { cols: 7, rows: 14, fake: 0.45, memTime: 8,  name: 'Magma Maze' },
  { cols: 7, rows: 14, fake: 0.50, memTime: 7,  name: 'Obsidian Run' },
  { cols: 7, rows: 16, fake: 0.55, memTime: 7,  name: 'Volcano Heart' },
  { cols: 7, rows: 16, fake: 0.60, memTime: 6,  name: 'Dragon\'s Lair' },
  { cols: 7, rows: 16, fake: 0.65, memTime: 5,  name: 'Hellfire Sprint' },
  { cols: 7, rows: 16, fake: 0.70, memTime: 5,  name: 'Core Meltdown' },
  { cols: 7, rows: 16, fake: 0.75, memTime: 4,  name: 'Final Descent' },
];

function getLevelConfig(levelNum) {
  if (levelNum <= LEVELS.length) return LEVELS[levelNum - 1];
  // Endless scaling for level 16+
  const n = levelNum - LEVELS.length; // how many beyond 15
  return {
    cols: 7,
    rows: Math.min(20, 16 + n),
    fake: Math.min(0.85, 0.75 + n * 0.02),
    memTime: Math.max(3, 4 - Math.floor(n / 3)),
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
const SPEED_BONUS_THRESHOLD = 0.5;
const STAR_TWO_THRESHOLD = 0.5;
const STAR_THREE_THRESHOLD = 0.8;

// Characters
const CHARACTERS = [
  { id: 'knight', emoji: '\u{1F9D1}\u200D\u{1F9B0}', name: 'Knight', color: '#4488ff' },
  { id: 'wizard', emoji: '\u{1F9D9}', name: 'Wizard', color: '#aa44ff' },
  { id: 'archer', emoji: '\u{1F9DD}', name: 'Elf', color: '#44cc44' },
  { id: 'ninja',  emoji: '\u{1F977}', name: 'Ninja', color: '#888888' },
  { id: 'princess', emoji: '\u{1F478}', name: 'Princess', color: '#ff66aa' },
  { id: 'prince', emoji: '\u{1F934}', name: 'Prince', color: '#6688ff' },
  { id: 'cat', emoji: '\u{1F431}', name: 'Cat', color: '#ffaa44' },
  { id: 'dog', emoji: '\u{1F436}', name: 'Dog', color: '#cc8844' },
];
