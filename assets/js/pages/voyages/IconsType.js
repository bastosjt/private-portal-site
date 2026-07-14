/**
 * Icônes par type de voyage — clé = value du champ `type` (config.js).
 */
import {
  Car,
  Palmtree,
  Plane,
} from '../../vendor/lucide.mjs';
import { renderLucideIcon } from '../../lib/lucide-icon.js';

const ICON_REGISTRY = {
  plane: Plane,
  car: Car,
  palmtree: Palmtree,
};

const TRAVEL_TYPE_ICONS = {
  week_end: 'palmtree',
  road_trip: 'car',
};

export function getTravelTypeLucideIcon(typeValue) {
  const iconName = TRAVEL_TYPE_ICONS[typeValue] || 'plane';
  return ICON_REGISTRY[iconName] || Plane;
}

export function renderTravelTypeIcon(typeValue, options = {}) {
  const Icon = getTravelTypeLucideIcon(typeValue);
  return renderLucideIcon(Icon, { strokeWidth: 2, ...options });
}
