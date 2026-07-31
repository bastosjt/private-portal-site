/** Date  **/
export const COUPLE_START_DATE = '2026-06-27';

/** Nom de l'espace et version */
export const APP_NAME = 'Our Space';
export const APP_TAGLINE = 'À nous deux';
export const APP_VERSION = '2.5.0';

/** Durée minimale du splash (ms). 0 = comportement normal. */
export const SPLASH_MIN_DURATION_MS = 0;

export function renderVersionBadgeHtml(version = APP_VERSION) {
  return `<span class="version-badge"><span class="version-badge-text">${version}</span></span>`;
}

export {
  USER_DISPLAY_NAMES,
  getUserDisplayName,
} from './lib/user-profile.js';

/** Thème de l'espace et paramètres */
export const BASE_THEME = 'base';

/** Red cherry — fond thème rouge cerise (liquid glass) */
export const RED_CHERRY = '#321208';

/** Orange — fond thème orange brûlé lisible (liquid glass) */
export const SUNSET_BG = '#8a3a0c';

/** Forêt — fond thème vert moyen naturel (liquid glass) */
export const FOREST_BG = '#1e382c';

/** Violet — fond thème violet profond (liquid glass) */
export const VIOLET_BG = '#261838';

/** Pink — fond thème rose profond (liquid glass) */
export const PINK_BG = '#381828';

/** Minuit — fond thème noir premium (liquid glass) */
export const MIDNIGHT_BG = '#0e1018';

/** Thèmes visuels de l'application (DA globale) */
export const DEFAULT_APP_THEME = 'navy';

export const APP_THEMES = [
  {
    id: 'navy',
    label: 'Navy',
    description: 'Liquid glass bleu nuit',
    themeColor: '#062045',
  },
  {
    id: 'orange',
    label: 'Red Cherry',
    description: 'Liquid glass rouge cerise',
    themeColor: RED_CHERRY,
  },
  {
    id: 'sunset',
    label: 'Orange',
    description: 'Liquid glass orange brûlé',
    themeColor: SUNSET_BG,
  },
  {
    id: 'forest',
    label: 'Vert nature',
    description: 'Liquid glass vert moyen naturel',
    themeColor: FOREST_BG,
  },
  {
    id: 'violet',
    label: 'Violet',
    description: 'Liquid glass violet profond',
    themeColor: VIOLET_BG,
  },
  {
    id: 'pink',
    label: 'Pink',
    description: 'Liquid glass rose profond',
    themeColor: PINK_BG,
    hidden: true,
  },
  {
    id: 'midnight',
    label: 'Minuit',
    description: 'Liquid glass noir premium',
    themeColor: MIDNIGHT_BG,
  },
];

export function getSelectableAppThemes() {
  return APP_THEMES.filter((theme) => !theme.hidden);
}

export function normalizeAppTheme(value) {
  const id = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return APP_THEMES.some((theme) => theme.id === id) ? id : DEFAULT_APP_THEME;
}

/** Thème de la carte interactive */
export const MAP_THEME = 'emerald';
export const MAP_ACCENT = '#22C55E';

export const SETTINGS_THEME = BASE_THEME;

export const NAV_ITEMS = [
  {
    id: 'accueil',
    label: 'Accueil',
    href: '#accueil',
    icon: 'home',
  },
  {
    id: 'carte',
    label: 'Carte interactive',
    href: '#carte',
    icon: 'map',
    theme: 'emerald',
  },
  {
    id: 'activites',
    label: 'Activités',
    href: '#activites',
    icon: 'activity',
    theme: 'cyan',
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
    href: '#restaurants',
    icon: 'restaurant',
    theme: 'rose',
  },
  {
    id: 'films',
    label: 'Films & Séries',
    href: '#films',
    icon: 'film',
    theme: 'violet',
  },
  {
    id: 'voyages',
    label: 'Voyages',
    href: '#voyages',
    icon: 'travel',
    theme: 'blue',
  },
  {
    id: 'wishlist',
    label: 'Wishlist',
    href: '#wishlist',
    icon: 'wishlist',
    theme: 'pink',
  },
];

export const SETTINGS_ITEM = {
  id: 'parametres',
  label: 'Profil',
  href: '#parametres',
  icon: 'user',
};

export const HOME_CATEGORIES = [
  {
    id: 'activities',
    label: 'Activités',
    href: '#activites',
    icon: 'activity',
    titleKey: 'nom',
    theme: 'cyan',
    addLabel: 'Ajouter une activité',
    modalTitle: 'Nouvelle activité',
    fields: [
      { name: 'nom', label: 'Nom', type: 'text', required: true, placeholder: 'Ex. Escape game' },
      { name: 'categorie', label: 'Type', type: 'select', allowCustom: true },
      { name: 'tags', label: 'Tags', type: 'multiSelect', allowCustom: true, optional: true },
      { name: 'disponibilite', label: 'Disponibilité', type: 'select', options: [
        { value: 'permanent', label: 'Sans limite de date' },
        { value: 'a_venir', label: 'À venir' },
        { value: 'duree_limitee', label: 'Durée limitée' },
      ], default: 'permanent' },
      { name: 'periode_debut', label: 'À partir de', type: 'text', placeholder: 'Ex. 1er déc. 2026' },
      { name: 'periode_fin', label: 'Jusqu\'au', type: 'text', placeholder: 'Ex. 28 fév. 2027' },
      { name: 'localisation', label: 'Adresse ou lieu', type: 'address', placeholder: 'Commencez à taper une adresse…' },
      { name: 'prix', label: 'Prix estimé', type: 'priceRange', placeholderMin: 'Min', placeholderMax: 'Max' },
      { name: 'travelId', label: 'Voyage associé', type: 'select', optionsFrom: 'travels' },
    ],
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
    href: '#restaurants',
    icon: 'restaurant',
    titleKey: 'nom',
    theme: 'rose',
    addLabel: 'Ajouter un restaurant',
    modalTitle: 'Nouveau restaurant',
    fields: [
      { name: 'nom', label: 'Nom', type: 'text', required: true, placeholder: 'Ex. Le Comptoir' },
      { name: 'type', label: 'Type', type: 'select', allowCustom: true },
      { name: 'cuisine', label: 'Type de cuisine', type: 'select', allowCustom: true, optional: true },
      { name: 'tags', label: 'Tags', type: 'multiSelect', allowCustom: true, optional: true },
      { name: 'adresse', label: 'Adresse', type: 'address', placeholder: 'Numéro, rue, ville…', fills: { lienMaps: 'mapsUrl' } },
      { name: 'prix', label: 'Prix estimé', type: 'priceRange', placeholderMin: 'Min', placeholderMax: 'Max' },
      { name: 'lienMaps', label: 'Lien Google Maps', type: 'url', placeholder: 'Rempli automatiquement' },
      { name: 'travelId', label: 'Voyage associé', type: 'select', optionsFrom: 'travels' },
    ],
  },
  {
    id: 'movies',
    label: 'Films & Séries',
    href: '#films',
    icon: 'film',
    titleKey: 'titre',
    theme: 'violet',
    addLabel: 'Ajouter un film',
    modalTitle: 'Nouveau film ou série',
    fields: [
      { name: 'titre', label: 'Titre', type: 'text', required: true, placeholder: 'Ex. Interstellar' },
      { name: 'type', label: 'Type', type: 'select', allowCustom: true },
      { name: 'genre', label: 'Genre', type: 'select', allowCustom: true },
    ],
  },
  {
    id: 'travels',
    label: 'Voyages',
    href: '#voyages',
    icon: 'travel',
    titleKey: 'destination',
    theme: 'blue',
    addLabel: 'Ajouter un voyage',
    modalTitle: 'Nouveau voyage',
    fields: [
      { name: 'destination', label: 'Destination', type: 'text', required: true, placeholder: 'Ex. Lisbonne' },
      { name: 'localisation', label: 'Lieu sur la carte', type: 'address', placeholder: 'Ex. Lisbonne, Portugal…', fills: { pays: 'country' } },
      { name: 'type', label: 'Type', type: 'select', allowCustom: true },
      { name: 'pays', label: 'Pays', type: 'text', placeholder: 'Ex. Portugal' },
      { name: 'budget', label: 'Budget estimé', type: 'text', placeholder: 'Ex. 800' },
      { name: 'periode', label: 'Période', type: 'text', placeholder: 'Ex. Été 2026' },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Idées, envies…' },
    ],
  },
  {
    id: 'wishlist',
    label: 'Wishlist',
    href: '#wishlist',
    icon: 'wishlist',
    titleKey: 'nom',
    theme: 'pink',
    addLabel: 'Ajouter à la wishlist',
    modalTitle: 'Nouvel élément',
    fields: [
      { name: 'nom', label: 'Nom', type: 'text', required: true, placeholder: 'Ex. Appareil photo' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Pourquoi on le veut…' },
      { name: 'prix', label: 'Prix', type: 'text', placeholder: 'Ex. 120' },
      { name: 'lien', label: 'Lien', type: 'url', placeholder: 'https://…' },
      { name: 'priorite', label: 'Priorité', type: 'select', options: [
        { value: 'basse', label: 'Basse' },
        { value: 'moyenne', label: 'Moyenne' },
        { value: 'haute', label: 'Haute' },
      ], default: 'moyenne' },
    ],
  },
];

export function getCategoryById(id) {
  return HOME_CATEGORIES.find((cat) => cat.id === id);
}
