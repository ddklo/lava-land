// ─── MENU ───────────────────────────────────────────────────────
function updateStartBtn() {
  document.getElementById('start-btn').disabled = !(G.heroChoice && G.rescueChoice);
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

  // Start button
  document.getElementById('start-btn').addEventListener('click', startGame);

  // Play again button — scene transition handles all DOM visibility
  document.getElementById('play-again-btn').addEventListener('click', () => {
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
  G.memorizeTimer = MEMORIZE_TIME;
  G.particles = [];

  SceneManager.replace(MemorizeScene);
}
