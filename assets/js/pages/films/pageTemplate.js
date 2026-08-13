import { renderListOnlyCategoryPageView } from '../shared/categoryListPageTemplate.js';

export const FILMS_VIEW_HTML = renderListOnlyCategoryPageView({
  categoryId: 'movies',
  prefix: 'films',
  themeFallback: 'violet',
  listHeading: 'Tous nos films &amp; séries',
});
