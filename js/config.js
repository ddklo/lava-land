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
