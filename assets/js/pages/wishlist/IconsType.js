import { Heart } from '../../vendor/lucide.mjs';
import { renderLucideIcon } from '../../lib/lucide-icon.js';

const PRIORITY_ICON_CLASS = {
  haute: 'wishlist-priority-icon--high',
  moyenne: 'wishlist-priority-icon--medium',
  basse: 'wishlist-priority-icon--low',
};

export function renderWishlistPriorityIcon(priorite, options = {}) {
  const className = PRIORITY_ICON_CLASS[priorite] || PRIORITY_ICON_CLASS.moyenne;
  const fill = priorite === 'haute' ? 'currentColor' : 'none';
  return `<span class="wishlist-priority-icon ${className}">${renderLucideIcon(Heart, { strokeWidth: 2, fill, ...options })}</span>`;
}
