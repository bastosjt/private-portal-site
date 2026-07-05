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

export function resetScrollLock() {
  lockCount = 0;
  document.documentElement.classList.remove('scroll-locked');
  document.body.classList.remove('scroll-locked');
  document.body.style.top = '';
}
