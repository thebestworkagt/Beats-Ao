(function (global) {
  'use strict';

  const BASE_URL = 'https://bbghffltmiqcljuokbgz.supabase.co/functions/v1/api';

  async function request(path, options = {}) {
    const response = await fetch(`${BASE_URL}/${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    return response;
  }

  function get(path) {
    return request(path, { method: 'GET' });
  }

  function post(path, payload) {
    return request(path, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  global.BeatsAoApi = Object.freeze({
    baseUrl: BASE_URL,
    get,
    post
  });
})(window);
