/** Date de début de la relation — à personnaliser */
export const COUPLE_START_DATE = '2026-06-27';

/** Prénoms affichés — clé = uid Firebase */
export const USER_DISPLAY_NAMES = {
  fiiTfAA6tWRWSiIi9mhni91XU2y1: 'Bastien',
  by7lDskaTvPBOqEg3OOBXw0GWWw1: 'Louis',
};

export function getUserDisplayName(user) {
  if (!user) return '';
  if (USER_DISPLAY_NAMES[user.uid]) return USER_DISPLAY_NAMES[user.uid];

  const local = user.email?.split('@')[0] || '';
  const part = local.split(/[._-]/)[0] || local;
  if (!part) return '';
  return part.charAt(0).toUpperCase() + part.slice(1);
}

export const NAV_ITEMS = [
  {
    id: 'accueil',
    label: 'Accueil',
    href: 'accueil.html',
    icon: 'home',
  },
  {
    id: 'activites',
    label: 'Activités',
    href: 'activites.html',
    icon: 'activity',
    theme: 'cyan',
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
    href: 'restaurants.html',
    icon: 'restaurant',
    theme: 'rose',
  },
  {
    id: 'films',
    label: 'Films & Séries',
    href: 'films.html',
    icon: 'film',
    theme: 'violet',
  },
  {
    id: 'voyages',
    label: 'Voyages',
    href: 'voyages.html',
    icon: 'travel',
    theme: 'blue',
  },
  {
    id: 'wishlist',
    label: 'Wishlist',
    href: 'wishlist.html',
    icon: 'wishlist',
    theme: 'pink',
  },
];

export const HOME_CATEGORIES = [
  {
    id: 'activities',
    label: 'Activités',
    href: 'activites.html',
    icon: 'activity',
    titleKey: 'nom',
    theme: 'cyan',
    addLabel: 'Ajouter une activité',
    modalTitle: 'Nouvelle activité',
    fields: [
      { name: 'nom', label: 'Nom', type: 'text', required: true, placeholder: 'Ex. Escape game' },
      { name: 'categorie', label: 'Type', type: 'select', allowCustom: true, options: [
        { value: 'musee', label: 'Musée' },
        { value: 'expo', label: 'Expo' },
        { value: 'balade', label: 'Balade' },
        { value: 'escape_game', label: 'Escape game' },
        { value: 'concert', label: 'Concert' },
        { value: 'spectacle', label: 'Spectacle' },
        { value: 'sport', label: 'Sport' },
      ], default: 'musee' },
      { name: 'localisation', label: 'Adresse ou lieu', type: 'address', placeholder: 'Commencez à taper une adresse…' },
      { name: 'prix', label: 'Prix estimé', type: 'text', placeholder: 'Ex. 25' },
    ],
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
    href: 'restaurants.html',
    icon: 'restaurant',
    titleKey: 'nom',
    theme: 'rose',
    addLabel: 'Ajouter un restaurant',
    modalTitle: 'Nouveau restaurant',
    fields: [
      { name: 'nom', label: 'Nom', type: 'text', required: true, placeholder: 'Ex. Le Comptoir' },
      { name: 'type', label: 'Type', type: 'select', allowCustom: true, options: [
        { value: 'restaurant', label: 'Restaurant' },
        { value: 'bar', label: 'Bar' },
        { value: 'bistro', label: 'Bistro' },
        { value: 'cafe', label: 'Café' },
        { value: 'brasserie', label: 'Brasserie' },
        { value: 'bar_a_vin', label: 'Bar à vin' },
        { value: 'fast_food', label: 'Fast-food' },
      ], default: 'restaurant' },
      { name: 'cuisine', label: 'Type de cuisine', type: 'select', allowCustom: true, options: [
        { value: 'francaise', label: 'Française' },
        { value: 'italienne', label: 'Italienne' },
        { value: 'japonaise', label: 'Japonaise' },
        { value: 'chinoise', label: 'Chinoise' },
        { value: 'indienne', label: 'Indienne' },
        { value: 'libanaise', label: 'Libanaise' },
        { value: 'mexicaine', label: 'Mexicaine' },
        { value: 'thai', label: 'Thaï' },
        { value: 'pizza', label: 'Pizza' },
        { value: 'burgers', label: 'Burgers' },
        { value: 'vegetarien', label: 'Végétarien' },
      ], default: 'francaise' },
      { name: 'adresse', label: 'Adresse', type: 'address', placeholder: 'Numéro, rue, ville…', fills: { lienMaps: 'mapsUrl' } },
      { name: 'prix', label: 'Prix estimé', type: 'text', placeholder: 'Ex. 40' },
      { name: 'lienMaps', label: 'Lien Google Maps', type: 'url', placeholder: 'Rempli automatiquement' },
    ],
  },
  {
    id: 'movies',
    label: 'Films & Séries',
    href: 'films.html',
    icon: 'film',
    titleKey: 'titre',
    theme: 'violet',
    addLabel: 'Ajouter un film',
    modalTitle: 'Nouveau film ou série',
    fields: [
      { name: 'titre', label: 'Titre', type: 'text', required: true, placeholder: 'Ex. Interstellar' },
      { name: 'type', label: 'Type', type: 'select', allowCustom: true, options: [
        { value: 'film', label: 'Film' },
        { value: 'serie', label: 'Série' },
      ], default: 'film' },
    ],
  },
  {
    id: 'travels',
    label: 'Voyages',
    href: 'voyages.html',
    icon: 'travel',
    titleKey: 'destination',
    theme: 'blue',
    addLabel: 'Ajouter un voyage',
    modalTitle: 'Nouveau voyage',
    fields: [
      { name: 'destination', label: 'Destination', type: 'text', required: true, placeholder: 'Ex. Lisbonne' },
      { name: 'pays', label: 'Pays', type: 'text', placeholder: 'Ex. Portugal' },
      { name: 'budget', label: 'Budget estimé', type: 'text', placeholder: 'Ex. 800' },
      { name: 'periode', label: 'Période', type: 'text', placeholder: 'Ex. Été 2026' },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Idées, envies…' },
    ],
  },
  {
    id: 'wishlist',
    label: 'Wishlist',
    href: 'wishlist.html',
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
