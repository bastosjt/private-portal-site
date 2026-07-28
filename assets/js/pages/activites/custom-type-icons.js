/**
 * Icônes custom style Lucide (viewBox 24×24, stroke 2, round caps).
 * Format = IconNode Lucide : tableau de [tag, attrs] pour createElement().
 */

/** Fontaine (icône custom). */
export const Fountain = [
  ['path', { d: 'M12 2.5v5' }],
  ['path', { d: 'M9 4c1 1.2 2 1.8 3 1.8s2-.6 3-1.8' }],
  ['path', { d: 'M6.94 8.5h10.12' }],
  ['path', { d: 'M6.94 8.5c0 3.04 2.26 5.5 5.06 5.5s5.06-2.46 5.06-5.5' }],
  ['path', { d: 'M4 15h16' }],
  ['path', { d: 'M4 15c0 3.61 3.54 6.5 8 6.5s8-2.89 8-6.5' }],
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

/** Monument (icône custom). */
export const Monument = [
  ['path', { d: 'M19 21.83H5l2-4.67h10l2 4.67Z' }],
  ['path', { d: 'M8 17.17v-2h8v2' }],
  ['path', { d: 'M10 15.17V6.17l2-4 2 4v9' }],
];

/** Ruines / site historique (icone custom). */
export const Ruins = [
  ['line', { x1: '12', y1: '21.85', x2: '12', y2: '7.21' }],
  ['line', { x1: '15.21', y1: '21.85', x2: '15.21', y2: '7.21' }],
  ['line', { x1: '8.79', y1: '21.85', x2: '8.79', y2: '7.21' }],
  ['line', { x1: '8.79', y1: '4.47', x2: '15.21', y2: '4.47' }],
  ['line', { x1: '4.12', y1: '2.06', x2: '19.88', y2: '2.06' }],
  ['path', { d: 'M20.01 6.88c-1.23.06-2.37-.98-2.53-2.41' }],
  ['path', { d: 'M20.11 2.06c1.2.06 2.15 1.11 2.18 2.35.03 1.37-1.12 2.41-2.29 2.47' }],
  ['path', { d: 'M4.17 6.88c-1.37.03-2.41-1.12-2.47-2.29-.06-1.23.98-2.37 2.41-2.53' }],
  ['path', { d: 'M6.53 4.7c-.06 1.2-1.11 2.15-2.35 2.18' }],
];

/** Pont (icône custom). */
export const Bridge = [
  // Câble supérieur
  ['path', { d: 'M3 8L7.5 6 12 5.2 16.5 6 21 8' }],
  // Suspentes
  ['path', { d: 'M7.5 6v8' }],
  ['path', { d: 'M12 5.2v8.8' }],
  ['path', { d: 'M16.5 6v8' }],
  // Double arche
  ['path', { d: 'M2 13.2C6.2 9.9 10.7 9.7 12 9.7c5.3 0 9 2.6 10 3.5' }],
  ['path', { d: 'M2 18.8C6.2 15.5 10.7 15.3 12 15.3c5.3 0 9 2.6 10 3.5' }],
  // Piles aux extrémités
  ['path', { d: 'M3 8v11' }],
  ['path', { d: 'M21 8v11' }],
];
