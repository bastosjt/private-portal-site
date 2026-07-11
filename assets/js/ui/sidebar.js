import { NAV_ITEMS, APP_NAME, APP_TAGLINE, APP_VERSION } from '../config.js';
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

export function renderSidebar(container, { user, activeId = getActiveId() } = {}) {
  const navLinks = NAV_ITEMS.map((item) => {
    const isActive = item.id === activeId;
    return `
      <a href="${item.href}" class="sidebar-link${isActive ? ' is-active' : ''}" data-route="${item.id}"${item.theme ? ` data-theme="${item.theme}"` : ''}${isActive ? ' aria-current="page"' : ''}>
        <span class="sidebar-link-icon">${icon(item.icon)}</span>
        <span class="sidebar-link-label">${item.label}</span>
      </a>
    `;
  }).join('');

  container.innerHTML = `
    <aside class="sidebar" id="sidebar" aria-label="Navigation principale">
      <div class="sidebar-inner">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="sidebar-brand-icon">${icon('wishlist')}</div>
            <div class="sidebar-brand-text">
              ${APP_NAME}
              <span>${APP_TAGLINE}</span>
            </div>
          </div>
          <button type="button" id="sidebar-close" class="sidebar-close" aria-label="Fermer le menu">
            ${CLOSE_ICON}
          </button>
        </div>

        <nav class="sidebar-nav">${navLinks}</nav>

        <div class="sidebar-bottom">
          <p class="sidebar-version" aria-hidden="true">v${APP_VERSION}</p>
          <div class="sidebar-footer">
            <div class="sidebar-user">
              <span class="sidebar-user-avatar" data-user-initials aria-hidden="true"></span>
              <div class="sidebar-user-info">
                <span class="sidebar-user-label">Connecté</span>
                <span class="sidebar-user-email" data-user-email></span>
              </div>
            </div>
            <button type="button" id="logout-btn" class="sidebar-logout">Déconnexion</button>
          </div>
        </div>
      </div>
    </aside>

    <div class="sidebar-overlay" id="sidebar-overlay" hidden></div>
  `;

  if (user) {
    updateSidebarUser(container, user);
  }
}

export function updateSidebarUser(container, user) {
  const initials = getInitials(user.email);
  container.querySelectorAll('[data-user-initials]').forEach((el) => {
    el.textContent = initials;
  });
  container.querySelectorAll('[data-user-email]').forEach((el) => {
    el.textContent = user.email;
  });
}

function getInitials(email) {
  const name = email.split('@')[0] || '?';
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
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

export function initSidebar({ onLogout, onNavigate } = {}) {
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

  document.getElementById('logout-btn')?.addEventListener('click', onLogout);

  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 901px)').matches) close();
  });
}

export { icon as sidebarIcon };
