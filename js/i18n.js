// ─── INTERNATIONALIZATION ────────────────────────────────────────
// Translation dictionary and t() helper for multi-language support.
// Loaded after config.js, before state.js.

const TRANSLATIONS = {
  en: {
    // Menu
    'menu.title': 'LAVA LAND',
    'menu.subtitle': 'Jump across the lava to save your friend!',
    'menu.choose_hero': 'Choose Your Hero',
    'menu.choose_rescue': 'Choose Who to Save',
    'menu.adventure': 'ADVENTURE MODE',
    'menu.custom': 'CUSTOM MODE',
    'menu.settings': '\u2699 SETTINGS',
    'menu.credit': 'made by Ellie Hellesvik Kloven',

    // Settings
    'settings.title': '\u2699 SETTINGS',
    'settings.difficulty': 'Difficulty',
    'settings.grid_size': 'Grid Size',
    'settings.memorize_time': 'Memorize Time',
    'settings.language': 'Language',
    'settings.soundtrack': 'Soundtrack',
    'settings.theme': 'Theme',
    'settings.haptic': 'Haptic Feedback',
    'settings.on': 'ON',
    'settings.off': 'OFF',
    'settings.done': 'DONE',

    // Difficulty
    'diff.easy': 'Easy',
    'diff.easy.desc': 'Few fake blocks',
    'diff.medium': 'Medium',
    'diff.medium.desc': 'Many fake blocks',
    'diff.hard': 'Hard',
    'diff.hard.desc': 'Most blocks are fake',

    // Grid sizes
    'size.small': 'Small',
    'size.small.desc': '5 cols \u00D7 8 rows',
    'size.medium': 'Medium',
    'size.medium.desc': '6 cols \u00D7 12 rows',
    'size.large': 'Large',
    'size.large.desc': '7 cols \u00D7 16 rows',

    // Memorize times
    'mem.short': 'Short',
    'mem.short.desc': '5 seconds',
    'mem.medium': 'Medium',
    'mem.medium.desc': '10 seconds',
    'mem.long': 'Long',
    'mem.long.desc': '20 seconds',

    // Language options
    'lang.en': 'English',
    'lang.no': 'Norsk',

    // Soundtrack options
    'soundtrack.classic': 'Classic',
    'soundtrack.classic.desc': '80s synth-funk',
    'soundtrack.retro': 'Retro',
    'soundtrack.retro.desc': 'Chiptune 8-bit',
    'soundtrack.chill': 'Chill',
    'soundtrack.chill.desc': 'Ambient lo-fi',

    // Theme options
    'theme.volcano': 'Volcano',
    'theme.volcano.desc': 'Fire & lava',
    'theme.ocean': 'Ocean',
    'theme.ocean.desc': 'Deep sea',
    'theme.forest': 'Forest',
    'theme.forest.desc': 'Enchanted woods',

    // Settings summary
    'settings.summary': 'Custom: {diff} \u00B7 {size} grid \u00B7 {mem}s memorize',

    // Game HUD
    'hud.time': 'TIME',
    'hud.jumps': 'JUMPS',
    'hud.streak': 'STREAK',
    'hud.level_of': 'Level {level} of {total}: {name}',
    'hud.score': 'Score {score}',

    // Memorize scene
    'memorize.countdown': 'MEMORIZE! {secs}s',
    'memorize.hint.touch': 'Tap to start early for bonus points!',
    'memorize.hint.keyboard': 'Press any key to start early for bonus points!',

    // Playing scene
    'playing.hint.touch': 'Tap platform to move \u00A0|\u00A0 Swipe down/up to jump',
    'playing.hint.keyboard': '\u2190 \u2192 hop \u00A0|\u00A0 \u2193 / Space forward \u00A0|\u00A0 \u2191 backward',
    'playing.streak': '\uD83D\uDD25 {n}\u00D7 STREAK!',
    'playing.route_reveal': '\uD83D\uDDFA\uFE0F Secret Route ({secs}s) \u2014 green\u00A0=\u00A0safe, red\u00A0=\u00A0danger',

    // Tutorial
    'tutorial.hop_left': 'Hop \u2190 first!',
    'tutorial.hop_right': 'Hop \u2192 first!',
    'tutorial.jump_back.touch': 'Swipe \u2191 to jump back!',
    'tutorial.jump_back.keyboard': 'Press \u2191 to jump back!',
    'tutorial.jump_forward.touch': 'Tap to jump!',
    'tutorial.jump_forward.keyboard': 'Press \u2193 to jump!',

    // Lose screen
    'lose.title': 'OH NO!',
    'lose.try_again': 'TRY AGAIN',
    'lose.back_to_menu': 'BACK TO MENU',
    'lose.almost.1': 'So close! {hero} almost made it!',
    'lose.almost.2': 'Almost there! Just one more jump!',
    'lose.almost.3': '{rescue} was right there! Try again!',
    'lose.fell.1': '{hero} fell into the lava!',
    'lose.fell.2': '{hero} couldn\'t save {rescue}!',
    'lose.fell.3': 'The lava got {hero}!',

    // Win screen
    'win.title': 'YOU DID IT!',
    'win.saved': '{hero} saved {rescue}!',
    'win.next_level': 'NEXT LEVEL',
    'win.back_to_menu': 'BACK TO MENU',
    'win.route_revealed': 'Route revealed \u2014 no score!',
    'win.time_bonus': 'Time bonus',
    'win.jump_efficiency': 'Jump efficiency',
    'win.level_bonus': 'Level bonus',
    'win.difficulty_bonus': 'Difficulty bonus',
    'win.perfect_path': 'Perfect path!',
    'win.speed_bonus': 'Speed bonus!',
    'win.early_start': 'Early start bonus!',
    'win.streak_bonus': 'Streak bonus!',
    'win.level_score': 'Level Score',
    'win.total_score': 'Total Score: {score}',

    // Pause screen
    'pause.title': 'PAUSED',
    'pause.resume': 'RESUME',
    'pause.quit': 'QUIT TO MENU',

    // Rescue character
    'rescue.help': 'Help!',

    // Instructions
    'instructions.keyboard.1': 'Hop left / right (same row)',
    'instructions.keyboard.2': 'Jump forward (next row)',
    'instructions.keyboard.3': 'Jump backward (previous row)',
    'instructions.keyboard.4': 'Memorize the safe platforms, then leap across!',
    'instructions.touch.1': 'Tap on a platform to move there',
    'instructions.touch.2': 'Swipe \u2190 \u2192 to hop sideways',
    'instructions.touch.3': 'Swipe \u2193 to jump forward \u00B7 Swipe \u2191 to go back',
    'instructions.touch.4': 'Memorize the safe platforms, then jump!',

    // Page title
    'page.title': 'Lava Land - Save Your Friend!',

    // Speech
    'speech.congrats': 'You did a great job!',
    'speech.lose.1': 'Oh no! You fell in the lava!',
    'speech.lose.2': 'Oops! Try again!',
    'speech.lose.3': 'Into the lava! Better luck next time!',

    // Level preview
    'level.preview': 'Level {level}',

    // Character names
    'char.Tortoise': 'Tortoise',
    'char.Wizard': 'Wizard',
    'char.Koala': 'Koala',
    'char.Ninja': 'Ninja',
    'char.Princess': 'Princess',
    'char.Prince': 'Prince',
    'char.Cat': 'Cat',
    'char.Dog': 'Dog',
    'char.Witch': 'Witch',
    'char.Dolphin': 'Dolphin',

    // Level names
    'level.The Crossing': 'The Crossing',
    'level.Stepping Stones': 'Stepping Stones',
    'level.Lava Creek': 'Lava Creek',
    'level.Molten Path': 'Molten Path',
    'level.Ember Trail': 'Ember Trail',
    'level.Fire Walk': 'Fire Walk',
    'level.Inferno Bridge': 'Inferno Bridge',
    'level.Scorched Passage': 'Scorched Passage',
    'level.Magma Maze': 'Magma Maze',
    'level.Obsidian Run': 'Obsidian Run',
    'level.Volcano Heart': 'Volcano Heart',
    'level.Dragon\'s Lair': 'Dragon\'s Lair',
    'level.Hellfire Sprint': 'Hellfire Sprint',
    'level.Core Meltdown': 'Core Meltdown',
    'level.Final Descent': 'Final Descent',

    // Endless level
    'level.Endless': 'Endless {n}',

    // Combo callouts
    'combo.nice': 'NICE!',
    'combo.awesome': 'AWESOME!',
    'combo.incredible': 'INCREDIBLE!',
    'combo.unstoppable': 'UNSTOPPABLE!',
    'combo.legendary': 'LEGENDARY!',

    // Almost there
    'almost.there': 'Almost there!',
    'almost.one_more': 'One more jump!',
    'almost.you_got_this': 'You got this!',
    'almost.so_close': 'So close!',

    // Coins
    'win.coins_bonus': 'Coins collected',

    // Level stories
    'story.1': '{hero} spots {rescue} across a bubbling lava creek. Time to be brave!',
    'story.2': '{hero} steps onto the ancient stepping stones. Each one might crumble!',
    'story.3': '{rescue} is stranded beyond the lava creek. Only {hero} can help!',
    'story.4': 'The molten path glows red. {hero} must find the safe way through!',
    'story.5': 'Glowing embers light the trail ahead. {rescue} calls out for help!',
    'story.6': '{hero} enters the fire walk. The heat is intense but {rescue} needs saving!',
    'story.7': 'The inferno bridge stretches wide. {hero} must remember every safe step!',
    'story.8': 'A scorched passage blocks the way. {hero} won\'t give up on {rescue}!',
    'story.9': 'The magma maze twists and turns. Can {hero} find the path through?',
    'story.10': '{hero} races across the obsidian run. {rescue} is counting on a perfect memory!',
    'story.11': 'Deep inside the volcano\'s heart, {rescue} waits. {hero} must be fearless!',
    'story.12': '{hero} enters the dragon\'s lair. One wrong step and it\'s over!',
    'story.13': 'Hellfire rages all around! {hero} must sprint through the flames to reach {rescue}!',
    'story.14': 'The core is melting down! {hero} has seconds to cross before it all collapses!',
    'story.15': 'The final descent into the volcano! {hero} faces the ultimate challenge to save {rescue}!',

    // Error
    'error.canvas': 'Failed to load game: canvas element not found.',
    'error.context': 'Failed to load game: 2D context unavailable.',
    'error.storage': 'Settings could not be saved (storage unavailable)',
  },

  no: {
    // Menu
    'menu.title': 'LAVALAND',
    'menu.subtitle': 'Hopp over lavaen for \u00E5 redde vennen din!',
    'menu.choose_hero': 'Velg din helt',
    'menu.choose_rescue': 'Velg hvem du vil redde',
    'menu.adventure': 'EVENTYRMODUS',
    'menu.custom': 'EGENDEFINERT',
    'menu.settings': '\u2699 INNSTILLINGER',
    'menu.credit': 'laget av Ellie Hellesvik Kloven',

    // Settings
    'settings.title': '\u2699 INNSTILLINGER',
    'settings.difficulty': 'Vanskelighetsgrad',
    'settings.grid_size': 'Rutenettstørrelse',
    'settings.memorize_time': 'Husketid',
    'settings.language': 'Spr\u00E5k',
    'settings.soundtrack': 'Musikk',
    'settings.theme': 'Tema',
    'settings.haptic': 'Haptisk tilbakemelding',
    'settings.on': 'P\u00C5',
    'settings.off': 'AV',
    'settings.done': 'FERDIG',

    // Difficulty
    'diff.easy': 'Lett',
    'diff.easy.desc': 'F\u00E5 falske blokker',
    'diff.medium': 'Middels',
    'diff.medium.desc': 'Mange falske blokker',
    'diff.hard': 'Vanskelig',
    'diff.hard.desc': 'De fleste blokkene er falske',

    // Grid sizes
    'size.small': 'Liten',
    'size.small.desc': '5 kol \u00D7 8 rader',
    'size.medium': 'Middels',
    'size.medium.desc': '6 kol \u00D7 12 rader',
    'size.large': 'Stor',
    'size.large.desc': '7 kol \u00D7 16 rader',

    // Memorize times
    'mem.short': 'Kort',
    'mem.short.desc': '5 sekunder',
    'mem.medium': 'Middels',
    'mem.medium.desc': '10 sekunder',
    'mem.long': 'Lang',
    'mem.long.desc': '20 sekunder',

    // Language options
    'lang.en': 'English',
    'lang.no': 'Norsk',

    // Soundtrack options
    'soundtrack.classic': 'Klassisk',
    'soundtrack.classic.desc': '80-talls synth-funk',
    'soundtrack.retro': 'Retro',
    'soundtrack.retro.desc': 'Chiptune 8-bit',
    'soundtrack.chill': 'Rolig',
    'soundtrack.chill.desc': 'Ambient lo-fi',

    // Theme options
    'theme.volcano': 'Vulkan',
    'theme.volcano.desc': 'Ild og lava',
    'theme.ocean': 'Hav',
    'theme.ocean.desc': 'Dypt hav',
    'theme.forest': 'Skog',
    'theme.forest.desc': 'Fortryllet skog',

    // Settings summary
    'settings.summary': 'Egendefinert: {diff} \u00B7 {size} rutenett \u00B7 {mem}s husketid',

    // Game HUD
    'hud.time': 'TID',
    'hud.jumps': 'HOPP',
    'hud.streak': 'SERIE',
    'hud.level_of': 'Niv\u00E5 {level} av {total}: {name}',
    'hud.score': 'Poeng {score}',

    // Memorize scene
    'memorize.countdown': 'HUSK! {secs}s',
    'memorize.hint.touch': 'Trykk for \u00E5 starte tidlig og f\u00E5 bonuspoeng!',
    'memorize.hint.keyboard': 'Trykk en tast for \u00E5 starte tidlig og f\u00E5 bonuspoeng!',

    // Playing scene
    'playing.hint.touch': 'Trykk plattform for \u00E5 flytte \u00A0|\u00A0 Sveip ned/opp for \u00E5 hoppe',
    'playing.hint.keyboard': '\u2190 \u2192 sidehopp \u00A0|\u00A0 \u2193 / Mellomrom fremover \u00A0|\u00A0 \u2191 bakover',
    'playing.streak': '\uD83D\uDD25 {n}\u00D7 SERIE!',
    'playing.route_reveal': '\uD83D\uDDFA\uFE0F Hemmelig rute ({secs}s) \u2014 gr\u00F8nn\u00A0=\u00A0trygg, r\u00F8d\u00A0=\u00A0fare',

    // Tutorial
    'tutorial.hop_left': 'Hopp \u2190 f\u00F8rst!',
    'tutorial.hop_right': 'Hopp \u2192 f\u00F8rst!',
    'tutorial.jump_back.touch': 'Sveip \u2191 for \u00E5 hoppe tilbake!',
    'tutorial.jump_back.keyboard': 'Trykk \u2191 for \u00E5 hoppe tilbake!',
    'tutorial.jump_forward.touch': 'Trykk for \u00E5 hoppe!',
    'tutorial.jump_forward.keyboard': 'Trykk \u2193 for \u00E5 hoppe!',

    // Lose screen
    'lose.title': '\u00C5 NEI!',
    'lose.try_again': 'PR\u00D8V IGJEN',
    'lose.back_to_menu': 'TILBAKE TIL MENY',
    'lose.almost.1': 'S\u00E5 n\u00E6r! {hero} klarte det nesten!',
    'lose.almost.2': 'Nesten! Bare ett hopp til!',
    'lose.almost.3': '{rescue} var rett der! Pr\u00F8v igjen!',
    'lose.fell.1': '{hero} falt i lavaen!',
    'lose.fell.2': '{hero} klarte ikke \u00E5 redde {rescue}!',
    'lose.fell.3': 'Lavaen tok {hero}!',

    // Win screen
    'win.title': 'DU KLARTE DET!',
    'win.saved': '{hero} reddet {rescue}!',
    'win.next_level': 'NESTE NIVA\u030A',
    'win.back_to_menu': 'TILBAKE TIL MENY',
    'win.route_revealed': 'Rute avsl\u00F8rt \u2014 ingen poeng!',
    'win.time_bonus': 'Tidsbonus',
    'win.jump_efficiency': 'Hoppeffektivitet',
    'win.level_bonus': 'Niv\u00E5bonus',
    'win.difficulty_bonus': 'Vanskelighetsbonus',
    'win.perfect_path': 'Perfekt sti!',
    'win.speed_bonus': 'Hastighetsbonus!',
    'win.early_start': 'Tidlig start-bonus!',
    'win.streak_bonus': 'Seriebonus!',
    'win.level_score': 'Niv\u00E5poeng',
    'win.total_score': 'Totalpoeng: {score}',

    // Pause screen
    'pause.title': 'PAUSE',
    'pause.resume': 'FORTSETT',
    'pause.quit': 'AVSLUTT TIL MENY',

    // Rescue character
    'rescue.help': 'Hjelp!',

    // Instructions
    'instructions.keyboard.1': 'Hopp til venstre / h\u00F8yre (samme rad)',
    'instructions.keyboard.2': 'Hopp fremover (neste rad)',
    'instructions.keyboard.3': 'Hopp bakover (forrige rad)',
    'instructions.keyboard.4': 'Husk de trygge plattformene, og hopp over!',
    'instructions.touch.1': 'Trykk p\u00E5 en plattform for \u00E5 flytte dit',
    'instructions.touch.2': 'Sveip \u2190 \u2192 for \u00E5 hoppe sidelengs',
    'instructions.touch.3': 'Sveip \u2193 for \u00E5 hoppe fremover \u00B7 Sveip \u2191 for \u00E5 g\u00E5 tilbake',
    'instructions.touch.4': 'Husk de trygge plattformene, og hopp!',

    // Page title
    'page.title': 'Lavaland - Redd vennen din!',

    // Speech
    'speech.congrats': 'Bra jobbet!',
    'speech.lose.1': '\u00C5 nei! Du falt i lavaen!',
    'speech.lose.2': 'Oops! Pr\u00F8v igjen!',
    'speech.lose.3': 'I lavaen! Bedre lykke neste gang!',

    // Level preview
    'level.preview': 'Niv\u00E5 {level}',

    // Character names
    'char.Tortoise': 'Skilpadde',
    'char.Wizard': 'Trollmann',
    'char.Koala': 'Koala',
    'char.Ninja': 'Ninja',
    'char.Princess': 'Prinsesse',
    'char.Prince': 'Prins',
    'char.Cat': 'Katt',
    'char.Dog': 'Hund',
    'char.Witch': 'Heks',
    'char.Dolphin': 'Delfin',

    // Level names
    'level.The Crossing': 'Krysningen',
    'level.Stepping Stones': 'Kl\u00F8ppesteiner',
    'level.Lava Creek': 'Lavabekken',
    'level.Molten Path': 'Smeltet sti',
    'level.Ember Trail': 'Glosporet',
    'level.Fire Walk': 'Ildvandring',
    'level.Inferno Bridge': 'Infernobroen',
    'level.Scorched Passage': 'Svidd passasje',
    'level.Magma Maze': 'Magmalabyrinten',
    'level.Obsidian Run': 'Obsidianl\u00F8pet',
    'level.Volcano Heart': 'Vulkanens hjerte',
    'level.Dragon\'s Lair': 'Dragens hule',
    'level.Hellfire Sprint': 'Helvedessprint',
    'level.Core Meltdown': 'Kjernesmelte',
    'level.Final Descent': 'Siste nedstigning',

    // Endless level
    'level.Endless': 'Uendelig {n}',

    // Combo callouts
    'combo.nice': 'FINT!',
    'combo.awesome': 'FANTASTISK!',
    'combo.incredible': 'UTROLIG!',
    'combo.unstoppable': 'USTOPPELIG!',
    'combo.legendary': 'LEGENDARISK!',

    // Almost there
    'almost.there': 'Nesten fremme!',
    'almost.one_more': 'Bare ett hopp til!',
    'almost.you_got_this': 'Du klarer det!',
    'almost.so_close': 'S\u00E5 n\u00E6r!',

    // Coins
    'win.coins_bonus': 'Mynter samlet',

    // Level stories
    'story.1': '{hero} ser {rescue} over en boblende lavabekk. P\u00E5 tide \u00E5 v\u00E6re modig!',
    'story.2': '{hero} trer p\u00E5 de gamle kl\u00F8ppesteinene. Hver en kan smuldre!',
    'story.3': '{rescue} er strandet bak lavabekken. Bare {hero} kan hjelpe!',
    'story.4': 'Den smeltede stien gløder rødt. {hero} m\u00E5 finne den trygge veien!',
    'story.5': 'Glødende gløder lyser opp sporet. {rescue} roper om hjelp!',
    'story.6': '{hero} g\u00E5r inn i ildvandringen. Varmen er intens, men {rescue} trenger redning!',
    'story.7': 'Infernobroen strekker seg bredt. {hero} m\u00E5 huske hvert trygge steg!',
    'story.8': 'En svidd passasje blokkerer veien. {hero} gir ikke opp {rescue}!',
    'story.9': 'Magmalabyrinten svinger og snur. Kan {hero} finne veien gjennom?',
    'story.10': '{hero} løper over obsidianløpet. {rescue} regner med perfekt hukommelse!',
    'story.11': 'Dypt inne i vulkanens hjerte venter {rescue}. {hero} m\u00E5 v\u00E6re fryktløs!',
    'story.12': '{hero} g\u00E5r inn i dragens hule. Ett feil steg og det er over!',
    'story.13': 'Helvedesild raser overalt! {hero} m\u00E5 sprinte gjennom flammene for \u00E5 n\u00E5 {rescue}!',
    'story.14': 'Kjernen smelter ned! {hero} har sekunder p\u00E5 \u00E5 krysse før alt kollapser!',
    'story.15': 'Den siste nedstigningen i vulkanen! {hero} m\u00F8ter den ultimate utfordringen for \u00E5 redde {rescue}!',

    // Error
    'error.canvas': 'Kunne ikke laste spillet: canvas-element ikke funnet.',
    'error.context': 'Kunne ikke laste spillet: 2D-kontekst utilgjengelig.',
    'error.storage': 'Innstillinger kunne ikke lagres (lagring utilgjengelig)',
  },
};

// Speech synthesis language codes
const SPEECH_LANG = { en: 'en-US', no: 'nb-NO' };

// Translation helper: t(key) or t(key, {param: value})
function t(key, params) {
  const lang = (typeof G !== 'undefined' && G.language) || 'en';
  let str = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.en[key] || key;
  if (params) {
    for (var k in params) {
      if (params.hasOwnProperty(k)) {
        str = str.split('{' + k + '}').join(params[k]);
      }
    }
  }
  return str;
}
