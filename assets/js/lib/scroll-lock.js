let lockCount = 0;
let scrollY = 0;

export function lockScroll() {
  if (lockCount === 0) {
    scrollY = window.scrollY;
    document.documentElement.classList.add('scroll-locked');
    document.body.classList.add('scroll-locked');
    document.body.style.top = `-${scrollY}px`;
  }
  lockCount += 1;
}

export function unlockScroll() {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  document.documentElement.classList.remove('scroll-locked');
  document.body.classList.remove('scroll-locked');
  document.body.style.top = '';
  window.scrollTo(0, scrollY);
}

/** Réinitialise un verrou bloqué (ex. lock/unlock déséquilibrés après une modale). */
export function forceUnlockScroll() {
  lockCount = 0;
  document.documentElement.classList.remove('scroll-locked');
  document.body.classList.remove('scroll-locked');
  document.body.style.top = '';
}

/** Débloque le scroll si aucune modale n'est ouverte (filet de sécurité navigation). */
export function releaseStalePageScrollLock() {
  if (document.querySelector('.add-modal-overlay.is-active')) return;
  document.body.classList.remove('modal-open');
  forceUnlockScroll();
}
