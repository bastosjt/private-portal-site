/**
 * Fermeture par drag (bottom sheet mobile).
 * Comportement type iOS / Material : zone handle+tête, rubber-band,
 * snap-back animé, dismiss par distance ou vélocité.
 */

const ACTIVATE_THRESHOLD_PX = 8;
const DISMISS_RATIO = 0.22;
const DISMISS_MIN_PX = 88;
const DISMISS_VELOCITY = 0.85; // px/ms ≈ 850 px/s
const DISMISS_FLICK_MIN_PX = 18;
const RUBBER_START_PX = 96;
const RUBBER_FACTOR = 0.28;
const SNAP_BACK_MS = 280;
const DISMISS_ANIM_MS = 240;
const VELOCITY_SMOOTHING = 0.35;

export const MODAL_DRAG_HANDLE_HTML = `
  <div class="add-modal-drag" aria-hidden="true">
    <span class="add-modal-drag-pill"></span>
  </div>
`;

function isDragCloseEnabled() {
  return window.matchMedia('(max-width: 639px)').matches;
}

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyOffset(modal, overlay, offset) {
  modal.style.transform = `translate3d(0, ${offset}px, 0)`;
  const progress = Math.min(1, offset / 320);
  overlay.style.opacity = String(Math.max(0.28, 1 - progress * 0.72));
}

function rubberBand(dy) {
  if (dy <= RUBBER_START_PX) return dy;
  return RUBBER_START_PX + (dy - RUBBER_START_PX) * RUBBER_FACTOR;
}

function isInteractiveTarget(target) {
  return Boolean(
    target?.closest?.(
      'button, a, input, textarea, select, label, [role="button"], [contenteditable="true"]',
    ),
  );
}

function isDragSurfaceTarget(modal, target) {
  if (!(target instanceof Element)) return false;
  if (target.closest('.add-modal-drag')) return true;
  const head = modal.querySelector('.add-modal-head');
  if (!head || !head.contains(target)) return false;
  return !isInteractiveTarget(target);
}

/**
 * @param {object} options
 * @param {HTMLElement} options.overlay
 * @param {HTMLElement} options.modal
 * @param {() => void|Promise<void>} options.onClose
 */
export function initModalDragClose({ overlay, modal, onClose }) {
  const handle = modal.querySelector('.add-modal-drag');
  if (!handle) {
    return { destroy() {}, reset() {} };
  }

  let pointerId = null;
  let tracking = false;
  let dragging = false;
  let dismissing = false;
  let finishing = false;
  let startY = 0;
  let lastY = 0;
  let lastTime = 0;
  let velocityY = 0;
  let currentOffset = 0;
  let windowListening = false;

  function clearInlineStyles() {
    modal.classList.remove('is-dragging');
    overlay.classList.remove('is-dragging');
    modal.style.transform = '';
    modal.style.transition = '';
    modal.style.opacity = '';
    modal.style.willChange = '';
    overlay.style.opacity = '';
    overlay.style.transition = '';
  }

  function reset() {
    if (dismissing || finishing) return;

    if (tracking || dragging) {
      try {
        if (pointerId != null && modal.hasPointerCapture?.(pointerId)) {
          modal.releasePointerCapture(pointerId);
        }
      } catch {
        // ignore
      }
      endTracking();
    }

    clearInlineStyles();
  }

  function bindWindowListeners() {
    if (windowListening) return;
    windowListening = true;
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', finishPointer);
    window.addEventListener('pointercancel', finishPointer);
  }

  function unbindWindowListeners() {
    if (!windowListening) return;
    windowListening = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', finishPointer);
    window.removeEventListener('pointercancel', finishPointer);
  }

  function beginDrag() {
    dragging = true;
    modal.classList.add('is-dragging');
    overlay.classList.add('is-dragging');
    modal.style.willChange = 'transform';
    modal.style.transition = 'none';
    overlay.style.transition = 'none';
  }

  function endTracking() {
    tracking = false;
    dragging = false;
    pointerId = null;
    currentOffset = 0;
    velocityY = 0;
    unbindWindowListeners();
  }

  function onPointerDown(event) {
    if (dismissing || finishing || tracking || dragging) return;
    if (!isDragCloseEnabled()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!isDragSurfaceTarget(modal, event.target)) return;

    tracking = true;
    pointerId = event.pointerId;
    startY = event.clientY;
    lastY = event.clientY;
    lastTime = performance.now();
    velocityY = 0;
    currentOffset = 0;

    bindWindowListeners();

    try {
      modal.setPointerCapture(event.pointerId);
    } catch {
      // Fallback : les listeners window assurent le suivi.
    }
  }

  function onPointerMove(event) {
    if (!tracking || event.pointerId !== pointerId || dismissing || finishing) return;

    const now = performance.now();
    const rawDy = event.clientY - startY;
    const dt = Math.max(1, now - lastTime);
    const instantVelocity = (event.clientY - lastY) / dt;
    velocityY = velocityY
      ? (velocityY * (1 - VELOCITY_SMOOTHING)) + (instantVelocity * VELOCITY_SMOOTHING)
      : instantVelocity;

    lastY = event.clientY;
    lastTime = now;

    if (!dragging) {
      if (rawDy < -ACTIVATE_THRESHOLD_PX) {
        // Tirage vers le haut : on abandonne le geste.
        endTracking();
        clearInlineStyles();
        return;
      }
      if (rawDy < ACTIVATE_THRESHOLD_PX) return;

      beginDrag();
      event.preventDefault();
    }

    const offset = rubberBand(Math.max(0, rawDy));
    currentOffset = offset;
    applyOffset(modal, overlay, offset);
    event.preventDefault();
  }

  async function snapBack(fromOffset) {
    const reduced = prefersReducedMotion();
    modal.classList.remove('is-dragging');
    overlay.classList.remove('is-dragging');

    if (reduced || fromOffset <= 1) {
      clearInlineStyles();
      return;
    }

    // Repose l’offset courant avant d’animer le retour (sinon pas de transition).
    applyOffset(modal, overlay, fromOffset);
    // Force reflow pour que la transition parte bien de fromOffset.
    void modal.offsetHeight;

    modal.style.transition = `transform ${SNAP_BACK_MS}ms var(--ease-out-expo)`;
    overlay.style.transition = `opacity ${SNAP_BACK_MS}ms var(--ease-premium)`;
    modal.style.transform = 'translate3d(0, 0, 0)';
    overlay.style.opacity = '1';

    await sleep(SNAP_BACK_MS);
    if (tracking || dragging || dismissing || finishing) return;
    clearInlineStyles();
  }

  async function dismissSheet(fromOffset) {
    dismissing = true;
    modal.classList.remove('is-dragging');
    overlay.classList.remove('is-dragging');

    const reduced = prefersReducedMotion();
    const duration = reduced ? 0 : DISMISS_ANIM_MS;

    if (duration > 0) {
      applyOffset(modal, overlay, fromOffset);
      void modal.offsetHeight;
      modal.style.transition = `transform ${duration}ms var(--ease-page-leave)`;
      overlay.style.transition = `opacity ${duration}ms var(--ease-premium)`;
      modal.style.transform = 'translate3d(0, 110%, 0)';
      overlay.style.opacity = '0';
      await sleep(duration);
    }

    try {
      await onClose?.();
    } finally {
      dismissing = false;
      clearInlineStyles();
    }
  }

  async function finishPointer(event) {
    if (!tracking || event.pointerId !== pointerId || dismissing || finishing) return;

    finishing = true;
    const wasDragging = dragging;
    const offset = currentOffset;
    const velocity = velocityY;
    const capturedId = pointerId;

    endTracking();

    try {
      if (modal.hasPointerCapture?.(capturedId)) {
        modal.releasePointerCapture(capturedId);
      }
    } catch {
      // ignore
    }

    try {
      if (!wasDragging) {
        clearInlineStyles();
        return;
      }

      const sheetHeight = Math.max(modal.getBoundingClientRect().height, 1);
      const dismissDistance = Math.max(DISMISS_MIN_PX, sheetHeight * DISMISS_RATIO);
      const flickDismiss = velocity > DISMISS_VELOCITY && offset > DISMISS_FLICK_MIN_PX;
      const shouldDismiss = offset >= dismissDistance || flickDismiss;

      if (shouldDismiss) {
        await dismissSheet(offset);
        return;
      }

      await snapBack(offset);
    } finally {
      finishing = false;
    }
  }

  modal.addEventListener('pointerdown', onPointerDown, { passive: true });

  return {
    reset,
    destroy() {
      modal.removeEventListener('pointerdown', onPointerDown);
      unbindWindowListeners();
      dismissing = false;
      finishing = false;
      endTracking();
      clearInlineStyles();
    },
  };
}

export function wireModalDragClose(overlay, onClose) {
  const modal = overlay.querySelector('.add-modal');
  if (!modal) return { destroy() {}, reset() {} };
  return initModalDragClose({ overlay, modal, onClose });
}
