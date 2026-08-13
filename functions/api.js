// Cloudflare Pages Functions - API
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bbghffltmiqcljuokbgz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZ2hmZmx0bWlxY2xqdW9rYmd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NzIyODgsImV4cCI6MjEwMDI0ODI4OH0.n1mYWDG2803VEbGQ8qyWlCkthtezu-3Yuh-k58bo0xE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  const method = request.method;

  // CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Responder preflight (OPTIONS)
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    // ============================================================
    // ROTA: /api/beats (GET)
    // ============================================================
    if (path === 'beats' && method === 'GET') {
      const { data, error } = await supabase
        .from('beats')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers
        });
      }

      return new Response(JSON.stringify(data || []), {
        status: 200,
        headers
      });
    }

    // ============================================================
    // ROTA: /api/play (POST)
    // ============================================================
    if (path === 'play' && method === 'POST') {
      const { beatId } = await request.json();

      if (!beatId) {
        return new Response(JSON.stringify({ error: 'beatId é obrigatório' }), {
          status: 400,
          headers
        });
      }

      const { data, error } = await supabase
        .from('beats')
        .select('plays')
        .eq('id', beatId)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers
        });
      }

      const currentPlays = data?.plays || 0;
      const newPlays = currentPlays + 1;

      const { error: updateError } = await supabase
        .from('beats')
        .update({ plays: newPlays })
        .eq('id', beatId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers
        });
      }

      return new Response(JSON.stringify({ success: true, plays: newPlays }), {
        status: 200,
        headers
      });
    }

    // ============================================================
    // ROTA: /api/ratings (GET)
    // ============================================================
    if (path === 'ratings' && method === 'GET') {
      const { data, error } = await supabase
        .from('ratings')
        .select('*');

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers
        });
      }

      return new Response(JSON.stringify(data || []), {
        status: 200,
        headers
      });
    }

    // ============================================================
    // ROTA: /api/rate (POST)
    // ============================================================
    if (path === 'rate' && method === 'POST') {
      const { beatId, rating, userId } = await request.json();

      if (!beatId || !rating) {
        return new Response(JSON.stringify({ error: 'beatId e rating são obrigatórios' }), {
          status: 400,
          headers
        });
      }

      if (rating < 1 || rating > 5) {
        return new Response(JSON.stringify({ error: 'Rating deve ser entre 1 e 5' }), {
          status: 400,
          headers
        });
      }

      const { error } = await supabase
        .from('ratings')
        .insert([{
          beat_id: beatId,
          rating: rating,
          user_id: userId || 'anonymous'
        }]);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Avaliação enviada!' }), {
        status: 200,
        headers
      });
    }

    // ============================================================
    // ROTA: /api/download (POST)
    // ============================================================
    if (path === 'download' && method === 'POST') {
      const { password, format, beatSlug } = await request.json();

      if (!beatSlug) {
        return new Response(JSON.stringify({ error: 'Beat não especificado' }), {
          status: 400,
          headers
        });
      }

      const { data: beat, error } = await supabase
        .from('beats')
        .select('password, audio_download_mp3, audio_download_wav, title')
        .eq('slug', beatSlug)
        .maybeSingle();

      if (error || !beat) {
        return new Response(JSON.stringify({ error: 'Beat não encontrado' }), {
          status: 404,
          headers
        });
      }

      if (password !== beat.password) {
        return new Response(JSON.stringify({ error: 'Senha incorreta' }), {
          status: 401,
          headers
        });
      }

      const DOWNLOAD_LINKS = {
        mp3: beat.audio_download_mp3,
        wav: beat.audio_download_wav
      };

      if (!DOWNLOAD_LINKS[format]) {
        return new Response(JSON.stringify({ error: 'Formato inválido' }), {
          status: 400,
          headers
        });
      }

      return new Response(JSON.stringify({
        success: true,
        url: DOWNLOAD_LINKS[format],
        filename: `${beat.title.replace(/\s/g, '_')}.${format}`
      }), {
        status: 200,
        headers
      });
    }

    // ============================================================
    // ROTA PADRÃO (404)
    // ============================================================
    return new Response(JSON.stringify({ error: 'Rota não encontrada' }), {
      status: 404,
      headers
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers
    });
  }
}
