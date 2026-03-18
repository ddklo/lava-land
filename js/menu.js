// ─── MENU ───────────────────────────────────────────────────────
function updateStartBtn() {
  const ready = !!(G.heroChoice && G.rescueChoice);
  document.getElementById('start-btn').disabled = !ready;
  document.getElementById('custom-btn').disabled = !ready;
}

function updateSettingsSummary() {
  const diffLabel = G.difficulty.charAt(0).toUpperCase() + G.difficulty.slice(1);
  const sizeLabel = G.selectedSize.charAt(0).toUpperCase() + G.selectedSize.slice(1);
  const memSecs = MEMORIZE_TIMES[G.selectedMemTime];
  document.getElementById('settings-summary').textContent = 'Custom: ' + diffLabel + ' \u00B7 ' + sizeLabel + ' grid \u00B7 ' + memSecs + 's memorize';
}

function returnToMenu() {
  G.heroChoice = null;
  G.rescueChoice = null;
  G.levelConfig = null;
  G.level = 1;
  G.totalScore = 0;
  G.tutorialShown = false;
  document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
  updateStartBtn();
  transitionTo(MenuScene);
}

function startLevel() {
  const cfg = getLevelConfig(G.level);
  G.levelConfig = cfg;
  G.gridCols = cfg.cols;
  G.gridRows = cfg.rows;
  G.memorizeTimer = cfg.memTime;

  generatePlatforms();
  resetPlayer();
  G.particles = [];
  G.trailMarks = [];
  G.jumpCount = 0;
  G.memTimeSaved = 0;
  G.jumpStreak = 0;
  G.hopsThisRow = 0;
  G.streakBonus = 0;

  transitionTo(MemorizeScene);
}

function advanceLevel() {
  G.level++;
  startLevel();
}

function setupMenu() {
  const heroGrid = document.getElementById('hero-grid');
  const rescueGrid = document.getElementById('rescue-grid');

  CHARACTERS.forEach(ch => {
    const hCard = document.createElement('div');
    hCard.className = 'char-card';
    hCard.innerHTML = `<div class="emoji">${ch.emoji}</div><div class="name">${ch.name}</div>`;
    hCard.addEventListener('click', () => {
      G.heroChoice = ch.id;
      heroGrid.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      hCard.classList.add('selected');
      // If rescue matches hero, clear rescue selection
      if (G.rescueChoice === ch.id) {
        G.rescueChoice = null;
        rescueGrid.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      }
      updateStartBtn();
    });
    heroGrid.appendChild(hCard);

    const rCard = document.createElement('div');
    rCard.className = 'char-card';
    rCard.innerHTML = `<div class="emoji">${ch.emoji}</div><div class="name">${ch.name}</div>`;
    rCard.addEventListener('click', () => {
      // Skip if same as hero
      if (ch.id === G.heroChoice) return;
      G.rescueChoice = ch.id;
      rescueGrid.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      rCard.classList.add('selected');
      updateStartBtn();
    });
    rescueGrid.appendChild(rCard);
  });

  // Difficulty selector
  document.querySelectorAll('#diff-row .opt-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#diff-row .opt-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      G.difficulty = card.dataset.diff;
    });
  });

  // Grid size selector
  document.querySelectorAll('#size-row .opt-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#size-row .opt-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      G.selectedSize = card.dataset.size;
    });
  });

  // Memorize time selector
  document.querySelectorAll('#memtime-row .opt-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#memtime-row .opt-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      G.selectedMemTime = card.dataset.memtime;
    });
  });

  // Settings button — open settings screen
  document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('settings-screen').style.display = 'block';
  });

  // Settings done button — back to menu
  document.getElementById('settings-back-btn').addEventListener('click', () => {
    document.getElementById('settings-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
    updateSettingsSummary();
  });

  // Adventure mode button (primary)
  document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-btn').disabled = true;
    document.getElementById('custom-btn').disabled = true;
    initAudio();
    G.heroChar = CHARACTERS.find(c => c.id === G.heroChoice);
    G.rescueChar = CHARACTERS.find(c => c.id === G.rescueChoice);
    G.gameMode = 'adventure';
    G.level = 1;
    G.totalScore = 0;
    startLevel();
  });

  // Custom mode button
  document.getElementById('custom-btn').addEventListener('click', () => {
    document.getElementById('start-btn').disabled = true;
    document.getElementById('custom-btn').disabled = true;
    initAudio();
    G.heroChar = CHARACTERS.find(c => c.id === G.heroChoice);
    G.rescueChar = CHARACTERS.find(c => c.id === G.rescueChoice);
    G.gameMode = 'custom';
    G.levelConfig = null;
    startGame();
  });

  // Next level button (win screen — adventure mode)
  document.getElementById('next-level-btn').addEventListener('click', () => {
    advanceLevel();
  });

  // Play again / back to menu button (win screen)
  document.getElementById('play-again-btn').addEventListener('click', () => {
    returnToMenu();
  });

  // Try again button (lose screen)
  document.getElementById('try-again-btn').addEventListener('click', () => {
    if (G.gameMode === 'adventure') {
      startLevel();
    } else {
      startGame();
    }
  });

  // Back to menu button (lose screen)
  document.getElementById('lose-menu-btn').addEventListener('click', () => {
    returnToMenu();
  });
}

function startGame() {
  // Custom mode — use manual settings
  const sizeConfig = GRID_SIZES[G.selectedSize];
  G.gridCols = sizeConfig.cols;
  G.gridRows = sizeConfig.rows;

  generatePlatforms();
  resetPlayer();
  G.memorizeTimer = MEMORIZE_TIMES[G.selectedMemTime];
  G.particles = [];
  G.trailMarks = [];
  G.jumpCount = 0;
  G.memTimeSaved = 0;
  G.jumpStreak = 0;
  G.hopsThisRow = 0;
  G.streakBonus = 0;

  transitionTo(MemorizeScene);
}
