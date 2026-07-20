/** Style vectoriel minimal — fond plat, sans relief, labels FR. */
export const FRENCH_NAME = ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name']];

/** Une seule police par variante — évite les requêtes glyph .pbf en cascade. */
const MAP_FONT_REGULAR = ['Montserrat Regular'];
const MAP_FONT_MEDIUM = ['Montserrat Medium'];
const MAP_FONT_ITALIC = ['Montserrat Regular Italic'];
const MAP_FONT_MEDIUM_ITALIC = ['Montserrat Medium Italic'];

/** Fenêtre de fondu entre niveaux de détail (en incréments de zoom). */
const FADE = 2.2;

/** Interpolation douce pour tailles / épaisseurs (croissance progressive). */
const ZOOM_EASE = ['exponential', 1.45];

function zoomEase(...stops) {
  return ['interpolate', ZOOM_EASE, ['zoom'], ...stops];
}

/** Fondu entrant ease-in-out (courbe en S). */
function fadeIn(start, end = start + FADE, peak = 1) {
  const span = end - start;
  return [
    'interpolate', ['linear'], ['zoom'],
    start, 0,
    start + span * 0.16, peak * 0.05,
    start + span * 0.4, peak * 0.32,
    start + span * 0.68, peak * 0.78,
    start + span * 0.9, peak * 0.96,
    end, peak,
  ];
}

/** Fondu entrant + sortant avec plateau et transitions croisées. */
function fadeInOut(start, inEnd, outStart, end, peak = 1) {
  const inSpan = inEnd - start;
  const outSpan = end - outStart;
  return [
    'interpolate', ['linear'], ['zoom'],
    start, 0,
    start + inSpan * 0.2, peak * 0.08,
    start + inSpan * 0.55, peak * 0.72,
    start + inSpan * 0.88, peak * 0.97,
    inEnd, peak,
    outStart, peak,
    outStart + outSpan * 0.12, peak * 0.97,
    outStart + outSpan * 0.42, peak * 0.72,
    outStart + outSpan * 0.75, peak * 0.22,
    end, 0,
  ];
}

/** Opacité progressive par paliers de zoom (hiérarchie routes). */
function roadOpacity(...stops) {
  return ['interpolate', ['linear'], ['zoom'], ...stops];
}

/** Couleurs routes — du plus visible (autoroutes) au plus discret (rues). */
const ROAD = {
  highway: '#c2c9d4',
  major: '#8a939f',
  minor: '#4a5160',
  path: '#383e48',
  tunnel: '#5c6472',
};

/** Vert naturel — prairies (clair) vs forêts (légèrement plus soutenu). */
const GREEN_OPACITY = 0.75;
const FOREST_OPACITY = 0.8;

const GREEN = {
  main: '#5c9070',
  light: '#689878',
  soft: '#528a68',
  earth: '#4a7860',
  meadow: '#6a9e78',
  forest: '#4a8060',
};

/** Tissu urbain — violet-gris type Apple Plans. */
const URBAN = {
  subtle: '#3a3848',
  main: '#46425a',
  light: '#524e66',
};

function greenMeadow() {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    0, GREEN.meadow,
    8, GREEN.light,
    14, GREEN.main,
  ];
}

function greenForest() {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    0, GREEN.forest,
    8, '#528a68',
    14, GREEN.soft,
  ];
}

function greenOpacity() {
  return GREEN_OPACITY;
}

function forestOpacity() {
  return FOREST_OPACITY;
}

/** Campagne & relief — champs, roche, neige, zones humides. */
const NATURE = {
  farmland: '#6e6042',
  farmlandLight: '#786848',
  farmlandMid: '#7a8450',
  farmlandGreen: '#6a9060',
  rock: '#524a44',
  rockLight: '#6a5e54',
  rockBright: '#7a6c5e',
  ice: '#9ab8cc',
  wetland: '#6a9a88',
  wetlandLight: '#7aaa92',
  sand: '#6a5c48',
  peak: '#c4b4a4',
};

export const OUR_SPACE_MAP_STYLE = {
  version: 8,
  name: 'Our Space — Carte simple',
  sources: {
    carto: {
      type: 'vector',
      url: 'https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json',
    },
  },
  glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf',
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, GREEN.meadow,
          3, '#5a8868',
          5, '#4a7860',
          7, '#343c3a',
          9, '#2f3438',
          11, '#2c3036',
          13, '#282c35',
        ],
      },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'carto',
      'source-layer': 'water',
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          2, '#182e40',
          4, '#1a3348',
          7, '#1e3848',
          9, '#213a46',
          11, '#243442',
          13, '#26363e',
          14, '#283840',
        ],
        'fill-antialias': true,
      },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'carto',
      'source-layer': 'waterway',
      filter: ['in', ['get', 'class'], ['literal', ['river', 'canal', 'stream', 'drain']]],
      paint: {
        'line-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          3, '#3d6a88',
          10, '#456a82',
          14, '#3a5868',
        ],
        'line-width': zoomEase(3, 0.5, 6, 0.8, 10, 1.2, 14, 2, 17, 3.2),
        'line-opacity': fadeIn(2.4, 5.0),
      },
    },
    {
      id: 'landcover-green-base',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landcover',
      paint: {
        'fill-color': greenMeadow(),
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 0.4,
          5, 0.32,
          9, 0.18,
          12, 0.08,
        ],
        'fill-antialias': true,
      },
    },
    {
      id: 'landcover-farmland',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landcover',
      filter: ['==', ['get', 'class'], 'farmland'],
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, NATURE.farmlandGreen,
          4, '#728858',
          7, NATURE.farmlandMid,
          10, NATURE.farmlandLight,
          13, NATURE.farmland,
          15, '#645838',
        ],
        'fill-opacity': roadOpacity(0, 0.5, 4, 0.62, 7, 0.7, 10, 0.72, 13, 0.68, 15, 0.62),
        'fill-antialias': true,
      },
    },
    {
      id: 'landcover-grass-wide',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landcover',
      filter: ['==', ['get', 'class'], 'grass'],
      paint: {
        'fill-color': greenMeadow(),
        'fill-opacity': greenOpacity(),
        'fill-antialias': true,
      },
    },
    {
      id: 'landcover-meadow',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landcover',
      minzoom: 8,
      filter: [
        'all',
        ['==', ['get', 'class'], 'grass'],
        ['in', ['get', 'subclass'], ['literal', ['meadow', 'grassland', 'heath', 'fell', 'tundra', 'grass']]],
      ],
      paint: {
        'fill-color': greenMeadow(),
        'fill-opacity': greenOpacity(),
        'fill-antialias': true,
      },
    },
    {
      id: 'landcover-wood',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landcover',
      filter: ['==', ['get', 'class'], 'wood'],
      paint: {
        'fill-color': greenForest(),
        'fill-opacity': forestOpacity(),
        'fill-antialias': true,
      },
    },
    {
      id: 'landcover-wetland',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landcover',
      filter: ['==', ['get', 'class'], 'wetland'],
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, NATURE.wetlandLight,
          6, NATURE.wetland,
          12, NATURE.wetlandLight,
          14, '#447068',
        ],
        'fill-opacity': roadOpacity(0, 0.4, 3, 0.58, 5, 0.68, 7.5, 0.72, 10, 0.65, 14, 0.55),
        'fill-antialias': true,
      },
    },
    {
      id: 'landcover-rock',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landcover',
      filter: ['==', ['get', 'class'], 'rock'],
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, NATURE.rockBright,
          7, NATURE.rockLight,
          11, '#7a6c60',
          15, '#8a7a6c',
        ],
        'fill-opacity': roadOpacity(4, 0.28, 5, 0.5, 6.5, 0.65, 8, 0.72, 10, 0.68, 13, 0.62),
        'fill-antialias': true,
      },
    },
    {
      id: 'landcover-ice',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landcover',
      filter: ['==', ['get', 'class'], 'ice'],
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, '#7a9cb0',
          8, NATURE.ice,
          12, '#b0ccd8',
        ],
        'fill-opacity': roadOpacity(3, 0.35, 4.5, 0.58, 6, 0.72, 9, 0.75, 12, 0.7),
        'fill-antialias': true,
      },
    },
    {
      id: 'landcover-sand',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landcover',
      filter: ['==', ['get', 'class'], 'sand'],
      paint: {
        'fill-color': NATURE.sand,
        'fill-opacity': roadOpacity(8, 0, 9, 0.35, 11, 0.5, 13, 0.55),
        'fill-antialias': true,
      },
    },
    {
      id: 'landuse-green-base',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landuse',
      filter: [
        'in',
        ['get', 'class'],
        ['literal', ['park', 'grass', 'scrub', 'orchard', 'vineyard', 'cemetery', 'allotments']],
      ],
      paint: {
        'fill-color': greenMeadow(),
        'fill-opacity': greenOpacity(),
        'fill-antialias': true,
      },
    },
    {
      id: 'landuse-forest',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landuse',
      filter: ['in', ['get', 'class'], ['literal', ['forest', 'wood']]],
      paint: {
        'fill-color': greenForest(),
        'fill-opacity': forestOpacity(),
        'fill-antialias': true,
      },
    },
    {
      id: 'landuse-scrub',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landuse',
      filter: ['in', ['get', 'class'], ['literal', ['scrub', 'orchard', 'vineyard']]],
      paint: {
        'fill-color': greenMeadow(),
        'fill-opacity': greenOpacity(),
        'fill-antialias': true,
      },
    },
    {
      id: 'landuse-park',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landuse',
      filter: ['in', ['get', 'class'], ['literal', ['park', 'grass', 'cemetery', 'allotments']]],
      paint: {
        'fill-color': greenMeadow(),
        'fill-opacity': greenOpacity(),
        'fill-antialias': true,
      },
    },
    {
      id: 'landuse-urban',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landuse',
      filter: [
        'in',
        ['get', 'class'],
        ['literal', ['residential', 'commercial', 'industrial', 'retail', 'garages']],
      ],
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, URBAN.subtle,
          9, URBAN.main,
          13, URBAN.light,
        ],
        'fill-opacity': roadOpacity(5, 0.3, 8, 0.48, 10, 0.58, 12, 0.62, 14, 0.55),
        'fill-antialias': true,
      },
    },
    {
      id: 'building',
      type: 'fill',
      source: 'carto',
      'source-layer': 'building',
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, '#383648',
          11, '#3e3c50',
          13, '#46445a',
          16, '#4e4c62',
        ],
        'fill-outline-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, '#44425a',
          11, '#4a4862',
          13, '#56546e',
          16, '#626078',
        ],
        'fill-opacity': fadeInOut(10.0, 12.0, 14.5, 16.5),
        'fill-antialias': true,
      },
    },
    {
      id: 'building-top',
      type: 'fill',
      source: 'carto',
      'source-layer': 'building',
      paint: {
        'fill-color': '#524e66',
        'fill-outline-color': '#68647c',
        'fill-opacity': fadeIn(13.0, 15.0),
        'fill-translate': zoomEase(12, ['literal', [0, 0]], 15, ['literal', [-1.5, -1.5]], 17, ['literal', [-2, -2]]),
        'fill-antialias': true,
      },
    },
    {
      id: 'roads-path',
      type: 'line',
      source: 'carto',
      'source-layer': 'transportation',
      filter: [
        'all',
        ['!=', ['get', 'brunnel'], 'tunnel'],
        ['in', ['get', 'class'], ['literal', ['path', 'track']]],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ROAD.path,
        'line-width': zoomEase(14, 0.25, 16, 0.5, 18, 1.0),
        'line-dasharray': [2, 2],
        'line-opacity': roadOpacity(13.5, 0, 14.5, 0.18, 15.5, 0.35, 16.5, 0.5, 17.5, 0.62),
      },
    },
    {
      id: 'roads-minor',
      type: 'line',
      source: 'carto',
      'source-layer': 'transportation',
      filter: [
        'all',
        ['!=', ['get', 'brunnel'], 'tunnel'],
        ['in', ['get', 'class'], ['literal', ['service', 'minor', 'street']]],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ROAD.minor,
        'line-width': zoomEase(12, 0.25, 14, 0.45, 16, 0.9, 18, 1.6),
        'line-opacity': roadOpacity(11.5, 0, 12.5, 0.12, 13.5, 0.28, 14.5, 0.45, 15.5, 0.58, 16.5, 0.68, 17.5, 0.75),
      },
    },
    {
      id: 'roads-major',
      type: 'line',
      source: 'carto',
      'source-layer': 'transportation',
      filter: [
        'all',
        ['!=', ['get', 'brunnel'], 'tunnel'],
        ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary', 'primary']]],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ROAD.major,
        'line-width': zoomEase(7, 0.35, 10, 0.75, 13, 1.4, 16, 2.4, 18, 3.2),
        'line-opacity': roadOpacity(5.5, 0, 6.5, 0.22, 7.5, 0.42, 8.5, 0.58, 9.5, 0.68, 11, 0.76, 13, 0.82),
      },
    },
    {
      id: 'roads-highway',
      type: 'line',
      source: 'carto',
      'source-layer': 'transportation',
      filter: [
        'all',
        ['!=', ['get', 'brunnel'], 'tunnel'],
        ['in', ['get', 'class'], ['literal', ['trunk', 'motorway']]],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ROAD.highway,
        'line-width': zoomEase(4, 0.45, 7, 0.9, 10, 1.6, 13, 2.6, 16, 4.0, 18, 5.0),
        'line-opacity': roadOpacity(3, 0.3, 4, 0.5, 5, 0.65, 6.5, 0.78, 8, 0.88, 10, 0.94, 12, 0.97),
      },
    },
    {
      id: 'roads-tunnel',
      type: 'line',
      source: 'carto',
      'source-layer': 'transportation',
      filter: ['==', ['get', 'brunnel'], 'tunnel'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ROAD.tunnel,
        'line-width': zoomEase(12, 0.35, 14, 0.8, 17, 1.6),
        'line-dasharray': [3, 3],
        'line-opacity': roadOpacity(12.5, 0, 13.5, 0.2, 14.5, 0.38, 15.5, 0.5, 16.5, 0.58),
      },
    },
    {
      id: 'boundary-country',
      type: 'line',
      source: 'carto',
      'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 2], ['==', ['get', 'maritime'], 0]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#9aa3b0',
        'line-width': zoomEase(2, 1, 5, 1.4, 8, 1.8, 12, 2.2),
        'line-opacity': fadeIn(0.8, 3.5, 0.75),
      },
    },
    {
      id: 'boundary-region',
      type: 'line',
      source: 'carto',
      'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 4], ['==', ['get', 'maritime'], 0]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#787f8c',
        'line-width': zoomEase(4, 0.7, 8, 1, 12, 1.3),
        'line-dasharray': [5, 3],
        'line-opacity': fadeIn(2.8, 5.5, 0.65),
      },
    },
    {
      id: 'boundary-department',
      type: 'line',
      source: 'carto',
      'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 6], ['==', ['get', 'maritime'], 0]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#636a78',
        'line-width': zoomEase(5, 0.55, 9, 0.85, 13, 1.3),
        'line-dasharray': [3, 2],
        'line-opacity': fadeIn(4.5, 7.0, 0.5),
      },
    },
    {
      id: 'label-road-highway',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'transportation_name',
      filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]],
      layout: {
        'symbol-placement': 'line',
        'text-field': FRENCH_NAME,
        'text-font': MAP_FONT_REGULAR,
        'text-size': zoomEase(9, 10, 14, 12),
        'text-max-angle': 30,
      },
      paint: {
        'text-color': '#b8c0cc',
        'text-halo-color': '#282c35',
        'text-halo-width': 1.2,
        'text-opacity': roadOpacity(8.5, 0, 9.5, 0.35, 10.5, 0.6, 12, 0.78, 14, 0.88),
      },
    },
    {
      id: 'label-road-major',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'transportation_name',
      filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary']]],
      layout: {
        'symbol-placement': 'line',
        'text-field': FRENCH_NAME,
        'text-font': MAP_FONT_REGULAR,
        'text-size': zoomEase(11, 10, 16, 12),
        'text-max-angle': 30,
      },
      paint: {
        'text-color': '#a8b0bc',
        'text-halo-color': '#282c35',
        'text-halo-width': 1.2,
        'text-opacity': roadOpacity(10.5, 0, 11.5, 0.25, 12.5, 0.48, 13.5, 0.65, 15, 0.78),
      },
    },
    {
      id: 'label-road',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'transportation_name',
      filter: ['in', ['get', 'class'], ['literal', ['minor', 'street', 'service', 'path']]],
      layout: {
        'symbol-placement': 'line',
        'text-field': FRENCH_NAME,
        'text-font': MAP_FONT_REGULAR,
        'text-size': zoomEase(13, 9, 16, 11, 18, 12),
        'text-max-angle': 30,
      },
      paint: {
        'text-color': '#8a919c',
        'text-halo-color': '#282c35',
        'text-halo-width': 1.1,
        'text-opacity': roadOpacity(13.5, 0, 14.5, 0.2, 15.5, 0.4, 16.5, 0.55, 17.5, 0.68),
      },
    },
    {
      id: 'label-water',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'water_name',
      filter: ['in', ['get', 'class'], ['literal', ['ocean', 'sea', 'lake', 'bay', 'strait']]],
      layout: {
        'text-field': FRENCH_NAME,
        'text-font': MAP_FONT_MEDIUM_ITALIC,
        'text-size': zoomEase(0, 11, 3, 13, 6, 16, 10, 18),
        'text-letter-spacing': 0.04,
      },
      paint: {
        'text-color': '#8eb0c8',
        'text-halo-color': '#1a2838',
        'text-halo-width': 1.4,
        'text-opacity': fadeInOut(0, 1.8, 11.0, 13.8),
      },
    },
    {
      id: 'label-waterway',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'waterway',
      filter: ['all', ['==', ['get', 'class'], 'river'], ['has', 'name']],
      layout: {
        'symbol-placement': 'line',
        'text-field': FRENCH_NAME,
        'text-font': MAP_FONT_ITALIC,
        'text-size': zoomEase(5, 8, 10, 10, 14, 12),
        'symbol-spacing': 250,
      },
      paint: {
        'text-color': '#7a9bb0',
        'text-halo-color': '#1a2838',
        'text-halo-width': 1.2,
        'text-opacity': fadeIn(3.8, 6.5),
      },
    },
    {
      id: 'label-place-suburb',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter']]],
      layout: {
        'text-field': FRENCH_NAME,
        'text-font': MAP_FONT_MEDIUM,
        'text-size': zoomEase(9, 11, 13, 13, 15, 14),
        'text-anchor': 'center',
      },
      paint: {
        'text-color': '#e4e8ee',
        'text-halo-color': '#282c35',
        'text-halo-width': 1.3,
        'text-opacity': fadeInOut(8.5, 11.0, 14.5, 17.0),
      },
    },
    {
      id: 'label-place-town',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      filter: ['in', ['get', 'class'], ['literal', ['town', 'village']]],
      layout: {
        'text-field': FRENCH_NAME,
        'text-font': MAP_FONT_MEDIUM,
        'text-size': zoomEase(7, 10, 11, 12, 13, 14),
        'text-anchor': 'center',
      },
      paint: {
        'text-color': '#f0f2f5',
        'text-halo-color': '#282c35',
        'text-halo-width': 1.4,
        'text-opacity': fadeInOut(5.8, 8.5, 13.8, 16.5),
      },
    },
    {
      id: 'label-place-city',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      filter: ['==', ['get', 'class'], 'city'],
      layout: {
        'text-field': FRENCH_NAME,
        'text-font': MAP_FONT_MEDIUM,
        'text-size': zoomEase(4, 11, 8, 15, 12, 20, 16, 24),
        'text-anchor': 'center',
      },
      paint: {
        'text-color': '#f0f2f5',
        'text-halo-color': '#282c35',
        'text-halo-width': 1.6,
        'text-opacity': fadeIn(2.8, 5.5),
      },
    },
    {
      id: 'label-place-region',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      filter: ['in', ['get', 'class'], ['literal', ['state', 'region']]],
      layout: {
        'text-field': FRENCH_NAME,
        'text-font': MAP_FONT_MEDIUM,
        'text-size': zoomEase(3, 10, 6, 13, 9, 16),
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.06,
      },
      paint: {
        'text-color': '#e8ebf0',
        'text-halo-color': '#282c35',
        'text-halo-width': 1.4,
        'text-opacity': fadeInOut(2.0, 5.0, 8.2, 10.8),
      },
    },
    {
      id: 'label-place-country',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      filter: ['==', ['get', 'class'], 'country'],
      layout: {
        'text-field': FRENCH_NAME,
        'text-font': MAP_FONT_MEDIUM,
        'text-size': zoomEase(2, 10, 5, 14),
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.08,
      },
      paint: {
        'text-color': '#f0f2f5',
        'text-halo-color': '#282c35',
        'text-halo-width': 1.5,
        'text-opacity': fadeInOut(0.5, 2.8, 6.5, 9.2),
      },
    },
    {
      id: 'mountain-peak-dot',
      type: 'circle',
      source: 'carto',
      'source-layer': 'mountain_peak',
      filter: ['in', ['get', 'class'], ['literal', ['peak', 'volcano']]],
      paint: {
        'circle-radius': zoomEase(8, 2, 11, 3, 14, 4),
        'circle-color': [
          'match',
          ['get', 'class'],
          'volcano', '#a87858',
          NATURE.rockLight,
        ],
        'circle-stroke-width': 1.2,
        'circle-stroke-color': NATURE.peak,
        'circle-opacity': roadOpacity(7.5, 0, 8.5, 0.45, 10, 0.65, 12, 0.78),
      },
    },
    {
      id: 'label-mountain-peak',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'mountain_peak',
      filter: ['in', ['get', 'class'], ['literal', ['peak', 'volcano']]],
      layout: {
        'text-field': FRENCH_NAME,
        'text-font': MAP_FONT_MEDIUM,
        'text-size': zoomEase(8, 9, 11, 10, 14, 12),
        'text-anchor': 'top',
        'text-offset': [0, 0.55],
        'text-max-width': 8,
        'symbol-sort-key': ['get', 'rank'],
      },
      paint: {
        'text-color': [
          'match',
          ['get', 'class'],
          'volcano', '#d4a080',
          NATURE.peak,
        ],
        'text-halo-color': '#282c35',
        'text-halo-width': 1.4,
        'text-opacity': roadOpacity(7.5, 0, 8.5, 0.4, 9.5, 0.65, 11, 0.82, 13, 0.9),
      },
    },
  ],
};
