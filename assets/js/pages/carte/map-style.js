/** Style vectoriel minimal — fond plat, sans relief, labels FR. */
export const FRENCH_NAME = ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name']];

/** Ramp d’apparition (~1 niveau de zoom), puis plateau — pas de transparence au dézoom. */
const APPEAR_SPAN = 1.05;
const ZOOM_CEIL = 24;

/** Interpolation douce pour tailles / épaisseurs (croissance progressive). */
const ZOOM_EASE = ['exponential', 1.45];

function zoomEase(...stops) {
  return ['interpolate', ZOOM_EASE, ['zoom'], ...stops];
}

/** Fondu entrant court puis opacité stable (ne redescend pas en dézoomant). */
export function appear(peak, tileZoom) {
  const end = tileZoom + APPEAR_SPAN;
  return [
    'interpolate', ['linear'], ['zoom'],
    tileZoom, 0,
    tileZoom + APPEAR_SPAN * 0.28, peak * 0.42,
    tileZoom + APPEAR_SPAN * 0.62, peak * 0.88,
    end, peak,
    ZOOM_CEIL, peak,
  ];
}

/** Alias : même comportement qu’appear (compat). */
export function fadeIn(start, end, peak = 1) {
  return appear(peak, start);
}

/** Fondu entrant + sortant (labels hiérarchiques uniquement). */
export function fadeInOut(start, inEnd, outStart, end, peak = 1) {
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

/** @deprecated Préférer appear(). */
export function fadeInScaled(peak, start) {
  return appear(peak, start);
}

/** Fondu entrant puis sortant vers une opacité cible. */
export function fadeInOutScaled(peak, start, inEnd, outStart, end) {
  return fadeInOut(start, inEnd, outStart, end, peak);
}

/** Palette basemap — vert sage (indépendante du thème app). */
const DEFAULT_PALETTE = {
  name: 'Our Space — Carte simple',
  greenOpacity: 0.68,
  forestOpacity: 0.74,
  labelHalo: '#282c35',
  road: {
    highway: '#c2c9d4',
    major: '#8a939f',
    minor: '#4a5160',
    path: '#383e48',
    tunnel: '#5c6472',
  },
  green: {
    main: '#4a7260',
    light: '#557a68',
    soft: '#416858',
    earth: '#385a4c',
    meadow: '#5a7f6c',
    forest: '#3a6452',
  },
  urban: {
    subtle: '#3a3848',
    main: '#46425a',
    light: '#524e66',
  },
  water: {
    deep: '#1a4568',
    mid: '#215a82',
    near: '#286890',
    zoom14: '#2f7298',
    line: '#458eb4',
    lineSoft: '#3a7fa6',
    lineZoom14: '#52a0c4',
    label: '#7ab4d4',
    labelHalo: '#102c44',
  },
  nature: {
    farmland: '#635848',
    farmlandLight: '#6e6250',
    farmlandMid: '#6a7254',
    farmlandGreen: '#5a7a5e',
    farmlandZoom4: '#66785a',
    farmlandZoom15: '#5a5040',
    rock: '#524a44',
    rockLight: '#6a5e54',
    rockBright: '#7a6c5e',
    rockZoom11: '#7a6c60',
    rockZoom15: '#8a7a6c',
    ice: '#8aaec4',
    iceZoom4: '#7a9cb0',
    iceZoom12: '#b0ccd8',
    wetland: '#4e7a70',
    wetlandLight: '#5a8a7e',
    sand: '#6a5c48',
    peak: '#c4b4a4',
    volcano: '#a87858',
    volcanoLabel: '#d4a080',
  },
  background: [
    0, '#5a7f6c',
    3, '#557a68',
    5, '#385a4c',
    7, '#32383a',
    9, '#2e3338',
    11, '#2a2f36',
    13, '#262b33',
  ],
  building: {
    fill: ['#383648', '#3e3c50', '#46445a', '#4e4c62'],
    outline: ['#44425a', '#4a4862', '#56546e', '#626078'],
    top: '#524e66',
    topOutline: '#68647c',
  },
  boundary: {
    country: '#9aa3b0',
    region: '#787f8c',
    department: '#636a78',
  },
  labelRoad: {
    highway: '#b8c0cc',
    major: '#a8b0bc',
    minor: '#8a919c',
  },
  labelPlace: {
    suburb: '#e4e8ee',
    town: '#f0f2f5',
    city: '#f0f2f5',
    region: '#e8ebf0',
    country: '#f0f2f5',
  },
};

/** Navy — fond / urbain navy ; végétation verte et eau bleue lisibles. */
const NAVY_PALETTE = {
  name: 'Our Space — Carte navy',
  greenOpacity: 0.68,
  forestOpacity: 0.74,
  labelHalo: '#031428',
  road: {
    highway: '#9cb8d4',
    major: '#6a94b8',
    minor: '#4a7094',
    path: '#3a6080',
    tunnel: '#5a88a8',
  },
  green: {
    main: '#4a7260',
    light: '#557a68',
    soft: '#416858',
    earth: '#385a4c',
    meadow: '#5a7f6c',
    forest: '#3a6452',
  },
  urban: {
    subtle: '#0a2848',
    main: '#0e3258',
    light: '#123c68',
  },
  water: {
    deep: '#1a4568',
    mid: '#215a82',
    near: '#286890',
    zoom14: '#2f7298',
    line: '#458eb4',
    lineSoft: '#3a7fa6',
    lineZoom14: '#52a0c4',
    label: '#7ab4d4',
    labelHalo: '#102c44',
  },
  nature: {
    farmland: '#1e3d58',
    farmlandLight: '#255580',
    farmlandMid: '#1a4268',
    farmlandGreen: '#5a7a5e',
    farmlandZoom4: '#66785a',
    farmlandZoom15: '#163d62',
    rock: '#3a4a5c',
    rockLight: '#4a5a6c',
    rockBright: '#5a6a7c',
    rockZoom11: '#5a6a78',
    rockZoom15: '#6a7a88',
    ice: '#6a9cb8',
    iceZoom4: '#5a8ca8',
    iceZoom12: '#8ab4cc',
    wetland: '#4e7a70',
    wetlandLight: '#5a8a7e',
    sand: '#4a5868',
    peak: '#a8b8c8',
    volcano: '#8a6858',
    volcanoLabel: '#c4a890',
  },
  background: [
    0, '#0c4088',
    3, '#0a3268',
    5, '#082850',
    7, '#062045',
    9, '#051a38',
    11, '#041830',
    13, '#031428',
  ],
  building: {
    fill: ['#123558', '#163d62', '#1a466e', '#1e5078'],
    outline: ['#1a4268', '#1e4a72', '#22527c', '#265a86'],
    top: '#255580',
    topOutline: '#2f6694',
  },
  boundary: {
    country: '#7a9cb8',
    region: '#5a88a8',
    department: '#4a7898',
  },
  labelRoad: {
    highway: '#b8d0e4',
    major: '#a8c4dc',
    minor: '#8aaccc',
  },
  labelPlace: {
    suburb: '#dce8f4',
    town: '#eef4fa',
    city: '#eef4fa',
    region: '#e4eef8',
    country: '#eef4fa',
  },
};

/** Red cherry — fond / urbain brûlé ; végétation verte et eau bleue lisibles. */
const ORANGE_PALETTE = {
  name: 'Our Space — Carte orange',
  greenOpacity: 0.68,
  forestOpacity: 0.74,
  labelHalo: '#240e05',
  road: {
    highway: '#d4a888',
    major: '#b88868',
    minor: '#986848',
    path: '#785038',
    tunnel: '#a87858',
  },
  green: {
    main: '#4a7260',
    light: '#557a68',
    soft: '#416858',
    earth: '#385a4c',
    meadow: '#5a7f6c',
    forest: '#3a6452',
  },
  urban: {
    subtle: '#4a1808',
    main: '#321208',
    light: '#5c200a',
  },
  water: {
    deep: '#1a4568',
    mid: '#215a82',
    near: '#286890',
    zoom14: '#2f7298',
    line: '#458eb4',
    lineSoft: '#3a7fa6',
    lineZoom14: '#52a0c4',
    label: '#7ab4d4',
    labelHalo: '#102c44',
  },
  nature: {
    farmland: '#5c2818',
    farmlandLight: '#6a3018',
    farmlandMid: '#4a2010',
    farmlandGreen: '#5a7a5e',
    farmlandZoom4: '#66785a',
    farmlandZoom15: '#3a1808',
    rock: '#4a3830',
    rockLight: '#5a4840',
    rockBright: '#6a5850',
    rockZoom11: '#6a5048',
    rockZoom15: '#7a6058',
    ice: '#8ab4cc',
    iceZoom4: '#7aa4bc',
    iceZoom12: '#b0ccd8',
    wetland: '#4e7a70',
    wetlandLight: '#5a8a7e',
    sand: '#6a5040',
    peak: '#c8a890',
    volcano: '#a86848',
    volcanoLabel: '#d49878',
  },
  background: [
    0, '#6a2410',
    3, '#4a1808',
    5, '#3a1408',
    7, '#321208',
    9, '#2a1006',
    11, '#240e05',
    13, '#1e0c04',
  ],
  building: {
    fill: ['#5c2818', '#6a3018', '#783818', '#864020'],
    outline: ['#4a2010', '#582810', '#663018', '#743820'],
    top: '#8a4828',
    topOutline: '#a85830',
  },
  boundary: {
    country: '#d4a888',
    region: '#b88868',
    department: '#a87858',
  },
  labelRoad: {
    highway: '#f0d8c8',
    major: '#e8c8b0',
    minor: '#d8b898',
  },
  labelPlace: {
    suburb: '#f8ece4',
    town: '#fff4ec',
    city: '#fff4ec',
    region: '#f8ece4',
    country: '#fff4ec',
  },
};

/** Orange brûlé — fond chaud ; végétation verte et eau bleue lisibles. */
const SUNSET_PALETTE = {
  name: 'Our Space — Carte orange',
  greenOpacity: 0.68,
  forestOpacity: 0.74,
  labelHalo: '#4a1808',
  road: {
    highway: '#f0c8a0',
    major: '#e0a878',
    minor: '#c89058',
    path: '#a87848',
    tunnel: '#d0a070',
  },
  green: {
    main: '#4a7260',
    light: '#557a68',
    soft: '#416858',
    earth: '#385a4c',
    meadow: '#5a7f6c',
    forest: '#3a6452',
  },
  urban: {
    subtle: '#b85014',
    main: '#8a3a0c',
    light: '#c86020',
  },
  water: {
    deep: '#1a4568',
    mid: '#215a82',
    near: '#286890',
    zoom14: '#2f7298',
    line: '#458eb4',
    lineSoft: '#3a7fa6',
    lineZoom14: '#52a0c4',
    label: '#7ab4d4',
    labelHalo: '#102c44',
  },
  nature: {
    farmland: '#8a4820',
    farmlandLight: '#985028',
    farmlandMid: '#7a4018',
    farmlandGreen: '#5a7a5e',
    farmlandZoom4: '#66785a',
    farmlandZoom15: '#6e2e08',
    rock: '#5a4840',
    rockLight: '#6a5850',
    rockBright: '#7a6860',
    rockZoom11: '#7a6058',
    rockZoom15: '#8a7068',
    ice: '#8ab4cc',
    iceZoom4: '#7aa4bc',
    iceZoom12: '#b0ccd8',
    wetland: '#4e7a70',
    wetlandLight: '#5a8a7e',
    sand: '#8a6848',
    peak: '#e8c0a0',
    volcano: '#c87848',
    volcanoLabel: '#e8a878',
  },
  background: [
    0, '#d06822',
    3, '#b85014',
    5, '#963a0e',
    7, '#8a3a0c',
    9, '#742e0a',
    11, '#5e2408',
    13, '#4a1c06',
  ],
  building: {
    fill: ['#a85828', '#b86030', '#c86838', '#d07040'],
    outline: ['#884818', '#985020', '#a85828', '#b86030'],
    top: '#d87840',
    topOutline: '#e88850',
  },
  boundary: {
    country: '#f0c8a0',
    region: '#e0a878',
    department: '#d09868',
  },
  labelRoad: {
    highway: '#fff0e0',
    major: '#ffe8d0',
    minor: '#f0d0b0',
  },
  labelPlace: {
    suburb: '#fff4ec',
    town: '#fff8f0',
    city: '#fff8f0',
    region: '#fff4ec',
    country: '#fff8f0',
  },
};

function greenMeadow(green) {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    0, green.meadow,
    8, green.light,
    14, green.main,
  ];
}

function greenForest(green) {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    0, green.forest,
    8, green.soft,
    14, green.earth,
  ];
}

function backgroundColor(palette) {
  const [z0, c0, z3, c3, z5, c5, z7, c7, z9, c9, z11, c11, z13, c13] = palette.background;
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    z0, c0,
    z3, c3,
    z5, c5,
    z7, c7,
    z9, c9,
    z11, c11,
    z13, c13,
  ];
}

function createOurSpaceMapStyle(palette) {
  const { road, green, urban, water, nature, building, boundary, labelRoad, labelPlace } = palette;

  return {
  version: 8,
  name: palette.name,
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
        'background-color': backgroundColor(palette),
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
          2, water.deep,
          6, water.mid,
          11, water.near,
          14, water.zoom14,
        ],
        'fill-antialias': true,
        'fill-opacity': appear(1, 1.5),
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
          3, water.lineSoft,
          10, water.line,
          14, water.lineZoom14,
        ],
        'line-width': zoomEase(3, 0.5, 6, 0.8, 10, 1.2, 14, 2, 17, 3.2),
        'line-opacity': appear(1, 2.4),
      },
    },
    {
      id: 'landcover-green-base',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landcover',
      paint: {
        'fill-color': greenMeadow(green),
        'fill-opacity': appear(0.35, 0),
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
          0, nature.farmlandGreen,
          4, nature.farmlandZoom4,
          7, nature.farmlandMid,
          10, nature.farmlandLight,
          13, nature.farmland,
          15, nature.farmlandZoom15,
        ],
        'fill-opacity': appear(0.72, 0),
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
        'fill-color': greenMeadow(green),
        'fill-opacity': appear(palette.greenOpacity, 3),
        'fill-antialias': true,
      },
    },
    {
      id: 'landcover-meadow',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landcover',
      filter: [
        'all',
        ['==', ['get', 'class'], 'grass'],
        ['in', ['get', 'subclass'], ['literal', ['meadow', 'grassland', 'heath', 'fell', 'tundra', 'grass']]],
      ],
      paint: {
        'fill-color': greenMeadow(green),
        'fill-opacity': appear(palette.greenOpacity, 8),
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
        'fill-color': greenForest(green),
        'fill-opacity': appear(palette.forestOpacity, 4),
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
          0, nature.wetlandLight,
          6, nature.wetland,
          12, nature.wetlandLight,
          14, green.earth,
        ],
        'fill-opacity': appear(0.72, 0),
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
          4, nature.rockBright,
          7, nature.rockLight,
          11, nature.rockZoom11,
          15, nature.rockZoom15,
        ],
        'fill-opacity': appear(0.72, 4),
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
          4, nature.iceZoom4,
          8, nature.ice,
          12, nature.iceZoom12,
        ],
        'fill-opacity': appear(0.75, 3),
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
        'fill-color': nature.sand,
        'fill-opacity': appear(0.55, 9),
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
        'fill-color': greenMeadow(green),
        'fill-opacity': appear(palette.greenOpacity, 5),
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
        'fill-color': greenForest(green),
        'fill-opacity': appear(palette.forestOpacity, 5),
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
        'fill-color': greenMeadow(green),
        'fill-opacity': appear(palette.greenOpacity, 6),
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
        'fill-color': greenMeadow(green),
        'fill-opacity': appear(palette.greenOpacity, 6),
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
          5, urban.subtle,
          9, urban.main,
          13, urban.light,
        ],
        'fill-opacity': appear(0.62, 6),
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
          10, building.fill[0],
          11, building.fill[1],
          13, building.fill[2],
          16, building.fill[3],
        ],
        'fill-outline-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, building.outline[0],
          11, building.outline[1],
          13, building.outline[2],
          16, building.outline[3],
        ],
        'fill-opacity': appear(0.88, 13),
        'fill-antialias': true,
      },
    },
    {
      id: 'building-top',
      type: 'fill',
      source: 'carto',
      'source-layer': 'building',
      paint: {
        'fill-color': building.top,
        'fill-outline-color': building.topOutline,
        'fill-opacity': appear(0.72, 14.5),
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
        'line-color': road.path,
        'line-width': zoomEase(14, 0, 14.7, 0.2, 15.5, 0.45, 18, 1.0),
        'line-dasharray': [2, 2],
        'line-opacity': appear(0.65, 14),
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
        'line-color': road.minor,
        'line-width': zoomEase(12, 0, 12.7, 0.2, 14, 0.45, 16, 0.9, 18, 1.6),
        'line-opacity': appear(0.88, 12),
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
        'line-color': road.major,
        'line-width': zoomEase(8, 0, 8.8, 0.12, 10, 0.45, 13, 1.4, 16, 2.4, 18, 3.2),
        'line-opacity': appear(0.85, 8),
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
        'line-color': road.highway,
        'line-width': zoomEase(4, 0.45, 7, 0.9, 10, 1.6, 13, 2.6, 16, 4.0, 18, 5.0),
        'line-opacity': appear(0.97, 4),
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
        'line-color': road.tunnel,
        'line-width': zoomEase(13, 0, 13.8, 0.1, 14.5, 0.28, 16, 0.8, 17, 1.6),
        'line-dasharray': [3, 3],
        'line-opacity': appear(0.58, 13),
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
        'line-color': boundary.country,
        'line-width': zoomEase(2, 1, 5, 1.4, 8, 1.8, 12, 2.2),
        'line-opacity': appear(0.75, 0.8),
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
        'line-color': boundary.region,
        'line-width': zoomEase(4, 0.7, 8, 1, 12, 1.3),
        'line-dasharray': [5, 3],
        'line-opacity': appear(0.65, 2.8),
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
        'line-color': boundary.department,
        'line-width': zoomEase(5, 0.55, 9, 0.85, 13, 1.3),
        'line-dasharray': [3, 2],
        'line-opacity': appear(0.5, 4.5),
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
        'text-font': ['Montserrat Regular', 'Open Sans Regular', 'Noto Sans Regular'],
        'text-size': zoomEase(9, 7, 11, 9, 14, 11, 16, 12),
        'text-max-angle': 30,
      },
      paint: {
        'text-color': labelRoad.highway,
        'text-halo-color': palette.labelHalo,
        'text-halo-width': 1.2,
        'text-opacity': appear(0.88, 9),
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
        'text-font': ['Montserrat Regular', 'Open Sans Regular', 'Noto Sans Regular'],
        'text-size': zoomEase(11, 7, 13, 9, 16, 12),
        'text-max-angle': 30,
      },
      paint: {
        'text-color': labelRoad.major,
        'text-halo-color': palette.labelHalo,
        'text-halo-width': 1.2,
        'text-opacity': appear(0.78, 11),
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
        'text-font': ['Montserrat Regular', 'Open Sans Regular', 'Noto Sans Regular'],
        'text-size': zoomEase(14, 6, 15, 8, 16, 10, 18, 12),
        'text-max-angle': 30,
      },
      paint: {
        'text-color': labelRoad.minor,
        'text-halo-color': palette.labelHalo,
        'text-halo-width': 1.1,
        'text-opacity': appear(0.72, 14),
      },
    },
    {
      id: 'label-water',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'water_name',
      maxzoom: 13,
      filter: ['in', ['get', 'class'], ['literal', ['ocean', 'sea', 'lake', 'bay', 'strait']]],
      layout: {
        'text-field': FRENCH_NAME,
        'text-font': ['Montserrat Medium Italic', 'Open Sans Italic', 'Noto Sans Regular'],
        'text-size': zoomEase(0, 11, 3, 13, 6, 16, 10, 18),
        'text-letter-spacing': 0.04,
      },
      paint: {
        'text-color': water.label,
        'text-halo-color': water.labelHalo,
        'text-halo-width': 1.4,
        'text-opacity': appear(1, 0.5),
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
        'text-font': ['Montserrat Regular Italic', 'Open Sans Italic', 'Noto Sans Regular'],
        'text-size': zoomEase(5, 8, 10, 10, 14, 12),
        'symbol-spacing': 250,
      },
      paint: {
        'text-color': water.label,
        'text-halo-color': water.labelHalo,
        'text-halo-width': 1.2,
        'text-opacity': appear(1, 3.8),
      },
    },
    {
      id: 'label-place-suburb',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      minzoom: 9,
      maxzoom: 17,
      filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter']]],
      layout: {
        'text-field': FRENCH_NAME,
        'text-font': ['Montserrat Medium', 'Open Sans Bold', 'Noto Sans Regular'],
        'text-size': zoomEase(9, 11, 13, 13, 15, 14),
        'text-anchor': 'center',
      },
      paint: {
        'text-color': labelPlace.suburb,
        'text-halo-color': palette.labelHalo,
        'text-halo-width': 1.3,
        'text-opacity': appear(1, 10),
      },
    },
    {
      id: 'label-place-town',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      minzoom: 6,
      maxzoom: 16,
      filter: ['in', ['get', 'class'], ['literal', ['town', 'village']]],
      layout: {
        'text-field': FRENCH_NAME,
        'text-font': ['Montserrat Medium', 'Open Sans Bold', 'Noto Sans Regular'],
        'text-size': zoomEase(7, 10, 11, 12, 13, 14),
        'text-anchor': 'center',
      },
      paint: {
        'text-color': labelPlace.town,
        'text-halo-color': palette.labelHalo,
        'text-halo-width': 1.4,
        'text-opacity': appear(1, 7),
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
        'text-font': ['Montserrat Medium', 'Open Sans Bold', 'Noto Sans Regular'],
        'text-size': zoomEase(4, 11, 8, 15, 12, 20, 16, 24),
        'text-anchor': 'center',
      },
      paint: {
        'text-color': labelPlace.city,
        'text-halo-color': palette.labelHalo,
        'text-halo-width': 1.6,
        'text-opacity': appear(1, 2.8),
      },
    },
    {
      id: 'label-place-region',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      maxzoom: 9,
      filter: ['in', ['get', 'class'], ['literal', ['state', 'region']]],
      layout: {
        'text-field': FRENCH_NAME,
        'text-font': ['Montserrat Medium', 'Open Sans Bold', 'Noto Sans Regular'],
        'text-size': zoomEase(3, 10, 6, 13, 9, 16),
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.06,
      },
      paint: {
        'text-color': labelPlace.region,
        'text-halo-color': palette.labelHalo,
        'text-halo-width': 1.4,
        'text-opacity': appear(1, 2),
      },
    },
    {
      id: 'label-place-country',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      maxzoom: 7,
      filter: ['==', ['get', 'class'], 'country'],
      layout: {
        'text-field': FRENCH_NAME,
        'text-font': ['Montserrat Medium', 'Open Sans Bold', 'Noto Sans Regular'],
        'text-size': zoomEase(2, 10, 5, 14),
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.08,
      },
      paint: {
        'text-color': labelPlace.country,
        'text-halo-color': palette.labelHalo,
        'text-halo-width': 1.5,
        'text-opacity': appear(1, 0.5),
      },
    },
    {
      id: 'mountain-peak-dot',
      type: 'circle',
      source: 'carto',
      'source-layer': 'mountain_peak',
      filter: ['in', ['get', 'class'], ['literal', ['peak', 'volcano']]],
      paint: {
        'circle-radius': zoomEase(8, 0, 9, 1.5, 11, 3, 14, 4),
        'circle-color': [
          'match',
          ['get', 'class'],
          'volcano', nature.volcano,
          nature.rockLight,
        ],
        'circle-stroke-width': 1.2,
        'circle-stroke-color': nature.peak,
        'circle-opacity': appear(0.78, 8),
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
        'text-font': ['Montserrat Medium', 'Open Sans Bold', 'Noto Sans Regular'],
        'text-size': zoomEase(8, 7, 10, 8, 14, 12),
        'text-anchor': 'top',
        'text-offset': [0, 0.55],
        'text-max-width': 8,
        'symbol-sort-key': ['get', 'rank'],
      },
      paint: {
        'text-color': [
          'match',
          ['get', 'class'],
          'volcano', nature.volcanoLabel,
          nature.peak,
        ],
        'text-halo-color': palette.labelHalo,
        'text-halo-width': 1.4,
        'text-opacity': appear(0.9, 8),
      },
    },
  ],
  };
}

export const OUR_SPACE_MAP_STYLE = createOurSpaceMapStyle(DEFAULT_PALETTE);
/** Style basemap — palette fixe (vert sage), indépendante du thème app. */
export function getOurSpaceMapStyle() {
  return OUR_SPACE_MAP_STYLE;
}
