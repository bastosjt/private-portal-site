import { createElement } from 'https://esm.sh/lucide@1.23.0';
import {
  Clapperboard,
  Heart,
  House,
  Menu,
  Plane,
  RollerCoaster,
  Utensils,
  X,
} from 'https://esm.sh/lucide@1.23.0';

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
  activity: RollerCoaster,
  restaurant: Utensils,
  film: Clapperboard,
  travel: Plane,
  wishlist: Heart,
  close: X,
  menu: Menu,
};

export function renderNavIcon(name, { strokeWidth, width, height, ...attrs } = {}) {
  const Icon = NAV_ICON_COMPONENTS[name] || House;
  const resolvedStrokeWidth = strokeWidth ?? (name === 'activity' ? 2 : 1.75);
  return renderLucideIcon(Icon, { strokeWidth: resolvedStrokeWidth, width, height, ...attrs });
}
