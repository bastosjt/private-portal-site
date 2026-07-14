import { createElement } from '../../vendor/lucide.mjs';
import { getActivityTypeLucideIcon } from '../activites/IconsType.js';
import { getRestaurantTypeLucideIcon } from '../restaurants/IconsType.js';
import { getTravelTypeLucideIcon } from '../voyages/IconsType.js';

const MARKER_FILL = '#1f2229';
const PIN_PATH = 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0';
/** Disque plein (circle-small r=6) — masque le trou du pin sous l’icône */
const ICON_DISC = { cx: 12, cy: 10, r: 6 };
const PIN_STROKE = 0.75;

const CATEGORY_COLORS = {
  activities: '#f97316',
  restaurants: '#f43f5e',
  travels: '#0ea5e9',
};

function normalizeTypeKey(typeValue) {
  const raw = String(typeValue || '').trim();
  return raw || 'default';
}

function getMarkerTypeValue(marker) {
  if (marker.categoryId === 'activities') return marker.activityType;
  if (marker.categoryId === 'restaurants') return marker.restaurantType;
  if (marker.categoryId === 'travels') return marker.travelType;
  return '';
}

function getMarkerLucideIcon(marker) {
  if (marker.categoryId === 'activities') return getActivityTypeLucideIcon(marker.activityType);
  if (marker.categoryId === 'restaurants') return getRestaurantTypeLucideIcon(marker.restaurantType);
  if (marker.categoryId === 'travels') return getTravelTypeLucideIcon(marker.travelType);
  return getActivityTypeLucideIcon('');
}

export function getMarkerIconImageId(marker) {
  const typeKey = normalizeTypeKey(getMarkerTypeValue(marker));
  return `map-pin-${marker.categoryId}-${typeKey}`;
}

function markerFromImageId(imageId) {
  const match = /^map-pin-(activities|restaurants|travels)-(.+)$/.exec(imageId);
  if (!match) return null;

  const categoryId = match[1];
  const typeValue = match[2] === 'default' ? '' : match[2];

  return {
    categoryId,
    activityType: categoryId === 'activities' ? typeValue : '',
    restaurantType: categoryId === 'restaurants' ? typeValue : '',
    travelType: categoryId === 'travels' ? typeValue : '',
  };
}

const pendingMarkerImageLoads = new Set();

async function loadMarkerImageById(map, imageId) {
  if (!map || map.hasImage(imageId) || pendingMarkerImageLoads.has(imageId)) return false;

  const marker = markerFromImageId(imageId);
  if (!marker) return false;

  pendingMarkerImageLoads.add(imageId);
  try {
    await ensureMapMarkerImages(map, [marker]);
    return map.hasImage(imageId);
  } finally {
    pendingMarkerImageLoads.delete(imageId);
  }
}

export function bindMapMarkerImageFallback(map) {
  if (!map || map._mapMarkerImageFallbackBound) return;
  map._mapMarkerImageFallbackBound = true;

  map.on('styleimagemissing', (event) => {
    const { id } = event;
    if (!id?.startsWith('map-pin-') || map.hasImage(id)) return;

    loadMarkerImageById(map, id)
      .then((loaded) => {
        if (loaded) map.triggerRepaint();
      })
      .catch((err) => {
        console.warn('styleimagemissing:', id, err.message);
      });
  });
}

export function collectMarkerImageDescriptors(markers) {
  const seen = new Set();
  const descriptors = [];

  for (const marker of markers) {
    const imageId = getMarkerIconImageId(marker);
    if (seen.has(imageId)) continue;
    seen.add(imageId);

    descriptors.push({
      imageId,
      color: CATEGORY_COLORS[marker.categoryId],
      Icon: getMarkerLucideIcon(marker),
    });
  }

  return descriptors;
}

function getIconMarkup(Icon) {
  const svg = createElement(Icon, {
    width: 24,
    height: 24,
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  return svg.innerHTML;
}

function buildMarkerSvg({ color, Icon }) {
  const iconMarkup = getIconMarkup(Icon);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24">
  <path
    d="${PIN_PATH}"
    fill="${MARKER_FILL}"
    stroke="${color}"
    stroke-width="${PIN_STROKE}"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle
    cx="${ICON_DISC.cx}"
    cy="${ICON_DISC.cy}"
    r="${ICON_DISC.r}"
    fill="${MARKER_FILL}"
    stroke="${MARKER_FILL}"
    stroke-width="1"
  />
  <g
    transform="translate(${ICON_DISC.cx} ${ICON_DISC.cy}) scale(0.32) translate(-12 -12)"
    fill="none"
    stroke="${color}"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    ${iconMarkup}
  </g>
</svg>`.trim();
}

function svgToImage(svgString) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Impossible de charger l’icône de marqueur'));
    img.src = dataUrl;
  });
}

export async function ensureMapMarkerImages(map, markers = []) {
  if (!map) return;

  const descriptors = collectMarkerImageDescriptors(markers);
  const missing = descriptors.filter((descriptor) => !map.hasImage(descriptor.imageId));
  if (missing.length === 0) return;

  await Promise.all(missing.map(async (descriptor) => {
    if (map.hasImage(descriptor.imageId)) return;

    try {
      const image = await svgToImage(buildMarkerSvg(descriptor));
      if (!map.hasImage(descriptor.imageId)) {
        map.addImage(descriptor.imageId, image, { pixelRatio: 2 });
      }
    } catch (err) {
      console.warn('ensureMapMarkerImages:', descriptor.imageId, err.message);
    }
  }));
}

export function resetMapMarkerImages() {
  // Les images MapLibre sont recréées au prochain chargement de style.
}
