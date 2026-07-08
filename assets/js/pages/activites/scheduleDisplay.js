import { CalendarClock } from '../../vendor/lucide.mjs';
import { renderLucideIcon } from '../../lib/lucide-icon.js';
import { formatItemPrice } from '../../lib/price-format.js';

const SCHEDULE_ICON = renderLucideIcon(CalendarClock, { strokeWidth: 2, width: 16, height: 16 });

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

export function getActivityListMetaParts(item, { getCategorieLabel, formatItemPrice: formatPriceFn = formatItemPrice }) {
  const parts = [];
  if (item.categorie) parts.push(getCategorieLabel(item.categorie));
  const priceLabel = formatPriceFn(item);
  if (priceLabel) parts.push(priceLabel);
  return parts;
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

  return `
    <div class="act-schedule-note act-schedule-note--${modifier}" role="note"${ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : ''}>
      <span class="act-schedule-note-icon" aria-hidden="true">${SCHEDULE_ICON}</span>
      <span class="act-schedule-note-copy">
        ${tag ? `<span class="act-schedule-note-tag">${escapeHtml(tag)}</span>` : ''}
        ${periode ? `<span class="act-schedule-note-period">${escapeHtml(periode)}</span>` : ''}
      </span>
    </div>
  `;
}
