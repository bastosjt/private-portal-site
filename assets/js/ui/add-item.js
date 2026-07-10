import { HOME_CATEGORIES, getCategoryById } from '../config.js';
import { addItem, updateItem } from '../firebase/firestore.js';
import { sidebarIcon } from './sidebar.js';
import { initFormAddressFields } from './address-autocomplete.js';
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
  clearFormDraft,
  loadFormDraft,
  saveFormDraft,
} from '../lib/form-draft.js';
import {
  ensureAuthSession,
  getSubmitErrorMessage,
  isRetryableFirestoreError,
} from '../auth/ensure-auth.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';
import { sanitizeHttpsUrl } from '../lib/safe-url.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
  return `
    <label class="form-field" for="${id}">
      <span class="form-field-label">${escapeHtml(field.label)}</span>
      <div class="form-input-wrap">
        <input type="${inputType}" id="${id}" name="${field.name}" class="form-input"${placeholder}${required}${numericAttrs}>
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
      <div class="add-form-draft hidden" id="add-form-draft" role="status" aria-live="polite">
        <span class="add-form-draft-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
            <path d="M10 12h4"/><path d="M10 16h4"/>
          </svg>
        </span>
        <div class="add-form-draft-content">
          <p class="add-form-draft-title">Brouillon enregistré</p>
          <p class="add-form-draft-meta" id="add-form-draft-meta">Sauvegardé localement sur cet appareil</p>
        </div>
        <button type="button" class="add-form-draft-clear" id="add-form-draft-clear" aria-label="Effacer le brouillon">
          Effacer
        </button>
      </div>
      ${category.fields.map((field) => renderField(field, category.id)).join('')}
      <p class="add-form-error hidden" id="add-form-error" role="alert"></p>
      <button type="submit" class="add-form-submit" id="add-form-submit">
        Enregistrer
      </button>
    </form>
  `;
}

export function initAddItem({ onAdded, onUpdated } = {}) {
  let activeCategoryId = null;
  let editingItemId = null;
  let editingItem = null;
  let isSubmitting = false;
  let addressCleanup = null;
  let selectCleanup = null;
  let draftCleanup = null;
  let bodyTransitionToken = 0;
  let modalTransitionToken = 0;
  let isBodyTransitioning = false;

  const MODAL_MS = 360;
  const STEP_MS = 260;

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
      <div class="add-modal-head">
        <button type="button" class="add-modal-back hidden" id="add-modal-back" aria-label="Retour">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <h2 class="add-modal-title" id="add-modal-title">Nouvelle idée</h2>
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
        setSelectFieldValue(
          form,
          field,
          value,
          getFieldDisplayLabel(category.id, field.name, value),
          category.id,
        );
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

  function staggerPickerItems(root) {
    root?.querySelectorAll('.add-picker-item').forEach((item, index) => {
      item.style.setProperty('--picker-delay', `${index * 35 + 50}ms`);
    });
  }

  function clearFieldCleanups() {
    addressCleanup?.();
    addressCleanup = null;
    selectCleanup?.();
    selectCleanup = null;
    draftCleanup?.();
    draftCleanup = null;
  }

  function getActiveForm() {
    return getContentEl()?.querySelector('#add-form') || null;
  }

  function formatDraftSavedAt(savedAt) {
    if (!savedAt) return 'Sauvegardé localement sur cet appareil';

    const diffMs = Date.now() - savedAt;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Sauvegardé à l\'instant';
    if (mins < 60) return `Sauvegardé il y a ${mins} min`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Sauvegardé il y a ${hours} h`;

    return 'Sauvegardé localement sur cet appareil';
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

  function updateDraftNotice(form, categoryId) {
    const notice = form.querySelector('#add-form-draft');
    const meta = form.querySelector('#add-form-draft-meta');
    const clearBtn = form.querySelector('#add-form-draft-clear');
    if (!notice) return;

    const category = getCategoryById(categoryId);
    const draft = loadFormDraft(categoryId, editingItemId, category);
    notice.classList.toggle('hidden', !draft);

    if (draft && meta) {
      meta.textContent = formatDraftSavedAt(draft.savedAt);
    }

    resetDraftClearButton(clearBtn);
  }

  function blurFormFields(form) {
    if (!form) return;
    form.querySelectorAll('input, textarea, select').forEach((el) => el.blur());
    if (document.activeElement?.closest('#add-form')) {
      document.activeElement.blur();
    }
  }

  function resetFormBaseline(form, category) {
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

      if (field.type === 'address') {
        delete el.dataset.lat;
        delete el.dataset.lng;
      }
    }

    if (editingItem) {
      populateForm(form, category, editingItem);
    }
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
    saveFormDraft(activeCategoryId, editingItemId, form, category);
    updateDraftNotice(form, activeCategoryId);
  }

  function setupDraftAutosave(form, category) {
    draftCleanup?.();
    let timer = null;

    const scheduleSave = () => {
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
      return editingItemId;
    }
    return addItem(category.id, data, sessionUser.uid);
  }

  async function bindForm(panel, categoryId, item = null) {
    const category = getCategoryById(categoryId);
    if (!category) return false;

    activeCategoryId = categoryId;
    const form = panel.querySelector('#add-form');
    if (!form) return false;

    if (item) {
      populateForm(form, category, item);
      const submitBtn = form.querySelector('#add-form-submit');
      if (submitBtn) submitBtn.textContent = 'Mettre à jour';
    }

    addressCleanup = initFormAddressFields(form, category);
    selectCleanup = await initFormSelectFields(form, category);

    const draft = loadFormDraft(categoryId, editingItemId, category);
    if (draft) {
      applyFormDraft(form, category, draft);
      for (const field of category.fields) {
        if (field.type !== 'select') continue;
        const value = draft.fields[field.name];
        if (!value || value === PLACEHOLDER_OPTION_VALUE) continue;
        setSelectFieldValue(
          form,
          field,
          value,
          getFieldDisplayLabel(categoryId, field.name, value),
          categoryId,
        );
      }
    }

    saveFormDraft(categoryId, editingItemId, form, category);
    setupDraftAutosave(form, category);
    updateDraftNotice(form, categoryId);
    blurFormFields(form);

    const draftClearBtn = form.querySelector('#add-form-draft-clear');
    draftClearBtn?.addEventListener('click', (event) => handleDraftClear(event, form, category));

    return true;
  }

  function mountPicker() {
    clearFieldCleanups();
    editingItemId = null;
    editingItem = null;
    activeCategoryId = null;
    setModalTitle('Nouvelle idée', false);

    const content = getContentEl() || bodyEl;
    if (content === bodyEl) {
      bodyEl.innerHTML = `<div class="add-modal-content">${renderCategoryPicker()}</div>`;
    } else {
      content.innerHTML = renderCategoryPicker();
    }
    staggerPickerItems(getContentEl());
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

  async function transitionContent(mountFn, { direction = 'forward', animate = true } = {}) {
    if (isBodyTransitioning) return false;

    const token = ++bodyTransitionToken;
    const content = getContentEl();
    const canAnimate = animate && content?.innerHTML.trim();

    if (canAnimate) {
      isBodyTransitioning = true;
      content.classList.remove('is-entering', 'is-entering-back');
      content.classList.add(direction === 'back' ? 'is-leaving-back' : 'is-leaving');
      await waitForTransition(content, STEP_MS);
      if (token !== bodyTransitionToken) {
        isBodyTransitioning = false;
        return false;
      }
      content.classList.remove('is-leaving', 'is-leaving-back');
    }

    await mountFn();

    if (token !== bodyTransitionToken) {
      isBodyTransitioning = false;
      return false;
    }

    const nextContent = getContentEl();
    if (canAnimate && nextContent) {
      nextContent.classList.add(direction === 'back' ? 'is-entering-back' : 'is-entering');
      await nextFrame();
      nextContent.classList.remove('is-entering', 'is-entering-back');
    }

    isBodyTransitioning = false;
    return true;
  }

  async function showPicker({ animate = true } = {}) {
    saveDraftNow();
    await transitionContent(mountPicker, { direction: 'back', animate });
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

  async function close() {
    if (isBodyTransitioning) return;

    saveDraftNow();

    const token = ++modalTransitionToken;
    bodyTransitionToken += 1;
    isBodyTransitioning = false;

    overlay.classList.remove('is-active');
    document.body.classList.remove('modal-open');
    unlockScroll();

    await waitForTransition(overlay, MODAL_MS);
    if (token !== modalTransitionToken) return;

    clearFieldCleanups();
    overlay.classList.add('hidden');
    activeCategoryId = null;
    editingItemId = null;
    editingItem = null;
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
      } else {
        const el = form.elements[field.name];
        if (!el) continue;
        value = el.value.trim();

        if (field.type === 'address' && el.dataset.lat && el.dataset.lng) {
          data.latitude = Number(el.dataset.lat);
          data.longitude = Number(el.dataset.lng);
        }
      }

      if (field.type === 'url') {
        value = sanitizeHttpsUrl(value);
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
      saveDraftNow();

      try {
        await persistFormData(category, data);
      } catch (err) {
        if (!isRetryableFirestoreError(err)) throw err;
        await ensureAuthSession();
        await persistFormData(category, data);
      }

      clearFormDraft(activeCategoryId, editingItemId);
      const itemId = editingItemId;
      close();
      if (itemId) onUpdated?.(category.id, itemId);
      else onAdded?.(category.id);
    } catch (err) {
      console.error(editingItemId ? 'updateItem:' : 'addItem:', err);
      saveDraftNow();
      errorEl.textContent = getSubmitErrorMessage(err);
      errorEl.classList.remove('hidden');
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = editingItemId ? 'Mettre à jour' : 'Enregistrer';
    }
  }

  fab.addEventListener('click', () => open());

  closeBtn.addEventListener('click', close);
  backBtn.addEventListener('click', () => {
    if (isBodyTransitioning) return;
    showPicker({ animate: true });
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  bodyEl.addEventListener('click', (event) => {
    if (isBodyTransitioning) return;
    const pickerBtn = event.target.closest('[data-category]');
    if (pickerBtn?.closest('#add-picker')) {
      showForm(pickerBtn.dataset.category, null, { animate: true, direction: 'forward' });
    }
  });

  bodyEl.addEventListener('submit', (event) => {
    if (event.target.id === 'add-form') handleSubmit(event);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.classList.contains('hidden')) {
      close();
    }
  });

  return { open, close, openEdit };
}
