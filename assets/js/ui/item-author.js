import { auth } from '../firebase/config.js';
import { paintAvatarElement, renderAvatarContent } from '../lib/profile-avatar.js';
import {
  getDisplayNameForUid,
  getItemAuthorAriaLabel,
  getItemAuthorDisplayLabel,
  getItemAuthorHeadline,
} from '../lib/user-profile.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getItemAuthorUid(item) {
  return item?.createdBy || item?.userId || null;
}

export function renderItemAuthorMarkup(item, { viewerUid = auth.currentUser?.uid ?? null } = {}) {
  const uid = getItemAuthorUid(item);
  if (!uid) return '';

  const headline = getItemAuthorHeadline(uid);
  const relationalLabel = getItemAuthorDisplayLabel(uid, viewerUid);
  const ariaLabel = getItemAuthorAriaLabel(uid, viewerUid);
  const avatar = renderAvatarContent(uid, { name: getDisplayNameForUid(uid) });

  return `
    <div class="item-author item-author--detail">
      <div class="item-author-card" aria-label="${escapeHtml(ariaLabel)}">
        <span class="item-author-label">Ajouté par</span>
        <span class="item-author-row">
          <span class="item-author-avatar${avatar.hasAnimal ? ' has-animal' : ''}" data-author-uid="${escapeHtml(uid)}" data-author-avatar aria-hidden="true">${avatar.html}</span>
          <span class="item-author-copy">
            <span class="item-author-headline">${escapeHtml(headline)}</span>
            <span class="item-author-name">${escapeHtml(relationalLabel)}</span>
          </span>
        </span>
      </div>
    </div>
  `;
}

export function paintItemAuthors(root = document) {
  root.querySelectorAll('[data-author-avatar]').forEach((el) => {
    const uid = el.dataset.authorUid;
    if (!uid) return;

    const avatar = renderAvatarContent(uid, { name: getDisplayNameForUid(uid) });
    paintAvatarElement(el, avatar);
  });
}
