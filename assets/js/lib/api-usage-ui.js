function formatCount(value) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value));
}

const ENTRANCE_STAGGER_MS = 55;

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const METRIC_ANIM_MS = 520;

function animateValue(el, from, to, render, { duration = METRIC_ANIM_MS } = {}) {
  if (!el || from === to) {
    if (el) el.textContent = render(to);
    return;
  }

  if (prefersReducedMotion()) {
    el.textContent = render(to);
    return;
  }

  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - progress) ** 3;
    const current = from + (to - from) * eased;
    el.textContent = render(current);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = render(to);
    }
  };

  requestAnimationFrame(tick);
}

function pulseMetricElements(row, ...elements) {
  if (prefersReducedMotion()) return;

  elements.filter(Boolean).forEach((el) => el.classList.add('is-metric-pulse'));
  row?.classList.add('is-metric-row-updated');

  window.setTimeout(() => {
    elements.filter(Boolean).forEach((el) => el.classList.remove('is-metric-pulse'));
    row?.classList.remove('is-metric-row-updated');
  }, METRIC_ANIM_MS + 80);
}

function applyBarWidth(fillEl, percent, { animate = true } = {}) {
  if (!fillEl) return;

  const target = Math.max(0, Math.min(100, percent ?? 0));
  const display = target > 0 ? Math.max(4, target) : 0;

  if (!animate || prefersReducedMotion()) {
    fillEl.style.width = `${display}%`;
    fillEl.dataset.width = String(display);
    return;
  }

  fillEl.style.width = `${display}%`;
  fillEl.dataset.width = String(display);
}

function updateUsageRow(row, usage, { animate = false } = {}) {
  const prevCount = Number(row.dataset.count) || 0;
  const prevRemaining = Number(row.dataset.remaining);
  const prevPercent = Number(row.dataset.percent) || 0;
  const prevLevel = row.dataset.level || 'ok';
  const hasLimit = usage.limit != null;

  const countEl = row.querySelector('[data-metric="count"]');
  const metaEl = row.querySelector('[data-metric="meta"]');
  const barFill = row.querySelector('[data-metric="bar"]');

  row.dataset.level = usage.level;
  row.dataset.count = String(usage.count);
  row.dataset.remaining = hasLimit ? String(usage.remaining) : '';
  row.dataset.percent = hasLimit ? String(usage.percent ?? 0) : '';

  const countChanged = prevCount !== usage.count;
  const remainingChanged = hasLimit && prevRemaining !== usage.remaining;
  const percentChanged = hasLimit && prevPercent !== (usage.percent ?? 0);
  const levelChanged = prevLevel !== usage.level;

  if (countEl) {
    if (animate && countChanged) {
      animateValue(countEl, prevCount, usage.count, (v) => formatCount(v));
    } else {
      countEl.textContent = usage.countLabel;
    }
  }

  if (metaEl && hasLimit) {
    if (animate && remainingChanged) {
      animateValue(
        metaEl,
        Number.isFinite(prevRemaining) ? prevRemaining : usage.remaining,
        usage.remaining,
        (v) => `${formatCount(v)} restantes`,
      );
    } else {
      metaEl.textContent = `${usage.remainingLabel} restantes`;
    }
  }

  if (barFill && hasLimit) {
    if (animate && (percentChanged || countChanged)) {
      applyBarWidth(barFill, usage.percent, { animate: true });
    } else {
      applyBarWidth(barFill, usage.percent, { animate: false });
    }
  }

  if (animate && (countChanged || remainingChanged || percentChanged || levelChanged)) {
    pulseMetricElements(row, countEl, metaEl, barFill);
  }
}

function buildUsageRowElement(usage, ui, index) {
  const hasLimit = usage.limit != null;
  const barWidth = hasLimit ? Math.max(usage.count > 0 ? 4 : 0, usage.percent ?? 0) : 0;

  const row = document.createElement('div');
  row.className = 'settings-api-compact-row';
  row.dataset.apiService = usage.id;
  row.dataset.theme = ui.theme;
  row.dataset.level = usage.level;
  row.dataset.count = String(usage.count);
  row.dataset.remaining = hasLimit ? String(usage.remaining) : '';
  row.dataset.percent = hasLimit ? String(usage.percent ?? 0) : '';
  row.style.setProperty('--api-row-delay', `${index * ENTRANCE_STAGGER_MS}ms`);

  row.innerHTML = `
    <span class="settings-api-compact-icon" aria-hidden="true"></span>
    <div class="settings-api-compact-body">
      <div class="settings-api-compact-head">
        <span class="settings-api-compact-name">${ui.shortName}</span>
        ${hasLimit ? `<span class="settings-api-compact-meta" data-metric="meta">${usage.remainingLabel} restantes</span>` : ''}
      </div>
      ${hasLimit ? `
        <div class="settings-api-compact-bar" aria-hidden="true">
          <span class="settings-api-compact-bar-fill" data-metric="bar" style="width: 0%"></span>
        </div>
      ` : ''}
      <span class="settings-api-compact-detail">
        <span data-metric="count">${usage.countLabel}</span> · ${usage.periodLabel}
      </span>
    </div>
  `;

  const iconHost = row.querySelector('.settings-api-compact-icon');
  if (iconHost && ui.iconHtml) {
    iconHost.innerHTML = ui.iconHtml;
  }

  const barFill = row.querySelector('[data-metric="bar"]');
  if (barFill) {
    requestAnimationFrame(() => applyBarWidth(barFill, barWidth, { animate: !prefersReducedMotion() }));
  }

  return row;
}

export function animateApiUsageEntrance(rootEl) {
  const list = rootEl?.querySelector('.settings-api-compact-list');
  if (!list || prefersReducedMotion()) return;

  list.classList.add('is-entering');

  window.setTimeout(() => {
    list.classList.remove('is-entering');
  }, 600 + (list.children.length * ENTRANCE_STAGGER_MS));
}

/**
 * Met à jour le dashboard API en place avec animations sur les métriques.
 * @returns {boolean} true si au moins une ligne a été traitée
 */
export function refreshApiUsageDashboard(rootEl, summary, uiByService, { animate = true } = {}) {
  if (!rootEl || !summary?.length) return false;

  const list = rootEl.querySelector('.settings-api-compact-list');
  if (!list) return false;

  const summaryIds = new Set(summary.map((u) => u.id));

  for (const usage of summary) {
    const ui = uiByService[usage.id];
    if (!ui) continue;

    let row = list.querySelector(`[data-api-service="${usage.id}"]`);
    if (!row) {
      row = buildUsageRowElement(usage, ui, list.children.length);
      list.appendChild(row);
      if (animate) pulseMetricElements(row, row.querySelector('[data-metric="count"]'));
      continue;
    }

    updateUsageRow(row, usage, { animate });
  }

  list.querySelectorAll('[data-api-service]').forEach((row) => {
    if (!summaryIds.has(row.dataset.apiService)) {
      row.remove();
    }
  });

  return list.children.length > 0;
}

export function mountApiUsageDashboard(rootEl, summary, uiByService) {
  if (!rootEl) return;

  const list = rootEl.querySelector('.settings-api-compact-list');
  if (!list) return;

  list.replaceChildren();
  summary.forEach((usage, index) => {
    const ui = uiByService[usage.id];
    if (!ui) return;
    list.appendChild(buildUsageRowElement(usage, ui, index));
  });
}
