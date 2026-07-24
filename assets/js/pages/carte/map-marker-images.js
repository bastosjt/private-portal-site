import { createElement, Check, Clock } from '../../vendor/lucide.mjs';
import { renderLucideIcon } from '../../lib/lucide-icon.js';
import { getActivityTypeLucideIcon } from '../activites/IconsType.js';
import { getRestaurantTypeLucideIcon } from '../restaurants/IconsType.js';
import { getTravelTypeLucideIcon } from '../voyages/IconsType.js';

const MARKER_FILL = '#1f2229';
const PIN_PATH = 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0';
/** Disque plein (circle-small r=6) — masque le trou du pin sous l’icône */
const ICON_DISC = { cx: 12, cy: 10, r: 6 };
const PIN_STROKE = 0.75;

export const MAP_MARKER_DONE_BADGE_ID = 'map-pin-done-badge-v2';
export const MAP_MARKER_LIMITED_BADGE_ID = 'map-pin-limited-badge-v2';
/** Vert « réalisé » (aligné sur .act-done-card) */
const DONE_BADGE_GREEN = '#4ade80';
/** Coin supérieur droit de la tête du pin (viewBox 24×24, ancrage bas). */
const MAP_MARKER_OVERLAY_ANCHOR = { cx: 17.2, cy: 5.2 };
const OVERLAY_BADGE_SCALE = 0.44;
const OVERLAY_BADGE_CIRCLE_R = 11;
const OVERLAY_BADGE_ICON_SCALE = 0.56;
const OVERLAY_BADGE_ICON_STROKE = 2.15;
const OVERLAY_BADGE_BORDER_OPACITY = 0.28;
const OVERLAY_BADGE_SHADOW = {
  dy: 1.35,
  blur: 0.7,
  opacity: 0.55,
};

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

export function getMapMarkerCategoryColor(categoryId) {
  return CATEGORY_COLORS[categoryId] || CATEGORY_COLORS.activities;
}

export function getMarkerPinColor(marker) {
  return CATEGORY_COLORS[marker.categoryId] || CATEGORY_COLORS.activities;
}

function getMarkerIconColor(marker) {
  return getMarkerPinColor(marker);
}

export function renderMapMarkerTypeIcon(marker, options = {}) {
  const Icon = getMarkerLucideIcon(marker);
  return renderLucideIcon(Icon, { strokeWidth: 2, width: 16, height: 16, ...options });
}

export function getMarkerIconImageId(marker) {
  const typeKey = normalizeTypeKey(getMarkerTypeValue(marker));
  if (marker.categoryId === 'travels') {
    return `map-pin-travels-${typeKey}-blue`;
  }
  return `map-pin-${marker.categoryId}-${typeKey}`;
}

function markerFromImageId(imageId) {
  const travelMatch = /^map-pin-travels-(.+)-blue$/.exec(imageId);
  if (travelMatch) {
    const typeValue = travelMatch[1] === 'default' ? '' : travelMatch[1];
    return {
      categoryId: 'travels',
      activityType: '',
      restaurantType: '',
      travelType: typeValue,
    };
  }

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
      color: getMarkerPinColor(marker),
      iconColor: getMarkerIconColor(marker),
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

function buildMarkerSvg({ color, iconColor = color, Icon }) {
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
    stroke="${iconColor}"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    ${iconMarkup}
  </g>
</svg>`.trim();
}

function buildOverlayBadgeSvg({ filterId, color, iconMarkup }) {
  const { cx, cy } = MAP_MARKER_OVERLAY_ANCHOR;
  const transform = `translate(${cx} ${cy}) scale(${OVERLAY_BADGE_SCALE}) translate(-12 -12)`;
  const { dy, blur, opacity } = OVERLAY_BADGE_SHADOW;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24">
  <defs>
    <filter id="${filterId}" x="-35%" y="-15%" width="170%" height="185%">
      <feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="${color}" flood-opacity="${opacity}"/>
    </filter>
  </defs>
  <g transform="${transform}" filter="url(#${filterId})">
    <circle
      cx="12"
      cy="12"
      r="${OVERLAY_BADGE_CIRCLE_R}"
      fill="${MARKER_FILL}"
      stroke="${color}"
      stroke-width="0.5"
      stroke-opacity="${OVERLAY_BADGE_BORDER_OPACITY}"
    />
    <g
      transform="translate(12 12) scale(${OVERLAY_BADGE_ICON_SCALE}) translate(-12 -12)"
      fill="none"
      stroke="${color}"
      stroke-width="${OVERLAY_BADGE_ICON_STROKE}"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      ${iconMarkup}
    </g>
  </g>
</svg>`.trim();
}

function buildDoneBadgeSvg() {
  return buildOverlayBadgeSvg({
    filterId: 'map-pin-done-shadow',
    color: DONE_BADGE_GREEN,
    iconMarkup: getIconMarkup(Check),
  });
}

function buildLimitedBadgeSvg() {
  return buildOverlayBadgeSvg({
    filterId: 'map-pin-limited-shadow',
    color: CATEGORY_COLORS.activities,
    iconMarkup: getIconMarkup(Clock),
  });
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

const globalImageCache = new Map();
const imageBuildPromises = new Map();

function getOrBuildCachedImage(imageId, buildSvg) {
  const cached = globalImageCache.get(imageId);
  if (cached) return Promise.resolve(cached);

  const pending = imageBuildPromises.get(imageId);
  if (pending) return pending;

  const promise = svgToImage(buildSvg())
    .then((image) => {
      globalImageCache.set(imageId, image);
      imageBuildPromises.delete(imageId);
      return image;
    })
    .catch((err) => {
      imageBuildPromises.delete(imageId);
      throw err;
    });

  imageBuildPromises.set(imageId, promise);
  return promise;
}

async function addCachedImageToMap(map, imageId, buildSvg) {
  if (!map || map.hasImage(imageId)) return;

  try {
    const image = await getOrBuildCachedImage(imageId, buildSvg);
    if (!map.hasImage(imageId)) {
      map.addImage(imageId, image, { pixelRatio: 2 });
    }
  } catch (err) {
    console.warn('addCachedImageToMap:', imageId, err.message);
  }
}

export async function preloadMapMarkerImages(markers = []) {
  const descriptors = collectMarkerImageDescriptors(markers);
  await Promise.all([
    getOrBuildCachedImage(MAP_MARKER_DONE_BADGE_ID, buildDoneBadgeSvg),
    getOrBuildCachedImage(MAP_MARKER_LIMITED_BADGE_ID, buildLimitedBadgeSvg),
    ...descriptors.map((descriptor) => getOrBuildCachedImage(
      descriptor.imageId,
      () => buildMarkerSvg(descriptor),
    )),
  ]);
}

export async function ensureMapMarkerDoneBadge(map) {
  await addCachedImageToMap(map, MAP_MARKER_DONE_BADGE_ID, buildDoneBadgeSvg);
}

export async function ensureMapMarkerLimitedBadge(map) {
  await addCachedImageToMap(map, MAP_MARKER_LIMITED_BADGE_ID, buildLimitedBadgeSvg);
}

export async function ensureMapMarkerOverlayBadges(map) {
  await Promise.all([
    ensureMapMarkerDoneBadge(map),
    ensureMapMarkerLimitedBadge(map),
  ]);
}

export async function ensureMapMarkerImages(map, markers = []) {
  if (!map) return;

  await ensureMapMarkerOverlayBadges(map);

  const descriptors = collectMarkerImageDescriptors(markers);
  const missing = descriptors.filter((descriptor) => !map.hasImage(descriptor.imageId));
  if (missing.length === 0) return;

  await Promise.all(missing.map(async (descriptor) => {
    if (map.hasImage(descriptor.imageId)) return;
    await addCachedImageToMap(
      map,
      descriptor.imageId,
      () => buildMarkerSvg(descriptor),
    );
  }));
}

export function resetMapMarkerImages() {
  globalImageCache.clear();
  imageBuildPromises.clear();
}
