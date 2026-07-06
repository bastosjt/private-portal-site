import { CalendarClock } from 'https://esm.sh/lucide@1.23.0';
import { renderLucideIcon } from './lucide-icon.js';

const SCHEDULE_ICON = renderLucideIcon(CalendarClock, { strokeWidth: 2, width: 16, height: 16 });

export function formatActivityPeriod(item) {
  const debut = item.periode_debut?.trim() || '';
  const fin = item.periode_fin?.trim() || '';
  const legacy = item.periode?.trim() || '';

  if (debut && fin) return `Du ${debut} au ${fin}`;
  if (debut) return `À partir du ${debut}`;
  if (fin) return `Jusqu'au ${fin}`;
  return legacy;
}

export function hasActivitySchedule(item) {
  return (item.disponibilite && item.disponibilite !== 'permanent') || Boolean(formatActivityPeriod(item));
}

export function getActivityListMetaParts(item, { getCategorieLabel, formatPrice }) {
  const parts = [];
  if (item.categorie) parts.push(getCategorieLabel(item.categorie));
  if (item.prix) parts.push(formatPrice(item.prix));
  return parts;
}

export function getActivityMetaParts(item, { getCategorieLabel, getDisponibiliteLabel, formatPrice }) {
  const parts = getActivityListMetaParts(item, { getCategorieLabel, formatPrice });
  const periode = formatActivityPeriod(item);

  if (item.disponibilite && item.disponibilite !== 'permanent') {
    const label = getDisponibiliteLabel(item.disponibilite);
    if (label) parts.splice(item.categorie ? 1 : 0, 0, label);
  }
  if (periode) {
    const insertAt = parts.length > 0 && item.prix && parts[parts.length - 1] === formatPrice(item.prix)
      ? parts.length - 1
      : parts.length;
    parts.splice(insertAt, 0, periode);
  }

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
