// ─── MENU ───────────────────────────────────────────────────────
function updateStartBtn() {
  document.getElementById('start-btn').disabled = !(G.heroChoice && G.rescueChoice);
}

function updateSettingsSummary() {
  const diffLabel = G.difficulty.charAt(0).toUpperCase() + G.difficulty.slice(1);
  const sizeLabel = G.selectedSize.charAt(0).toUpperCase() + G.selectedSize.slice(1);
  const memSecs = MEMORIZE_TIMES[G.selectedMemTime];
  document.getElementById('settings-summary').textContent = diffLabel + ' \u00B7 ' + sizeLabel + ' grid \u00B7 ' + memSecs + 's memorize';
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
      updateStartBtn();
    });
    heroGrid.appendChild(hCard);

    const rCard = document.createElement('div');
    rCard.className = 'char-card';
    rCard.innerHTML = `<div class="emoji">${ch.emoji}</div><div class="name">${ch.name}</div>`;
    rCard.addEventListener('click', () => {
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

  // Start button
  document.getElementById('start-btn').addEventListener('click', startGame);

  // Play again button (win screen) — back to menu
  document.getElementById('play-again-btn').addEventListener('click', () => {
    G.heroChoice = null;
    G.rescueChoice = null;
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    updateStartBtn();
    SceneManager.replace(MenuScene);
  });

  // Try again button (lose screen) — restart same game
  document.getElementById('try-again-btn').addEventListener('click', () => {
    startGame();
  });

  // Back to menu button (lose screen)
  document.getElementById('lose-menu-btn').addEventListener('click', () => {
    G.heroChoice = null;
    G.rescueChoice = null;
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    updateStartBtn();
    SceneManager.replace(MenuScene);
  });
}

function startGame() {
  initAudio();

  // Apply grid size setting
  const sizeConfig = GRID_SIZES[G.selectedSize];
  G.gridCols = sizeConfig.cols;
  G.gridRows = sizeConfig.rows;

  generatePlatforms();
  resetPlayer();
  G.memorizeTimer = MEMORIZE_TIMES[G.selectedMemTime];
  G.particles = [];
  G.trailMarks = [];

  SceneManager.replace(MemorizeScene);
}
