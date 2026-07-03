const STORAGE_KEY = 'portal-custom-options';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getCustomOptions(storageKey) {
  const all = readAll();
  return Array.isArray(all[storageKey]) ? all[storageKey] : [];
}

export function addCustomOption(storageKey, option) {
  const all = readAll();
  const current = getCustomOptions(storageKey);
  const exists = current.some((item) => item.value === option.value);
  if (exists) return option;

  all[storageKey] = [...current, option];
  writeAll(all);
  return option;
}

export function slugifyLabel(label) {
  const base = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return base || 'personnalise';
}

export function makeUniqueValue(base, usedValues) {
  let value = base;
  let index = 2;
  while (usedValues.has(value)) {
    value = `${base}_${index}`;
    index += 1;
  }
  return value;
}

export const ADD_OPTION_VALUE = '__add__';
