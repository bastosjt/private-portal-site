import { escapeHtml } from '../lib/escape-html.js';
import { devWarn, devError } from '../lib/dev-log.js';
import { HOME_CATEGORIES, getCategoryById, isPlaceLinkedAddressField } from '../config.js';
import { addItem, updateItem } from '../firebase/firestore.js';
import { patchCachedItem, upsertCachedItem, ensureItems, findCachedItemById } from '../data/appDataCache.js';
import { setActiveTravelId } from '../lib/space-settings.js';
import { Timestamp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import { sidebarIcon } from './sidebar.js';
import { initFormAddressFields } from './address-autocomplete.js';
import { initFormPlaceNameFields } from './place-name-autocomplete.js';
import { initPlaceFieldSuggestions, clearPlaceFieldSuggestions, restorePlaceFieldSuggestionsFromDraft, hasPendingPlaceFieldSuggestions, getFirstPendingPlaceFieldSuggestion } from './place-field-suggestions.js';
import { initActivityScheduleFields, syncActivityScheduleFields } from './activity-schedule-fields.js';
import { searchAddresses } from '../lib/address-search.js';
import { waitForTransition, nextFrame } from '../lib/transitions.js';
import {
  initFormSelectFields,
  getSelectFieldValue,
  setSelectFieldValue,
  renderSelectField,
  ADD_OPTION_VALUE,
  PLACEHOLDER_OPTION_VALUE,
} from './select-custom.js';
import { formatPrice, isMoneyField } from '../lib/price-format.js';
import {
  collectPriceRangeData,
  populatePriceRangeFields,
  renderPriceRangeField,
  validatePriceRangeFields,
} from '../lib/form-price-field.js';
import { getFieldOptionLabel } from '../lib/custom-types.js';
import {
  applyFormDraft,
  captureFormSnapshot,
  clearFormDraft,
  formSnapshotsEqual,
  loadFormDraft,
  saveFormDraft,
} from '../lib/form-draft.js';
import {
  ensureAuthSession,
  getSubmitErrorMessage,
  isRetryableFirestoreError,
} from '../auth/ensure-auth.js';
import { lockScroll, unlockScroll, releaseStalePageScrollLock } from '../lib/scroll-lock.js';
import { sanitizeHttpsUrl } from '../lib/safe-url.js';
import { MODAL_DRAG_HANDLE_HTML, wireModalDragClose } from '../lib/modal-drag-close.js';
import {
  initFormMultiSelectFields,
  getMultiSelectFieldValues,
  renderMultiSelectField,
  setMultiSelectFieldValues,
} from './multi-select-field.js';
import { normalizeItemTags } from '../lib/item-tags.js';

function renderField(field, categoryId) {
  const id = `add-field-${field.name}`;
  const required = field.required ? ' required' : '';
  const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : '';

  if (field.type === 'textarea') {
    return `
      <label class="form-field form-field--textarea" for="${id}">
        <span class="form-field-label">${escapeHtml(field.label)}</span>
        <textarea id="${id}" name="${field.name}" class="form-textarea" rows="3"${placeholder}${required}></textarea>
      </label>
    `;
  }

  if (field.type === 'select') {
    return renderSelectField(field, categoryId);
  }

  if (field.type === 'multiSelect') {
    return renderMultiSelectField(field, categoryId);
  }

  if (field.type === 'priceRange') {
    return renderPriceRangeField(field);
  }

  if (field.type === 'address') {
    return `
      <label class="form-field" for="${id}">
        <span class="form-field-label">${escapeHtml(field.label)}</span>
        <div class="form-input-wrap address-field">
          <span class="address-field-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </span>
          <input type="text" id="${id}" name="${field.name}" class="form-input form-input--address"${placeholder}${required} autocomplete="off">
        </div>
      </label>
    `;
  }

  const inputType = field.type === 'url' ? 'url' : 'text';
  const numericAttrs = isMoneyField(field.name) ? ' inputmode="decimal" autocomplete="off"' : '';
  const placeSearchAttrs = field.placeSearch ? ' autocomplete="off"' : '';
  const placeSearchWrap = field.placeSearch ? ' address-field place-name-field' : '';

  if (field.schedulePart) {
    return `
      <div class="form-field form-field--schedule is-conditional-hidden" data-schedule-part="${field.schedulePart}">
        <div class="form-field--schedule__clip">
          <label for="${id}">
            <span class="form-field-label">${escapeHtml(field.label)}</span>
            <div class="form-input-wrap">
              <input type="${inputType}" id="${id}" name="${field.name}" class="form-input"${placeholder}${required}${numericAttrs}${placeSearchAttrs}>
            </div>
          </label>
        </div>
      </div>
    `;
  }

  return `
    <label class="form-field" for="${id}">
      <span class="form-field-label">${escapeHtml(field.label)}</span>
      <div class="form-input-wrap${placeSearchWrap}">
        <input type="${inputType}" id="${id}" name="${field.name}" class="form-input"${placeholder}${required}${numericAttrs}${placeSearchAttrs}>
      </div>
    </label>
  `;
}

function renderCategoryPicker() {
  return `
    <div class="add-picker" id="add-picker">
      <p class="add-picker-lead">Quelle idée voulez-vous ajouter ?</p>
      <div class="add-picker-grid">
        ${HOME_CATEGORIES.map((cat) => `
          <button type="button" class="add-picker-item" data-theme="${cat.theme}" data-category="${cat.id}">
            <span class="add-picker-icon">${sidebarIcon(cat.icon)}</span>
            <span class="add-picker-label">${escapeHtml(cat.label)}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderForm(category) {
  return `
    <form class="add-form" id="add-form" data-theme="${category.theme}" novalidate>
      <div class="add-form-scroll">
        ${category.fields.map((field) => renderField(field, category.id)).join('')}
      </div>
      <div class="add-form-footer">
        <p class="add-form-error hidden" id="add-form-error" role="alert"></p>
        <button type="submit" class="add-form-submit" id="add-form-submit">
          Enregistrer
        </button>
      </div>
    </form>
  `;
}

export function initAddItem({ onAdded, onUpdated } = {}) {
  let activeCategoryId = null;
  let editingItemId = null;
  let editingItem = null;
  let isSubmitting = false;
  let addressCleanup = null;
  let placeNameCleanup = null;
  let placeFieldSuggestionsCleanup = null;
  let selectCleanup = null;
  let multiSelectCleanup = null;
  let scheduleCleanup = null;
  let draftCleanup = null;
  let formDraftBaseline = null;
  let bodyTransitionToken = 0;
  let modalTransitionToken = 0;
  let isBodyTransitioning = false;

  const MODAL_MS = 480;
  const STEP_LEAVE_MS = 110;
  const abort = new AbortController();
  const { signal } = abort;

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'fab';
  fab.id = 'fab-add';
  fab.setAttribute('aria-label', 'Ajouter une idée');
  fab.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" aria-hidden="true">
      <path d="M12 5v14"/><path d="M5 12h14"/>
    </svg>
  `;
  document.body.appendChild(fab);

  const overlay = document.createElement('div');
  overlay.className = 'add-modal-overlay hidden';
  overlay.id = 'add-modal-overlay';
  overlay.innerHTML = `
    <div class="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
      ${MODAL_DRAG_HANDLE_HTML}
      <div class="add-modal-head">
        <button type="button" class="add-modal-back hidden" id="add-modal-back" aria-label="Retour">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <div class="add-modal-head-main">
          <h2 class="add-modal-title" id="add-modal-title">Nouvelle idée</h2>
          <div class="add-form-draft" id="add-form-draft" role="status" aria-live="polite" aria-hidden="true">
            <div class="add-form-draft__inner">
              <div class="add-form-draft__content">
                <span class="add-form-draft-label">Brouillon</span>
                <button type="button" class="add-form-draft-clear" id="add-form-draft-clear" aria-label="Effacer le brouillon">
                  Effacer
                </button>
              </div>
            </div>
          </div>
        </div>
        <button type="button" class="add-modal-close" id="add-modal-close" aria-label="Fermer">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
      <div class="add-modal-body" id="add-modal-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const titleEl = overlay.querySelector('#add-modal-title');
  const bodyEl = overlay.querySelector('#add-modal-body');
  const backBtn = overlay.querySelector('#add-modal-back');
  const closeBtn = overlay.querySelector('#add-modal-close');
  const modalEl = overlay.querySelector('.add-modal');
  const draftClearBtn = overlay.querySelector('#add-form-draft-clear');

  draftClearBtn?.addEventListener('click', (event) => {
    const form = getActiveForm();
    const category = activeCategoryId ? getCategoryById(activeCategoryId) : null;
    if (form && category) handleDraftClear(event, form, category);
  });

  function getFieldDisplayLabel(categoryId, fieldName, value) {
    return getFieldOptionLabel(categoryId, fieldName, value);
  }

  function populateForm(form, category, item) {
    form.reset();
    for (const field of category.fields) {
      if (field.type === 'priceRange') {
        populatePriceRangeFields(form, item);
        continue;
      }

      const value = item[field.name];
      if (value == null || value === '') continue;

      if (field.type === 'select') {
        let displayLabel = getFieldDisplayLabel(category.id, field.name, value);
        if (field.optionsFrom === 'travels') {
          displayLabel = findCachedItemById('travels', value)?.destination || displayLabel;
        }
        setSelectFieldValue(
          form,
          field,
          value,
          displayLabel,
          category.id,
        );
        continue;
      }

      if (field.type === 'multiSelect') {
        setMultiSelectFieldValues(form, field, category.id, normalizeItemTags(item[field.name]));
        continue;
      }

      const el = form.elements[field.name];
      if (!el) continue;
      el.value = value;

      if (field.type === 'address') {
        if (item.latitude != null && item.longitude != null) {
          el.dataset.lat = String(item.latitude);
          el.dataset.lng = String(item.longitude);
        } else {
          delete el.dataset.lat;
          delete el.dataset.lng;
        }

        if (isPlaceLinkedAddressField(category, field) && item.lienMaps) {
          el.dataset.mapsUrl = item.lienMaps;
        }
      }
    }
  }

  function getContentEl() {
    return bodyEl.querySelector('.add-modal-content');
  }

  function setModalTitle(text, showBack) {
    titleEl.textContent = text;
    backBtn.classList.toggle('hidden', !showBack);
  }

  function staggerPickerItems(root, { delayBase = 90 } = {}) {
    root?.querySelectorAll('.add-picker-item').forEach((item, index) => {
      item.style.setProperty('--picker-delay', `${index * 32 + delayBase}ms`);
    });
  }

  function clearFieldCleanups() {
    addressCleanup?.();
    addressCleanup = null;
    placeNameCleanup?.();
    placeNameCleanup = null;
    placeFieldSuggestionsCleanup?.();
    placeFieldSuggestionsCleanup = null;
    selectCleanup?.();
    selectCleanup = null;
    multiSelectCleanup?.();
    multiSelectCleanup = null;
    scheduleCleanup?.();
    scheduleCleanup = null;
    draftCleanup?.();
    draftCleanup = null;
  }

  function getActiveForm() {
    return getContentEl()?.querySelector('#add-form') || null;
  }

  function resetDraftClearButton(btn) {
    if (!btn) return;
    clearTimeout(Number(btn.dataset.confirmTimer || 0));
    btn.dataset.confirming = '';
    btn.dataset.confirmTimer = '';
    btn.textContent = 'Effacer';
    btn.classList.remove('is-confirming');
    btn.setAttribute('aria-label', 'Effacer le brouillon');
  }

  function updateSubmitAvailability(form) {
    const submitBtn = form?.querySelector('#add-form-submit');
    if (!submitBtn || isSubmitting) return;
    submitBtn.disabled = hasPendingPlaceFieldSuggestions(form);
  }

  function hideDraftNotice() {
    const notice = overlay.querySelector('#add-form-draft');
    const clearBtn = overlay.querySelector('#add-form-draft-clear');
    notice?.classList.remove('is-visible');
    notice?.setAttribute('aria-hidden', 'true');
    resetDraftClearButton(clearBtn);
  }

  function updateDraftNotice(form, categoryId) {
    const notice = overlay.querySelector('#add-form-draft');
    const clearBtn = overlay.querySelector('#add-form-draft-clear');
    if (!notice || !form) return;

    const category = getCategoryById(categoryId);
    const isDirty = formDraftBaseline
      ? !formSnapshotsEqual(captureFormSnapshot(form, category), formDraftBaseline)
      : false;

    notice.classList.toggle('is-visible', isDirty);
    notice.setAttribute('aria-hidden', isDirty ? 'false' : 'true');

    if (clearBtn?.dataset.confirming !== 'true') {
      resetDraftClearButton(clearBtn);
    }
  }

  function blurFormFields(form) {
    if (!form) return;
    form.querySelectorAll('input, textarea, select').forEach((el) => el.blur());
    if (document.activeElement?.closest('#add-form')) {
      document.activeElement.blur();
    }
  }

  function resetFormBaseline(form, category) {
    clearPlaceFieldSuggestions(form);
    form.reset();
    for (const field of category.fields) {
      if (field.type === 'priceRange') {
        populatePriceRangeFields(form, {});
        continue;
      }

      const el = form.elements[field.name];
      if (!el) continue;

      if (field.type === 'select') {
        setSelectFieldValue(form, field, '', '', category.id);
        continue;
      }

      if (field.type === 'multiSelect') {
        setMultiSelectFieldValues(form, field, category.id, []);
        continue;
      }

      if (field.type === 'address') {
        delete el.dataset.lat;
        delete el.dataset.lng;
      }
    }

    if (editingItem) {
      populateForm(form, category, editingItem);
    }

    if (category.id === 'activities') {
      const select = form.elements.disponibilite;
      if (select) select.dataset.scheduleMode = select.value || 'permanent';
      syncActivityScheduleFields(form, { purgeHidden: true });
    }

    formDraftBaseline = captureFormSnapshot(form, category);
  }

  function handleDraftClear(event, form, category) {
    const btn = event.currentTarget;

    if (btn.dataset.confirming !== 'true') {
      btn.dataset.confirming = 'true';
      btn.textContent = 'Confirmer ?';
      btn.classList.add('is-confirming');
      btn.setAttribute('aria-label', 'Confirmer la suppression du brouillon');
      clearTimeout(Number(btn.dataset.confirmTimer || 0));
      btn.dataset.confirmTimer = String(setTimeout(() => {
        resetDraftClearButton(btn);
      }, 3500));
      return;
    }

    clearFormDraft(category.id, editingItemId);
    resetFormBaseline(form, category);
    updateDraftNotice(form, category.id);
    form.querySelector('#add-form-error')?.classList.add('hidden');
  }

  function saveDraftNow() {
    if (!activeCategoryId || overlay.classList.contains('hidden')) return;
    const form = getActiveForm();
    const category = getCategoryById(activeCategoryId);
    if (!form || !category) return;

    const current = captureFormSnapshot(form, category);
    if (formDraftBaseline && formSnapshotsEqual(current, formDraftBaseline)) {
      clearFormDraft(activeCategoryId, editingItemId);
      updateDraftNotice(form, activeCategoryId);
      return;
    }

    saveFormDraft(activeCategoryId, editingItemId, form, category);
    updateDraftNotice(form, activeCategoryId);
  }

  function setupDraftAutosave(form, category) {
    draftCleanup?.();
    let timer = null;

    const scheduleSave = () => {
      if (activeCategoryId) {
        const liveForm = getActiveForm();
        if (liveForm) {
          updateDraftNotice(liveForm, activeCategoryId);
          updateSubmitAvailability(liveForm);
        }
      }
      clearTimeout(timer);
      timer = setTimeout(() => saveDraftNow(), 400);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        saveDraftNow();
        return;
      }
      ensureAuthSession().catch(() => {});
    };

    form.addEventListener('input', scheduleSave);
    form.addEventListener('change', scheduleSave);
    document.addEventListener('visibilitychange', onVisibilityChange);

    draftCleanup = () => {
      clearTimeout(timer);
      form.removeEventListener('input', scheduleSave);
      form.removeEventListener('change', scheduleSave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }

  async function persistFormData(category, data) {
    const sessionUser = await ensureAuthSession();
    if (editingItemId) {
      await updateItem(category.id, editingItemId, data);
      patchCachedItem(category.id, editingItemId, data);
      return editingItemId;
    }

    const id = await addItem(category.id, data, sessionUser.uid);
    const now = Timestamp.now();
    upsertCachedItem(category.id, {
      id,
      ...data,
      userId: sessionUser.uid,
      createdBy: sessionUser.uid,
      createdAt: now,
      updatedAt: now,
    });

    if (category.id === 'travels') {
      void setActiveTravelId(id);
    }

    return id;
  }

  async function bindForm(panel, categoryId, item = null) {
    const category = getCategoryById(categoryId);
    if (!category) return false;

    activeCategoryId = categoryId;
    const form = panel.querySelector('#add-form');
    if (!form) return false;

    if (category.fields.some((field) => field.optionsFrom === 'travels')) {
      await ensureItems('travels');
    }

    if (item) {
      populateForm(form, category, item);
      const submitBtn = form.querySelector('#add-form-submit');
      if (submitBtn) submitBtn.textContent = 'Mettre à jour';
    }

    addressCleanup = initFormAddressFields(form, category);
    placeNameCleanup = initFormPlaceNameFields(form, category);
    placeFieldSuggestionsCleanup = initPlaceFieldSuggestions(form, category);
    selectCleanup = await initFormSelectFields(form, category);
    multiSelectCleanup = await initFormMultiSelectFields(form, category);
    scheduleCleanup = categoryId === 'activities' ? initActivityScheduleFields(form) : null;

    // Baseline = état initial (vide ou item édité), avant restauration d'un brouillon.
    formDraftBaseline = captureFormSnapshot(form, category);

    const draft = loadFormDraft(categoryId, editingItemId, category);
    if (draft) {
      applyFormDraft(form, category, draft);
      for (const field of category.fields) {
        if (field.type === 'multiSelect') {
          const raw = draft.fields[field.name];
          const values = Array.isArray(raw)
            ? raw
            : (raw ? normalizeItemTags(raw) : []);
          setMultiSelectFieldValues(form, field, categoryId, values);
          continue;
        }
        if (field.type !== 'select') continue;
        const value = draft.fields[field.name];
        if (!value || value === PLACEHOLDER_OPTION_VALUE) continue;
        let displayLabel = getFieldDisplayLabel(categoryId, field.name, value);
        if (field.optionsFrom === 'travels') {
          displayLabel = findCachedItemById('travels', value)?.destination || displayLabel;
        }
        setSelectFieldValue(
          form,
          field,
          value,
          displayLabel,
          categoryId,
        );
      }

      restorePlaceFieldSuggestionsFromDraft(form, category, draft.meta);

      // Brouillon déjà présent : resynchroniser uniquement s'il diffère vraiment de la baseline.
      const current = captureFormSnapshot(form, category);
      if (!formSnapshotsEqual(current, formDraftBaseline)) {
        saveFormDraft(categoryId, editingItemId, form, category);
      } else {
        clearFormDraft(categoryId, editingItemId);
      }

      if (categoryId === 'activities') {
        const select = form.elements.disponibilite;
        if (select) select.dataset.scheduleMode = select.value || 'permanent';
        syncActivityScheduleFields(form, { purgeHidden: true });
      }
    }

    setupDraftAutosave(form, category);
    modalEl.dataset.theme = category.theme;
    updateDraftNotice(form, categoryId);
    updateSubmitAvailability(form);
    blurFormFields(form);

    return true;
  }

  function mountPicker({ stepReveal = false } = {}) {
    clearFieldCleanups();
    editingItemId = null;
    editingItem = null;
    activeCategoryId = null;
    formDraftBaseline = null;
    delete modalEl.dataset.theme;
    hideDraftNotice();
    setModalTitle('Nouvelle idée', false);

    const content = getContentEl() || bodyEl;
    if (content === bodyEl) {
      bodyEl.innerHTML = `<div class="add-modal-content">${renderCategoryPicker()}</div>`;
    } else {
      content.innerHTML = renderCategoryPicker();
    }
    staggerPickerItems(getContentEl(), { delayBase: stepReveal ? 16 : 90 });
  }

  async function mountForm(categoryId, item = null) {
    clearFieldCleanups();

    const category = getCategoryById(categoryId);
    if (!category) return false;

    setModalTitle(
      item ? `Modifier ${category.label.toLowerCase()}` : category.modalTitle,
      !item,
    );

    const content = getContentEl() || bodyEl;
    if (content === bodyEl) {
      bodyEl.innerHTML = `<div class="add-modal-content">${renderForm(category)}</div>`;
    } else {
      content.innerHTML = renderForm(category);
    }

    return await bindForm(getContentEl(), categoryId, item);
  }

  function prefersReducedMotion() {
    return typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  async function transitionContent(mountFn, { direction = 'forward', animate = true } = {}) {
    if (isBodyTransitioning) return false;

    const token = ++bodyTransitionToken;
    const content = getContentEl();
    const canAnimate = animate && content?.innerHTML.trim() && !prefersReducedMotion();
    const leavingClass = direction === 'back' ? 'is-leaving-back' : 'is-leaving';
    const enteringClass = direction === 'back' ? 'is-entering-back' : 'is-entering';

    isBodyTransitioning = true;

    if (canAnimate) {
      content.classList.remove('is-entering', 'is-entering-back');
      content.classList.add(leavingClass);
      titleEl.classList.add('is-swapping');
      // Swap tôt : on ne bloque pas sur la fin de leave ni sur bindForm.
      await new Promise((resolve) => window.setTimeout(resolve, STEP_LEAVE_MS));
      if (token !== bodyTransitionToken) {
        isBodyTransitioning = false;
        titleEl.classList.remove('is-swapping');
        return false;
      }
    }

    // Lance le mount : la partie sync (innerHTML + titre) s’exécute avant le 1er await.
    const mountPromise = Promise.resolve().then(() => mountFn());
    await Promise.resolve();
    if (token !== bodyTransitionToken) {
      isBodyTransitioning = false;
      titleEl.classList.remove('is-swapping');
      return false;
    }

    const nextContent = getContentEl();
    if (canAnimate && nextContent) {
      nextContent.classList.remove('is-leaving', 'is-leaving-back');
      nextContent.classList.add(enteringClass);
      titleEl.classList.remove('is-swapping');
      await nextFrame();
      if (token !== bodyTransitionToken) {
        isBodyTransitioning = false;
        return false;
      }
      nextContent.classList.remove('is-entering', 'is-entering-back');
    } else {
      titleEl.classList.remove('is-swapping');
    }

    const mounted = await mountPromise;
    if (token !== bodyTransitionToken) {
      isBodyTransitioning = false;
      return false;
    }

    isBodyTransitioning = false;
    return mounted !== false;
  }

  async function showPicker({ animate = true } = {}) {
    saveDraftNow();
    await transitionContent(() => mountPicker({ stepReveal: true }), { direction: 'back', animate });
  }

  async function showForm(categoryId, item = null, { animate = true, direction = 'forward' } = {}) {
    const ok = await transitionContent(
      () => mountForm(categoryId, item),
      { direction, animate: animate && !item },
    );

    if (!ok) return;

    blurFormFields(getActiveForm() || getContentEl()?.querySelector('#add-form'));
  }

  async function open(categoryId = null, item = null) {
    if (isBodyTransitioning) return;
    if (overlay.classList.contains('is-active') && !overlay.classList.contains('hidden')) return;

    const token = ++modalTransitionToken;
    bodyTransitionToken += 1;
    editingItemId = item?.id || null;
    editingItem = item || null;

    bodyEl.innerHTML = '<div class="add-modal-content"></div>';

    if (categoryId) {
      await mountForm(categoryId, item);
    } else {
      mountPicker();
    }

    overlay.classList.remove('hidden');
    await nextFrame();
    if (token !== modalTransitionToken) return;

    overlay.classList.add('is-active');
    document.body.classList.add('modal-open');
    lockScroll();
  }

  function openEdit(categoryId, item) {
    if (!item?.id) return;
    open(categoryId, item);
  }

  async function close({ preserveDraft = true } = {}) {
    if (isBodyTransitioning) return;
    if (overlay.classList.contains('hidden')) return;

    dragClose.reset();

    if (preserveDraft) saveDraftNow();

    const token = ++modalTransitionToken;
    bodyTransitionToken += 1;
    isBodyTransitioning = false;

    overlay.classList.remove('is-active');
    document.body.classList.remove('modal-open');
    unlockScroll();
    releaseStalePageScrollLock();

    await waitForTransition(overlay, MODAL_MS);
    if (token !== modalTransitionToken) return;

    clearFieldCleanups();
    delete modalEl.dataset.theme;
    hideDraftNotice();
    overlay.classList.add('hidden');
    activeCategoryId = null;
    editingItemId = null;
    editingItem = null;
    formDraftBaseline = null;
    bodyEl.innerHTML = '';
  }

  async function collectFormData(form, category) {
    const data = {};
    for (const field of category.fields) {
      if (field.type === 'priceRange') {
        Object.assign(data, collectPriceRangeData(form, { isEdit: Boolean(editingItemId) }));
        continue;
      }

      let value = '';

      if (field.type === 'select') {
        value = await getSelectFieldValue(form, field, category.id);
      } else if (field.type === 'multiSelect') {
        const values = getMultiSelectFieldValues(form, field);
        if (values.length) data[field.name] = values;
        else if (editingItemId || field.optional) data[field.name] = [];
        continue;
      } else {
        const el = form.elements[field.name];
        if (!el) continue;
        value = el.value.trim();

        if (field.type === 'address') {
          let lat = el.dataset.lat ? Number(el.dataset.lat) : null;
          let lng = el.dataset.lng ? Number(el.dataset.lng) : null;
          let suggestion = null;

          if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && value) {
            const results = await searchAddresses(value, { limit: 1 });
            suggestion = results[0] ?? null;
            if (Number.isFinite(suggestion?.lat) && Number.isFinite(suggestion?.lng)) {
              lat = suggestion.lat;
              lng = suggestion.lng;
            }
          }

          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            data.latitude = lat;
            data.longitude = lng;
          } else if (editingItemId) {
            data.latitude = null;
            data.longitude = null;
          }

          if (suggestion && field.fills) {
            for (const [fieldName, suggestionKey] of Object.entries(field.fills)) {
              const target = form.elements[fieldName];
              const existing = target?.value?.trim() || data[fieldName];
              if (!existing && suggestion[suggestionKey]) {
                data[fieldName] = suggestion[suggestionKey];
              }
            }
          }

          if (isPlaceLinkedAddressField(category, field)) {
            const mapsUrl = sanitizeHttpsUrl(el.dataset.mapsUrl || suggestion?.mapsUrl || '');
            if (mapsUrl) {
              data.lienMaps = mapsUrl;
            } else if (editingItemId) {
              data.lienMaps = null;
            }
          }

          if (value) {
            data[field.name] = value;
          } else if (editingItemId) {
            data[field.name] = null;
          }
          continue;
        }
      }

      if (field.type === 'url') {
        value = sanitizeHttpsUrl(value);
      }

      if (field.type === 'select' && field.optionsFrom) {
        if (value && value !== ADD_OPTION_VALUE && value !== PLACEHOLDER_OPTION_VALUE) {
          data[field.name] = value;
        } else if (editingItemId) {
          data[field.name] = null;
        }
        continue;
      }

      if (field.type === 'select') {
        if (value && value !== ADD_OPTION_VALUE && value !== PLACEHOLDER_OPTION_VALUE) {
          data[field.name] = value;
        } else if (editingItemId || field.optional) {
          data[field.name] = null;
        }
        continue;
      }

      if (value && value !== ADD_OPTION_VALUE) {
        data[field.name] = isMoneyField(field.name) ? formatPrice(value) : value;
      }
    }
    return data;
  }

  function getRequiredField(category) {
    return category.fields.find((f) => f.required);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || !activeCategoryId) return;

    const category = getCategoryById(activeCategoryId);
    if (!category) return;

    const form = event.target;
    const errorEl = form.querySelector('#add-form-error');
    const submitBtn = form.querySelector('#add-form-submit');
    const requiredField = getRequiredField(category);

    errorEl.classList.add('hidden');

    if (hasPendingPlaceFieldSuggestions(form)) {
      errorEl.textContent = 'Acceptez ou ignorez les suggestions avant d\'enregistrer.';
      errorEl.classList.remove('hidden');
      getFirstPendingPlaceFieldSuggestion(form)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }

    if (requiredField) {
      const requiredValue = requiredField.type === 'select'
        ? await getSelectFieldValue(form, requiredField, category.id)
        : form.elements[requiredField.name]?.value.trim();

      if (!requiredValue || requiredValue === ADD_OPTION_VALUE) {
        errorEl.textContent = `Le champ « ${requiredField.label} » est requis.`;
        errorEl.classList.remove('hidden');
        form.elements[requiredField.name]?.focus();
        return;
      }
    }

    for (const field of category.fields) {
      if (field.type === 'priceRange') {
        const priceError = validatePriceRangeFields(form);
        if (priceError) {
          errorEl.textContent = priceError;
          errorEl.classList.remove('hidden');
          form.elements.prixMin?.focus();
          return;
        }
        continue;
      }

      if (field.type === 'url') {
        const rawUrl = form.elements[field.name]?.value.trim();
        if (rawUrl && !sanitizeHttpsUrl(rawUrl)) {
          errorEl.textContent = `Le champ « ${field.label} » doit être un lien https:// valide.`;
          errorEl.classList.remove('hidden');
          form.elements[field.name]?.focus();
          return;
        }
        continue;
      }

      if (field.type !== 'select' || !field.allowCustom) continue;
      if (field.optional) continue;
      const value = await getSelectFieldValue(form, field, category.id);
      if (!value || value === ADD_OPTION_VALUE || value === PLACEHOLDER_OPTION_VALUE) {
        errorEl.textContent = `Choisissez un « ${field.label} ».`;
        errorEl.classList.remove('hidden');
        form.elements[field.name]?.focus();
        return;
      }
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enregistrement…';

    try {
      const data = await collectFormData(form, category);

      try {
        await persistFormData(category, data);
      } catch (err) {
        if (!isRetryableFirestoreError(err)) throw err;
        await ensureAuthSession();
        await persistFormData(category, data);
      }

      clearFormDraft(activeCategoryId, editingItemId);
      draftCleanup?.();
      draftCleanup = null;
      const itemId = editingItemId;
      await close({ preserveDraft: false });
      if (itemId) onUpdated?.(category.id, itemId);
      else onAdded?.(category.id);
    } catch (err) {
      devError(editingItemId ? 'updateItem:' : 'addItem:', err);
      saveDraftNow();
      errorEl.textContent = getSubmitErrorMessage(err);
      errorEl.classList.remove('hidden');
    } finally {
      isSubmitting = false;
      submitBtn.textContent = editingItemId ? 'Mettre à jour' : 'Enregistrer';
      updateSubmitAvailability(form);
    }
  }

  fab.addEventListener('click', () => {
    fab.classList.add('is-pressed');
    void open();
    window.setTimeout(() => fab.classList.remove('is-pressed'), 400);
  }, { signal });

  closeBtn.addEventListener('click', close, { signal });
  backBtn.addEventListener('click', () => {
    if (isBodyTransitioning) return;
    backBtn.classList.add('is-pressed');
    void showPicker({ animate: true }).finally(() => {
      backBtn.classList.remove('is-pressed');
    });
  }, { signal });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  }, { signal });

  bodyEl.addEventListener('click', (event) => {
    if (isBodyTransitioning) return;
    const pickerBtn = event.target.closest('[data-category]');
    if (!pickerBtn?.closest('#add-picker')) return;

    const categoryId = pickerBtn.dataset.category;
    if (!categoryId) return;

    pickerBtn.classList.add('is-selected');
    void showForm(categoryId, null, { animate: true, direction: 'forward' });
  }, { signal });

  bodyEl.addEventListener('submit', (event) => {
    if (event.target.id === 'add-form') handleSubmit(event);
  }, { signal });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.classList.contains('hidden')) {
      close();
    }
  }, { signal });

  const dragClose = wireModalDragClose(overlay, close);

  function destroy() {
    abort.abort();
    dragClose.destroy();
    modalTransitionToken += 1;
    bodyTransitionToken += 1;
    isBodyTransitioning = false;
    isSubmitting = false;
    clearFieldCleanups();
    overlay.classList.remove('is-active');
    overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    unlockScroll();
    bodyEl.innerHTML = '';
    activeCategoryId = null;
    editingItemId = null;
    editingItem = null;
    fab.remove();
    overlay.remove();
  }

  return { open, close, openEdit, destroy };
}
