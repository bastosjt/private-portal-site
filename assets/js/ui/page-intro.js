import { escapeHtml } from '../lib/escape-html.js';

const DESKTOP_MQ = '(min-width: 901px)';

function getPageContentRoot() {
  return document.querySelector('#page-root .page-content');
}

export function syncPageIntro(title = '', sub = '') {
  const main = getPageContentRoot();
  if (!main) return;

  const showIntro = Boolean(title) && window.matchMedia(DESKTOP_MQ).matches;

  if (!showIntro) {
    main.querySelector('.page-intro')?.remove();
    return;
  }

  let intro = main.querySelector('.page-intro');
  if (!intro) {
    intro = document.createElement('header');
    intro.className = 'page-intro';
    main.insertBefore(intro, main.firstChild);
  }

  const theme = main.dataset.theme || '';
  if (theme) intro.dataset.theme = theme;
  else intro.removeAttribute('data-theme');

  intro.innerHTML = `
    <h1 class="page-intro-title">${escapeHtml(title)}</h1>
    ${sub ? `<p class="page-intro-sub">${escapeHtml(sub)}</p>` : ''}
  `;
}

export function clearPageIntro() {
  getPageContentRoot()?.querySelector('.page-intro')?.remove();
}
