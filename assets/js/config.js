/** Date  **/
export const COUPLE_START_DATE = '2026-06-27';

/** Nom de l'espace et version */
export const APP_NAME = 'Our Space';
export const APP_TAGLINE = 'À nous deux';
export const APP_VERSION = '2.0.0';

export function renderVersionBadgeHtml(version = APP_VERSION) {
  return `<span class="version-badge"><span class="version-badge-text">${version}</span></span>`;
}

export {
  USER_DISPLAY_NAMES,
  getUserDisplayName,
} from './lib/user-profile.js';

/** Thème de l'espace et paramètres */
export const BASE_THEME = 'base';

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
  label: 'Paramètres',
  href: '#parametres',
  icon: 'settings',
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
      { name: 'disponibilite', label: 'Disponibilité', type: 'select', options: [
        { value: 'permanent', label: 'Sans limite de date' },
        { value: 'a_venir', label: 'À venir' },
        { value: 'duree_limitee', label: 'Durée limitée' },
      ], default: 'permanent' },
      { name: 'periode_debut', label: 'À partir de', type: 'text', placeholder: 'Ex. 1er déc. 2026' },
      { name: 'periode_fin', label: 'Jusqu\'au', type: 'text', placeholder: 'Ex. 28 fév. 2027' },
      { name: 'localisation', label: 'Adresse ou lieu', type: 'address', placeholder: 'Commencez à taper une adresse…' },
      { name: 'prix', label: 'Prix estimé', type: 'priceRange', placeholderMin: 'Min', placeholderMax: 'Max' },
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
      { name: 'cuisine', label: 'Type de cuisine', type: 'select', allowCustom: true },
      { name: 'adresse', label: 'Adresse', type: 'address', placeholder: 'Numéro, rue, ville…', fills: { lienMaps: 'mapsUrl' } },
      { name: 'prix', label: 'Prix estimé', type: 'priceRange', placeholderMin: 'Min', placeholderMax: 'Max' },
      { name: 'lienMaps', label: 'Lien Google Maps', type: 'url', placeholder: 'Rempli automatiquement' },
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
