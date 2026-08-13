import { CalendarClock, Clock4 } from '../../vendor/lucide.mjs';
import { renderLucideIcon } from '../../lib/lucide-icon.js';
import { formatListItemPrice } from '../../lib/price-format.js';

const SCHEDULE_ICON = renderLucideIcon(CalendarClock, { strokeWidth: 2, width: 16, height: 16 });
const LIMITED_DURATION_ICON = renderLucideIcon(Clock4, { strokeWidth: 2, width: 16, height: 16 });
const BADGE_SCHEDULE_ICON = renderLucideIcon(CalendarClock, { strokeWidth: 2, width: 14, height: 14 });
const BADGE_LIMITED_ICON = renderLucideIcon(Clock4, { strokeWidth: 2, width: 14, height: 14 });

export function formatActivityPeriod(item) {
  const debut = item.periode_debut?.trim() || '';
  const fin = item.periode_fin?.trim() || '';

  if (debut && fin) return `Du ${debut} au ${fin}`;
  if (debut) return `À partir de ${debut}`;
  if (fin) return `Jusqu'au ${fin}`;
  return '';
}

export function hasActivitySchedule(item) {
  return (item.disponibilite && item.disponibilite !== 'permanent') || Boolean(formatActivityPeriod(item));
}

export function hasActivityLimitedDuration(item) {
  return item?.disponibilite === 'duree_limitee';
}

export function getActivityListMetaParts(item, { getCategorieLabel, formatItemPrice: formatPriceFn = formatListItemPrice }) {
  const parts = [];
  if (item.categorie) parts.push(getCategorieLabel(item.categorie));
  const priceLabel = formatPriceFn(item);
  if (priceLabel) parts.push(priceLabel);
  return parts;
}

export function renderActivityScheduleIconBadge(item, {
  getDisponibiliteLabel,
  escapeHtml,
  showPeriod = false,
  theme = 'cyan',
} = {}) {
  if (!hasActivitySchedule(item)) return '';

  const periode = showPeriod ? formatActivityPeriod(item) : '';
  const tag = item.disponibilite && item.disponibilite !== 'permanent'
    ? getDisponibiliteLabel(item.disponibilite)
    : '';

  if (!tag && !periode) return '';

  const icon = hasActivityLimitedDuration(item) ? BADGE_LIMITED_ICON : BADGE_SCHEDULE_ICON;
  const ariaLabel = [tag, periode].filter(Boolean).join(' · ');
  const titleAttr = ariaLabel ? ` title="${escapeHtml(ariaLabel)}"` : '';

  return `
    <span class="bottom-nav-explorer-badge act-schedule-icon-badge" role="img"${ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : ''}${titleAttr}>
      <span class="bottom-nav-page-badge" data-theme="${escapeHtml(theme)}" aria-hidden="true">${icon}</span>
    </span>
  `;
}

export function renderActivityListTypeIcon(item, renderCategoryIcon, options) {
  const iconHtml = renderCategoryIcon(item.categorie);
  const badgeHtml = renderActivityScheduleIconBadge(item, options);
  return `${iconHtml}${badgeHtml}`;
}

export function renderTravelPeriodIconBadge(item, {
  escapeHtml,
  theme = 'blue',
} = {}) {
  const periode = item?.periode?.trim();
  if (!periode) return '';

  return `
    <span class="bottom-nav-explorer-badge act-schedule-icon-badge" role="img" aria-label="${escapeHtml(periode)}" title="${escapeHtml(periode)}">
      <span class="bottom-nav-page-badge" data-theme="${escapeHtml(theme)}" aria-hidden="true">${BADGE_SCHEDULE_ICON}</span>
    </span>
  `;
}

export function renderTravelListTypeIcon(item, renderCategoryIcon, options) {
  const iconHtml = renderCategoryIcon(item.type);
  const badgeHtml = renderTravelPeriodIconBadge(item, options);
  return `${iconHtml}${badgeHtml}`;
}

export function renderActivityScheduleNote(item, { getDisponibiliteLabel, escapeHtml, showPeriod = true }) {
  if (!hasActivitySchedule(item)) return '';

  const periode = showPeriod ? formatActivityPeriod(item) : '';
  const tag = item.disponibilite && item.disponibilite !== 'permanent'
    ? getDisponibiliteLabel(item.disponibilite)
    : '';

  if (!tag && !periode) return '';

  const modifier = item.disponibilite === 'permanent' ? 'periode' : item.disponibilite;
  const ariaLabel = [tag, periode].filter(Boolean).join(' · ');
  const scheduleIcon = hasActivityLimitedDuration(item) ? LIMITED_DURATION_ICON : SCHEDULE_ICON;

  return `
    <div class="act-schedule-note act-schedule-note--${modifier}" role="note"${ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : ''}>
      <span class="act-schedule-note-icon" aria-hidden="true">${scheduleIcon}</span>
      <span class="act-schedule-note-copy">
        ${tag ? `<span class="act-schedule-note-tag">${escapeHtml(tag)}</span>` : ''}
        ${periode ? `<span class="act-schedule-note-period">${escapeHtml(periode)}</span>` : ''}
      </span>
    </div>
  `;
}
