import { escapeHtml } from '../lib/escape-html.js';
import { SETTINGS_THEME } from '../config.js';
import {
  PROFILE_ANIMALS,
  PROFILE_ANIMAL_COLORS,
  clearProfileAnimal,
  getProfileAnimalColorStyle,
  getProfileAnimalEntry,
  getProfileAnimalMeta,
  setProfileAnimal,
} from '../lib/profile-animal.js';
import { renderNavIcon } from '../lib/lucide-icon.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';
import { MODAL_DRAG_HANDLE_HTML, wireModalDragClose } from '../lib/modal-drag-close.js';
import { nextFrame, waitForTransition } from '../lib/transitions.js';

const STEP_MS = 260;

function renderPickerHtml({ hasAnimal = false, selectedAnimalId = null } = {}) {
  const clearItem = hasAnimal ? `
    <button type="button" class="add-picker-item add-picker-item--clear" data-theme="${SETTINGS_THEME}" data-clear-animal>
      <span class="add-picker-icon">${renderNavIcon('undo-2', { strokeWidth: 2 })}</span>
      <span class="add-picker-label">Retirer l'animal</span>
    </button>
  ` : '';

  return `
    <div class="add-picker profile-animal-picker" id="profile-animal-picker">
      <p class="add-picker-lead">Choisis ton animal de profil</p>
      <div class="add-picker-grid profile-animal-picker-grid">
        ${clearItem}
        ${PROFILE_ANIMALS.map((animal) => {
          const isSelected = animal.id === selectedAnimalId;
          return `
          <button
            type="button"
            class="add-picker-item${isSelected ? ' is-selected' : ''}"
            data-theme="${SETTINGS_THEME}"
            data-animal="${animal.id}"
            aria-label="${escapeHtml(animal.label)}${isSelected ? ' (actif)' : ''}"
            aria-pressed="${isSelected ? 'true' : 'false'}"
          >
            <span class="add-picker-icon">${renderNavIcon(animal.icon, { strokeWidth: 2 })}</span>
            <span class="add-picker-label">${escapeHtml(animal.label)}</span>
          </button>
        `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderColorFormHtml({ animalId, selectedColorId }) {
  const animal = getProfileAnimalMeta(animalId);
  const colorStyle = getProfileAnimalColorStyle(selectedColorId);

  return `
    <form class="profile-animal-form add-form" id="profile-animal-form" data-theme="${SETTINGS_THEME}" novalidate>
      <div class="add-form-scroll">
        <div class="profile-animal-preview">
          <span class="profile-animal-preview-avatar" id="profile-animal-preview" style="background:${colorStyle.gradient};border:1px solid ${colorStyle.border};color:${colorStyle.iconColor};box-shadow:var(--neu-up-sm), 0 0 18px ${colorStyle.glow}">
            ${renderNavIcon(animalId, { strokeWidth: 2, width: 34, height: 34 })}
          </span>
          <p class="profile-animal-preview-label">${escapeHtml(animal?.label || '')}</p>
        </div>
        <p class="add-picker-lead">Choisis une couleur</p>
        <div class="profile-color-grid" role="listbox" aria-label="Couleurs de profil">
          ${PROFILE_ANIMAL_COLORS.map((color) => `
            <button
              type="button"
              class="profile-color-swatch${color.id === selectedColorId ? ' is-selected' : ''}"
              data-color="${color.id}"
              style="background:${color.gradient}"
              aria-label="${escapeHtml(color.label)}"
              aria-selected="${color.id === selectedColorId ? 'true' : 'false'}"
              title="${escapeHtml(color.label)}"
            >
              <span class="profile-color-swatch-ring" aria-hidden="true"></span>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="add-form-footer">
        <button type="submit" class="add-form-submit" id="profile-animal-save">Enregistrer</button>
      </div>
    </form>
  `;
}

export function initProfileAnimalPicker({ user, onChange, signal } = {}) {
  if (!user) return () => {};

  const overlay = document.createElement('div');
  overlay.className = 'add-modal-overlay hidden';
  overlay.id = 'profile-animal-overlay';
  overlay.innerHTML = `
    <div class="add-modal" role="dialog" aria-modal="true" aria-labelledby="profile-animal-title">
      ${MODAL_DRAG_HANDLE_HTML}
      <div class="add-modal-head">
        <button type="button" class="add-modal-back hidden" id="profile-animal-back" aria-label="Retour">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <h2 class="add-modal-title" id="profile-animal-title">Photo de profil</h2>
        <button type="button" class="add-modal-close" id="profile-animal-close" aria-label="Fermer">
          ${renderNavIcon('close', { strokeWidth: 2 })}
        </button>
      </div>
      <div class="add-modal-body" id="profile-animal-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const bodyEl = overlay.querySelector('#profile-animal-body');
  const titleEl = overlay.querySelector('#profile-animal-title');
  const backBtn = overlay.querySelector('#profile-animal-back');
  const closeBtn = overlay.querySelector('#profile-animal-close');

  let isOpen = false;
  let isTransitioning = false;
  let transitionToken = 0;
  let pendingAnimalId = null;
  let selectedColorId = PROFILE_ANIMAL_COLORS[0].id;

  const getContentEl = () => bodyEl.querySelector('.add-modal-content');

  const setTitle = (text, showBack = false) => {
    if (titleEl) titleEl.textContent = text;
    backBtn?.classList.toggle('hidden', !showBack);
  };

  const staggerPickerItems = () => {
    overlay.querySelectorAll('.add-picker-item').forEach((item, index) => {
      item.style.setProperty('--picker-delay', `${index * 35 + 50}ms`);
    });
  };

  const staggerColorSwatches = () => {
    overlay.querySelectorAll('.profile-color-swatch').forEach((item, index) => {
      item.style.setProperty('--picker-delay', `${index * 30 + 40}ms`);
    });
  };

  const mountPicker = () => {
    pendingAnimalId = null;
    setTitle('Photo de profil', false);
    const current = getProfileAnimalEntry(user.uid);
    const hasAnimal = Boolean(current);
    bodyEl.innerHTML = `<div class="add-modal-content">${renderPickerHtml({
      hasAnimal,
      selectedAnimalId: current?.animal ?? null,
    })}</div>`;
    staggerPickerItems();
  };

  const updatePreview = () => {
    const preview = overlay.querySelector('#profile-animal-preview');
    if (!preview || !pendingAnimalId) return;
    const style = getProfileAnimalColorStyle(selectedColorId);
    preview.style.background = style.gradient;
    preview.style.border = `1px solid ${style.border}`;
    preview.style.color = style.iconColor;
    preview.style.boxShadow = `var(--neu-up-sm), 0 0 18px ${style.glow}`;
  };

  const mountColorForm = (animalId) => {
    pendingAnimalId = animalId;
    const current = getProfileAnimalEntry(user.uid);
    selectedColorId = current?.animal === animalId
      ? current.color
      : PROFILE_ANIMAL_COLORS[0].id;

    setTitle('Couleur', true);
    bodyEl.innerHTML = `<div class="add-modal-content">${renderColorFormHtml({ animalId, selectedColorId })}</div>`;
    staggerColorSwatches();
  };

  const transitionContent = async (mountFn, { direction = 'forward', animate = true } = {}) => {
    if (isTransitioning) return false;

    const token = ++transitionToken;
    const content = getContentEl();
    const canAnimate = animate && content?.innerHTML.trim();

    if (canAnimate) {
      isTransitioning = true;
      content.classList.remove('is-entering', 'is-entering-back');
      content.classList.add(direction === 'back' ? 'is-leaving-back' : 'is-leaving');
      await waitForTransition(content, STEP_MS);
      if (token !== transitionToken) {
        isTransitioning = false;
        return false;
      }
      content.classList.remove('is-leaving', 'is-leaving-back');
    }

    mountFn();

    if (token !== transitionToken) {
      isTransitioning = false;
      return false;
    }

    const nextContent = getContentEl();
    if (canAnimate && nextContent) {
      nextContent.classList.add(direction === 'back' ? 'is-entering-back' : 'is-entering');
      await nextFrame();
      nextContent.classList.remove('is-entering', 'is-entering-back');
    }

    isTransitioning = false;
    return true;
  };

  const showPicker = async ({ animate = true } = {}) => {
    await transitionContent(mountPicker, { direction: 'back', animate });
  };

  const showColorForm = async (animalId, { animate = true } = {}) => {
    await transitionContent(() => mountColorForm(animalId), { direction: 'forward', animate });
  };

  const open = () => {
    if (isOpen) return;
    mountPicker();
    overlay.classList.remove('hidden');
    lockScroll();
    requestAnimationFrame(() => {
      overlay.classList.add('is-active');
      isOpen = true;
    });
  };

  const close = () => {
    if (!isOpen) return;
    dragClose.reset();
    overlay.classList.remove('is-active');
    isOpen = false;
    pendingAnimalId = null;
    window.setTimeout(() => {
      if (!isOpen) {
        overlay.classList.add('hidden');
        bodyEl.innerHTML = '';
        unlockScroll();
      }
    }, 360);
  };

  const onOverlayClick = (event) => {
    if (event.target === overlay) close();
  };

  const onBodyClick = async (event) => {
    if (isTransitioning) return;

    const clearBtn = event.target.closest('[data-clear-animal]');
    if (clearBtn?.closest('#profile-animal-picker')) {
      clearProfileAnimal(user.uid);
      onChange?.(null);
      close();
      return;
    }

    const animalBtn = event.target.closest('[data-animal]');
    if (animalBtn?.closest('#profile-animal-picker')) {
      await showColorForm(animalBtn.dataset.animal);
      return;
    }

    const colorBtn = event.target.closest('[data-color]');
    if (colorBtn?.closest('#profile-animal-form')) {
      selectedColorId = colorBtn.dataset.color;
      overlay.querySelectorAll('.profile-color-swatch').forEach((swatch) => {
        const isSelected = swatch.dataset.color === selectedColorId;
        swatch.classList.toggle('is-selected', isSelected);
        swatch.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
      updatePreview();
    }
  };

  const onSubmit = (event) => {
    const form = event.target.closest('#profile-animal-form');
    if (!form || event.type === 'click') return;
    event.preventDefault();
    if (!pendingAnimalId) return;
    setProfileAnimal(user.uid, pendingAnimalId, selectedColorId);
    onChange?.({ animal: pendingAnimalId, color: selectedColorId });
    close();
  };

  const onBack = () => {
    if (isTransitioning) return;
    showPicker({ animate: true });
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && isOpen) close();
  };

  closeBtn.addEventListener('click', close, { signal });
  backBtn.addEventListener('click', onBack, { signal });
  overlay.addEventListener('click', onOverlayClick, { signal });
  bodyEl.addEventListener('click', onBodyClick, { signal });
  bodyEl.addEventListener('submit', onSubmit, { signal });
  document.addEventListener('keydown', onKeyDown, { signal });

  const dragClose = wireModalDragClose(overlay, close);

  const destroy = () => {
    dragClose.destroy();
    close();
    overlay.remove();
  };

  return { open, close, destroy };
}
