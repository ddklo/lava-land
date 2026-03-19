# LAVA LAND - Game Rules

## Objective

Navigate across a grid of platforms suspended over lava to reach and rescue your friend on the other side. You must memorize which platforms are safe before the timer runs out, then jump across without falling.

## How to Play

### 1. Setup (Menu Screen)
- **Choose your hero** from 8 characters (Knight, Wizard, Elf, Ninja, Princess, Prince, Cat, Dog)
- **Choose who to rescue** (must be different from your hero)
- Adjust **difficulty**, **grid size**, and **memorize time** in Settings

### 2. Memorize Phase
- The full grid is shown zoomed out with platforms color-coded:
  - **Green platforms with checkmarks** = safe to land on
  - **Red platforms with X marks** = fake (will crumble if you land on them)
- A countdown timer shows how long you have to memorize
- **Remember the safe path!** You will need it in the next phase

### 3. Playing Phase
- The view zooms in and you control your character from the starting platform
- Jump from platform to platform to reach the rescue character at the far end
- All platforms now look identical (no more color hints)
- Each platform you leave **explodes and disappears** — no going back
- A timer tracks how long you take

### 4. Win Condition
- Reach the **last row** AND land on the **exact platform** where the rescue character is standing
- Landing on the last row but wrong column does not count as a win
- A celebration plays with fireworks, confetti, and the characters walking across the screen

### 5. Lose Conditions
- **Land on a fake platform**: It crumbles and you fall into the lava
- **Land on a destroyed platform**: If a platform was already exploded, landing there means falling
- A lose screen shows with the option to retry or return to menu

## Controls

### Keyboard
| Key | Action |
|-----|--------|
| Left Arrow | Hop left (same row) |
| Right Arrow | Hop right (same row) |
| Up Arrow | Jump forward (next row) |
| Space | Jump forward (next row) |

### Touch (Mobile)
| Gesture | Action |
|---------|--------|
| Swipe left | Hop left |
| Swipe right | Hop right |
| Tap / Swipe up | Jump forward |

## Settings

### Difficulty
| Level | Fake Platform Chance | Description |
|-------|---------------------|-------------|
| Easy | 20% | Few fake blocks |
| Medium | 45% | Many fake blocks |
| Hard | 70% | Most blocks are fake |

The fake chance applies to every platform that is NOT on the safe path. The safe path always has exactly one safe platform per row.

### Grid Size
| Size | Columns x Rows |
|------|---------------|
| Small | 5 x 8 |
| Medium | 6 x 12 |
| Large | 7 x 16 |

### Memorize Time
| Setting | Duration |
|---------|----------|
| Short | 5 seconds |
| Medium | 10 seconds |
| Long | 20 seconds |

## Game Mechanics

### Safe Path
- Every generated level has exactly one guaranteed safe path from the first row to the last row
- The path moves laterally (left/right) with 70% probability at each row, staying straight 30% of the time
- Path generation is governed by configurable **board rules** (defined in `BOARD_RULES` in config.js):
  - **maxConsecutiveStraight** (default 1): Max consecutive rows the path can stay in the same column
  - **maxConsecutiveSameDirection** (default 5): Max consecutive rows the path can move in the same lateral direction (left or right). Prevents long easy-to-memorize diagonals
  - **minLateralMoveFraction** (default 0.4): At least 40% of rows must include a lateral move for variety

### Platform Behavior
- **Safe platforms**: Solid stone blocks. Landing on them produces a dust effect and bob animation
- **Fake platforms**: Look identical during play. Landing causes them to shake and crumble, then you fall
- **Destroyed platforms**: After you jump away from any platform, it explodes into debris. If you somehow land on one (via sideways movement), you fall

### Jump Animation
- Your character follows a parabolic arc between platforms
- The character stretches vertically at the peak of the jump and squashes on takeoff/landing
- A shadow on the ground tracks the character's position

### Player Trail
- Each platform you land on leaves a glowing trail mark
- Trail marks slowly fade over time, showing your path through the level

### Camera
- The camera smoothly follows your character upward as you progress
- During the memorize phase, the camera zooms out to show the entire level

### Screen Shake
- Falling into lava triggers a screen shake effect for dramatic impact
