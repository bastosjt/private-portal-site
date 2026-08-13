import { getPartnerUid, getPartnerBadgeLabel, getDisplayNameForUid, DEFAULT_PARTNER_NICKNAME_LABEL } from '../../lib/user-profile.js';
import { getItemAuthorUid } from '../../ui/item-author.js';

export const AUTHOR_FILTER_OPTIONS = [
  { value: 'mine', label: 'Moi', ariaLabel: 'Mes envies' },
  { value: 'partner', label: 'Partenaire', ariaLabel: 'Envies du partenaire' },
];

function getPartnerFirstName(viewerUid) {
  const partnerUid = getPartnerUid(viewerUid);
  if (!partnerUid) return 'Partenaire';
  const name = getDisplayNameForUid(partnerUid);
  const firstName = name.split(/\s+/).filter(Boolean)[0];
  return firstName || 'Partenaire';
}

function getPartnerWishesLabel(viewerUid) {
  const nickname = getPartnerBadgeLabel(viewerUid);
  if (nickname === DEFAULT_PARTNER_NICKNAME_LABEL) return 'Envies du partenaire';
  return `Envies de ${nickname}`;
}

export function getAuthorFilterOptions(viewerUid) {
  const partnerName = getPartnerFirstName(viewerUid);
  return AUTHOR_FILTER_OPTIONS.map((opt) => {
    if (opt.value === 'partner') {
      return {
        ...opt,
        label: partnerName,
        ariaLabel: getPartnerWishesLabel(viewerUid),
      };
    }
    return opt;
  });
}

export function filterWishlistByAuthor(items, author, { viewerUid }) {
  if (author === 'mine') {
    return items.filter((item) => getItemAuthorUid(item) === viewerUid);
  }

  if (author === 'partner') {
    const partnerUid = getPartnerUid(viewerUid);
    if (!partnerUid) return [];
    return items.filter((item) => getItemAuthorUid(item) === partnerUid);
  }

  return [];
}
