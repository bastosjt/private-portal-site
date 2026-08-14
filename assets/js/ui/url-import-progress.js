import { escapeHtml } from '../lib/escape-html.js';

const STEP_CLASS = {
  pending: 'url-import-step--pending',
  active: 'url-import-step--active',
  done: 'url-import-step--done',
};

export function renderUrlImportProgressHtml(steps, activeIndex = 0) {
  const safeSteps = steps.filter(Boolean);
  const progress = safeSteps.length > 1
    ? Math.round(((activeIndex + 0.35) / safeSteps.length) * 100)
    : 42;

  const stepsHtml = safeSteps.map((label, index) => {
    let stateClass = STEP_CLASS.pending;
    if (index < activeIndex) stateClass = STEP_CLASS.done;
    else if (index === activeIndex) stateClass = STEP_CLASS.active;

    return `
      <li class="url-import-step ${stateClass}">
        <span class="url-import-step-dot" aria-hidden="true"></span>
        <span class="url-import-step-label">${escapeHtml(label)}</span>
      </li>
    `;
  }).join('');

  return `
    <div class="url-import-progress" role="status" aria-live="polite">
      <div class="url-import-progress-bar" aria-hidden="true">
        <span class="url-import-progress-bar-fill" style="width: ${progress}%"></span>
      </div>
      <ol class="url-import-progress-steps">${stepsHtml}</ol>
    </div>
  `;
}

export function mountUrlImportProgress(feedbackEl, steps, activeIndex = 0) {
  if (!feedbackEl) return () => {};

  const labels = steps.filter(Boolean);
  let currentIndex = Math.max(0, Math.min(activeIndex, labels.length - 1));

  const render = () => {
    feedbackEl.innerHTML = renderUrlImportProgressHtml(labels, currentIndex);
  };

  render();

  return (nextIndex) => {
    if (!Number.isFinite(nextIndex)) return;
    currentIndex = Math.max(0, Math.min(nextIndex, labels.length - 1));
    render();
  };
}
