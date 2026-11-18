(function (global) {
  'use strict';

  const STORAGE_KEY = 'bestBeatsCart';

  function getIds() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function persist(ids) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    updateCount(ids);
  }

  function updateCount(ids = getIds()) {
    const element = document.getElementById('cartCount');
    if (element) element.textContent = ids.length;
  }

  function toggle(beatId) {
    const ids = getIds();
    const index = ids.indexOf(beatId);
    if (index >= 0) {
      ids.splice(index, 1);
      persist(ids);
      return false;
    }
    ids.push(beatId);
    persist(ids);
    return true;
  }

  function remove(beatId) {
    const ids = getIds().filter(id => id !== beatId);
    persist(ids);
  }

  function includes(beatId) {
    return getIds().includes(beatId);
  }

  function getBeats(beats) {
    const ids = getIds();
    return beats.filter(beat => ids.includes(beat.id));
  }

  function getTotal(beats) {
    return getBeats(beats).reduce((sum, beat) => {
      const price = parseFloat(String(beat.price || '').replace(/[^0-9.]/g, ''));
      return sum + (Number.isFinite(price) ? price : 0);
    }, 0);
  }

  global.BeatsAoCart = Object.freeze({
    getIds,
    toggle,
    remove,
    includes,
    getBeats,
    getTotal,
    updateCount
  });
})(window);
