/**
 * Applique le thème splash avant le 1er paint (script classique, pas module).
 * Couleurs alignées sur APP_THEMES.chromeColor / variables.css.
 */
(function applySplashThemeHint() {
  var LAST_USER_KEY = 'app-last-uid';
  var CHROME_COLORS = {
    navy: '#0a3268',
    orange: '#4a1808',
    sunset: '#b85014',
    forest: '#325040',
    violet: '#382850',
    pink: '#582840',
    midnight: '#181c28',
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
    var lastUid = localStorage.getItem(LAST_USER_KEY);
    if (lastUid) {
      var saved = localStorage.getItem('app-theme:' + lastUid);
      if (saved) {
        saved = saved.trim().toLowerCase();
        if (ALLOWED[saved]) theme = saved;
      }
    }
  } catch {
    // ignore quota / private mode
  }

  if (!document.body) return;

  document.body.dataset.appTheme = theme;
  document.documentElement.style.backgroundColor = CHROME_COLORS[theme];

  document.querySelectorAll('meta[name="theme-color"]').forEach(function (node) {
    node.remove();
  });
  var meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = CHROME_COLORS[theme];
  document.head.appendChild(meta);
})();
