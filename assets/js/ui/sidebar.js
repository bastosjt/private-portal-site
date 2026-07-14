import { NAV_ITEMS, APP_NAME, SETTINGS_ITEM } from '../config.js';
import { getSpaceTagline } from '../lib/space-settings.js';
import { getRouteFromHash } from '../navigation/router.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';
import { renderNavIcon } from '../lib/lucide-icon.js';

const CLOSE_ICON = renderNavIcon('close', { strokeWidth: 2, width: 24, height: 24 });

function icon(name, strokeWidth) {
  return renderNavIcon(name, strokeWidth != null ? { strokeWidth } : {});
}

function getActiveId() {
  return getRouteFromHash();
}

function renderNavLink(item, activeId) {
  const isActive = item.id === activeId;
  return `
    <a href="${item.href}" class="sidebar-link${isActive ? ' is-active' : ''}" data-route="${item.id}"${item.theme ? ` data-theme="${item.theme}"` : ''}${isActive ? ' aria-current="page"' : ''}>
      <span class="sidebar-link-icon">${icon(item.icon)}</span>
      <span class="sidebar-link-label">${item.label}</span>
    </a>
  `;
}

export function renderSidebar(container, { activeId = getActiveId() } = {}) {
  const navLinks = NAV_ITEMS.map((item) => renderNavLink(item, activeId)).join('');
  const settingsActive = SETTINGS_ITEM.id === activeId;

  container.innerHTML = `
    <aside class="sidebar" id="sidebar" aria-label="Navigation principale">
      <div class="sidebar-inner">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="sidebar-brand-icon">${icon('wishlist')}</div>
            <div class="sidebar-brand-text">
              ${APP_NAME}
              <span>${getSpaceTagline()}</span>
            </div>
          </div>
          <button type="button" id="sidebar-close" class="sidebar-close" aria-label="Fermer le menu">
            ${CLOSE_ICON}
          </button>
        </div>

        <nav class="sidebar-nav">${navLinks}</nav>

        <div class="sidebar-bottom">
          <div class="sidebar-footer">
            <a href="${SETTINGS_ITEM.href}" class="sidebar-link${settingsActive ? ' is-active' : ''}" data-route="${SETTINGS_ITEM.id}"${settingsActive ? ' aria-current="page"' : ''}>
              <span class="sidebar-link-icon">${icon(SETTINGS_ITEM.icon)}</span>
              <span class="sidebar-link-label">${SETTINGS_ITEM.label}</span>
            </a>
          </div>
        </div>
      </div>
    </aside>

    <div class="sidebar-overlay" id="sidebar-overlay" hidden></div>
  `;
}

export function updateSidebarTagline(tagline = getSpaceTagline()) {
  const el = document.querySelector('.sidebar-brand-text span');
  if (el) el.textContent = tagline;
}

export function updateSidebarActive(activeId = getActiveId()) {
  document.querySelectorAll('.sidebar-link').forEach((link) => {
    const isActive = link.dataset.route === activeId;
    link.classList.toggle('is-active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

export function initSidebar({ onNavigate } = {}) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggle = document.getElementById('menu-toggle');
  const closeBtn = document.getElementById('sidebar-close');
  const SIDEBAR_MS = 400;

  const staggerNavLinks = () => {
    document.querySelectorAll('.sidebar-link').forEach((link, index) => {
      link.style.setProperty('--nav-delay', `${index * 45 + 70}ms`);
    });
  };

  const resetNavStagger = () => {
    document.querySelectorAll('.sidebar-link').forEach((link) => {
      link.style.removeProperty('--nav-delay');
    });
  };

  const staggerNavLinksClose = () => {
    const links = document.querySelectorAll('.sidebar-link');
    const last = Math.max(links.length - 1, 0);
    links.forEach((link, index) => {
      link.style.setProperty('--nav-delay', `${(last - index) * 45 + 70}ms`);
    });
  };

  const open = () => {
    overlay?.removeAttribute('hidden');
    overlay?.classList.add('is-active');
    lockScroll();
    requestAnimationFrame(() => {
      sidebar?.classList.add('is-open');
      document.body.classList.add('sidebar-open');
      staggerNavLinks();
    });
  };

  const close = () => {
    staggerNavLinksClose();
    requestAnimationFrame(() => {
      sidebar?.classList.remove('is-open');
      overlay?.classList.remove('is-active');
      document.body.classList.remove('sidebar-open');
    });

    window.setTimeout(() => {
      resetNavStagger();
      unlockScroll();
      if (!overlay?.classList.contains('is-active')) {
        overlay?.setAttribute('hidden', '');
      }
    }, SIDEBAR_MS);
  };

  toggle?.addEventListener('click', open);
  document.addEventListener('click', (event) => {
    if (event.target.closest('#menu-toggle')) open();
  });
  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);

  document.querySelectorAll('.sidebar-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      const routeId = link.dataset.route;
      if (routeId && onNavigate) {
        event.preventDefault();
        onNavigate(routeId);
      }
      if (window.matchMedia('(max-width: 900px)').matches) close();
    });
  });

  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 901px)').matches) close();
  });
}

export { icon as sidebarIcon };
