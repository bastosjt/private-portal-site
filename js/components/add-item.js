import { HOME_CATEGORIES, getCategoryById } from '../config.js';
import { addItem, updateItem } from '../api/firestore.js';
import { sidebarIcon } from './sidebar.js';
import { initFormAddressFields } from './address-autocomplete.js';
import { waitForTransition, nextFrame } from '../utils/motion.js';
import {
  initFormSelectFields,
  getSelectFieldValue,
  setSelectFieldValue,
  renderSelectField,
  ADD_OPTION_VALUE,
} from './select-custom.js';
import { getCustomOptions } from '../services/custom-options.js';
import { formatPrice, isMoneyField } from '../utils/format.js';

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
  return `
    <label class="form-field" for="${id}">
      <span class="form-field-label">${escapeHtml(field.label)}</span>
      <div class="form-input-wrap">
        <input type="${inputType}" id="${id}" name="${field.name}" class="form-input"${placeholder}${required}>
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
      ${category.fields.map((field) => renderField(field, category.id)).join('')}
      <p class="add-form-error hidden" id="add-form-error" role="alert"></p>
      <button type="submit" class="add-form-submit" id="add-form-submit">
        Enregistrer
      </button>
    </form>
  `;
}

export function initAddItem({ user, onAdded, onUpdated } = {}) {
  let activeCategoryId = null;
  let editingItemId = null;
  let isSubmitting = false;
  let addressCleanup = null;
  let selectCleanup = null;
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
    if (!value) return '';
    const category = getCategoryById(categoryId);
    const field = category?.fields.find((f) => f.name === fieldName);
    const base = field?.options?.find((opt) => opt.value === value);
    if (base) return base.label;
    const custom = getCustomOptions(`${categoryId}.${fieldName}`).find((opt) => opt.value === value);
    return custom?.label || value.replace(/_/g, ' ');
  }

  function populateForm(form, category, item) {
    for (const field of category.fields) {
      const value = item[field.name];
      if (value == null || value === '') continue;

      if (field.type === 'select') {
        setSelectFieldValue(
          form,
          field,
          value,
          getFieldDisplayLabel(category.id, field.name, value),
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
  }

  function bindForm(panel, categoryId, item = null) {
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
    selectCleanup = initFormSelectFields(form, category);
    return true;
  }

  function mountPicker() {
    clearFieldCleanups();
    editingItemId = null;
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

  function mountForm(categoryId, item = null) {
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

    return bindForm(getContentEl(), categoryId, item);
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

    mountFn();

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
    await transitionContent(mountPicker, { direction: 'back', animate });
  }

  async function showForm(categoryId, item = null, { animate = true, direction = 'forward' } = {}) {
    const ok = await transitionContent(
      () => mountForm(categoryId, item),
      { direction, animate: animate && !item },
    );

    if (!ok) return;

    const firstInput = getContentEl()?.querySelector('input, textarea, select');
    if (firstInput) {
      requestAnimationFrame(() => firstInput.focus());
    }
  }

  async function open(categoryId = null, item = null) {
    if (isBodyTransitioning) return;

    const token = ++modalTransitionToken;
    bodyTransitionToken += 1;
    editingItemId = item?.id || null;

    bodyEl.innerHTML = '<div class="add-modal-content"></div>';

    if (categoryId) {
      mountForm(categoryId, item);
    } else {
      mountPicker();
    }

    overlay.classList.remove('hidden');
    await nextFrame();
    if (token !== modalTransitionToken) return;

    overlay.classList.add('is-active');
    document.body.classList.add('modal-open');
  }

  function openEdit(categoryId, item) {
    if (!item?.id) return;
    open(categoryId, item);
  }

  async function close() {
    if (isBodyTransitioning) return;

    const token = ++modalTransitionToken;
    bodyTransitionToken += 1;
    isBodyTransitioning = false;

    overlay.classList.remove('is-active');
    document.body.classList.remove('modal-open');

    await waitForTransition(overlay, MODAL_MS);
    if (token !== modalTransitionToken) return;

    clearFieldCleanups();
    overlay.classList.add('hidden');
    activeCategoryId = null;
    editingItemId = null;
    bodyEl.innerHTML = '';
  }

  function collectFormData(form, category) {
    const data = {};
    for (const field of category.fields) {
      let value = '';

      if (field.type === 'select') {
        value = getSelectFieldValue(form, field);
      } else {
        const el = form.elements[field.name];
        if (!el) continue;
        value = el.value.trim();

        if (field.type === 'address' && el.dataset.lat && el.dataset.lng) {
          data.latitude = Number(el.dataset.lat);
          data.longitude = Number(el.dataset.lng);
        }
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
        ? getSelectFieldValue(form, requiredField)
        : form.elements[requiredField.name]?.value.trim();

      if (!requiredValue || requiredValue === ADD_OPTION_VALUE) {
        errorEl.textContent = `Le champ « ${requiredField.label} » est requis.`;
        errorEl.classList.remove('hidden');
        form.elements[requiredField.name]?.focus();
        return;
      }
    }

    for (const field of category.fields) {
      if (field.type !== 'select' || !field.allowCustom) continue;
      const value = getSelectFieldValue(form, field);
      if (value === ADD_OPTION_VALUE) {
        errorEl.textContent = `Choisissez ou ajoutez un « ${field.label} ».`;
        errorEl.classList.remove('hidden');
        form.elements[field.name]?.focus();
        return;
      }
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enregistrement…';

    try {
      const data = collectFormData(form, category);
      if (editingItemId) {
        await updateItem(category.id, editingItemId, data);
        const itemId = editingItemId;
        close();
        onUpdated?.(category.id, itemId);
      } else {
        await addItem(category.id, data, user.uid);
        close();
        onAdded?.(category.id);
      }
    } catch (err) {
      console.error(editingItemId ? 'updateItem:' : 'addItem:', err);
      errorEl.textContent = 'Impossible d’enregistrer. Réessayez.';
      errorEl.classList.remove('hidden');
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enregistrer';
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
