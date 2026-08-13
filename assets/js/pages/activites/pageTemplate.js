import { renderMapCategoryListPageView } from '../shared/categoryListPageTemplate.js';

export const ACTIVITIES_VIEW_HTML = renderMapCategoryListPageView({
  categoryId: 'activities',
  prefix: 'activities',
  themeFallback: 'cyan',
  listHeading: 'Toutes nos idées',
  mapAriaLabel: 'Carte des activités',
  fitAllAriaLabel: 'Voir toutes les activités',
  emptyHint: 'Ajoutez une adresse à vos activités pour les voir ici.',
});
