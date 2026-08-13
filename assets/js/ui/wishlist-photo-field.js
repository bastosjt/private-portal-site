import { escapeHtml } from '../lib/escape-html.js';
import { isDataImageUrl, sanitizeImageUrl } from '../lib/safe-url.js';
import { MODAL_DRAG_HANDLE_HTML } from '../lib/modal-drag-close.js';
import { renderLucideIcon } from '../lib/lucide-icon.js';
import { AlignCenterHorizontal, AlignCenterVertical } from '../vendor/lucide.mjs';

const OUTPUT_SIZE = 512;
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_CROP_SOURCE_SIDE = 2400;

const IMAGE_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
`;

export function renderWishlistPhotoField(field, categoryId) {
  const id = `add-field-${field.name}`;
  const required = field.required ? ' required' : '';

  return `
    <div class="form-field form-field--wishlist-photo" data-wishlist-photo-field>
      <span class="form-field-label">${escapeHtml(field.label)}</span>
      <input type="hidden" id="${id}" name="${field.name}"${required}>
      <div
        class="form-input-wrap address-field wishlist-photo-wrap"
        id="${id}-trigger"
        data-wishlist-photo-trigger
        role="button"
        tabindex="0"
        aria-label="Ajouter une photo"
      >
        <span class="address-field-icon wishlist-photo-wrap__slot" data-wishlist-photo-slot aria-hidden="true">
          ${IMAGE_ICON}
        </span>
        <span class="wishlist-photo-wrap__text" data-wishlist-photo-empty>Ajouter une photo</span>
        <button
          type="button"
          class="url-import-preview__site-wrap wishlist-photo-wrap__modify hidden"
          data-wishlist-photo-modify
        >
          <span class="url-import-preview__site">Modifier la photo</span>
        </button>
        <button
          type="button"
          class="wishlist-photo-wrap__clear hidden"
          data-wishlist-photo-remove
          aria-label="Supprimer la photo"
          tabindex="-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
      <span class="form-field-hint" data-wishlist-photo-hint>Photo carrée recommandée.</span>
      <p class="form-field-hint wishlist-photo-wrap__error hidden" data-wishlist-photo-error role="alert"></p>
      <input type="file" class="visually-hidden" data-wishlist-photo-input accept="image/jpeg,image/png,image/webp,image/*" tabindex="-1">
    </div>
  `;
}

function setPhotoError(root, message = '') {
  const errorEl = root.querySelector('[data-wishlist-photo-error]');
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.toggle('hidden', !message);
}

function syncPhotoPreview(root) {
  const input = root.querySelector(`input[type="hidden"][name="imageUrl"]`);
  const iconSlot = root.querySelector('[data-wishlist-photo-slot]');
  const emptyEl = root.querySelector('[data-wishlist-photo-empty]');
  const modifyWrap = root.querySelector('[data-wishlist-photo-modify]');
  const hint = root.querySelector('[data-wishlist-photo-hint]');
  const removeBtn = root.querySelector('[data-wishlist-photo-remove]');
  const trigger = root.querySelector('[data-wishlist-photo-trigger]');
  if (!input || !iconSlot || !emptyEl) return;

  const imageUrl = sanitizeImageUrl(input.value);
  if (input.value && !imageUrl) {
    input.value = '';
  }

  const hasImage = Boolean(imageUrl);
  removeBtn?.classList.toggle('hidden', !hasImage);
  trigger?.classList.toggle('has-photo', hasImage);
  iconSlot.classList.toggle('has-image', hasImage);
  emptyEl.classList.toggle('hidden', hasImage);
  modifyWrap?.classList.toggle('hidden', !hasImage);
  hint.classList.toggle('hidden', hasImage);

  if (hasImage) {
    iconSlot.innerHTML = `
      <img
        src="${escapeHtml(imageUrl)}"
        alt=""
        class="wishlist-photo-wrap__thumb"
        decoding="async"
      >
    `;
    trigger?.removeAttribute('role');
    trigger?.removeAttribute('tabindex');
    trigger?.removeAttribute('aria-label');
  } else {
    iconSlot.innerHTML = IMAGE_ICON;
    delete root.dataset.photoName;
    emptyEl.textContent = 'Ajouter une photo';
    hint.classList.remove('hidden');
    hint.textContent = 'Photo carrée recommandée.';
    trigger?.setAttribute('role', 'button');
    trigger?.setAttribute('tabindex', '0');
    trigger?.setAttribute('aria-label', 'Ajouter une photo');
  }
}

export function refreshWishlistPhotoFields(form) {
  form?.querySelectorAll('[data-wishlist-photo-field]').forEach((fieldWrap) => {
    syncPhotoPreview(fieldWrap);
  });
}

function isSupportedImageFile(file) {
  if (!file) return false;
  if (file.type?.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || '');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        reject(new Error('Impossible de lire cette image.'));
        return;
      }
      resolve(dataUrl);
    };
    reader.onerror = () => reject(new Error('Impossible de lire cette image.'));
    reader.readAsDataURL(file);
  });
}

async function loadImageElement(src) {
  const img = new Image();
  img.src = src;

  if (typeof img.decode === 'function') {
    await img.decode();
  } else {
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Impossible de lire cette image.'));
    });
  }

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) {
    throw new Error('Impossible de lire cette image.');
  }

  return { img, width, height };
}

function drawSourceToImage(source, width, height) {
  const maxSide = Math.max(width, height);
  let targetW = width;
  let targetH = height;

  if (maxSide > MAX_CROP_SOURCE_SIDE) {
    const scale = MAX_CROP_SOURCE_SIDE / maxSide;
    targetW = Math.max(1, Math.round(width * scale));
    targetH = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Impossible de préparer cette image.');

  ctx.drawImage(source, 0, 0, targetW, targetH);
  source.close?.();

  return loadImageElement(canvas.toDataURL('image/jpeg', 0.92));
}

async function loadImageElementCrossOrigin(src) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;

  if (typeof img.decode === 'function') {
    await img.decode();
  } else {
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Impossible de lire cette image.'));
    });
  }

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) {
    throw new Error('Impossible de lire cette image.');
  }

  return { img, width, height };
}

async function normalizeCropSource({ img, width, height }) {
  if (width <= MAX_CROP_SOURCE_SIDE && height <= MAX_CROP_SOURCE_SIDE) {
    return { img, width, height };
  }
  return drawSourceToImage(img, width, height);
}

async function prepareImageForCropFromUrl(imageUrl) {
  if (isDataImageUrl(imageUrl)) {
    return normalizeCropSource(await loadImageElement(imageUrl));
  }

  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('needs-file-picker');
    const blob = await response.blob();
    if (!blob.type?.startsWith('image/')) throw new Error('needs-file-picker');

    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(blob);
      return drawSourceToImage(bitmap, bitmap.width, bitmap.height);
    }

    const dataUrl = await readFileAsDataUrl(new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' }));
    return normalizeCropSource(await loadImageElement(dataUrl));
  } catch {
    try {
      return normalizeCropSource(await loadImageElementCrossOrigin(imageUrl));
    } catch {
      return normalizeCropSource(await loadImageElement(imageUrl));
    }
  }
}

async function prepareImageForCrop(file) {
  if (!isSupportedImageFile(file)) {
    throw new Error('Choisissez une image (JPEG, PNG ou WebP).');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Image trop lourde (max. 12 Mo).');
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return drawSourceToImage(bitmap, bitmap.width, bitmap.height);
    } catch {
      // Fallback ci-dessous (formats exotiques, navigateurs plus anciens).
    }
  }

  const dataUrl = await readFileAsDataUrl(file);
  return normalizeCropSource(await loadImageElement(dataUrl));
}

function getCoverScale(imageWidth, imageHeight, cropSize) {
  return Math.max(cropSize / imageWidth, cropSize / imageHeight);
}

function renderCropOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'add-modal-overlay wishlist-photo-crop-overlay is-loading';
  overlay.dataset.theme = 'pink';
  overlay.innerHTML = `
    <div class="add-modal add-modal--photo-crop" role="dialog" aria-modal="true" aria-labelledby="wishlist-photo-crop-title">
      ${MODAL_DRAG_HANDLE_HTML}
      <div class="add-modal-head wishlist-photo-crop-head">
        <h2 class="add-modal-title" id="wishlist-photo-crop-title">Recadrer la photo</h2>
      </div>
      <div class="add-modal-body wishlist-photo-crop-body">
        <div class="wishlist-photo-crop__fit">
          <div class="wishlist-photo-crop__viewport" data-crop-viewport>
            <div class="wishlist-photo-crop__letterbox" data-crop-letterbox aria-hidden="true"></div>
            <img class="wishlist-photo-crop__image" data-crop-image alt="" draggable="false">
            <div class="wishlist-photo-crop__window" data-crop-window aria-hidden="true"></div>
          </div>
        </div>
        <div class="wishlist-photo-crop__toolbar">
          <button
            type="button"
            class="wishlist-photo-crop__align-btn"
            data-crop-align-x
            aria-label="Centrer horizontalement"
          >
            ${renderLucideIcon(AlignCenterHorizontal, { width: 20, height: 20 })}
          </button>
          <button
            type="button"
            class="wishlist-photo-crop__align-btn"
            data-crop-align-y
            aria-label="Centrer verticalement"
          >
            ${renderLucideIcon(AlignCenterVertical, { width: 20, height: 20 })}
          </button>
        </div>
        <p class="wishlist-photo-crop__error hidden" data-crop-error role="alert"></p>
      </div>
      <div class="add-form-footer wishlist-photo-crop-footer">
        <div class="wishlist-photo-crop-footer__actions">
          <button type="button" class="add-form-submit" data-crop-cancel>
            Retour
          </button>
          <button type="button" class="add-form-submit" data-crop-apply disabled>
            Ajouter
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-active'));
  return overlay;
}

function setCropLoading(overlay, isLoading, errorMessage = '') {
  overlay.classList.toggle('is-loading', isLoading);
  overlay.querySelector('[data-crop-viewport]')?.toggleAttribute('hidden', Boolean(errorMessage));
  overlay.querySelector('.wishlist-photo-crop__toolbar')?.classList.toggle('hidden', isLoading || Boolean(errorMessage));

  const applyBtn = overlay.querySelector('[data-crop-apply]');
  applyBtn?.toggleAttribute('disabled', isLoading || Boolean(errorMessage));

  const errorEl = overlay.querySelector('[data-crop-error]');
  if (errorEl) {
    errorEl.textContent = errorMessage;
    errorEl.classList.toggle('hidden', !errorMessage);
  }
}

function getLongEdgeMinScale(imageWidth, imageHeight, cropSize) {
  return cropSize / Math.max(imageWidth, imageHeight);
}

function hasCropLetterbox(drawW, drawH, cropSize) {
  return drawW < cropSize - 0.5 || drawH < cropSize - 0.5;
}

function openCropModal(prepareImage) {
  const overlay = renderCropOverlay();
  const viewport = overlay.querySelector('[data-crop-viewport]');
  const windowEl = overlay.querySelector('[data-crop-window]');
  const letterboxEl = overlay.querySelector('[data-crop-letterbox]');
  const imgEl = overlay.querySelector('[data-crop-image]');
  const cancelBtn = overlay.querySelector('[data-crop-cancel]');
  const applyBtn = overlay.querySelector('[data-crop-apply]');
  const alignXBtn = overlay.querySelector('[data-crop-align-x]');
  const alignYBtn = overlay.querySelector('[data-crop-align-y]');

  return new Promise((resolve, reject) => {
    let image = null;
    let imageWidth = 0;
    let imageHeight = 0;
    let viewportW = 0;
    let viewportH = 0;
    let cropSize = 0;
    let cropX = 0;
    let cropY = 0;
    let minScale = 1;
    let maxScale = 1;
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let closed = false;

    const pointers = new Map();
    let dragOrigin = null;
    let pinchOrigin = null;

    function measureLayout() {
      viewportW = viewport.clientWidth;
      viewportH = viewport.clientHeight;
      cropSize = Math.min(viewportW, viewportH) * 0.9;
      cropX = (viewportW - cropSize) / 2;
      cropY = (viewportH - cropSize) / 2;
      viewport.style.setProperty('--crop-size', `${cropSize}px`);
      windowEl.style.setProperty('--crop-size', `${cropSize}px`);
      const coverScale = getCoverScale(imageWidth, imageHeight, cropSize);
      minScale = getLongEdgeMinScale(imageWidth, imageHeight, cropSize);
      maxScale = coverScale * 6;
    }

    function updateLetterbox() {
      if (!letterboxEl) return;
      const drawW = imageWidth * scale;
      const drawH = imageHeight * scale;
      letterboxEl.hidden = !hasCropLetterbox(drawW, drawH, cropSize);
    }

    function applyTransform() {
      imgEl.style.width = `${imageWidth * scale}px`;
      imgEl.style.height = `${imageHeight * scale}px`;
      imgEl.style.transform = `translate3d(${panX}px, ${panY}px, 0)`;
      updateLetterbox();
    }

    function setScale(nextScale, focalX, focalY) {
      const clampedScale = Math.min(maxScale, Math.max(minScale, nextScale));
      const ratio = clampedScale / scale;
      panX = focalX - ratio * (focalX - panX);
      panY = focalY - ratio * (focalY - panY);
      scale = clampedScale;
      clampPan();
      applyTransform();
    }

    function alignCenterX() {
      if (!image) return;
      const drawW = imageWidth * scale;
      panX = cropX + (cropSize - drawW) / 2;
      clampPan();
      applyTransform();
    }

    function alignCenterY() {
      if (!image) return;
      const drawH = imageHeight * scale;
      panY = cropY + (cropSize - drawH) / 2;
      clampPan();
      applyTransform();
    }

    function resetCropState() {
      measureLayout();
      scale = minScale;
      const drawW = imageWidth * scale;
      const drawH = imageHeight * scale;
      panX = cropX + (cropSize - drawW) / 2;
      panY = cropY + (cropSize - drawH) / 2;
      clampPan();
      applyTransform();
    }

    function clampPanAxis(pan, cropStart, cropLength, drawLength) {
      if (drawLength >= cropLength) {
        return Math.min(cropStart, Math.max(cropStart + cropLength - drawLength, pan));
      }
      return Math.min(cropStart + cropLength - drawLength, Math.max(cropStart, pan));
    }

    function clampPan() {
      const drawW = imageWidth * scale;
      const drawH = imageHeight * scale;
      panX = clampPanAxis(panX, cropX, cropSize, drawW);
      panY = clampPanAxis(panY, cropY, cropSize, drawH);
    }

    function close(result) {
      if (closed) return;
      closed = true;
      overlay.classList.remove('is-active');
      const addModalOpen = document.getElementById('add-modal-overlay')?.classList.contains('is-active');
      if (!addModalOpen) {
        document.body.classList.remove('modal-open');
      }
      window.setTimeout(() => overlay.remove(), 280);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      if (result instanceof Error) reject(result);
      else resolve(result);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') close(new Error('cancelled'));
    }

    function onResize() {
      if (!image) return;
      resetCropState();
    }

    function exportCrop() {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Recadrage impossible.');

      const drawW = imageWidth * scale;
      const drawH = imageHeight * scale;
      const cropLeft = cropX;
      const cropTop = cropY;
      const cropRight = cropX + cropSize;
      const cropBottom = cropY + cropSize;
      const imgLeft = panX;
      const imgTop = panY;
      const imgRight = panX + drawW;
      const imgBottom = panY + drawH;

      const intersectLeft = Math.max(cropLeft, imgLeft);
      const intersectTop = Math.max(cropTop, imgTop);
      const intersectRight = Math.min(cropRight, imgRight);
      const intersectBottom = Math.min(cropBottom, imgBottom);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      if (intersectRight > intersectLeft && intersectBottom > intersectTop) {
        const srcX = (intersectLeft - panX) / scale;
        const srcY = (intersectTop - panY) / scale;
        const srcW = (intersectRight - intersectLeft) / scale;
        const srcH = (intersectBottom - intersectTop) / scale;
        const destX = ((intersectLeft - cropLeft) / cropSize) * OUTPUT_SIZE;
        const destY = ((intersectTop - cropTop) / cropSize) * OUTPUT_SIZE;
        const destW = ((intersectRight - intersectLeft) / cropSize) * OUTPUT_SIZE;
        const destH = ((intersectBottom - intersectTop) / cropSize) * OUTPUT_SIZE;

        ctx.drawImage(
          image,
          srcX,
          srcY,
          srcW,
          srcH,
          destX,
          destY,
          destW,
          destH,
        );
      }

      let quality = 0.88;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > 420_000 && quality > 0.5) {
        quality -= 0.08;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      if (dataUrl.length > 500_000) {
        throw new Error('Photo trop lourde après recadrage. Essayez une image plus petite.');
      }

      return dataUrl;
    }

    function getViewportPoint(clientX, clientY) {
      const rect = viewport.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }

    function getPinchMetrics() {
      const points = [...pointers.values()];
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      return {
        distance: Math.hypot(dx, dy) || 1,
        centerX: (points[0].x + points[1].x) / 2,
        centerY: (points[0].y + points[1].y) / 2,
      };
    }

    function onPointerDown(event) {
      if (!image || event.button > 0) return;
      const point = getViewportPoint(event.clientX, event.clientY);
      pointers.set(event.pointerId, point);
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-interacting');

      if (pointers.size === 2) {
        dragOrigin = null;
        const pinch = getPinchMetrics();
        pinchOrigin = { distance: pinch.distance, scale, panX, panY };
      } else if (pointers.size === 1) {
        pinchOrigin = null;
        dragOrigin = { x: point.x, y: point.y, panX, panY };
      }
    }

    function onPointerMove(event) {
      if (!pointers.has(event.pointerId) || !image) return;
      const point = getViewportPoint(event.clientX, event.clientY);
      pointers.set(event.pointerId, point);

      if (pointers.size === 2 && pinchOrigin) {
        const pinch = getPinchMetrics();
        const nextScale = pinchOrigin.scale * (pinch.distance / pinchOrigin.distance);
        setScale(nextScale, pinch.centerX, pinch.centerY);
        return;
      }

      if (pointers.size === 1 && dragOrigin) {
        panX = dragOrigin.panX + (point.x - dragOrigin.x);
        panY = dragOrigin.panY + (point.y - dragOrigin.y);
        clampPan();
        applyTransform();
      }
    }

    function onPointerUp(event) {
      pointers.delete(event.pointerId);
      if (pointers.size === 1) {
        const remaining = [...pointers.values()][0];
        dragOrigin = { x: remaining.x, y: remaining.y, panX, panY };
        pinchOrigin = null;
      } else {
        dragOrigin = null;
        pinchOrigin = null;
      }
      if (pointers.size === 0) {
        viewport.classList.remove('is-interacting');
      }
    }

    function onWheel(event) {
      if (!image) return;
      event.preventDefault();
      const point = getViewportPoint(event.clientX, event.clientY);
      const delta = -event.deltaY * 0.0018;
      setScale(scale * (1 + delta), point.x, point.y);
    }

    function activateCrop({ img, width, height }) {
      image = img;
      imageWidth = width;
      imageHeight = height;
      imgEl.src = img.src;
      setCropLoading(overlay, false);
      applyBtn.disabled = false;
      requestAnimationFrame(() => {
        resetCropState();
        window.addEventListener('resize', onResize);
      });
    }

    cancelBtn.addEventListener('click', () => close(new Error('cancelled')));
    alignXBtn?.addEventListener('click', alignCenterX);
    alignYBtn?.addEventListener('click', alignCenterY);
    applyBtn.addEventListener('click', () => {
      try {
        close(exportCrop());
      } catch (error) {
        setCropLoading(overlay, false, error instanceof Error ? error.message : 'Recadrage impossible.');
      }
    });

    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerUp);
    viewport.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('keydown', onKeyDown);

    prepareImage()
      .then(activateCrop)
      .catch((error) => {
        if (error?.message === 'needs-file-picker') {
          close(new Error('needs-file-picker'));
          return;
        }
        setCropLoading(overlay, false, error?.message || 'Impossible de lire cette image.');
      });
  });
}

function openCropModalFromFile(file) {
  return openCropModal(() => prepareImageForCrop(file));
}

function openCropModalFromUrl(imageUrl) {
  return openCropModal(() => prepareImageForCropFromUrl(imageUrl));
}

async function applyCroppedPhoto(root, dataUrl, { photoName } = {}) {
  const hiddenInput = root.querySelector('input[type="hidden"][name="imageUrl"]');
  if (!hiddenInput) return;
  if (photoName) root.dataset.photoName = photoName;
  else if (isDataImageUrl(dataUrl)) delete root.dataset.photoName;
  hiddenInput.value = dataUrl;
  hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
  hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
  syncPhotoPreview(root);
}

async function handleFileSelected(root, file) {
  setPhotoError(root, '');
  try {
    const dataUrl = await openCropModalFromFile(file);
    await applyCroppedPhoto(root, dataUrl, { photoName: file?.name });
  } catch (error) {
    if (error?.message === 'cancelled') return;
    setPhotoError(root, error?.message || 'Impossible d’ajouter cette photo.');
  }
}

async function handleModifyPhoto(root) {
  setPhotoError(root, '');
  const hiddenInput = root.querySelector('input[type="hidden"][name="imageUrl"]');
  const imageUrl = sanitizeImageUrl(hiddenInput?.value);
  if (!imageUrl) return;

  try {
    const dataUrl = await openCropModalFromUrl(imageUrl);
    await applyCroppedPhoto(root, dataUrl);
  } catch (error) {
    if (error?.message === 'cancelled') return;
    setPhotoError(root, error?.message || 'Impossible de modifier cette photo.');
  }
}

function bindWishlistPhotoField(fieldWrap) {
  const fileInput = fieldWrap.querySelector('[data-wishlist-photo-input]');
  const hiddenInput = fieldWrap.querySelector('input[type="hidden"][name="imageUrl"]');
  const trigger = fieldWrap.querySelector('[data-wishlist-photo-trigger]');
  const modifyBtn = fieldWrap.querySelector('[data-wishlist-photo-modify]');
  const removeBtn = fieldWrap.querySelector('[data-wishlist-photo-remove]');

  if (!fileInput || !hiddenInput || !trigger) return () => {};

  const openFilePicker = () => {
    fileInput.value = '';
    fileInput.click();
  };

  const onTriggerClick = (event) => {
    if (event.target.closest('[data-wishlist-photo-remove]')) return;
    if (event.target.closest('[data-wishlist-photo-modify]')) return;
    if (trigger.classList.contains('has-photo')) return;
    openFilePicker();
  };
  const onTriggerKeyDown = (event) => {
    if (trigger.classList.contains('has-photo')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFilePicker();
    }
  };
  const onModifyClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleModifyPhoto(fieldWrap);
  };
  const onRemoveClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    hiddenInput.value = '';
    delete fieldWrap.dataset.photoName;
    hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    setPhotoError(fieldWrap, '');
    syncPhotoPreview(fieldWrap);
  };
  const onFileChange = () => {
    const file = fileInput.files?.[0];
    if (file) handleFileSelected(fieldWrap, file);
  };
  const onHiddenInput = () => {
    const url = sanitizeImageUrl(hiddenInput.value);
    if (url && !isDataImageUrl(url)) {
      delete fieldWrap.dataset.photoName;
    }
    syncPhotoPreview(fieldWrap);
  };

  trigger.addEventListener('click', onTriggerClick);
  trigger.addEventListener('keydown', onTriggerKeyDown);
  modifyBtn?.addEventListener('click', onModifyClick);
  removeBtn?.addEventListener('click', onRemoveClick);
  fileInput.addEventListener('change', onFileChange);
  hiddenInput.addEventListener('input', onHiddenInput);

  syncPhotoPreview(fieldWrap);

  return () => {
    trigger.removeEventListener('click', onTriggerClick);
    trigger.removeEventListener('keydown', onTriggerKeyDown);
    modifyBtn?.removeEventListener('click', onModifyClick);
    removeBtn?.removeEventListener('click', onRemoveClick);
    fileInput.removeEventListener('change', onFileChange);
    hiddenInput.removeEventListener('input', onHiddenInput);
  };
}

export function initFormWishlistPhotoFields(form, category) {
  if (!form || category?.id !== 'wishlist') return () => {};

  const cleanups = [];
  form.querySelectorAll('[data-wishlist-photo-field]').forEach((fieldWrap) => {
    cleanups.push(bindWishlistPhotoField(fieldWrap));
  });

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}
