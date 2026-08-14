import { devWarn } from './dev-log.js';
import { trackApiRequest } from './api-usage-tracker.js';

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { rate: number, fetchedAt: number }>} */
const rateCache = new Map();
/** @type {Map<string, Promise<number>>} */
const pendingRates = new Map();

function normalizeCurrencyCode(code) {
  return String(code || '').trim().toUpperCase();
}

export function parseGoogleMoneyAmount(money) {
  if (!money) return null;

  const unitsRaw = money.units;
  const nanosRaw = money.nanos;
  if (unitsRaw == null && (nanosRaw == null || nanosRaw === 0)) return null;

  const units = Number(unitsRaw ?? 0);
  const nanos = Number(nanosRaw ?? 0);
  if (!Number.isFinite(units) || !Number.isFinite(nanos)) return null;

  const amount = units + nanos / 1e9;
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function roundMoney(amount) {
  return Math.round(amount * 100) / 100;
}

async function fetchEurConversionRate(currency, { signal } = {}) {
  const url = `${FRANKFURTER_URL}?from=${encodeURIComponent(currency)}&to=EUR`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Currency rate ${response.status}`);

  trackApiRequest('frankfurter');

  const data = await response.json();
  const rate = data.rates?.EUR;
  if (!Number.isFinite(rate)) throw new Error(`No EUR rate for ${currency}`);

  rateCache.set(currency, { rate, fetchedAt: Date.now() });
  return rate;
}

async function getEurConversionRate(currencyCode, { signal } = {}) {
  const currency = normalizeCurrencyCode(currencyCode);
  if (!currency || currency === 'EUR') return 1;

  const cached = rateCache.get(currency);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate;
  }

  if (pendingRates.has(currency)) {
    return pendingRates.get(currency);
  }

  const promise = fetchEurConversionRate(currency, { signal }).finally(() => {
    pendingRates.delete(currency);
  });
  pendingRates.set(currency, promise);
  return promise;
}

export async function convertGoogleMoneyToEur(money, { signal } = {}) {
  const amount = parseGoogleMoneyAmount(money);
  if (amount == null) return null;

  const currency = normalizeCurrencyCode(money?.currencyCode);
  if (!currency || currency === 'EUR') return roundMoney(amount);

  const rate = await getEurConversionRate(currency, { signal });
  return roundMoney(amount * rate);
}

export async function parseGooglePriceRangeToEur(priceRange, { signal } = {}) {
  if (!priceRange) return { prixMin: null, prixMax: null };

  try {
    const [prixMin, prixMax] = await Promise.all([
      convertGoogleMoneyToEur(priceRange.startPrice, { signal }),
      convertGoogleMoneyToEur(priceRange.endPrice, { signal }),
    ]);
    return { prixMin, prixMax };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    devWarn('currency conversion:', err.message);
    return { prixMin: null, prixMax: null };
  }
}
