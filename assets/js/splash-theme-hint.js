/**
 * Applique le thème splash avant le 1er paint (script classique, pas module).
 * Couleurs alignées sur APP_THEMES / variables.css.
 */
(function applySplashThemeHint() {
  var KEY = 'app-theme';
  var COLORS = {
    navy: '#062045',
    orange: '#321208',
    sunset: '#8a3a0c',
    forest: '#1e382c',
    violet: '#261838',
    pink: '#381828',
    midnight: '#0e1018',
  };
  var ALLOWED = {
    navy: 1,
    orange: 1,
    sunset: 1,
    forest: 1,
    violet: 1,
    pink: 1,
    midnight: 1,
  };
  var theme = 'navy';

  try {
    var saved = localStorage.getItem(KEY);
    if (saved) {
      saved = saved.trim().toLowerCase();
      if (ALLOWED[saved]) theme = saved;
    }
  } catch {
    // ignore quota / private mode
  }

  if (!document.body) return;

  document.body.dataset.appTheme = theme;
  document.documentElement.style.backgroundColor = COLORS[theme];

  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', COLORS[theme]);
})();
