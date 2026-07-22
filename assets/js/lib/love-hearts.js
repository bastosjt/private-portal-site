import { debounce } from './debounce.js';

export const HEART_PATH =
  'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z';

export const HEART_ANIM_SCALE = 1.06;
export const HEART_GAP_PX = 5;
export const LOVE_PULSE_MS = 1500;
export const LOVE_SPAM_WINDOW_MS = 280;
export const LOVE_SPAM_PULSE_MS = 720;
export const LOVE_BURST_COUNT = 7;
export const LOVE_BURST_MAX = 48;

const NUDGE_OFFSETS = (() => {
  const offsets = [[0, 0]];
  for (let ring = 1; ring <= 4; ring += 1) {
    const d = ring * 4;
    offsets.push(
      [d, 0], [-d, 0], [0, d], [0, -d],
      [d, d], [-d, d], [d, -d], [-d, -d],
    );
  }
  return offsets;
})();

function getHeartSize(scale) {
  return Math.round(24 * scale * 2.35);
}

function heartPeakOpacity(scale) {
  return 0.72 + scale * 0.28;
}

function resolveHeartBox(cfg, size, width, height, dx = 0, dy = 0) {
  const left = Math.max(0, Math.min((width * cfg.xPct) / 100 + dx, width - size));
  const top = Math.max(0, Math.min((height * cfg.yPct) / 100 + dy, height - size));
  const radius = (size * HEART_ANIM_SCALE) / 2;

  return {
    left,
    top,
    size,
    right: left + size,
    bottom: top + size,
    cx: left + size / 2,
    cy: top + size / 2,
    r: radius,
  };
}

function hitsCenterKeepOut(box, width, height) {
  const keepX = width * 0.2 + box.r;
  const keepY = height * 0.24 + box.r;
  return Math.abs(box.cx - width / 2) < keepX && Math.abs(box.cy - height / 2) < keepY;
}

function staysInPeripheralRing(box, width, height) {
  const ring = Math.min(width, height) * 0.19;
  return (
    box.cy <= ring ||
    box.cy >= height - ring ||
    box.cx <= ring ||
    box.cx >= width - ring
  );
}

function hitsLonelySideBand(cfg, box, width, height) {
  const inVerticalMid = box.cy > height * 0.38 && box.cy < height * 0.62;
  const onFarLeft = box.cx < width * 0.07;
  const onFarRight = box.cx > width * 0.93;
  return inVerticalMid && (onFarLeft || onFarRight);
}

function heartsOverlap(a, b) {
  return Math.hypot(a.cx - b.cx, a.cy - b.cy) < a.r + b.r + HEART_GAP_PX;
}

function hitsKeepOutRect(box, rect) {
  return !(
    box.right + box.r < rect.left ||
    box.left - box.r > rect.right ||
    box.bottom + box.r < rect.top ||
    box.top - box.r > rect.bottom
  );
}

function isFullyInside(box, width, height) {
  return box.left >= 0 && box.top >= 0 && box.right <= width && box.bottom <= height;
}

function staysInCardPeripheral(box, width, height) {
  const ringX = width * 0.16;
  const ringY = height * 0.15;
  return (
    box.cy <= ringY ||
    box.cy >= height - ringY ||
    box.cx <= ringX ||
    box.cx >= width - ringX
  );
}

function hash01(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function pointOnCardPerimeter(t, bandDepth = 0.11) {
  const margin = 0.032;
  const span = 1 - margin * 2;
  const side = Math.floor(t * 4) % 4;
  const local = (t * 4) % 1;
  const jitter = hash01(t * 7919 + 17) * bandDepth;

  switch (side) {
    case 0:
      return { xPct: (margin + local * span) * 100, yPct: (margin + jitter) * 100 };
    case 1:
      return { xPct: (1 - margin - jitter) * 100, yPct: (margin + local * span) * 100 };
    case 2:
      return { xPct: (1 - margin - local * span) * 100, yPct: (1 - margin - jitter) * 100 };
    default:
      return { xPct: (margin + jitter) * 100, yPct: (1 - margin - local * span) * 100 };
  }
}

const CARD_HEART_SCALES = [0.22, 0.24, 0.26, 0.28, 0.3, 0.32, 0.34, 0.36, 0.38, 0.4, 0.44, 0.48, 0.52];

function generateCardHeartConfigs(width, height, keepOutRects, targetCount = 72) {
  const configs = [];
  const placed = [];
  const golden = 0.618033988749;
  const maxAttempts = targetCount * 5;

  function tryPlaceCandidate(xPct, yPct, seed) {
    const scale = CARD_HEART_SCALES[Math.floor(hash01(seed * 3.1) * CARD_HEART_SCALES.length)];
    const size = getHeartSize(scale);
    const box = resolveHeartBox({ xPct, yPct }, size, width, height);

    if (!isFullyInside(box, width, height)) return false;
    if (!staysInCardPeripheral(box, width, height)) return false;
    if (keepOutRects.some((rect) => hitsKeepOutRect(box, rect))) return false;
    if (placed.some((other) => heartsOverlap(box, other))) return false;

    placed.push(box);
    configs.push({
      xPct,
      yPct,
      scale,
      rotate: Math.round((hash01(seed * 7.3) - 0.5) * 38),
      delay: Number((hash01(seed * 11.7) * 0.46).toFixed(2)),
      duration: Number((0.86 + hash01(seed * 13.9) * 0.2).toFixed(2)),
    });
    return true;
  }

  for (let attempt = 0; attempt < maxAttempts && configs.length < targetCount; attempt += 1) {
    const t = (attempt * golden) % 1;
    const { xPct, yPct } = pointOnCardPerimeter(t);
    tryPlaceCandidate(xPct, yPct, attempt);
  }

  const cornerSeeds = [
    [5.5, 4.8], [8.2, 7.4], [4.1, 9.6], [10.4, 3.6],
    [94.5, 4.8], [91.8, 7.4], [95.9, 9.6], [89.6, 3.6],
    [94.5, 95.2], [91.8, 92.6], [95.9, 90.4], [89.6, 96.4],
    [5.5, 95.2], [8.2, 92.6], [4.1, 90.4], [10.4, 96.4],
  ];

  for (let i = 0; i < cornerSeeds.length && configs.length < targetCount + 12; i += 1) {
    const [xPct, yPct] = cornerSeeds[i];
    tryPlaceCandidate(xPct, yPct, maxAttempts + i);
  }

  return configs;
}

function createLoveHeartEl(cfg, box) {
  const svgNs = 'http://www.w3.org/2000/svg';
  const el = document.createElement('div');
  el.className = 'love-heart';
  el.setAttribute('aria-hidden', 'true');
  el.style.width = `${box.size}px`;
  el.style.height = `${box.size}px`;
  el.style.left = `${box.left}px`;
  el.style.top = `${box.top}px`;
  el.style.setProperty('--love-delay', `${cfg.delay}s`);
  el.style.setProperty('--love-duration', `${cfg.duration}s`);
  el.style.setProperty('--heart-rotate', `${cfg.rotate ?? 0}deg`);
  el.style.setProperty('--love-peak', String(heartPeakOpacity(cfg.scale)));

  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(svgNs, 'path');
  path.setAttribute('d', HEART_PATH);
  svg.appendChild(path);
  el.appendChild(svg);
  return el;
}

/**
 * @param {object} options
 * @param {HTMLElement} options.container
 * @param {HTMLElement} options.root
 * @param {HTMLElement|null} [options.trigger]
 * @param {Array<{xPct:number,yPct:number,scale:number,rotate?:number,delay:number,duration:number}>} options.hearts
 * @param {'splash'|'card'} [options.placementMode]
 * @param {string[]} [options.keepOutSelectors]
 * @param {HTMLElement} [options.keepOutRoot]
 * @param {number} [options.proceduralCount]
 * @param {number} [options.pulseDurationMs]
 */
export function createLoveHeartsController({
  container,
  root,
  trigger = null,
  hearts = [],
  placementMode = 'splash',
  keepOutSelectors = [],
  keepOutRoot = container,
  proceduralCount = 72,
  pulseDurationMs = LOVE_PULSE_MS,
}) {
  let unbindLayout = null;
  let pulseTimer = null;
  let lastPulseAt = 0;
  let burstLayer = null;
  let skipClickUntil = 0;

  function ensureBurstLayer() {
    if (burstLayer?.isConnected) return burstLayer;
    const host = root.querySelector('.days-card-inner') || root;
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }
    burstLayer = document.createElement('div');
    burstLayer.className = 'love-burst-layer';
    burstLayer.setAttribute('aria-hidden', 'true');
    host.appendChild(burstLayer);
    return burstLayer;
  }

  function spawnClickBurst() {
    if (!trigger || !root) return;

    const layer = ensureBurstLayer();
    const host = layer.parentElement;
    if (!host) return;

    const hostRect = host.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const originX = triggerRect.left + triggerRect.width / 2 - hostRect.left;
    const originY = triggerRect.top + triggerRect.height / 2 - hostRect.top;
    const count = LOVE_BURST_COUNT + Math.floor(Math.random() * 3);

    while (layer.childElementCount + count > LOVE_BURST_MAX) {
      layer.firstElementChild?.remove();
    }

    for (let i = 0; i < count; i += 1) {
      const angle = ((Math.PI * 2) * i) / count + (Math.random() - 0.5) * 0.55;
      const distance = 42 + Math.random() * 78;
      const size = 14 + Math.random() * 16;
      const duration = 0.55 + Math.random() * 0.35;
      const el = document.createElement('div');
      el.className = 'love-burst-heart';
      el.style.left = `${originX}px`;
      el.style.top = `${originY}px`;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.setProperty('--burst-x', `${Math.cos(angle) * distance}px`);
      el.style.setProperty('--burst-y', `${Math.sin(angle) * distance - 18}px`);
      el.style.setProperty('--burst-rotate', `${Math.round((Math.random() - 0.5) * 70)}deg`);
      el.style.setProperty('--burst-duration', `${duration.toFixed(2)}s`);
      el.style.setProperty('--burst-scale', String(0.85 + Math.random() * 0.55));

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', HEART_PATH);
      svg.appendChild(path);
      el.appendChild(svg);

      el.addEventListener('animationend', () => el.remove(), { once: true });
      layer.appendChild(el);
    }
  }

  function getKeepOutRects() {
    if (placementMode !== 'card') return [];

    const containerRect = container.getBoundingClientRect();
    const pad = 14;
    const rects = [];

    for (const selector of keepOutSelectors) {
      const el = keepOutRoot.querySelector(selector);
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      rects.push({
        left: rect.left - containerRect.left - pad,
        top: rect.top - containerRect.top - pad,
        right: rect.right - containerRect.left + pad,
        bottom: rect.bottom - containerRect.top + pad,
      });
    }

    return rects;
  }

  function findPlacedBox(cfg, size, width, height, placed) {
    const keepOutRects = getKeepOutRects();

    for (const [dx, dy] of NUDGE_OFFSETS) {
      const box = resolveHeartBox(cfg, size, width, height, dx, dy);

      if (placementMode === 'splash') {
        if (!staysInPeripheralRing(box, width, height)) continue;
        if (hitsCenterKeepOut(box, width, height)) continue;
        if (hitsLonelySideBand(cfg, box, width, height)) continue;
      } else if (!isFullyInside(box, width, height)) {
        continue;
      } else if (!staysInCardPeripheral(box, width, height)) {
        continue;
      } else if (keepOutRects.some((rect) => hitsKeepOutRect(box, rect))) {
        continue;
      }

      if (placed.some((other) => heartsOverlap(box, other))) continue;
      return box;
    }

    return null;
  }

  function layoutLoveHearts() {
    const wasAwakened = root?.classList.contains('is-love-awakened') ?? false;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (!width || !height) return;

    container.replaceChildren();
    const placed = [];
    const keepOutRects = placementMode === 'card' ? getKeepOutRects() : [];
    const heartConfigs = placementMode === 'card'
      ? generateCardHeartConfigs(width, height, keepOutRects, proceduralCount)
      : hearts;

    for (const cfg of heartConfigs) {
      const size = getHeartSize(cfg.scale);
      const box = findPlacedBox(cfg, size, width, height, placed);
      if (!box) continue;

      placed.push(box);
      const el = createLoveHeartEl(cfg, box);
      if (wasAwakened) el.classList.add('is-lit');
      container.appendChild(el);
    }
  }

  function triggerPulse({ withBurst = true } = {}) {
    if (pulseTimer) clearTimeout(pulseTimer);

    const now = performance.now();
    const isSpam = now - lastPulseAt < LOVE_SPAM_WINDOW_MS;
    lastPulseAt = now;

    root.classList.add('is-love-awakened');
    root.classList.remove('is-love-pulsing');
    container.classList.remove('is-love-burst');
    if (isSpam) container.dataset.spam = '';
    else delete container.dataset.spam;

    // Un seul reflow pour relancer toutes les anims (spam-safe).
    void root.offsetWidth;

    root.classList.add('is-love-pulsing');
    container.classList.add('is-love-burst');

    for (const heart of container.children) {
      heart.classList.add('is-lit');
    }

    if (withBurst) spawnClickBurst();

    pulseTimer = setTimeout(() => {
      root.classList.remove('is-love-pulsing');
      container.classList.remove('is-love-burst');
      delete container.dataset.spam;
      pulseTimer = null;
    }, isSpam ? LOVE_SPAM_PULSE_MS : pulseDurationMs);
  }

  function onTriggerActivate(event) {
    if (event?.pointerType === 'mouse' && event.button != null && event.button !== 0) return;
    triggerPulse({ withBurst: true });
  }

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // Évite le double déclenchement pointerdown + click.
    skipClickUntil = performance.now() + 450;
    onTriggerActivate(event);
  }

  function onClick(event) {
    if (performance.now() < skipClickUntil) {
      event.preventDefault();
      return;
    }
    onTriggerActivate(event);
  }

  const relayout = debounce(() => layoutLoveHearts(), 120);
  layoutLoveHearts();
  window.addEventListener('resize', relayout);

  unbindLayout = () => {
    window.removeEventListener('resize', relayout);
    unbindLayout = null;
  };

  if (trigger) {
    trigger.style.touchAction = 'manipulation';
    trigger.addEventListener('pointerdown', onPointerDown);
    trigger.addEventListener('click', onClick);
  }

  return {
    relayout: layoutLoveHearts,
    pulse: triggerPulse,
    destroy() {
      unbindLayout?.();
      if (pulseTimer) {
        clearTimeout(pulseTimer);
        pulseTimer = null;
      }
      if (trigger) {
        trigger.removeEventListener('pointerdown', onPointerDown);
        trigger.removeEventListener('click', onClick);
      }
      burstLayer?.remove();
      burstLayer = null;
      delete container.dataset.spam;
      container.classList.remove('is-love-burst');
    },
  };
}
