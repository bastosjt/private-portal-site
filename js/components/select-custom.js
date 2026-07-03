import {
  ADD_OPTION_VALUE,
  addCustomOption,
  getCustomOptions,
  makeUniqueValue,
  slugifyLabel,
} from '../services/custom-options.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getStorageKey(categoryId, fieldName) {
  return `${categoryId}.${fieldName}`;
}

function buildOptionsHtml(field, categoryId) {
  const custom = field.allowCustom
    ? getCustomOptions(getStorageKey(categoryId, field.name))
    : [];

  const base = field.options || [];
  const all = [...base, ...custom];

  const options = all.map((opt) => {
    const selected = opt.value === field.default ? ' selected' : '';
    return `<option value="${escapeHtml(opt.value)}"${selected}>${escapeHtml(opt.label)}</option>`;
  });

  if (field.allowCustom) {
    options.push(`<option value="${ADD_OPTION_VALUE}">➕ Ajouter…</option>`);
  }

  return options.join('');
}

export function renderSelectField(field, categoryId) {
  const id = `add-field-${field.name}`;
  const required = field.required ? ' required' : '';
  const storageKey = getStorageKey(categoryId, field.name);

  const addBlock = field.allowCustom ? `
    <div class="form-select-add hidden" id="${id}-add">
      <div class="form-input-wrap">
        <input
          type="text"
          id="${id}-add-input"
          class="form-input form-select-add-input"
          placeholder="Nouveau type…"
          maxlength="40"
          autocomplete="off"
        >
      </div>
      <button type="button" class="form-select-add-btn" data-select-add="${id}">
        Ajouter à la liste
      </button>
    </div>
  ` : '';

  return `
    <div class="form-field form-field--select" data-select-field="${field.name}">
      <label for="${id}">
        <span class="form-field-label">${escapeHtml(field.label)}</span>
        <div class="form-select-wrap">
          <select
            id="${id}"
            name="${field.name}"
            class="form-select"
            data-storage-key="${storageKey}"
            ${field.allowCustom ? 'data-allow-custom="true"' : ''}${required}
          >${buildOptionsHtml(field, categoryId)}</select>
        </div>
      </label>
      ${addBlock}
    </div>
  `;
}

function getUsedValues(select) {
  return new Set(Array.from(select.options).map((opt) => opt.value));
}

function insertOption(select, option, beforeAdd = true) {
  const addOption = select.querySelector(`option[value="${ADD_OPTION_VALUE}"]`);
  const el = document.createElement('option');
  el.value = option.value;
  el.textContent = option.label;

  if (beforeAdd && addOption) {
    select.insertBefore(el, addOption);
  } else {
    select.appendChild(el);
  }

  select.value = option.value;
}

function initCustomSelect(select) {
  const storageKey = select.dataset.storageKey;
  const addPanel = document.getElementById(`${select.id}-add`);
  const addInput = document.getElementById(`${select.id}-add-input`);
  const addBtn = document.querySelector(`[data-select-add="${select.id}"]`);

  if (!storageKey || !addPanel || !addInput || !addBtn) return () => {};

  function toggleAddPanel(show) {
    addPanel.classList.toggle('hidden', !show);
    if (show) {
      addInput.value = '';
      requestAnimationFrame(() => addInput.focus());
    }
  }

  function onSelectChange() {
    toggleAddPanel(select.value === ADD_OPTION_VALUE);
  }

  function commitCustomOption() {
    const label = addInput.value.trim();
    if (!label) {
      addInput.focus();
      return;
    }

    const used = getUsedValues(select);
    const value = makeUniqueValue(slugifyLabel(label), used);
    const option = addCustomOption(storageKey, { value, label });

    insertOption(select, option);
    toggleAddPanel(false);
  }

  select.addEventListener('change', onSelectChange);
  addBtn.addEventListener('click', commitCustomOption);
  addInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitCustomOption();
    }
  });

  return () => {
    select.removeEventListener('change', onSelectChange);
  };
}

export function initFormSelectFields(form, category) {
  const cleanups = [];

  for (const field of category.fields) {
    if (field.type !== 'select' || !field.allowCustom) continue;

    const select = form.elements[field.name];
    if (!select) continue;

    cleanups.push(initCustomSelect(select));
  }

  return () => cleanups.forEach((fn) => fn());
}

export function ensureSelectOption(select, value, label) {
  if (!select || !value) return;
  if (select.querySelector(`option[value="${CSS.escape(value)}"]`)) return;

  const addOption = select.querySelector(`option[value="${ADD_OPTION_VALUE}"]`);
  const el = document.createElement('option');
  el.value = value;
  el.textContent = label || value.replace(/_/g, ' ');

  if (addOption) {
    select.insertBefore(el, addOption);
  } else {
    select.appendChild(el);
  }
}

export function setSelectFieldValue(form, field, value, label) {
  const select = form.elements[field.name];
  if (!select || !value) return;
  ensureSelectOption(select, value, label);
  select.value = value;
}

export function getSelectFieldValue(form, field) {
  const select = form.elements[field.name];
  if (!select) return '';

  if (field.allowCustom && select.value === ADD_OPTION_VALUE) {
    const addInput = document.getElementById(`${select.id}-add-input`);
    const customLabel = addInput?.value.trim();
    if (customLabel) {
      const storageKey = select.dataset.storageKey;
      const used = getUsedValues(select);
      const value = makeUniqueValue(slugifyLabel(customLabel), used);
      addCustomOption(storageKey, { value, label: customLabel });
      insertOption(select, { value, label: customLabel });
      return value;
    }
    return ADD_OPTION_VALUE;
  }

  return select.value.trim();
}

export { ADD_OPTION_VALUE };
