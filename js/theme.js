// ============================================================
// theme.js — dark/light toggle, persisted in localStorage
// Dark is default. Loaded on every page via <script> in app.js
// ============================================================

(function () {
  const STORAGE_KEY = 'pf_theme';
  const DARK  = 'dark';
  const LIGHT = 'light';

  // Apply theme immediately (before paint) to avoid flash
  function applyTheme(theme) {
    if (theme === LIGHT) {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  // Read saved preference, default to dark
  function getSaved() {
    return localStorage.getItem(STORAGE_KEY) || DARK;
  }

  // Apply on load immediately
  applyTheme(getSaved());

  // Inject toggle button into nav once DOM is ready
  function injectToggle() {
    const actions = document.querySelector('.nav-actions');
    if (!actions || document.getElementById('themeToggle')) return;

    const btn = document.createElement('button');
    btn.id        = 'themeToggle';
    btn.className = 'theme-toggle';
    btn.setAttribute('aria-label', 'Toggle light/dark mode');
    btn.setAttribute('title', 'Toggle theme');
    updateIcon(btn, getSaved());

    btn.addEventListener('click', () => {
      const current = getSaved();
      const next    = current === DARK ? LIGHT : DARK;
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      updateIcon(btn, next);
    });

    // Insert before the cart button (last child)
    actions.insertBefore(btn, actions.firstChild);
  }

  function updateIcon(btn, theme) {
    // Sun = switch to light isn't needed (already light), show moon to go dark
    // Moon = switch to dark isn't needed (already dark), show sun to go light
    btn.textContent = theme === DARK ? '☀' : '☾';
    btn.setAttribute('title', theme === DARK ? 'Switch to light mode' : 'Switch to dark mode');
  }

  // Expose for initNav() to call after dynamic nav HTML injection
  window._themeInject = injectToggle;

  // Run after DOM — works whether script is in <head> or <body>
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggle);
  } else {
    injectToggle();
  }

  // Re-run after renderNav() is called (nav is injected dynamically)
  // Patch renderNav to auto-inject after render
  const _origInitNav = window.initNav;
  document.addEventListener('DOMContentLoaded', () => {
    // Give renderNav a moment to inject HTML, then inject toggle
    setTimeout(injectToggle, 0);
  });
})();
