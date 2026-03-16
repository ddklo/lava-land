// ─── CONSTANTS ──────────────────────────────────────────────────
const GAME_TITLE = 'LAVA LAND';
const GAME_AUTHOR = 'made by Ellie Hellesvik Kloven';
const CANVAS_W = 800;
const CANVAS_H = 700;
const PLATFORM_REAL_COLOR = '#665544';
const PLATFORM_REAL_TOP = '#887766';
const MEMORIZE_TIMES = {
  short:  5,
  medium: 10,
  long:   20,
};
const PLAT_H = 48;

const GRID_SIZES = {
  small:  { cols: 5, rows: 8 },
  medium: { cols: 6, rows: 12 },
  large:  { cols: 7, rows: 16 },
};

const DIFFICULTY_FAKE_CHANCE = {
  easy:   0.2,
  medium: 0.45,
  hard:   0.7,
};

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
