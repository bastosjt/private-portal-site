import { renderMapCategoryListPageView } from '../shared/categoryListPageTemplate.js';

export const RESTAURANTS_VIEW_HTML = renderMapCategoryListPageView({
  categoryId: 'restaurants',
  prefix: 'restaurants',
  themeFallback: 'rose',
  listHeading: 'Toutes nos adresses',
  mapAriaLabel: 'Carte des restaurants',
  fitAllAriaLabel: 'Voir tous les restaurants',
  emptyHint: 'Ajoutez une adresse à vos restaurants pour les voir ici.',
});
