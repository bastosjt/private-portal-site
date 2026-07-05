const CALENDAR_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 2v4"/><path d="M16 2v4"/>
    <rect width="18" height="18" x="3" y="4" rx="2"/>
    <path d="M3 10h18"/>
  </svg>
`;

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

export function renderActivityScheduleNote(item, { getDisponibiliteLabel, escapeHtml }) {
  if (!hasActivitySchedule(item)) return '';

  const periode = formatActivityPeriod(item);
  const tag = item.disponibilite && item.disponibilite !== 'permanent'
    ? getDisponibiliteLabel(item.disponibilite)
    : '';
  const modifier = item.disponibilite === 'permanent' ? 'periode' : item.disponibilite;

  const ariaLabel = [tag, periode].filter(Boolean).join(' · ');

  return `
    <div class="act-schedule-note act-schedule-note--${modifier}" role="note"${ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : ''}>
      <span class="act-schedule-note-icon" aria-hidden="true">${CALENDAR_ICON}</span>
      <span class="act-schedule-note-copy">
        ${tag ? `<span class="act-schedule-note-tag">${escapeHtml(tag)}</span>` : ''}
        ${periode ? `<span class="act-schedule-note-period">${escapeHtml(periode)}</span>` : ''}
      </span>
    </div>
  `;
}
