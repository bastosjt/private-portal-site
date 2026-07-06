export function formatOptionLabel(label) {
  const trimmed = String(label).trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleUpperCase('fr') + trimmed.slice(1).toLocaleLowerCase('fr');
}

export function sortOptionsByLabel(options) {
  return [...options].sort((a, b) =>
    (a.label || '').localeCompare(b.label || '', 'fr', { sensitivity: 'base' }),
  );
}
