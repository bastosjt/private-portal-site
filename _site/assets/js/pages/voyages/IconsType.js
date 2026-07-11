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

export function renderTravelTypeIcon(typeValue, options = {}) {
  const iconName = TRAVEL_TYPE_ICONS[typeValue] || 'plane';
  const Icon = ICON_REGISTRY[iconName] || Plane;
  return renderLucideIcon(Icon, { strokeWidth: 2, ...options });
}
