import { createElement } from '../vendor/lucide.mjs';
import {
  Bird,
  Bug,
  Cat,
  Clapperboard,
  CloudSync,
  Dog,
  Fish,
  Filter,
  Heart,
  House,
  Layers,
  Map,
  Menu,
  Origami,
  Panda,
  Plane,
  Rabbit,
  Rat,
  RollerCoaster,
  Search,
  Settings,
  Shrimp,
  Snail,
  Squirrel,
  Turtle,
  Undo2,
  UserPen,
  Utensils,
  Worm,
  X,
} from '../vendor/lucide.mjs';

/** Rend une icône Lucide en HTML string (pour innerHTML / templates). */
export function renderLucideIcon(Icon, { strokeWidth = 2, width, height, ...attrs } = {}) {
  const svgAttrs = {
    'stroke-width': String(strokeWidth),
    'aria-hidden': 'true',
    ...attrs,
  };
  if (width != null) svgAttrs.width = String(width);
  if (height != null) svgAttrs.height = String(height);

  return createElement(Icon, svgAttrs).outerHTML;
}

/** Icônes de navigation (clés = champ `icon` dans config.js). */
const NAV_ICON_COMPONENTS = {
  home: House,
  map: Map,
  activity: RollerCoaster,
  restaurant: Utensils,
  film: Clapperboard,
  travel: Plane,
  wishlist: Heart,
  settings: Settings,
  'cloud-sync': CloudSync,
  cat: Cat,
  dog: Dog,
  rabbit: Rabbit,
  squirrel: Squirrel,
  snail: Snail,
  panda: Panda,
  turtle: Turtle,
  bug: Bug,
  bird: Bird,
  fish: Fish,
  worm: Worm,
  shrimp: Shrimp,
  rat: Rat,
  origami: Origami,
  'undo-2': Undo2,
  'user-pen': UserPen,
  close: X,
  menu: Menu,
  filter: Filter,
  search: Search,
  layers: Layers,
};

export function renderNavIcon(name, { strokeWidth, width, height, ...attrs } = {}) {
  const Icon = NAV_ICON_COMPONENTS[name] || House;
  const resolvedStrokeWidth = strokeWidth ?? (name === 'activity' ? 2 : 1.75);
  return renderLucideIcon(Icon, { strokeWidth: resolvedStrokeWidth, width, height, ...attrs });
}
