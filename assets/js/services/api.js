(function (global) {
  'use strict';

  const BASE_URL = 'https://bbghffltmiqcljuokbgz.supabase.co/functions/v1/api';
  const SUPABASE_URL = 'https://bbghffltmiqcljuokbgz.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_lrmvRUsVTadv_yMV6fH_3Q_AMV_bM3k';

  if (!global.supabase?.createClient) {
    throw new Error('Supabase Auth SDK não foi carregado.');
  }
  const auth = global.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

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

  async function adminRequest(path, options = {}) {
    const { data } = await auth.auth.getSession();
    const accessToken = data?.session?.access_token;
    if (!accessToken) throw new Error('Sessão administrativa expirada. Entre novamente.');
    return request(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`
      }
    });
  }

  function adminGet(path) {
    return adminRequest(path, { method: 'GET' });
  }

  function adminPost(path, payload) {
    return adminRequest(path, { method: 'POST', body: JSON.stringify(payload) });
  }

  function adminPut(path, payload) {
    return adminRequest(path, { method: 'PUT', body: JSON.stringify(payload) });
  }

  function adminDelete(path) {
    return adminRequest(path, { method: 'DELETE' });
  }

  function post(path, payload) {
    return request(path, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  global.BeatsAoApi = Object.freeze({
    baseUrl: BASE_URL,
    auth,
    get,
    post,
    adminGet,
    adminPost,
    adminPut,
    adminDelete
  });
})(window);
