const MONEY_FIELDS = new Set(['prix', 'budget']);

export function isMoneyField(fieldName) {
  return MONEY_FIELDS.has(fieldName);
}

export function formatPrice(value) {
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/€/.test(trimmed) || /\beur\b/i.test(trimmed)) return trimmed;
  return `${trimmed} €`;
}
