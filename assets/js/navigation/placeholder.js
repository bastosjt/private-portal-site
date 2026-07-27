import { NAV_ITEMS } from '../config.js';
import { sidebarIcon } from '../ui/sidebar.js';

export function getPlaceholderViewHtml(routeId) {
  const navItem = NAV_ITEMS.find((item) => item.id === routeId) || NAV_ITEMS[0];
  const theme = navItem.theme || 'cyan';

  return `
    <main class="page-content" data-theme="${theme}">
      <section class="cat-panel" data-theme="${theme}">
        <div class="cat-panel-inner">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="cat-panel-head">
            <div class="cat-panel-title">
              <span class="cat-panel-icon">${sidebarIcon(navItem.icon)}</span>
              <div>
                <h3>${navItem.label}</h3>
                <p>Cette section arrive très bientôt</p>
              </div>
            </div>
          </div>
          <p style="color: var(--text-muted); margin: 0;">En attendant, explorez vos activités depuis le menu.</p>
        </div>
      </section>
    </main>
  `;
}
