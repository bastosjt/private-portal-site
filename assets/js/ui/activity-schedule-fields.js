/** Affichage conditionnel des dates activité selon le mode choisi. */

const SCHEDULE_MODES = {
  permanent: {
    showDebut: false,
    showFin: false,
  },
  a_venir: {
    showDebut: true,
    showFin: false,
    debutLabel: 'À partir du',
  },
  duree_limitee: {
    showDebut: true,
    showFin: true,
    debutLabel: 'Du',
    finLabel: 'Au',
  },
};

function getMode(value) {
  return SCHEDULE_MODES[value] ? value : 'permanent';
}

function setFieldHidden(fieldEl, hidden) {
  if (!fieldEl) return;
  fieldEl.classList.toggle('is-conditional-hidden', hidden);
  fieldEl.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

function setFieldLabel(fieldEl, label) {
  const labelEl = fieldEl?.querySelector('.form-field-label');
  if (labelEl && label) labelEl.textContent = label;
}

function clearInput(input) {
  if (!input || !input.value) return;
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function syncActivityScheduleFields(form, { purgeHidden = false } = {}) {
  const select = form.elements.disponibilite;
  if (!select) return;

  const debutField = form.elements.periode_debut?.closest('.form-field');
  const finField = form.elements.periode_fin?.closest('.form-field');
  const mode = SCHEDULE_MODES[getMode(select.value)];

  setFieldHidden(debutField, !mode.showDebut);
  setFieldHidden(finField, !mode.showFin);

  if (mode.showDebut && mode.debutLabel) setFieldLabel(debutField, mode.debutLabel);
  if (mode.showFin && mode.finLabel) setFieldLabel(finField, mode.finLabel);

  if (purgeHidden) {
    if (!mode.showDebut) clearInput(form.elements.periode_debut);
    if (!mode.showFin) clearInput(form.elements.periode_fin);
  }
}

function handleScheduleModeChange(form) {
  const select = form.elements.disponibilite;
  if (!select) return;

  const previous = select.dataset.scheduleMode || 'permanent';
  const next = getMode(select.value);
  select.dataset.scheduleMode = next;

  syncActivityScheduleFields(form);

  if (next === 'permanent') {
    clearInput(form.elements.periode_debut);
    clearInput(form.elements.periode_fin);
  } else if (next === 'a_venir') {
    clearInput(form.elements.periode_fin);
  }

  form.dispatchEvent(new Event('input', { bubbles: true }));
}

export function initActivityScheduleFields(form) {
  if (!form?.elements?.disponibilite) return () => {};

  const select = form.elements.disponibilite;
  select.dataset.scheduleMode = getMode(select.value);
  syncActivityScheduleFields(form, { purgeHidden: true });

  requestAnimationFrame(() => {
    form.querySelectorAll('.form-field--schedule').forEach((fieldEl) => {
      fieldEl.classList.add('is-schedule-ready');
    });
  });

  const onChange = (event) => {
    if (event.target !== select) return;
    handleScheduleModeChange(form);
  };

  form.addEventListener('change', onChange);

  return () => {
    form.removeEventListener('change', onChange);
  };
}
