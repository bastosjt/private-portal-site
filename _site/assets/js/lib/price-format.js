const MONEY_FIELDS = new Set(['prix', 'budget', 'prixMin', 'prixMax']);

export function isMoneyField(fieldName) {
  return MONEY_FIELDS.has(fieldName);
}

export function parseMoneyInput(value) {
  if (value == null || String(value).trim() === '') return null;
  const num = parseFloat(String(value).replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(num) && num >= 0 ? num : null;
}

export function parseLegacyPriceString(value) {
  const str = String(value).trim();
  if (!str) return { prixMin: null, prixMax: null };

  const rangeMatch = str.match(
    /^([\d.,]+)\s*(?:€|eur)?\s*(?:[-–—]|à|\/)\s*([\d.,]+)\s*(?:€|eur)?$/i,
  ) || str.match(/^entre\s+([\d.,]+)\s*(?:€|eur)?\s+et\s+([\d.,]+)/i);

  if (rangeMatch) {
    const a = parseMoneyInput(rangeMatch[1]);
    const b = parseMoneyInput(rangeMatch[2]);
    if (a != null && b != null) {
      return { prixMin: Math.min(a, b), prixMax: Math.max(a, b) };
    }
  }

  const single = parseMoneyInput(str);
  if (single == null && /^gratuit$/i.test(str)) {
    return { prixMin: 0, prixMax: null };
  }
  return { prixMin: single, prixMax: null };
}

export function normalizeItemPrice(item) {
  if (!item) return { prixMin: null, prixMax: null };

  const rawMin = item.prixMin;
  const rawMax = item.prixMax;
  const hasStructured = (rawMin != null && rawMin !== '') || (rawMax != null && rawMax !== '');

  if (hasStructured) {
    const prixMin = rawMin != null && rawMin !== '' ? Number(rawMin) : null;
    const prixMax = rawMax != null && rawMax !== '' ? Number(rawMax) : null;
    const min = Number.isFinite(prixMin) ? prixMin : null;
    const max = Number.isFinite(prixMax) ? prixMax : null;

    if (min == null && max == null) return { prixMin: null, prixMax: null };
    if (min == null) return { prixMin: max, prixMax: null };
    if (max == null || max === min) return { prixMin: min, prixMax: null };
    return { prixMin: Math.min(min, max), prixMax: Math.max(min, max) };
  }

  if (item.prix) return parseLegacyPriceString(item.prix);
  return { prixMin: null, prixMax: null };
}

export function hasItemPrice(item) {
  const { prixMin, prixMax } = normalizeItemPrice(item);
  return prixMin != null || prixMax != null;
}

export function formatMoneyAmount(num) {
  if (num == null || !Number.isFinite(num)) return '';
  if (Number.isInteger(num)) return String(num);
  return String(num).replace('.', ',');
}

function formatPriceRangeLabel(min, max) {
  if (max == null || max === min) {
    return min === 0 ? 'Gratuit' : `${formatMoneyAmount(min)} €`;
  }
  if (min === 0) return `Gratuit – ${formatMoneyAmount(max)} €`;
  if (max === 0) return `${formatMoneyAmount(min)} € – Gratuit`;
  return `${formatMoneyAmount(min)} – ${formatMoneyAmount(max)} €`;
}

/** Format texte libre pour les champs prix simples (formulaire). */
export function formatPrice(value) {
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^gratuit$/i.test(trimmed)) return 'Gratuit';
  const num = parseMoneyInput(trimmed);
  if (num === 0) return 'Gratuit';
  if (/€/.test(trimmed) || /\beur\b/i.test(trimmed)) return trimmed;
  return `${trimmed} €`;
}

export function formatItemPrice(item) {
  const { prixMin, prixMax } = normalizeItemPrice(item);
  if (prixMin == null && prixMax == null) return '';

  const min = prixMin ?? prixMax;
  const max = prixMax;

  return formatPriceRangeLabel(min, max);
}

export function getPriceSortMin(item) {
  const { prixMin, prixMax } = normalizeItemPrice(item);
  return prixMin ?? prixMax ?? null;
}

export function getPriceSortMax(item) {
  const { prixMin, prixMax } = normalizeItemPrice(item);
  return prixMax ?? prixMin ?? null;
}

export function compareItemsByPrice(a, b, direction = 1) {
  const getKey = direction === 1 ? getPriceSortMin : getPriceSortMax;
  const pa = getKey(a);
  const pb = getKey(b);

  if (pa == null && pb == null) return 0;
  if (pa == null) return 1;
  if (pb == null) return -1;
  return (pa - pb) * direction;
}
