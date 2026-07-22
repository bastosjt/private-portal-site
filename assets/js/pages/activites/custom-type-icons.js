/**
 * Icônes custom style Lucide (viewBox 24×24, stroke 2, round caps).
 * Format = IconNode Lucide : tableau de [tag, attrs] pour createElement().
 */

/** Fontaine à deux vasques + jets d’eau. */
export const Fountain = [
  // Jets
  ['path', { d: 'M12 2v5' }],
  ['path', { d: 'M9 3.5c1 1.2 2 1.8 3 1.8s2-.6 3-1.8' }],
  // Vasque haute
  ['path', { d: 'M9 9h6' }],
  ['path', { d: 'M9 9a3 3 0 0 0 6 0' }],
  // Fût
  ['path', { d: 'M12 12v2.5' }],
  // Vasque basse
  ['path', { d: 'M5 14.5h14' }],
  ['path', { d: 'M5 14.5c0 2.5 3.1 4.5 7 4.5s7-2 7-4.5' }],
  // Socle
  ['path', { d: 'M4 21h16' }],
];

/** Place / plaza : parvis + axes + monument central. */
export const Place = [
  ['rect', { width: '18', height: '18', x: '3', y: '3', rx: '2' }],
  ['path', { d: 'M3 12h5' }],
  ['path', { d: 'M16 12h5' }],
  ['path', { d: 'M12 3v5' }],
  ['path', { d: 'M12 16v5' }],
  ['circle', { cx: '12', cy: '12', r: '2.5' }],
];

/** Jardin botanique : serre cintrée + jeune plant (lisible vs fleur seule / parc). */
export const BotanicalGarden = [
  // Serre
  ['path', { d: 'M4 21V12a8 8 0 0 1 16 0v9' }],
  ['path', { d: 'M4 21h16' }],
  // Plant
  ['path', { d: 'M12 19v-5' }],
  ['path', { d: 'M12 15.5c-2.2-.3-3.5-1.6-3.5-3.2 1.2 0 2.6.7 3.5 2' }],
  ['path', { d: 'M12 15.5c2.2-.3 3.5-1.6 3.5-3.2-1.2 0-2.6.7-3.5 2' }],
];
