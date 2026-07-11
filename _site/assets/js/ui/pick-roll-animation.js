const SETTLE_MS = 460;
const MIN_TUMBLE_MS = 2600;
const MAX_TUMBLE_MS = 4200;
const LAND_FALLBACK_MS = 520;

let pendingAlmostOnLand = false;
let diceLandHandler = null;
let rollSafetyTimer = null;

export function cleanupPickRollAnimation() {
  pendingAlmostOnLand = false;

  if (rollSafetyTimer) {
    clearTimeout(rollSafetyTimer);
    rollSafetyTimer = null;
  }

  const dice = document.querySelector('.act-pick-dice-icon');
  if (dice && diceLandHandler) {
    dice.removeEventListener('animationiteration', diceLandHandler);
    diceLandHandler = null;
  }
}

export function applyPickRollingPhase(phase) {
  const body = document.getElementById('act-pick-body');
  const rollingEl = body?.querySelector('.act-pick-rolling');
  if (!body || !rollingEl || body.dataset.rollingPhase === phase) return;

  body.dataset.rollingPhase = phase;
  rollingEl.classList.toggle('act-pick-rolling--almost', phase === 'almost');

  const labelEl = rollingEl.querySelector('.act-pick-rolling-label');
  if (labelEl) {
    labelEl.textContent = phase === 'almost' ? 'Allez, ce sera…' : 'On pioche…';
  }
}

export function syncPickInnerLayout() {
  const inner = document.getElementById('act-pick-inner');
  if (!inner) return;

  // Garde toujours la hauteur standard de la carte (jamais de mode compact).
  inner.classList.remove('is-compact');
}

export function mountPickRolling(phase = 'pick') {
  const body = document.getElementById('act-pick-body');
  if (!body) return;

  cleanupPickRollAnimation();
  document.getElementById('act-pick-inner')?.classList.remove('is-compact');

  const label = phase === 'almost' ? 'Allez, ce sera…' : 'On pioche…';
  body.dataset.rollingPhase = phase;
  body.classList.add('is-rolling');
  body.innerHTML = `
    <div class="act-pick-rolling${phase === 'almost' ? ' act-pick-rolling--almost' : ''}">
      <span class="act-pick-dice-stage" aria-hidden="true">
        <span class="act-pick-dice-shadow"></span>
        <span class="act-pick-spark act-pick-spark--1"></span>
        <span class="act-pick-spark act-pick-spark--2"></span>
        <span class="act-pick-spark act-pick-spark--3"></span>
        <span class="act-pick-dice-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/>
          </svg>
        </span>
      </span>
      <p class="act-pick-rolling-label">${label}</p>
    </div>
  `;
}

function requestAlmostOnLand(onReady) {
  const body = document.getElementById('act-pick-body');
  if (body?.dataset.rollingPhase === 'almost') {
    onReady();
    return;
  }

  pendingAlmostOnLand = true;
  const dice = document.querySelector('.act-pick-dice-icon');

  const land = () => {
    if (!pendingAlmostOnLand) return;
    pendingAlmostOnLand = false;

    if (dice && diceLandHandler) {
      dice.removeEventListener('animationiteration', diceLandHandler);
      diceLandHandler = null;
    }

    applyPickRollingPhase('almost');
    onReady();
  };

  if (!dice) {
    applyPickRollingPhase('almost');
    onReady();
    return;
  }

  diceLandHandler = land;
  dice.addEventListener('animationiteration', land);

  setTimeout(() => {
    if (pendingAlmostOnLand) land();
  }, LAND_FALLBACK_MS);
}

export function runPickRollAnimation({ onComplete }) {
  cleanupPickRollAnimation();
  mountPickRolling('pick');

  let almostQueued = false;
  const start = performance.now();

  const finish = () => {
    cleanupPickRollAnimation();
    onComplete();
  };

  const queueAlmost = () => {
    if (almostQueued) return;
    almostQueued = true;
    requestAlmostOnLand(() => setTimeout(finish, SETTLE_MS));
  };

  const tick = (now) => {
    if (!almostQueued && now - start >= MIN_TUMBLE_MS) {
      queueAlmost();
      return;
    }
    if (!almostQueued) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);

  rollSafetyTimer = setTimeout(() => {
    if (!almostQueued) queueAlmost();
  }, MAX_TUMBLE_MS);
}
