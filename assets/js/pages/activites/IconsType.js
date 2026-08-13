/**
 * Icônes par type d'activité — clé = value du champ `categorie` (config.js).
 */
import {
  BicepsFlexed,
  Binoculars,
  Castle,
  Church,
  Fish,
  Flower2,
  Landmark,
  Mountain,
  Music,
  Parasol,
  PawPrint,
  Popcorn,
  Puzzle,
  RollerCoaster,
  Ship,
  ShoppingBag,
  Sparkles,
  Tickets,
  Trees,
} from '../../vendor/lucide.mjs';
import { createTypeIconRenderer } from '../shared/createTypeIconRenderer.js';
import { Bridge, Fountain, Monument, Place, Ruins } from './custom-type-icons.js';

const ICON_REGISTRY = {
  landmark: Landmark,
  castle: Castle,
  tickets: Tickets,
  binoculars: Binoculars,
  puzzle: Puzzle,
  music: Music,
  popcorn: Popcorn,
  sparkles: Sparkles,
  'biceps-flexed': BicepsFlexed,
  mountain: Mountain,
  trees: Trees,
  church: Church,
  fountain: Fountain,
  place: Place,
  'flower-2': Flower2,
  'shopping-bag': ShoppingBag,
  monument: Monument,
  bridge: Bridge,
  ruins: Ruins,
  parasol: Parasol,
  ship: Ship,
  fish: Fish,
  'paw-print': PawPrint,
  activity: RollerCoaster,
};

const ACTIVITY_TYPE_ICONS = {
  musee: 'landmark',
  chateau: 'castle',
  expo: 'tickets',
  escape_game: 'puzzle',
  concert: 'music',
  cinema: 'popcorn',
  feux_d_artifice: 'sparkles',
  sport: 'biceps-flexed',
  sommet: 'mountain',
  parc: 'trees',
  jardin_botanique: 'flower-2',
  aquarium: 'fish',
  zoo: 'paw-print',
  centre_commercial: 'shopping-bag',
  monument: 'monument',
  pont: 'bridge',
  site_historique: 'ruins',
  eglise: 'church',
  cathedrale: 'church',
  eglise_cathedrale: 'church',
  fontaine: 'fountain',
  place: 'place',
  plage: 'parasol',
  port: 'ship',
  vue_panoramique: 'binoculars',
};

const { getTypeLucideIcon, renderTypeIcon } = createTypeIconRenderer({
  iconRegistry: ICON_REGISTRY,
  typeMap: ACTIVITY_TYPE_ICONS,
  defaultIconKey: 'activity',
  defaultIcon: RollerCoaster,
});

export const getActivityTypeLucideIcon = getTypeLucideIcon;
export const renderActivityTypeIcon = renderTypeIcon;
