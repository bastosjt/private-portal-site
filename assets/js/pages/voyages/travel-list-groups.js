import { getCachedItems, findCachedItemById } from '../../data/appDataCache.js';
import { getFieldOptionLabel } from '../../lib/custom-types.js';
import { formatItemPrice, hasItemPrice } from '../../lib/price-format.js';
import { getCategoryStatusLabels } from '../../lib/category-status-labels.js';
import { renderActivityTypeIcon } from '../activites/IconsType.js';
import {
  getActivityListMetaParts,
  hasActivitySchedule,
  renderActivityScheduleNote,
} from '../activites/scheduleDisplay.js';
import { renderRestaurantTypeIcon } from '../restaurants/IconsType.js';
import { renderTravelTypeIcon } from './IconsType.js';
import { renderGeoCategoryLocation } from '../shared/listLocation.js';
import { initTravelDetail } from '../../ui/travel-detail.js';
import { initActivityDetail } from '../../ui/activity-detail.js';
import { initRestaurantDetail } from '../../ui/restaurant-detail.js';
import { getCategoryById } from '../../config.js';
import { CalendarClock } from '../../vendor/lucide.mjs';
import { renderLucideIcon } from '../../lib/lucide-icon.js';

const TRAVEL_STATUS = getCategoryStatusLabels('travels');
const ACTIVITY_STATUS = getCategoryStatusLabels('activities');
const RESTAURANT_STATUS = getCategoryStatusLabels('restaurants');
const TRAVEL_STATUS_BADGE = { doneLabel: TRAVEL_STATUS.done, todoLabel: TRAVEL_STATUS.todo };
const ACTIVITY_STATUS_BADGE = { doneLabel: ACTIVITY_STATUS.done, todoLabel: ACTIVITY_STATUS.todo };
const RESTAURANT_STATUS_BADGE = { doneLabel: RESTAURANT_STATUS.done, todoLabel: RESTAURANT_STATUS.todo };
const PERIOD_ICON = renderLucideIcon(CalendarClock, { strokeWidth: 2, width: 16, height: 16 });

const scheduleNoteOptions = {
  getDisponibiliteLabel: (value) => getFieldOptionLabel('activities', 'disponibilite', value),
  showPeriod: false,
};

function formatBudgetLabel(budget) {
  const value = String(budget || '').trim();
  if (!value) return '';
  return value.includes('€') ? value : `${value} €`;
}

function getTravelFieldLabel(fieldName, value) {
  return getFieldOptionLabel('travels', fieldName, value);
}

function getTravelMetaLine(travel) {
  const parts = [];
  if (travel.type) parts.push(getTravelFieldLabel('type', travel.type));
  const budgetLabel = formatBudgetLabel(travel.budget);
  if (budgetLabel) parts.push(budgetLabel);
  return parts.join(' · ') || 'Voyage';
}

function renderStatusBadge(done, { doneLabel, todoLabel }) {
  return `
    <span class="act-list-status ${done ? 'act-list-status--done' : 'act-list-status--todo'}">
      ${done ? `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      ` : `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/>
        </svg>
      `}
      ${done ? doneLabel : todoLabel}
    </span>
  `;
}

function sortLinkedItems(items, titleKey) {
  return [...items].sort((a, b) =>
    (a[titleKey] || '').localeCompare(b[titleKey] || '', 'fr', { sensitivity: 'base' }),
  );
}

function getLinkedItemsForTravel(travelId) {
  const activities = sortLinkedItems(
    (getCachedItems('activities') || []).filter((item) => item.travelId === travelId),
    'nom',
  );
  const restaurants = sortLinkedItems(
    (getCachedItems('restaurants') || []).filter((item) => item.travelId === travelId),
    'nom',
  );
  return { activities, restaurants };
}

export function renderTravelListGroups(travels, { activeFilters }) {
  if (activeFilters.status !== 'all') return null;

  return travels.map((travel) => {
    const { activities, restaurants } = getLinkedItemsForTravel(travel.id);
    const linkedItems = [
      ...activities.map((item) => ({ ...item, _listKind: 'activity' })),
      ...restaurants.map((item) => ({ ...item, _listKind: 'restaurant' })),
    ];

    return {
      id: `travel-${travel.id}`,
      travel,
      linkedCount: linkedItems.length,
      items: linkedItems,
      collapsible: true,
      defaultCollapsed: true,
      groupClass: 'act-list-group--travel',
    };
  });
}

function renderTravelPeriodNote(travel, escapeHtml) {
  const periode = travel.periode?.trim();
  if (!periode) return '';

  return `
    <div class="act-schedule-note act-schedule-note--periode" role="note" aria-label="${escapeHtml(periode)}">
      <span class="act-schedule-note-icon" aria-hidden="true">${PERIOD_ICON}</span>
      <span class="act-schedule-note-copy">
        <span class="act-schedule-note-period">${escapeHtml(periode)}</span>
      </span>
    </div>
  `;
}

export function renderTravelGroupHead(group, { collapsed, escapeHtml }) {
  const travel = group.travel;
  if (!travel) return '';

  const title = travel.localisation?.trim() || travel.pays?.trim() || travel.destination || 'Voyage';
  const metaLine = getTravelMetaLine(travel);
  const linkedHint = group.linkedCount > 0
    ? `${group.linkedCount} ${group.linkedCount > 1 ? 'idées' : 'idée'}`
    : 'Aucune idée liée';

  return `
    <div class="travel-group-head">
      <article class="travel-group-card">
        <button
          type="button"
          class="travel-group-body"
          data-travel-id="${escapeHtml(travel.id)}"
          aria-label="Voir ${escapeHtml(title)}"
        >
          <div class="act-list-item-head travel-group-body-main">
            <span class="cat-panel-icon">${renderTravelTypeIcon(travel.type)}</span>
            <div class="act-list-item-body">
              <h3>${escapeHtml(title)}</h3>
              <p class="act-list-meta">${escapeHtml(metaLine)}</p>
            </div>
            ${renderStatusBadge(travel.done, TRAVEL_STATUS_BADGE)}
          </div>
          ${renderTravelPeriodNote(travel, escapeHtml)}
        </button>
        <button
          type="button"
          class="travel-group-toggle act-list-group-toggle"
          data-group-toggle="${escapeHtml(group.id)}"
          aria-expanded="${collapsed ? 'false' : 'true'}"
          aria-label="${collapsed ? 'Déplier' : 'Replier'} ${escapeHtml(title)}"
        >
          <span class="act-list-group-label">${escapeHtml(linkedHint)}</span>
          <svg class="act-list-group-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
      </article>
    </div>
  `;
}

function renderTravelGroupActivityItem(activity, index, { animate, escapeHtml }) {
  const metaLine = getActivityListMetaParts(activity, {
    getCategorieLabel: (value) => getFieldOptionLabel('activities', 'categorie', value),
    formatItemPrice,
  }).join(' · ') || 'Activité';
  const extraClasses = hasActivitySchedule(activity) ? ' act-list-item--scheduled' : '';

  return `
    <li class="act-list-item${activity.done ? ' act-list-item--done' : ''}${extraClasses}"${animate ? ` style="animation-delay: ${index * 40}ms"` : ''}>
      <div class="act-list-item-inner" data-activity-id="${escapeHtml(activity.id)}" role="button" tabindex="0" aria-label="Voir ${escapeHtml(activity.nom)}">
        <span class="cat-panel-accent" aria-hidden="true"></span>
        <div class="act-list-item-head">
          <span class="cat-panel-icon">${renderActivityTypeIcon(activity.categorie)}</span>
          <div class="act-list-item-body">
            <h3>${escapeHtml(activity.nom)}</h3>
            <p class="act-list-meta">${escapeHtml(metaLine)}</p>
          </div>
          ${renderStatusBadge(activity.done, ACTIVITY_STATUS_BADGE)}
        </div>
        ${renderActivityScheduleNote(activity, { ...scheduleNoteOptions, escapeHtml })}
        ${renderGeoCategoryLocation(activity, 'activities', { escapeHtml })}
      </div>
    </li>
  `;
}

function renderTravelGroupRestaurantItem(restaurant, index, { animate, escapeHtml }) {
  const type = restaurant.type
    ? escapeHtml(getFieldOptionLabel('restaurants', 'type', restaurant.type))
    : 'Restaurant';
  const cuisine = restaurant.cuisine
    ? escapeHtml(getFieldOptionLabel('restaurants', 'cuisine', restaurant.cuisine))
    : '';
  const price = hasItemPrice(restaurant) ? escapeHtml(formatItemPrice(restaurant)) : '';

  return `
    <li class="act-list-item${restaurant.done ? ' act-list-item--done' : ''}"${animate ? ` style="animation-delay: ${index * 40}ms"` : ''}>
      <div class="act-list-item-inner" data-restaurant-id="${escapeHtml(restaurant.id)}" role="button" tabindex="0" aria-label="Voir ${escapeHtml(restaurant.nom)}">
        <span class="cat-panel-accent" aria-hidden="true"></span>
        <div class="act-list-item-head">
          <span class="cat-panel-icon">${renderRestaurantTypeIcon(restaurant.type)}</span>
          <div class="act-list-item-body">
            <h3>${escapeHtml(restaurant.nom)}</h3>
            <div class="act-list-meta act-list-meta--restaurant">
              <span class="act-list-meta-type">${type}</span>
              ${cuisine || price ? `
                <span class="act-list-meta-sub">
                  ${cuisine ? `<span class="act-list-meta-cuisine">${cuisine}</span>` : ''}
                  ${price ? `<span class="act-list-meta-price">${price}</span>` : ''}
                </span>
              ` : ''}
            </div>
          </div>
          ${renderStatusBadge(restaurant.done, RESTAURANT_STATUS_BADGE)}
        </div>
        ${renderGeoCategoryLocation(restaurant, 'restaurants', { escapeHtml })}
      </div>
    </li>
  `;
}

export function renderTravelGroupListItem(item, index, opts) {
  if (item._listKind === 'activity') {
    return renderTravelGroupActivityItem(item, index, opts);
  }
  if (item._listKind === 'restaurant') {
    return renderTravelGroupRestaurantItem(item, index, opts);
  }
  return '';
}

export function resolveTravelListItemFromRow(row) {
  const activityId = row.dataset.activityId;
  if (activityId) {
    const item = findCachedItemById('activities', activityId);
    return item ? { ...item, _listKind: 'activity' } : null;
  }

  const restaurantId = row.dataset.restaurantId;
  if (restaurantId) {
    const item = findCachedItemById('restaurants', restaurantId);
    return item ? { ...item, _listKind: 'restaurant' } : null;
  }

  const travelId = row.dataset.travelId;
  if (travelId) {
    const item = findCachedItemById('travels', travelId);
    return item ? { ...item, _listKind: 'travel' } : null;
  }

  return null;
}

export function initTravelHubDetail({ onChanged, onEdit, onMovePin, onClose, theme = 'blue' } = {}) {
  const travelTheme = theme || getCategoryById('travels')?.theme || 'blue';
  const activityTheme = getCategoryById('activities')?.theme || 'cyan';
  const restaurantTheme = getCategoryById('restaurants')?.theme || 'rose';

  let activeModal = null;

  const travelDetail = initTravelDetail({
    theme: travelTheme,
    onChanged,
    onClose,
    onEdit: (item) => onEdit?.({ ...item, _editCategory: 'travels' }),
    onMovePin: onMovePin
      ? (item) => onMovePin({ ...item, _editCategory: 'travels' })
      : undefined,
  });

  const activityDetail = initActivityDetail({
    theme: activityTheme,
    onChanged,
    onClose,
    onEdit: (item) => onEdit?.({ ...item, _editCategory: 'activities' }),
    onMovePin: onMovePin
      ? (item) => onMovePin({ ...item, _editCategory: 'activities' })
      : undefined,
  });

  const restaurantDetail = initRestaurantDetail({
    theme: restaurantTheme,
    onChanged,
    onClose,
    onEdit: (item) => onEdit?.({ ...item, _editCategory: 'restaurants' }),
    onMovePin: onMovePin
      ? (item) => onMovePin({ ...item, _editCategory: 'restaurants' })
      : undefined,
  });

  const modals = {
    travel: travelDetail,
    activity: activityDetail,
    restaurant: restaurantDetail,
  };

  async function closeAll() {
    await Promise.all([
      travelDetail.close?.(),
      activityDetail.close?.(),
      restaurantDetail.close?.(),
    ]);
    activeModal = null;
  }

  return {
    async open(item) {
      await closeAll();
      activeModal = modals[item._listKind] || modals.travel;
      activeModal.open(item);
    },
    close: closeAll,
    destroy() {
      travelDetail.destroy?.();
      activityDetail.destroy?.();
      restaurantDetail.destroy?.();
      activeModal = null;
    },
  };
}
