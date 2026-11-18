(function (global) {
  'use strict';

  const STORAGE_KEY = 'bestBeatsTheme';

  function apply(theme) {
    const selected = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', selected);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.innerHTML = selected === 'dark'
        ? '<i class="fas fa-moon"></i>'
        : '<i class="fas fa-sun"></i>';
    }
    return selected;
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    apply(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  function load() {
    const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
    apply(saved);
  }

  global.BeatsAoTheme = Object.freeze({ toggle, load });
})(window);
