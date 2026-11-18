(function (global) {
  'use strict';

  const STORAGE_KEY = 'favoriteBeats';

  function getAll() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function updateCount() {
    const element = document.getElementById('playlistCount');
    if (element) element.textContent = getAll().length;
  }

  function save(ids) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    updateCount();
  }

  function toggle(beatId) {
    const ids = getAll();
    const index = ids.indexOf(beatId);
    if (index >= 0) {
      ids.splice(index, 1);
      save(ids);
      return false;
    }
    ids.push(beatId);
    save(ids);
    return true;
  }

  function includes(beatId) {
    return getAll().includes(beatId);
  }

  global.BeatsAoPlaylist = Object.freeze({
    getAll,
    save,
    toggle,
    includes,
    updateCount
  });
})(window);
