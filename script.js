/*
  ============================================================
  script.js — The Dragon's Keep
  ============================================================

  HOW TO READ THIS FILE:
  JavaScript is what makes the page ALIVE. It listens for
  user actions (clicks, scrolls) and responds by changing
  the HTML/CSS dynamically — no page reload needed.

  This file is organized into these systems:
  1.  Particle System       — Floating ember effect on the hero
  2.  Navigation            — Hamburger menu + scroll highlight
  3.  Accordion             — How to Play collapsible steps
  4.  Battle System         — The full D&D combat demo
  5.  Soundboard            — Ambient audio toggles
  6.  Scroll Animations     — Fade-in on scroll
  7.  Init                  — Kicks everything off on page load
  ============================================================
*/

/* ============================================================
  SECTION 1: PARTICLE SYSTEM
  Creates floating ember/spark particles in the hero section.
  
  HOW IT WORKS:
  - We create <div> elements in JS and inject them into #particles
  - Each particle gets random size, position, speed, and drift
  - CSS handles the float animation via @keyframes floatUp
  - We use CSS custom properties (--duration, --delay, --drift)
    to give each particle unique motion without writing tons of CSS
============================================================ */

function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return; // Safety check — exit if element doesn't exist

  const PARTICLE_COUNT = 60; // How many embers to create

  for (let i = 0; i < PARTICLE_COUNT; i++) {

    const particle = document.createElement('div');
    particle.classList.add('particle');

    // Random size between 2px and 6px
    const size = Math.random() * 4 + 2;

    // Random horizontal starting position (0% to 100% of container width)
    const startX = Math.random() * 100;

    // Random animation duration: slower = 4s, faster = 8s
    const duration = Math.random() * 4 + 4;

    // Stagger start times so they don't all appear at once
    const delay = Math.random() * 6;

    // Random sideways drift so they wobble as they float up
    const drift = (Math.random() - 0.5) * 80; // -40px to +40px

    // Random opacity so some are brighter than others
    const opacity = Math.random() * 0.6 + 0.2;

    // Apply all the random values as inline styles
    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${startX}%;
      bottom: -10px;
      opacity: 0;
      --duration: ${duration}s;
      --delay: ${delay}s;
      --drift: ${drift}px;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;

    // Alternate between gold and red embers for visual variety
    particle.style.background = i % 3 === 0
      ? 'rgba(201, 168, 76, ' + opacity + ')'
      : i % 3 === 1
        ? 'rgba(139, 0, 0, ' + opacity + ')'
        : 'rgba(255, 100, 50, ' + opacity + ')';

    container.appendChild(particle);
  }
}

/* ============================================================
  SECTION 2: NAVIGATION
  Two features:
  A) Hamburger menu toggle for mobile screens
  B) Highlight the active nav link based on which section
     is currently visible (using IntersectionObserver)
============================================================ */

function initNavigation() {

  // --- A) HAMBURGER MENU ---
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      // Toggle the 'open' class — CSS handles showing/hiding
      navLinks.classList.toggle('open');

      // Animate hamburger bars into an X when open
      hamburger.classList.toggle('is-open');
    });

    // Close the menu when any nav link is clicked (good UX on mobile)
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.classList.remove('is-open');
      });
    });
  }

  // --- B) ACTIVE LINK HIGHLIGHT ON SCROLL ---
  // IntersectionObserver fires a callback whenever a section
  // enters or leaves the viewport. We use it to highlight
  // the matching nav link.

  const sections = document.querySelectorAll('section[id]');
  // querySelectorAll returns ALL elements matching the CSS selector

  const observerOptions = {
    root: null,           // null = observe relative to the browser viewport
    rootMargin: '-40% 0px -40% 0px', // Only trigger when section is in the middle 20%
    threshold: 0          // Fire as soon as any part enters the zone
  };

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Remove active from all links
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

        // Add active to the link whose href matches the visible section id
        const activeLink = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (activeLink) activeLink.classList.add('active');
      }
    });
  }, observerOptions);

  sections.forEach(section => navObserver.observe(section));
}

/* ============================================================
  SECTION 3: ACCORDION (How to Play)
  
  HOW IT WORKS:
  - Each accordion item has a header button and a body div
  - Clicking the header toggles the .active class on the item
  - CSS transitions max-height from 0 to auto for the open animation
  - We set the exact scrollHeight in JS so CSS can animate to it
============================================================ */

function initAccordion() {
  const accordionItems = document.querySelectorAll('.accordion-item');

  accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');
    const body   = item.querySelector('.accordion-body');

    header.addEventListener('click', () => {
      const isAlreadyOpen = item.classList.contains('active');

      // Close ALL items first (only one open at a time)
      accordionItems.forEach(i => {
        i.classList.remove('active');
        const b = i.querySelector('.accordion-body');
        if (b) b.style.maxHeight = '0';
      });

      // If it wasn't already open, open it
      if (!isAlreadyOpen) {
        item.classList.add('active');
        // scrollHeight = the full height of the content when uncollapsed
        // Setting maxHeight to this value lets CSS animate to exact height
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });
}

/* ============================================================
  SECTION 4: BATTLE SYSTEM
  The heart of the site — a full turn-based D&D combat demo.

  STATE MANAGEMENT:
  We store all game state in a single object called `battleState`.
  This is a common pattern — one source of truth for all data.

  FLOW:
  1. Player clicks an action button
  2. playerAction() resolves the player's turn (dice roll, damage, etc.)
  3. After a short delay, enemyTurn() fires automatically
  4. After each turn, checkBattleEnd() sees if someone has 0 HP
  5. If yes → endBattle(). If no → next round begins.
============================================================ */

// --- Battle State Object ---
// All game data lives here. JS reads and writes to this object.
const battleState = {
  playerHP:    20,
  playerMaxHP: 20,
  playerAC:    16,
  enemyHP:     7,
  enemyMaxHP:  7,
  enemyAC:     15,
  round:       1,
  playerTurn:  true,    // true = player can act, false = waiting for enemy
  isDodging:   false,   // true = player used Dodge this turn (raises AC)
  isOver:      false,   // true = combat has ended
};

// --- Dice Rolling ---
// This is the core mechanic of D&D!
// rollDie(20) returns a random integer from 1 to 20.
function rollDie(sides) {
  // Math.random() returns 0.0 to 0.999...
  // Multiply by sides, floor it (round down), add 1 → gives 1 to sides
  return Math.floor(Math.random() * sides) + 1;
}

// --- Animate the dice display ---
// Shows the dice spinning and then reveals the result number
function animateDice(result, callback) {
  const diceDisplay = document.getElementById('dice-display');
  const diceResult  = document.getElementById('dice-result');
  const diceFace    = document.getElementById('dice-face');

  // Add rolling class → triggers CSS spin animation
  diceDisplay.classList.add('rolling');
  diceResult.textContent = '...';

  // Array of dice face emojis to cycle through during the spin
  const faces = ['⚀','⚁','⚂','⚃','⚄','⚅','🎲'];
  let frame = 0;

  // setInterval runs the inner function repeatedly every 80ms
  // This creates the "tumbling" effect by swapping emoji faces
  const interval = setInterval(() => {
    diceFace.textContent = faces[frame % faces.length];
    frame++;
  }, 80);

  // After 600ms, stop the spin and show the real result
  setTimeout(() => {
    clearInterval(interval);
    diceDisplay.classList.remove('rolling');
    diceFace.textContent = '🎲';
    diceResult.textContent = result;

    // callback() runs whatever should happen AFTER the dice animation
    // This is called "callback pattern" — common in async JS
    if (callback) callback();
  }, 600);
}

// --- Add a message to the Combat Log ---
// type = 'player' | 'enemy' | 'miss' | 'crit' | 'system' | 'victory' | 'defeat' | 'dodge'
function addLog(message, type = 'system') {
  const log = document.getElementById('combat-log');
  if (!log) return;

  // Create a new paragraph element for this log entry
  const entry = document.createElement('p');
  entry.classList.add('log-entry', `log-${type}`);
  entry.textContent = message;

  // Append to the bottom of the log
  log.appendChild(entry);

  // Auto-scroll to the newest entry
  log.scrollTop = log.scrollHeight;
}

// --- Update HP bars in the UI ---
// After every attack, we call this to sync the visual bars with the data
function updateHPBars() {
  // Player HP
  const playerHPEl  = document.getElementById('player-hp');
  const playerHPBar = document.getElementById('player-hp-bar');
  if (playerHPEl)  playerHPEl.textContent = Math.max(0, battleState.playerHP);
  if (playerHPBar) {
    const pct = Math.max(0, battleState.playerHP / battleState.playerMaxHP * 100);
    playerHPBar.style.width = pct + '%';
    // Change bar color based on HP %
    playerHPBar.className = 'hp-fill player-hp-fill';
    if (pct <= 50) playerHPBar.classList.add('warning');
    if (pct <= 25) playerHPBar.classList.add('critical');
  }

  // Enemy HP
  const enemyHPEl  = document.getElementById('enemy-hp');
  const enemyHPBar = document.getElementById('enemy-hp-bar');
  if (enemyHPEl)  enemyHPEl.textContent = Math.max(0, battleState.enemyHP);
  if (enemyHPBar) {
    const ePct = Math.max(0, battleState.enemyHP / battleState.enemyMaxHP * 100);
    enemyHPBar.style.width = ePct + '%';
    enemyHPBar.className = 'hp-fill enemy-hp-fill';
    if (ePct <= 50) enemyHPBar.classList.add('warning');
    if (ePct <= 25) enemyHPBar.classList.add('critical');
  }
}

// --- Disable/Enable action buttons ---
// We disable buttons during enemy turn so the player can't spam-click
function setButtonsEnabled(enabled) {
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.disabled = !enabled;
  });
}

// --- Hit animation on a combatant sprite ---
// type = 'hit' or 'dodge'
function triggerAnimation(side, type) {
  // side = 'player-side' or 'enemy-side'
  const art = document.querySelector(`#${side} .combatant-art`);
  if (!art) return;

  art.classList.add(type);
  // Remove the class after the animation completes so it can be re-triggered
  art.addEventListener('animationend', () => art.classList.remove(type), { once: true });
  // { once: true } = the event listener removes itself after firing once
}

// --- Check if battle is over ---
function checkBattleEnd() {
  if (battleState.enemyHP <= 0) {
    endBattle('victory');
    return true;
  }
  if (battleState.playerHP <= 0) {
    endBattle('defeat');
    return true;
  }
  return false;
}

// --- End the battle ---
function endBattle(result) {
  battleState.isOver = true;
  setButtonsEnabled(false);

  const restartBtn = document.getElementById('restart-btn');

  if (result === 'victory') {
    addLog('', 'system');
    addLog('🏆 VICTORY! The goblin collapses! You gain 50 XP!', 'victory');
    addLog('🎉 You survived your first encounter. The adventure begins...', 'victory');
    triggerAnimation('enemy-side', 'hit');
  } else {
    addLog('', 'system');
    addLog('💀 YOU HAVE FALLEN. 0 HP reached. Make your death saving throws...', 'defeat');
    addLog('🎲 Roll a d20: 10+ = success, 9 or lower = failure. 3 successes stabilize you.', 'defeat');
    triggerAnimation('player-side', 'hit');
  }

  // Show the restart button after a moment
  if (restartBtn) {
    setTimeout(() => {
      restartBtn.style.display = 'block';
    }, 1000);
  }
}

// --- PLAYER ACTION ---
// Called when the player clicks Attack, Spell, or Dodge
// action = 'attack' | 'spell' | 'dodge'
function playerAction(action) {
  // Guard clauses: don't do anything if combat is over or it's not player's turn
  if (battleState.isOver) return;
  if (!battleState.playerTurn) return;

  // Disable buttons immediately to prevent double-clicking
  setButtonsEnabled(false);
  battleState.playerTurn = false;
  battleState.isDodging = false; // Reset dodge from last round

  // Roll a d20 for the action
  const roll = rollDie(20);

  animateDice(roll, () => {
    // This callback runs AFTER the dice animation finishes

    if (action === 'dodge') {
      // DODGE: Player takes a defensive stance — no attack, but raises AC this round
      addLog(`🛡️ You take the Dodge action! AC raised to ${battleState.playerAC + 4} until next turn.`, 'dodge');
      battleState.isDodging = true;
      triggerAnimation('player-side', 'dodge');

      // After player dodges, enemy still gets a turn
      setTimeout(() => enemyTurn(), 1200);

    } else if (action === 'attack') {
      // MELEE ATTACK
      // Attack roll = d20 roll + attack bonus (+5 for our Fighter)
      const attackBonus = 5;
      const attackRoll = roll + attackBonus;

      addLog(`⚔️ You swing your sword! Rolled ${roll} + ${attackBonus} = ${attackRoll} vs Goblin AC ${battleState.enemyAC}`, 'player');

      if (roll === 20) {
        // CRITICAL HIT: Roll damage dice twice!
        const damage = rollDie(8) + rollDie(8) + 3; // 2d8+3 on a crit
        battleState.enemyHP -= damage;
        addLog(`💥 CRITICAL HIT! Double dice! You deal ${damage} damage!`, 'crit');
        triggerAnimation('enemy-side', 'hit');
        playSFX('critical');
      } else if (attackRoll >= battleState.enemyAC) {
        // HIT: Roll normal damage (1d8 + 3 Strength modifier)
        const damage = rollDie(8) + 3;
        battleState.enemyHP -= damage;
        addLog(`✅ Hit! You deal ${damage} damage. Goblin HP: ${Math.max(0, battleState.enemyHP)}`, 'player');
        triggerAnimation('enemy-side', 'hit');
        playSFX('hit');
      } else if (roll === 1) {
        // CRITICAL MISS (rolling a 1 always misses, no matter what)
        addLog(`💨 Critical Miss! You stumble and swing wide. How embarrassing.`, 'miss');
        triggerAnimation('player-side', 'dodge');
        playSFX('miss');
      } else {
        // MISS
        addLog(`❌ Miss! Your attack doesn't break through the goblin's AC of ${battleState.enemyAC}.`, 'miss');
        playSFX('miss');
      }

      updateHPBars();
      if (!checkBattleEnd()) {
        setTimeout(() => enemyTurn(), 1200);
      }

    } else if (action === 'spell') {
      // RANGED SPELL ATTACK: Firebolt cantrip
      // Ranged spell attacks also use d20 + spell attack bonus
      const spellBonus = 4;
      const spellRoll = roll + spellBonus;

      addLog(`🔥 You hurl a Firebolt! Rolled ${roll} + ${spellBonus} = ${spellRoll} vs Goblin AC ${battleState.enemyAC}`, 'player');

      if (roll === 20) {
        const damage = rollDie(10) + rollDie(10); // Crit = 2d10
        battleState.enemyHP -= damage;
        addLog(`💥 CRITICAL SPELL HIT! Scorching flames deal ${damage} fire damage!`, 'crit');
        triggerAnimation('enemy-side', 'hit');
        playSFX('spell');
      } else if (spellRoll >= battleState.enemyAC) {
        const damage = rollDie(10); // Normal = 1d10
        battleState.enemyHP -= damage;
        addLog(`🔥 Firebolt hits! ${damage} fire damage! Goblin HP: ${Math.max(0, battleState.enemyHP)}`, 'player');
        triggerAnimation('enemy-side', 'hit');
        playSFX('spell');
      } else {
        addLog(`💨 Firebolt fizzles past the goblin. The spell misses!`, 'miss');
        playSFX('miss');
      }

      updateHPBars();
      if (!checkBattleEnd()) {
        setTimeout(() => enemyTurn(), 1200);
      }
    }
  });
}

// --- ENEMY TURN ---
// The Goblin automatically attacks the player.
// This fires automatically after every player action.
function enemyTurn() {
  if (battleState.isOver) return;

  addLog(`👺 Goblin's turn...`, 'system');

  const roll = rollDie(20);
  const attackBonus = 4;   // Goblin's attack bonus
  const attackRoll = roll + attackBonus;

  // If player dodged, their effective AC is higher
  const effectiveAC = battleState.isDodging
    ? battleState.playerAC + 4
    : battleState.playerAC;

  animateDice(roll, () => {
    addLog(`👺 Goblin slashes at you! Rolled ${roll} + ${attackBonus} = ${attackRoll} vs your AC ${effectiveAC}`, 'enemy');

    if (roll === 20) {
      const damage = rollDie(6) + rollDie(6) + 2; // Goblin crit = 2d6+2
      battleState.playerHP -= damage;
      addLog(`💥 Goblin CRITS! Vicious strike deals ${damage} damage!`, 'crit');
      triggerAnimation('player-side', 'hit');
      playSFX('hit');
    } else if (attackRoll >= effectiveAC) {
      const damage = rollDie(6) + 2; // Normal goblin attack = 1d6+2
      battleState.playerHP -= damage;
      addLog(`❗ Goblin hits you for ${damage} damage! Your HP: ${Math.max(0, battleState.playerHP)}`, 'enemy');
      triggerAnimation('player-side', 'hit');
      playSFX('hit');
    } else if (battleState.isDodging) {
      addLog(`🛡️ Your Dodge pays off! The goblin's attack fails to connect!`, 'dodge');
    } else {
      addLog(`💨 Goblin's attack misses! It clangs off your armor.`, 'miss');
    }

    updateHPBars();

    if (!checkBattleEnd()) {
      // Advance to next round and give player their turn back
      battleState.round++;
      battleState.playerTurn = true;
      document.getElementById('round-num').textContent = battleState.round;

      addLog(`— Round ${battleState.round} begins —`, 'system');
      setButtonsEnabled(true);
    }
  });
}

// --- RESTART BATTLE ---
// Called when player clicks "Fight Again"
// Resets all state and rebuilds the UI
function restartBattle() {
  // Reset state to starting values
  battleState.playerHP   = battleState.playerMaxHP;
  battleState.enemyHP    = battleState.enemyMaxHP;
  battleState.round      = 1;
  battleState.playerTurn = true;
  battleState.isDodging  = false;
  battleState.isOver     = false;

  // Reset UI
  updateHPBars();
  document.getElementById('round-num').textContent = '1';
  document.getElementById('dice-result').textContent = '—';
  document.getElementById('dice-face').textContent = '🎲';

  // Clear combat log
  const log = document.getElementById('combat-log');
  log.innerHTML = '';
  addLog('⚔️ A new goblin drops from the ceiling! Roll for initiative...', 'system');
  addLog('🎲 You rolled a 16! You go first. Choose your action!', 'system');

  // Hide restart button, re-enable action buttons
  document.getElementById('restart-btn').style.display = 'none';
  setButtonsEnabled(true);
}

/* ============================================================
  SECTION 5: SOUNDBOARD
  
  HOW IT WORKS:
  - We keep a registry of Audio objects in `soundRegistry`
  - Each sound maps a name (e.g. "tavern") to an Audio instance
  - toggleSound() plays or pauses the audio for that button
  - setMasterVolume() scales all playing sounds together

  NOTE ON AUDIO FILES:
  Real .mp3 files need to be in an /audio folder.
  Without them, the buttons will toggle visually but produce no sound.
  The system is fully wired — just add the files!

  Free sound sources:
  - https://freesound.org
  - https://opengameart.org
  - https://zapsplat.com
============================================================ */

// Registry: maps sound names to Audio objects
const soundRegistry = {};

// Master volume (0.0 to 1.0)
let masterVolume = 0.5;

// Sound file map: name → file path
// Add your .mp3 files to an /audio folder, then update these paths
const SOUND_FILES = {
  tavern:  'audio/tavern.mp3',
  fire:    'audio/fire.mp3',
  forest:  'audio/forest.mp3',
  thunder: 'audio/thunder.mp3',
  battle:  'audio/battle.mp3',
  dungeon: 'audio/dungeon.mp3',
  wind:    'audio/wind.mp3',
  victory: 'audio/victory.mp3',
};

// Sound effects used in battle (short clips, not loops)
const SFX_FILES = {
  hit:      'audio/sfx/hit.mp3',
  miss:     'audio/sfx/miss.mp3',
  spell:    'audio/sfx/spell.mp3',
  critical: 'audio/sfx/critical.mp3',
};

// Pre-load SFX audio objects so they play instantly
const sfxRegistry = {};

function initAudio() {
  // Pre-load each SFX into memory
  Object.entries(SFX_FILES).forEach(([name, path]) => {
    const audio = new Audio(path);
    audio.volume = masterVolume;
    sfxRegistry[name] = audio;
  });
}

// --- Play a sound effect ---
// Called during battle for hit/miss/spell sounds
function playSFX(name) {
  const sfx = sfxRegistry[name];
  if (!sfx) return;

  // Rewind to start so rapid repeated plays work
  sfx.currentTime = 0;
  sfx.volume = masterVolume;
  sfx.play().catch(() => {
    // .catch() silently handles the error if browser blocks autoplay
    // Browsers require user interaction before audio can play
  });
}

// --- Toggle an ambient sound button ---
// Called via onclick="toggleSound(this)" on each button
function toggleSound(button) {
  const soundName = button.dataset.sound;
  // dataset.sound reads the data-sound="tavern" attribute from the HTML

  const statusEl = button.querySelector('.sound-status');

  if (!soundRegistry[soundName]) {
    // First time this sound is toggled — create the Audio object
    const audio = new Audio(SOUND_FILES[soundName]);
    audio.loop = true;        // Loop = keep playing until stopped
    audio.volume = masterVolume;
    soundRegistry[soundName] = audio;
  }

  const audio = soundRegistry[soundName];

  if (button.classList.contains('active')) {
    // Sound is ON → turn it OFF
    audio.pause();
    audio.currentTime = 0;
    button.classList.remove('active');
    if (statusEl) statusEl.textContent = 'OFF';
  } else {
    // Sound is OFF → turn it ON
    audio.volume = masterVolume;
    audio.play().catch(() => {
      // If audio file doesn't exist, fail silently and still toggle button visually
      console.warn(`Audio file not found: ${SOUND_FILES[soundName]}. Add the file to enable sound.`);
    });
    button.classList.add('active');
    if (statusEl) statusEl.textContent = 'ON';
  }
}

// --- Set master volume for all sounds ---
// Called via oninput on the volume range slider
function setMasterVolume(value) {
  masterVolume = parseFloat(value);

  // Update the display percentage
  const display = document.getElementById('volume-display');
  if (display) display.textContent = Math.round(masterVolume * 100) + '%';

  // Update volume on all currently playing ambient sounds
  Object.values(soundRegistry).forEach(audio => {
    audio.volume = masterVolume;
  });

  // Update SFX volume too
  Object.values(sfxRegistry).forEach(audio => {
    audio.volume = masterVolume;
  });
}

/* ============================================================
  SECTION 6: SCROLL ANIMATIONS
  
  Elements fade in as they scroll into view using
  IntersectionObserver — the same technique as nav highlighting.
  
  Any element with class "animate-on-scroll" will fade in
  when it enters the viewport.
============================================================ */

function initScrollAnimations() {

  // Add the animate-on-scroll class to target elements
  const targets = document.querySelectorAll(
    '.info-card, .class-card, .accordion-item, .sound-btn, .terms-box'
  );

  targets.forEach((el, index) => {
    el.classList.add('animate-on-scroll');
    // Stagger the delay slightly per element so they cascade in
    el.style.transitionDelay = (index % 6) * 0.05 + 's';
  });

  // The observer watches for elements entering the viewport
  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Add .visible to trigger the CSS fade-in transition
        entry.target.classList.add('visible');
        // Unobserve after it's visible — no need to watch it anymore
        scrollObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1   // Fire when 10% of the element is in view
  });

  targets.forEach(el => scrollObserver.observe(el));

  // Inject the animation CSS for animate-on-scroll dynamically
  // (Avoids needing to add it to style.css manually)
  const style = document.createElement('style');
  style.textContent = `
    .animate-on-scroll {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .animate-on-scroll.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .nav-links a.active {
      color: var(--gold-bright);
      border-bottom-color: var(--gold-bright);
    }
    .hamburger.is-open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
    .hamburger.is-open span:nth-child(2) { opacity: 0; }
    .hamburger.is-open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
    .hamburger span { transition: all 0.3s ease; transform-origin: center; }
  `;
  document.head.appendChild(style);
}

/* ============================================================
  SECTION 7: INIT
  
  Everything above just DEFINES functions — they don't run yet.
  This section is what actually STARTS everything.

  DOMContentLoaded fires when the browser has fully parsed
  the HTML and built the page — safe to manipulate elements.
  
  We put all our init calls inside this event listener to make
  sure the HTML exists before our JS tries to find elements.
============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  console.log('🐉 The Dragon\'s Keep — Loaded. Welcome, adventurer.');

  // Start each system in order
  createParticles();          // Hero embers
  initNavigation();           // Hamburger + scroll highlight
  initAccordion();            // How to Play collapsible steps
  initScrollAnimations();     // Fade-in on scroll
  initAudio();                // Pre-load SFX

  // Initialize HP bars to full on load
  updateHPBars();

  // Make playerAction and restartBattle available globally
  // (they're called via onclick="" in the HTML)
  window.playerAction    = playerAction;
  window.restartBattle   = restartBattle;
  window.toggleSound     = toggleSound;
  window.setMasterVolume = setMasterVolume;
});

/*
  ============================================================
  🎓 WHAT YOU'VE BUILT — A QUICK RECAP FOR VS CODE
  ============================================================

  index.html  → Structure. All the sections, elements, IDs.
  style.css   → Appearance. Colors, layout, animations.
  script.js   → Behavior. What happens when users interact.

  TO TEST LOCALLY IN VS CODE:
  1. Install the "Live Server" extension (by Ritwick Dey)
  2. Right-click index.html → "Open with Live Server"
  3. Your site opens at http://127.0.0.1:5500

  TO ADD REAL SOUNDS:
  1. Create a folder: /audio and /audio/sfx
  2. Add files named: tavern.mp3, fire.mp3, forest.mp3,
     thunder.mp3, battle.mp3, dungeon.mp3, wind.mp3, victory.mp3
  3. SFX: audio/sfx/hit.mp3, miss.mp3, spell.mp3, critical.mp3
  4. Free sources: freesound.org, opengameart.org

  TO DEPLOY TO GITHUB PAGES:
  1. Push all 3 files to a GitHub repo
  2. Settings → Pages → Branch: main → Save
  3. Live URL: https://yourusername.github.io/repo-name
  ============================================================
*/
