import { renderLucideIcon } from '../../lib/lucide-icon.js';

/**
 * Factory pour les icônes de type par catégorie (restaurants, activités, films…).
 */
export function createTypeIconRenderer({
  iconRegistry,
  typeMap,
  defaultIconKey,
  defaultIcon,
  strokeWidth = 2,
}) {
  function getTypeLucideIcon(value) {
    const iconName = typeMap[value] || defaultIconKey;
    return iconRegistry[iconName] || defaultIcon;
  }

  function renderTypeIcon(value, options = {}) {
    return renderLucideIcon(getTypeLucideIcon(value), { strokeWidth, ...options });
  }

  return { getTypeLucideIcon, renderTypeIcon };
}
