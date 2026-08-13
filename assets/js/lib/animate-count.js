function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function easeOutQuint(t) {
  return 1 - (1 - t) ** 5;
}

export function animateCount(el, target, { duration = 900, delay = 0, onComplete } = {}) {
  if (prefersReducedMotion()) {
    el.textContent = target;
    el.classList.remove('cat-card-value--counting');
    el.classList.add('cat-card-value--counted');
    onComplete?.();
    return;
  }

  const startAt = performance.now() + delay;
  let lastDisplayed = -1;
  let finished = false;

  el.classList.add('cat-card-value--counting');
  el.classList.remove('cat-card-value--counted');

  const finish = () => {
    if (finished) return;
    finished = true;
    el.textContent = target;
    el.classList.remove('cat-card-value--counting');
    el.classList.add('cat-card-value--counted');
    onComplete?.();
  };

  const step = (now) => {
    if (finished) return;

    if (now < startAt) {
      requestAnimationFrame(step);
      return;
    }

    const progress = Math.min((now - startAt) / duration, 1);
    const eased = easeOutQuint(progress);
    const current = target === 0 ? 0 : Math.max(0, Math.round(eased * target));

    if (current !== lastDisplayed) {
      el.textContent = current;
      lastDisplayed = current;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
      return;
    }

    finish();
  };

  requestAnimationFrame(step);
}

export function animateCountElements(root, {
  selector = '[data-count-target]',
  stagger = 0,
  duration = 900,
} = {}) {
  if (!root) return;

  root.querySelectorAll(selector).forEach((el, index) => {
    const target = Number(el.dataset.countTarget);
    if (!Number.isFinite(target)) return;
    animateCount(el, target, {
      duration,
      delay: index * stagger,
    });
  });
}
