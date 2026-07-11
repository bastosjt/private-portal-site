import { Heart } from '../../vendor/lucide.mjs';
import { renderLucideIcon } from '../../lib/lucide-icon.js';

const PRIORITY_ICON_CLASS = {
  haute: 'wishlist-icon--high',
  moyenne: 'wishlist-icon--medium',
  basse: 'wishlist-icon--low',
};

export function renderWishlistPriorityIcon(priorite, options = {}) {
  const className = PRIORITY_ICON_CLASS[priorite] || PRIORITY_ICON_CLASS.moyenne;
  const fill = priorite === 'haute' ? 'currentColor' : 'none';
  return `<span class="wishlist-priority-icon ${className}">${renderLucideIcon(Heart, { strokeWidth: 2, fill, ...options })}</span>`;
}
