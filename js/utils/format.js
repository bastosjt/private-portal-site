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

export function formatOptionLabel(label) {
  const trimmed = String(label).trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleUpperCase('fr') + trimmed.slice(1).toLocaleLowerCase('fr');
}
