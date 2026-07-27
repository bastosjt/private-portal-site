/** Identifiant voyage normalisé (chaîne vide = non lié). */
export function getTravelLinkId(item) {
  const id = item?.travelId;
  return typeof id === 'string' ? id.trim() : '';
}

export function isTravelLinkedItem(item) {
  return getTravelLinkId(item) !== '';
}

/** Activités / restos liés à un voyage : exclus des listes globales. */
export function shouldShowInGlobalCategoryList(item, collectionId) {
  if (collectionId !== 'activities' && collectionId !== 'restaurants') return true;
  return !isTravelLinkedItem(item);
}
