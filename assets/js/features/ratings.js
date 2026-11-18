(function (global) {
  'use strict';

  let ratingsByBeat = {};

  async function load(api) {
    try {
      const response = await api.get('ratings');
      if (!response.ok) throw new Error('Erro ao buscar avaliações');
      const data = await response.json();
      const nextRatings = {};
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (!nextRatings[item.beat_id]) nextRatings[item.beat_id] = [];
          nextRatings[item.beat_id].push(Number(item.rating));
        });
      }
      ratingsByBeat = nextRatings;
      return true;
    } catch (error) {
      console.warn('Erro ao carregar avaliações:', error);
      ratingsByBeat = {};
      return false;
    }
  }

  async function submit(api, beatId, rating, userId) {
    const response = await api.post('rate', {
      beatId,
      rating,
      userId: userId || 'anonymous'
    });
    if (!response.ok) throw new Error('Erro ao enviar avaliação');
    await load(api);
  }

  function getForBeat(beatId) {
    return ratingsByBeat[beatId] || [];
  }

  function getAverage(beatId) {
    const values = getForBeat(beatId);
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function getCount(beatId) {
    return getForBeat(beatId).length;
  }

  function getOverallAverage() {
    const values = Object.values(ratingsByBeat).flat();
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  global.BeatsAoRatings = Object.freeze({
    load,
    submit,
    getForBeat,
    getAverage,
    getCount,
    getOverallAverage
  });
})(window);
