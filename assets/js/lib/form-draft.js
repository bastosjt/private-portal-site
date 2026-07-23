const STORAGE_PREFIX = 'portal-form-draft';
const ADD_OPTION_VALUE = '__add__';

function getStorageKey(categoryId, itemId = null) {
  return `${STORAGE_PREFIX}:${categoryId}:${itemId || 'new'}`;
}

function isMeaningfulFieldValue(field, value) {
  if (field.type === 'priceRange') {
    const min = String(value?.min ?? value?.prixMin ?? '').trim();
    const max = String(value?.max ?? value?.prixMax ?? '').trim();
    return Boolean(min || max);
  }

  const str = String(value ?? '').trim();
  if (!str) return false;

  if (field.type === 'select') {
    if (str === ADD_OPTION_VALUE) return false;
    if (field.default && str === field.default) return false;
  }

  return true;
}

function snapshotHasMeaningfulContent(fields, category) {
  if (!fields || !category) return false;

  return category.fields.some((field) => {
    if (field.type === 'priceRange') {
      return isMeaningfulFieldValue(field, {
        min: fields.prixMin,
        max: fields.prixMax,
      });
    }

    return isMeaningfulFieldValue(field, fields[field.name]);
  });
}

/** Capture brute des champs (+ meta adresse) sans filtre « contenu utile ». */
export function captureFormSnapshot(form, category) {
  if (!form || !category) return null;

  const fields = {};
  const meta = {};

  for (const field of category.fields) {
    if (field.type === 'priceRange') {
      fields.prixMin = form.elements.prixMin?.value ?? '';
      fields.prixMax = form.elements.prixMax?.value ?? '';
      continue;
    }

    const el = form.elements[field.name];
    if (!el) continue;

    fields[field.name] = el.value ?? '';

    if (field.type === 'address') {
      if (el.dataset.lat) meta[`${field.name}Lat`] = el.dataset.lat;
      if (el.dataset.lng) meta[`${field.name}Lng`] = el.dataset.lng;
    }
  }

  return { fields, meta };
}

function normalizeSnapshotValue(value) {
  return String(value ?? '').trim();
}

export function formSnapshotsEqual(a, b) {
  if (!a || !b) return a === b;

  const keys = new Set([
    ...Object.keys(a.fields || {}),
    ...Object.keys(b.fields || {}),
    ...Object.keys(a.meta || {}),
    ...Object.keys(b.meta || {}),
  ]);

  for (const key of keys) {
    const inFields = Object.prototype.hasOwnProperty.call(a.fields || {}, key)
      || Object.prototype.hasOwnProperty.call(b.fields || {}, key);
    if (inFields) {
      if (normalizeSnapshotValue(a.fields?.[key]) !== normalizeSnapshotValue(b.fields?.[key])) {
        return false;
      }
      continue;
    }

    if (normalizeSnapshotValue(a.meta?.[key]) !== normalizeSnapshotValue(b.meta?.[key])) {
      return false;
    }
  }

  return true;
}

export function snapshotFormFields(form, category) {
  const raw = captureFormSnapshot(form, category);
  if (!raw || !snapshotHasMeaningfulContent(raw.fields, category)) return null;

  return {
    ...raw,
    savedAt: Date.now(),
  };
}

export function saveFormDraft(categoryId, itemId, form, category) {
  const snapshot = snapshotFormFields(form, category);
  const key = getStorageKey(categoryId, itemId);

  if (!snapshot) {
    localStorage.removeItem(key);
    return false;
  }

  localStorage.setItem(key, JSON.stringify(snapshot));
  return true;
}

export function loadFormDraft(categoryId, itemId, category = null) {
  try {
    const raw = localStorage.getItem(getStorageKey(categoryId, itemId));
    if (!raw) return null;

    const draft = JSON.parse(raw);
    if (!draft?.fields) return null;

    if (category && !snapshotHasMeaningfulContent(draft.fields, category)) {
      clearFormDraft(categoryId, itemId);
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

export function clearFormDraft(categoryId, itemId) {
  localStorage.removeItem(getStorageKey(categoryId, itemId));
}

export function hasFormDraft(categoryId, itemId, category = null) {
  return loadFormDraft(categoryId, itemId, category) != null;
}

export function applyFormDraft(form, category, draft) {
  if (!form || !category || !draft?.fields) return false;

  for (const field of category.fields) {
    if (field.type === 'priceRange') {
      if (form.elements.prixMin && draft.fields.prixMin != null) {
        form.elements.prixMin.value = draft.fields.prixMin;
      }
      if (form.elements.prixMax && draft.fields.prixMax != null) {
        form.elements.prixMax.value = draft.fields.prixMax;
      }
      continue;
    }

    const value = draft.fields[field.name];
    if (value == null || value === '') continue;

    const el = form.elements[field.name];
    if (!el) continue;

    el.value = value;

    if (field.type === 'address') {
      const lat = draft.meta?.[`${field.name}Lat`];
      const lng = draft.meta?.[`${field.name}Lng`];
      if (lat && lng) {
        el.dataset.lat = lat;
        el.dataset.lng = lng;
      } else {
        delete el.dataset.lat;
        delete el.dataset.lng;
      }
    }
  }

  return true;
}
