import { createElement } from '../vendor/lucide.mjs';
import {
  ArrowLeft,
  ChevronLeft,
  Bird,
  Bug,
  Cat,
  Clapperboard,
  CloudSync,
  Dog,
  Fish,
  Filter,
  Grid2x2,
  LayoutGrid,
  Heart,
  House,
  Layers,
  Map,
  Menu,
  Origami,
  Panda,
  Plane,
  Plus,
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
  'grid2x2': Grid2x2,
  'layout-grid': LayoutGrid,
  'arrow-left': ArrowLeft,
  'chevron-left': ChevronLeft,
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
  plus: Plus,
  filter: Filter,
  search: Search,
  layers: Layers,
};

export function renderNavIcon(name, { strokeWidth, width, height, fill, ...attrs } = {}) {
  const Icon = NAV_ICON_COMPONENTS[name] || House;
  const resolvedStrokeWidth = strokeWidth ?? (name === 'activity' ? 2 : 1.75);
  const resolvedFill = fill ?? (name === 'heart-filled' ? 'currentColor' : 'none');
  const resolvedStroke = name === 'heart-filled' ? 'none' : 'currentColor';
  const iconName = name === 'heart-filled' ? 'heart-filled' : name;
  const Component = iconName === 'heart-filled' ? Heart : Icon;

  return renderLucideIcon(Component, {
    strokeWidth: resolvedStrokeWidth,
    width,
    height,
    fill: resolvedFill,
    stroke: resolvedStroke,
    ...attrs,
  });
}
