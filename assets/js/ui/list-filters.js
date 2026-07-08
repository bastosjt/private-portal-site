import { nextFrame, waitForTransition } from '../lib/transitions.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';

const MODAL_MS = 420;

const CHECK_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
`;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function initListFilters({
  theme = 'cyan',
  title = 'Filtres',
  sections = [],
  defaults = {},
  getState,
  onApply,
  beforeOpen,
} = {}) {
  let draftState = {};
  let expandedSections = new Set();
  let modalToken = 0;

  const overlay = document.createElement('div');
  overlay.className = 'add-modal-overlay filter-modal-overlay hidden';
  overlay.id = 'list-filter-overlay';
  overlay.innerHTML = `
    <div class="add-modal filter-modal" data-theme="${theme}" role="dialog" aria-modal="true" aria-labelledby="list-filter-title">
      <div class="add-modal-head">
        <button type="button" class="add-modal-back hidden" tabindex="-1" aria-hidden="true"></button>
        <h2 class="add-modal-title" id="list-filter-title">${escapeHtml(title)}</h2>
        <button type="button" class="add-modal-close" id="list-filter-close" aria-label="Fermer">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
      <div class="add-modal-body" id="list-filter-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const bodyEl = overlay.querySelector('#list-filter-body');
  const closeBtn = overlay.querySelector('#list-filter-close');

  function getSectionOptions(section) {
    return section.getOptions?.() ?? section.options ?? [];
  }

  function getVisibleSections() {
    return sections.filter((section) => {
      if (isSingle(section)) return true;
      return getSectionOptions(section).length > 0;
    });
  }

  function isSingle(section) {
    return section.mode === 'single';
  }

  function getDefaultValue(section) {
    if (defaults[section.id] != null) return defaults[section.id];
    if (isSingle(section)) return section.options?.[0]?.value ?? getSectionOptions(section)[0]?.value ?? '';
    return [];
  }

  function cloneState(state) {
    const next = {};
    for (const section of sections) {
      if (isSingle(section)) {
        next[section.id] = state[section.id] ?? getDefaultValue(section);
      } else {
        next[section.id] = new Set(state[section.id] || []);
      }
    }
    return next;
  }

  function isOptionActive(section, value) {
    if (isSingle(section)) return draftState[section.id] === value;
    return draftState[section.id]?.has(value);
  }

  function isCollapsible(section) {
    return section.collapsible !== false && !isSingle(section);
  }

  function getSectionSummary(section) {
    if (isSingle(section)) {
      const value = draftState[section.id];
      const opt = getSectionOptions(section).find((entry) => entry.value === value);
      return opt?.label || '—';
    }

    const count = draftState[section.id]?.size || 0;
    if (!count) return 'Tous';

    const labels = getSectionOptions(section)
      .filter((opt) => draftState[section.id]?.has(opt.value))
      .map((opt) => opt.label);

    if (labels.length <= 2) return labels.join(', ');
    return `${labels.length} sélectionnés`;
  }

  function renderCheckItem(section, opt) {
    const active = isOptionActive(section, opt.value);
    return `
      <button
        type="button"
        class="filter-check-item${active ? ' is-active' : ''}"
        data-filter-section="${section.id}"
        data-filter-value="${escapeHtml(opt.value)}"
        role="${isSingle(section) ? 'radio' : 'checkbox'}"
        aria-checked="${active ? 'true' : 'false'}"
      >
        <span class="filter-check-box">${CHECK_ICON}</span>
        <span class="filter-check-label">${escapeHtml(opt.label)}</span>
      </button>
    `;
  }

  function renderSection(section) {
    const collapsible = isCollapsible(section);
    const expanded = !collapsible || expandedSections.has(section.id);
    const summary = getSectionSummary(section);

    if (!collapsible) {
      return `
        <section class="filter-section filter-section--static" aria-labelledby="filter-section-${section.id}">
          <h3 class="filter-section-label" id="filter-section-${section.id}">${escapeHtml(section.label)}</h3>
          <div
            class="filter-check-list filter-check-list--open"
            role="${isSingle(section) ? 'radiogroup' : 'group'}"
            aria-label="${escapeHtml(section.label)}"
          >
            ${getSectionOptions(section).map((opt) => renderCheckItem(section, opt)).join('')}
          </div>
        </section>
      `;
    }

    return `
      <section class="filter-section filter-section--collapsible${expanded ? ' is-expanded' : ''}" data-filter-section-id="${section.id}">
        <button
          type="button"
          class="filter-section-toggle"
          id="filter-section-${section.id}"
          aria-expanded="${expanded ? 'true' : 'false'}"
          aria-controls="filter-panel-${section.id}"
          data-filter-toggle="${section.id}"
        >
          <span class="filter-section-toggle-copy">
            <span class="filter-section-label">${escapeHtml(section.label)}</span>
            <span class="filter-section-summary">${escapeHtml(summary)}</span>
          </span>
          <svg class="filter-section-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
        <div class="filter-check-list-wrap" id="filter-panel-${section.id}"${expanded ? '' : ' hidden'}>
          <div
            class="filter-check-list"
            role="group"
            aria-label="${escapeHtml(section.label)}"
          >
            ${getSectionOptions(section).map((opt) => renderCheckItem(section, opt)).join('')}
          </div>
        </div>
      </section>
    `;
  }

  function renderBody() {
    bodyEl.innerHTML = `
      <div class="filter-modal-content">
        ${getVisibleSections().map((section) => renderSection(section)).join('')}
        <div class="filter-modal-actions">
          <button type="button" class="filter-reset-btn" id="list-filter-reset">Réinitialiser</button>
          <button type="button" class="filter-apply-btn" id="list-filter-apply">Appliquer</button>
        </div>
      </div>
    `;
  }

  function updateCheckItem(sectionId, value, active) {
    const item = bodyEl.querySelector(
      `[data-filter-section="${sectionId}"][data-filter-value="${CSS.escape(value)}"]`,
    );
    if (!item) return;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-checked', active ? 'true' : 'false');
  }

  function updateSectionSummary(sectionId) {
    const section = sections.find((entry) => entry.id === sectionId);
    if (!section || !isCollapsible(section)) return;
    const summaryEl = bodyEl.querySelector(
      `[data-filter-section-id="${sectionId}"] .filter-section-summary`,
    );
    if (summaryEl) summaryEl.textContent = getSectionSummary(section);
  }

  function updateSingleSectionRadios(sectionId, value) {
    bodyEl.querySelectorAll(`[data-filter-section="${sectionId}"]`).forEach((item) => {
      const active = item.dataset.filterValue === value;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  function countActiveFilters(state) {
    return sections.reduce((sum, section) => {
      if (isSingle(section)) {
        const value = state[section.id];
        const defaultValue = getDefaultValue(section);
        return sum + (value !== defaultValue ? 1 : 0);
      }
      const value = state[section.id];
      const size = value instanceof Set ? value.size : (Array.isArray(value) ? value.length : 0);
      return sum + size;
    }, 0);
  }

  function updateTriggerBadge() {
    const btn = document.getElementById('act-filter-btn');
    const badge = btn?.querySelector('.act-filter-badge');
    if (!btn || !badge) return;

    const count = countActiveFilters(getState());
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count === 0);
    btn.classList.toggle('is-active', count > 0);
  }

  async function open() {
    await beforeOpen?.();
    draftState = cloneState(getState());
    expandedSections.clear();
    for (const section of sections) {
      if (isCollapsible(section) && draftState[section.id]?.size > 0) {
        expandedSections.add(section.id);
      }
    }
    renderBody();
    modalToken += 1;
    const token = modalToken;

    overlay.classList.remove('hidden');
    await nextFrame();
    if (token !== modalToken) return;

    overlay.classList.add('is-active');
    document.body.classList.add('modal-open');
    lockScroll();
  }

  async function close() {
    modalToken += 1;
    const token = modalToken;

    overlay.classList.remove('is-active');
    document.body.classList.remove('modal-open');
    unlockScroll();

    await waitForTransition(overlay, MODAL_MS);
    if (token !== modalToken) return;

    overlay.classList.add('hidden');
  }

  function applyDraft() {
    const applied = {};
    for (const section of sections) {
      if (isSingle(section)) {
        applied[section.id] = draftState[section.id];
      } else {
        applied[section.id] = [...(draftState[section.id] || [])];
      }
    }
    onApply?.(applied);
    updateTriggerBadge();
    close();
  }

  function resetDraft() {
    for (const section of sections) {
      if (isSingle(section)) {
        draftState[section.id] = getDefaultValue(section);
      } else {
        draftState[section.id] = new Set();
      }
    }
    expandedSections.clear();
    renderBody();
  }

  function toggleSection(sectionId) {
    const sectionEl = bodyEl.querySelector(`[data-filter-section-id="${sectionId}"]`);
    const toggle = bodyEl.querySelector(`[data-filter-toggle="${sectionId}"]`);
    const panel = bodyEl.querySelector(`#filter-panel-${sectionId}`);
    if (!sectionEl || !toggle || !panel) return;

    const willExpand = !expandedSections.has(sectionId);
    if (willExpand) expandedSections.add(sectionId);
    else expandedSections.delete(sectionId);

    sectionEl.classList.toggle('is-expanded', willExpand);
    toggle.setAttribute('aria-expanded', willExpand ? 'true' : 'false');
    panel.toggleAttribute('hidden', !willExpand);
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  closeBtn.addEventListener('click', close);

  bodyEl.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-filter-toggle]');
    if (toggle) {
      toggleSection(toggle.dataset.filterToggle);
      return;
    }

    const item = event.target.closest('[data-filter-section][data-filter-value]');
    if (item) {
      const sectionId = item.dataset.filterSection;
      const value = item.dataset.filterValue;
      const section = sections.find((entry) => entry.id === sectionId);
      if (!section) return;

      if (isSingle(section)) {
        draftState[sectionId] = value;
        updateSingleSectionRadios(sectionId, value);
      } else {
        const set = draftState[sectionId];
        if (!set) return;
        const willActivate = !set.has(value);
        if (willActivate) set.add(value);
        else set.delete(value);
        updateCheckItem(sectionId, value, willActivate);
        updateSectionSummary(sectionId);
      }
      return;
    }

    if (event.target.closest('#list-filter-reset')) {
      resetDraft();
      return;
    }

    if (event.target.closest('#list-filter-apply')) {
      applyDraft();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.classList.contains('hidden')) {
      close();
    }
  });

  function destroy() {
    modalToken += 1;
    overlay.classList.remove('is-active');
    overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    unlockScroll();
    overlay.remove();
  }

  return {
    open,
    close,
    destroy,
    updateTriggerBadge,
    countActiveFilters: () => countActiveFilters(getState()),
  };
}
