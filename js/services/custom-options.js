import { formatOptionLabel } from '../utils/format.js';

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
  if (!Array.isArray(all[storageKey])) return [];
  return all[storageKey].map((opt) => ({
    ...opt,
    label: formatOptionLabel(opt.label),
  }));
}

export function addCustomOption(storageKey, option) {
  const all = readAll();
  const raw = Array.isArray(all[storageKey]) ? all[storageKey] : [];
  const normalized = {
    ...option,
    label: formatOptionLabel(option.label),
  };
  const exists = raw.some((item) => item.value === normalized.value);
  if (exists) return normalized;

  all[storageKey] = [...raw, normalized];
  writeAll(all);
  return normalized;
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
