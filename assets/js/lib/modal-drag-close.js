const DISMISS_DISTANCE_PX = 72;
const DISMISS_VELOCITY = 0.45;
const DISMISS_ANIM_MS = 260;

export const MODAL_DRAG_HANDLE_HTML = `
  <div class="add-modal-drag" aria-hidden="true">
    <span class="add-modal-drag-pill"></span>
  </div>
`;

function isDragCloseEnabled() {
  return window.matchMedia('(max-width: 639px)').matches;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  let dragging = false;
  let pointerId = null;
  let startY = 0;
  let lastY = 0;
  let lastTime = 0;
  let velocityY = 0;
  let skipNextReset = false;

  function clearInlineStyles() {
    modal.classList.remove('is-dragging');
    overlay.classList.remove('is-dragging');
    modal.style.transform = '';
    modal.style.transition = '';
    modal.style.opacity = '';
    overlay.style.opacity = '';
    overlay.style.transition = '';
  }

  function reset() {
    if (dragging || skipNextReset) return;
    clearInlineStyles();
  }

  function onPointerDown(event) {
    if (!isDragCloseEnabled()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    dragging = true;
    pointerId = event.pointerId;
    startY = event.clientY;
    lastY = event.clientY;
    lastTime = performance.now();
    velocityY = 0;

    modal.classList.add('is-dragging');
    overlay.classList.add('is-dragging');
    handle.setPointerCapture(pointerId);
  }

  function onPointerMove(event) {
    if (!dragging || event.pointerId !== pointerId) return;

    const now = performance.now();
    const dy = Math.max(0, event.clientY - startY);
    const dt = now - lastTime;

    if (dt > 0) {
      velocityY = (event.clientY - lastY) / dt;
    }

    lastY = event.clientY;
    lastTime = now;

    const offset = dy <= 140 ? dy : 140 + (dy - 140) * 0.3;
    modal.style.transform = `translateY(${offset}px)`;

    const fade = Math.max(0.35, 1 - offset / 340);
    overlay.style.opacity = String(fade);
  }

  async function finishPointer(event) {
    if (!dragging || event.pointerId !== pointerId) return;

    dragging = false;
    handle.releasePointerCapture(pointerId);
    pointerId = null;

    const dy = Math.max(0, lastY - startY);
    const shouldDismiss = dy > DISMISS_DISTANCE_PX || velocityY > DISMISS_VELOCITY;

    if (!shouldDismiss) {
      modal.style.transition = 'transform 0.32s var(--ease-premium)';
      overlay.style.transition = 'opacity 0.32s var(--ease-premium)';
      clearInlineStyles();
      return;
    }

    modal.style.transition = `transform ${DISMISS_ANIM_MS}ms var(--ease-premium)`;
    modal.style.transform = 'translateY(100%)';
    overlay.style.transition = `opacity ${DISMISS_ANIM_MS}ms var(--ease-premium)`;
    overlay.style.opacity = '0';

    await sleep(DISMISS_ANIM_MS);
    skipNextReset = true;
    modal.classList.remove('is-dragging');
    overlay.classList.remove('is-dragging');
    await onClose?.();
    skipNextReset = false;
    clearInlineStyles();
    return;
  }

  handle.addEventListener('pointerdown', onPointerDown);
  handle.addEventListener('pointermove', onPointerMove);
  handle.addEventListener('pointerup', finishPointer);
  handle.addEventListener('pointercancel', finishPointer);

  return {
    reset,
    destroy() {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', finishPointer);
      handle.removeEventListener('pointercancel', finishPointer);
      clearInlineStyles();
    },
  };
}

export function wireModalDragClose(overlay, onClose) {
  const modal = overlay.querySelector('.add-modal');
  if (!modal) return { destroy() {}, reset() {} };
  return initModalDragClose({ overlay, modal, onClose });
}
