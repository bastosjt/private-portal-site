export function formatOptionLabel(label) {
  const trimmed = String(label).trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleUpperCase('fr') + trimmed.slice(1).toLocaleLowerCase('fr');
}

/** Adjectifs de cuisine au féminin (cuisine italienne, pas « italien »). */
const CUISINE_LABEL_FIXES = new Map([
  ['chinois', 'Chinoise'],
  ['chinoise', 'Chinoise'],
  ['francais', 'Française'],
  ['français', 'Française'],
  ['francaise', 'Française'],
  ['française', 'Française'],
  ['italien', 'Italienne'],
  ['italienne', 'Italienne'],
  ['japonais', 'Japonaise'],
  ['japonaise', 'Japonaise'],
  ['mexicain', 'Mexicaine'],
  ['mexicaine', 'Mexicaine'],
  ['thailandais', 'Thaïlandaise'],
  ['thaïlandais', 'Thaïlandaise'],
  ['thailandaise', 'Thaïlandaise'],
  ['thaïlandaise', 'Thaïlandaise'],
]);

export function formatCuisineLabel(label) {
  const formatted = formatOptionLabel(label);
  const key = formatted.toLocaleLowerCase('fr');
  return CUISINE_LABEL_FIXES.get(key) || formatted;
}

export function sortOptionsByLabel(options) {
  return [...options].sort((a, b) =>
    (a.label || '').localeCompare(b.label || '', 'fr', { sensitivity: 'base' }),
  );
}
