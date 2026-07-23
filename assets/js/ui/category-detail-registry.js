import { getCategoryById, BASE_THEME } from '../config.js';
import { initActivityDetail } from './activity-detail.js';
import { initRestaurantDetail } from './restaurant-detail.js';
import { initMovieDetail } from './movie-detail.js';
import { initTravelDetail } from './travel-detail.js';
import { initWishlistDetail } from './wishlist-detail.js';

const DETAIL_INIT_BY_CATEGORY = {
  activities: initActivityDetail,
  restaurants: initRestaurantDetail,
  movies: initMovieDetail,
  travels: initTravelDetail,
  wishlist: initWishlistDetail,
};

function getCategoryTheme(categoryId) {
  return getCategoryById(categoryId)?.theme || BASE_THEME;
}

export function initCategoryDetailModals(categoryIds, handlers = {}) {
  const modals = {};

  for (const categoryId of categoryIds) {
    const initFn = DETAIL_INIT_BY_CATEGORY[categoryId];
    if (!initFn) continue;

    modals[categoryId]?.destroy?.();
    modals[categoryId] = initFn({
      onChanged: handlers.onChanged,
      onClose: handlers.onClose,
      onEdit: handlers.onEdit ? (item) => handlers.onEdit(categoryId, item) : undefined,
      onMovePin: handlers.onMovePin ? (item) => handlers.onMovePin(categoryId, item) : undefined,
      theme: getCategoryTheme(categoryId),
    });
  }

  return modals;
}

export function destroyCategoryDetailModals(modals) {
  Object.values(modals).forEach((modal) => modal?.destroy?.());
}
