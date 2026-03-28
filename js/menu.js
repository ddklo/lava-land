// ─── MENU ───────────────────────────────────────────────────────

function saveSettings() {
  try {
    localStorage.setItem('ll_difficulty', G.difficulty);
    localStorage.setItem('ll_size', G.selectedSize);
    localStorage.setItem('ll_memtime', G.selectedMemTime);
    localStorage.setItem('ll_language', G.language);
    localStorage.setItem('ll_soundtrack', G.soundtrack);
    localStorage.setItem('ll_theme', G.theme);
    localStorage.setItem('ll_haptic', G.hapticEnabled ? 'on' : 'off');
  } catch (e) {
    // Briefly show a non-blocking warning if storage is unavailable
    var summary = document.getElementById('settings-summary');
    if (summary) {
      var orig = summary.textContent;
      summary.textContent = t('error.storage');
      setTimeout(function () { summary.textContent = orig; }, 2000);
    }
  }
}

function loadSettings() {
  try {
    const diff = localStorage.getItem('ll_difficulty');
    const size = localStorage.getItem('ll_size');
    const mem  = localStorage.getItem('ll_memtime');
    const lang = localStorage.getItem('ll_language');
    const snd  = localStorage.getItem('ll_soundtrack');
    const thm  = localStorage.getItem('ll_theme');
    if (diff && ['easy', 'medium', 'hard'].includes(diff))             G.difficulty = diff;
    if (size && ['small', 'medium', 'large'].includes(size))           G.selectedSize = size;
    if (mem  && ['short', 'medium', 'long'].includes(mem))             G.selectedMemTime = mem;
    if (lang && ['en', 'no'].includes(lang))                           G.language = lang;
    if (snd  && ['classic', 'retro', 'chill'].includes(snd))           G.soundtrack = snd;
    if (thm  && ['volcano', 'ocean', 'forest'].includes(thm))         G.theme = thm;
    const hap = localStorage.getItem('ll_haptic');
    if (hap === 'off') G.hapticEnabled = false;
  } catch (e) { /* storage unavailable */ }
}

function applyLanguage() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    el.textContent = t(el.dataset.i18n);
  });
  // Update page title
  document.title = t('page.title');
  // Update character name cards (data-raw-name becomes dataset.rawName)
  document.querySelectorAll('.char-card .name[data-raw-name]').forEach(function (el) {
    el.textContent = t('char.' + el.dataset.rawName);
  });
  // Update instruction blocks (contain HTML so use innerHTML)
  var kb = document.getElementById('instructions-keyboard');
  if (kb) kb.innerHTML = '<kbd>&larr;</kbd> <kbd>&rarr;</kbd> ' + t('instructions.keyboard.1') + '<br><kbd>&darr;</kbd> / <kbd>Space</kbd> ' + t('instructions.keyboard.2') + '<br><kbd>&uarr;</kbd> ' + t('instructions.keyboard.3') + '<br>' + t('instructions.keyboard.4');
  var touch = document.getElementById('instructions-touch');
  if (touch) touch.innerHTML = t('instructions.touch.1') + '<br>' + t('instructions.touch.2') + '<br>' + t('instructions.touch.3') + '<br>' + t('instructions.touch.4');
  updateSettingsSummary();
}

function applyTheme() {
  // Remove old theme classes, add new one
  document.body.classList.remove('theme-volcano', 'theme-ocean', 'theme-forest');
  var p = THEME_PALETTES[G.theme];
  if (p && p.cssClass) document.body.classList.add(p.cssClass);
  // Invalidate lava caches so they re-render with new colors
  G.lavaCache = null;
  G.lavaCacheCtx = null;
  G.lavaCacheMem = null;
  G.lavaCacheMemCtx = null;
  // Invalidate platform texture caches (colors changed)
  if (G.platforms) {
    for (const row of G.platforms) {
      for (const plat of row) {
        plat._cache = null;
        plat._cacheRevealed = null;
      }
    }
  }
}

function updateStartBtn() {
  const ready = !!(G.heroChoice && G.rescueChoice);
  document.getElementById('start-btn').disabled = !ready;
  document.getElementById('custom-btn').disabled = !ready;
}

function updateSettingsSummary() {
  const diffLabel = t('diff.' + G.difficulty);
  const sizeLabel = t('size.' + G.selectedSize);
  const memSecs = MEMORIZE_TIMES[G.selectedMemTime];
  document.getElementById('settings-summary').textContent = t('settings.summary', { diff: diffLabel, size: sizeLabel, mem: memSecs });
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

  // Defer heavy work (platform generation, player reset) to MemorizeScene.onEnter
  // so it runs during the fade-to-black overlay instead of blocking before the fade.
  G._pendingLevelSetup = true;

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
    hCard.innerHTML = `<div class="emoji">${ch.emoji}</div><div class="name" data-raw-name="${ch.name}">${t('char.' + ch.name)}</div>`;
    hCard.addEventListener('click', () => {
      // Pre-warm audio context on first user interaction so it's ready
      // when the game starts (avoids 10-100ms blocking delay on Start click).
      initAudio();
      G.heroChoice = ch.id;
      heroGrid.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      hCard.classList.add('selected');
      // Disable the matching rescue card, re-enable all others
      rescueGrid.querySelectorAll('.char-card').forEach(c => {
        c.classList.toggle('disabled', c.dataset.charId === ch.id);
      });
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
    rCard.dataset.charId = ch.id;
    rCard.innerHTML = `<div class="emoji">${ch.emoji}</div><div class="name" data-raw-name="${ch.name}">${t('char.' + ch.name)}</div>`;
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

  // Load persisted settings and reflect them on the UI
  loadSettings();
  document.querySelectorAll('#diff-row .opt-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.diff === G.difficulty);
  });
  document.querySelectorAll('#size-row .opt-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.size === G.selectedSize);
  });
  document.querySelectorAll('#memtime-row .opt-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.memtime === G.selectedMemTime);
  });
  document.querySelectorAll('#lang-row .opt-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.lang === G.language);
  });
  document.querySelectorAll('#soundtrack-row .opt-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.soundtrack === G.soundtrack);
  });
  document.querySelectorAll('#theme-row .opt-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.theme === G.theme);
  });
  document.querySelectorAll('#haptic-row .opt-card').forEach(c => {
    c.classList.toggle('selected', (c.dataset.haptic === 'on') === G.hapticEnabled);
  });
  applyLanguage();
  applyTheme();

  // Difficulty selector
  document.querySelectorAll('#diff-row .opt-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#diff-row .opt-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      G.difficulty = card.dataset.diff;
      saveSettings();
    });
  });

  // Grid size selector
  document.querySelectorAll('#size-row .opt-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#size-row .opt-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      G.selectedSize = card.dataset.size;
      saveSettings();
    });
  });

  // Memorize time selector
  document.querySelectorAll('#memtime-row .opt-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#memtime-row .opt-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      G.selectedMemTime = card.dataset.memtime;
      saveSettings();
    });
  });

  // Language selector
  document.querySelectorAll('#lang-row .opt-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#lang-row .opt-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      G.language = card.dataset.lang;
      applyLanguage();
      saveSettings();
    });
  });

  // Soundtrack selector
  document.querySelectorAll('#soundtrack-row .opt-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#soundtrack-row .opt-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      G.soundtrack = card.dataset.soundtrack;
      saveSettings();
    });
  });

  // Theme selector
  document.querySelectorAll('#theme-row .opt-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#theme-row .opt-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      G.theme = card.dataset.theme;
      applyTheme();
      saveSettings();
    });
  });

  // Haptic feedback toggle
  document.querySelectorAll('#haptic-row .opt-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#haptic-row .opt-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      G.hapticEnabled = card.dataset.haptic === 'on';
      saveSettings();
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

  // Forfeit button (playing HUD)
  document.getElementById('forfeit-btn').addEventListener('click', () => {
    if (G.gameState === 'playing') SceneManager.replace(FallingScene);
  });

  // Pause button (playing HUD)
  document.getElementById('pause-btn').addEventListener('click', () => {
    if (G.gameState === 'playing') SceneManager.push(PauseScene);
  });

  // Resume button (pause screen)
  document.getElementById('resume-btn').addEventListener('click', () => {
    if (G.gameState === 'paused') SceneManager.pop();
  });

  // Quit to menu button (pause screen)
  document.getElementById('pause-menu-btn').addEventListener('click', () => {
    if (G.gameState === 'paused') SceneManager.pop();
    returnToMenu();
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
  G.memorizeTimer = MEMORIZE_TIMES[G.selectedMemTime];

  // Defer heavy work to MemorizeScene.onEnter (runs during fade-to-black)
  G._pendingLevelSetup = true;

  transitionTo(MemorizeScene);
}
