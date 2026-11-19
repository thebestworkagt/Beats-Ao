import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const secretKeysRaw = Deno.env.get('SUPABASE_SECRET_KEYS') ?? ''

let secretKeys: Record<string, string>
try {
  secretKeys = JSON.parse(secretKeysRaw) as Record<string, string>
} catch {
  throw new Error('Invalid Supabase secret-key configuration')
}

const supabaseSecretKey = secretKeys.default

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error('Missing Supabase server configuration')
}

// Este cliente privilegiado só existe no servidor da Edge Function.
// Nunca copiar SUPABASE_SECRET_KEYS ou a chave obtida daqui para o frontend.
const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})

const allowedOrigins = new Set([
  'https://beatsao.site',
  'https://www.beatsao.site',
  'https://thebestworkagt.github.io'
])

const maxBodyBytes = 8 * 1024

type PublicBeat = {
  id: number
  title: string
  artist: string
  genre: string | null
  price: string
  bpm: number | null
  key: string | null
  cover: string | null
  audio: string | null
  slug: string
  plays: number | null
  description: string | null
  license_summary: string | null
  license_terms: string | null
  download_mp3_path: string | null
  download_wav_path: string | null
  audio_download_mp3: string | null
  audio_download_wav: string | null
}

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  })

  if (origin && allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
  }

  return headers
}

function jsonResponse(
  body: unknown,
  status = 200,
  origin: string | null = null
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin)
  })
}

function toPublicBeat(beat: PublicBeat) {
  return {
    id: beat.id,
    title: beat.title,
    artist: beat.artist,
    genre: beat.genre,
    price: beat.price,
    bpm: beat.bpm,
    key: beat.key,
    cover: beat.cover,
    audio: beat.audio,
    slug: beat.slug,
    plays: beat.plays ?? 0,
    description: beat.description,
    license_summary: beat.license_summary,
    license_terms: beat.license_terms,
    available_formats: {
      mp3: Boolean(beat.download_mp3_path || beat.audio_download_mp3),
      wav: Boolean(beat.download_wav_path || beat.audio_download_wav)
    },
    downloads: {
      mp3: beat.audio_download_mp3,
      wav: beat.audio_download_wav
    }
  }
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(req.headers.get('content-length') || 0)
  if (contentLength > maxBodyBytes) {
    throw new Error('Request body too large')
  }

  const raw = await req.text()
  if (new TextEncoder().encode(raw).byteLength > maxBodyBytes) {
    throw new Error('Request body too large')
  }

  const parsed: unknown = raw ? JSON.parse(raw) : {}
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid JSON body')
  }

  return parsed as Record<string, unknown>
}

function positiveInteger(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}

function isValidPrivatePath(
  value: unknown,
  beatId: number,
  format: 'mp3' | 'wav'
): value is string {
  if (typeof value !== 'string' || value.length > 512) return false

  const prefix = `beats/${beatId}/${format}/`
  if (!value.startsWith(prefix)) return false

  const filename = value.slice(prefix.length)
  if (!filename || filename.includes('/') || filename.includes('\\')) return false
  if (filename.includes('..') || filename.includes('?') || filename.includes('#')) return false

  const extension = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
  const basename = filename.slice(0, filename.lastIndexOf('.'))
  return extension === format && /^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(basename)
}

function safeFilename(title: string, extension: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'beat'

  return `${base}.${extension}`
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')

  if (origin && !allowedOrigins.has(origin)) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, null)
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin)
    })
  }

  const match = new URL(req.url).pathname.match(/\/api\/(.*)$/)
  const path = (match?.[1] ?? '').split('/').filter(Boolean)

  try {
    // GET /beats — catálogo público com allowlist de campos.
    if (path.length === 1 && path[0] === 'beats' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('beats')
        .select([
          'id', 'title', 'artist', 'genre', 'price', 'bpm', 'key',
          'cover', 'audio', 'slug', 'plays', 'description',
          'license_summary', 'license_terms', 'download_mp3_path',
          'download_wav_path', 'audio_download_mp3', 'audio_download_wav', 'status'
        ].join(','))
        .eq('status', 'published')
        .order('id', { ascending: false })

      if (error) {
        console.error('Public beats query failed:', error.message)
        return jsonResponse({ error: 'Unable to load beats' }, 500, origin)
      }

      return jsonResponse((data ?? []).map((beat) => toPublicBeat(beat as PublicBeat)), 200, origin)
    }

    // GET /beat/:slug — detalhe de um único beat publicado.
    if (path.length === 2 && path[0] === 'beat' && req.method === 'GET') {
      const slug = path[1].trim()
      if (!slug || slug.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return jsonResponse({ error: 'Beat not found' }, 404, origin)
      }

      const { data, error } = await supabase
        .from('beats')
        .select([
          'id', 'title', 'artist', 'genre', 'price', 'bpm', 'key',
          'cover', 'audio', 'slug', 'plays', 'description',
          'license_summary', 'license_terms', 'download_mp3_path',
          'download_wav_path', 'status'
        ].join(','))
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()

      if (error) {
        console.error('Public beat detail query failed:', error.message)
        return jsonResponse({ error: 'Unable to load beat' }, 500, origin)
      }

      if (!data) return jsonResponse({ error: 'Beat not found' }, 404, origin)
      return jsonResponse(toPublicBeat(data as PublicBeat), 200, origin)
    }

    // GET /ratings — apenas beat_id e rating; nunca user_id.
    if (path.length === 1 && path[0] === 'ratings' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('ratings')
        .select('beat_id,rating')

      if (error) {
        console.error('Ratings query failed:', error.message)
        return jsonResponse({ error: 'Unable to load ratings' }, 500, origin)
      }

      return jsonResponse(data ?? [], 200, origin)
    }

    // POST /play — incremento atómico através da função SQL dedicada.
    if (path.length === 1 && path[0] === 'play' && req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await readJson(req)
      } catch {
        return jsonResponse({ error: 'Invalid request body' }, 400, origin)
      }

      const beatId = positiveInteger(body.beatId)
      if (!beatId) return jsonResponse({ error: 'Invalid beatId' }, 400, origin)

      const { data, error } = await supabase.rpc('increment_beat_plays', {
        p_beat_id: beatId
      })

      if (error) {
        console.error('Play counter update failed:', error.message)
        return jsonResponse({ error: 'Unable to update play count' }, 500, origin)
      }

      if (data == null) return jsonResponse({ error: 'Beat not found' }, 404, origin)
      return jsonResponse({ success: true, plays: Number(data) }, 200, origin)
    }

    // POST /rate — endpoint legado: valida nota e beat publicado.
    // userId enviado pelo browser não é tratado como identidade autenticada.
    if (path.length === 1 && path[0] === 'rate' && req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await readJson(req)
      } catch {
        return jsonResponse({ error: 'Invalid request body' }, 400, origin)
      }

      const beatId = positiveInteger(body.beatId)
      const rating = Number(body.rating)
      if (!beatId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return jsonResponse({ error: 'Invalid rating data' }, 400, origin)
      }

      const { data: beat, error: beatError } = await supabase
        .from('beats')
        .select('id')
        .eq('id', beatId)
        .eq('status', 'published')
        .maybeSingle()

      if (beatError) {
        console.error('Rating beat lookup failed:', beatError.message)
        return jsonResponse({ error: 'Unable to submit rating' }, 500, origin)
      }
      if (!beat) return jsonResponse({ error: 'Beat not found' }, 404, origin)

      const { error } = await supabase
        .from('ratings')
        .insert({ beat_id: beatId, rating, user_id: 'anonymous' })

      if (error) {
        console.error('Rating insert failed:', error.message)
        return jsonResponse({ error: 'Unable to submit rating' }, 500, origin)
      }

      return jsonResponse({ success: true }, 201, origin)
    }

    // POST /download — assina por 120 segundos um objeto no bucket privado.
    // A password atual é um controlo legado e não substitui compra/licença.
    if (path.length === 1 && path[0] === 'download' && req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await readJson(req)
      } catch {
        return jsonResponse({ error: 'Invalid request body' }, 400, origin)
      }

      const password = typeof body.password === 'string' ? body.password.trim() : ''
      const format = typeof body.format === 'string' ? body.format.toLowerCase() : ''
      const beatSlug = typeof body.beatSlug === 'string' ? body.beatSlug.trim() : ''

      if (!password || password.length > 256 || (format !== 'mp3' && format !== 'wav')) {
        return jsonResponse({ success: false, error: 'Dados de download inválidos' }, 400, origin)
      }
      if (!beatSlug || beatSlug.length > 160) {
        return jsonResponse({ success: false, error: 'Beat não encontrado' }, 404, origin)
      }

      const { data: beat, error } = await supabase
        .from('beats')
        .select('id,title,password,download_mp3_path,download_wav_path,status')
        .eq('slug', beatSlug)
        .eq('status', 'published')
        .maybeSingle()

      if (error) {
        console.error('Download lookup failed:', error.message)
        return jsonResponse({ success: false, error: 'Não foi possível processar o download' }, 500, origin)
      }
      if (!beat || password !== beat.password) {
        return jsonResponse({ success: false, error: 'Senha incorreta ou beat indisponível' }, 401, origin)
      }

      const storedPath = format === 'mp3' ? beat.download_mp3_path : beat.download_wav_path
      if (!isValidPrivatePath(storedPath, beat.id, format)) {
        return jsonResponse({ success: false, error: 'Este formato ainda não está disponível no armazenamento privado' }, 404, origin)
      }

      const filename = safeFilename(beat.title ?? 'beat', format)
      const { data: signedData, error: signedError } = await supabase
        .storage
        .from('beat-downloads')
        .createSignedUrl(storedPath, 120, { download: filename })

      if (signedError || !signedData?.signedUrl) {
        console.error('Private download signing failed:', signedError?.message ?? 'Missing signed URL')
        return jsonResponse({ success: false, error: 'Não foi possível preparar o download' }, 500, origin)
      }

      return jsonResponse({
        success: true,
        url: signedData.signedUrl,
        filename,
        expires_in: 120
      }, 200, origin)
    }


    // Rotas administrativas: exigem sessão Supabase válida e UID explicitamente autorizado.
    if (path[0] === 'admin' && path[1] === 'beats') {
      const adminUid = Deno.env.get('ADMIN_USER_ID') ?? '';
      const authorization = req.headers.get('authorization') ?? '';
      const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
      if (!adminUid || !tokenMatch) {
        return jsonResponse({ error: 'Unauthorized' }, 401, origin);
      }

      const { data: authData, error: authError } = await supabase.auth.getUser(tokenMatch[1]);
      if (authError || !authData.user || authData.user.id !== adminUid) {
        return jsonResponse({ error: 'Forbidden' }, 403, origin);
      }

      const allowedFields = [
        'title', 'artist', 'genre', 'price', 'bpm', 'key', 'cover', 'audio',
        'audio_download_mp3', 'audio_download_wav', 'password',
        'description', 'license_summary', 'license_terms', 'status'
      ] as const;

      if (path.length === 2 && req.method === 'GET') {
        const { data, error } = await supabase
          .from('beats')
          .select('*')
          .order('id', { ascending: false });
        if (error) {
          console.error('Admin beats query failed:', error.message);
          return jsonResponse({ error: 'Unable to load admin beats' }, 500, origin);
        }
        return jsonResponse(data ?? [], 200, origin);
      }

      if (path.length === 2 && req.method === 'POST') {
        let body: Record<string, unknown>;
        try { body = await readJson(req); }
        catch { return jsonResponse({ error: 'Invalid request body' }, 400, origin); }

        const payload: Record<string, unknown> = {};
        for (const field of allowedFields) {
          if (Object.prototype.hasOwnProperty.call(body, field)) payload[field] = body[field];
        }
        if (typeof payload.title !== 'string' || !payload.title.trim() ||
            typeof payload.artist !== 'string' || !payload.artist.trim() ||
            typeof payload.genre !== 'string' || !payload.genre.trim() ||
            payload.price === undefined || !Number.isFinite(Number(payload.price)) || Number(payload.price) < 0) {
          return jsonResponse({ error: 'Invalid required beat fields' }, 400, origin);
        }
        payload.title = (payload.title as string).trim();
        payload.artist = (payload.artist as string).trim();
        payload.genre = (payload.genre as string).trim();
        payload.status = payload.status === 'published' || payload.status === 'archived' ? payload.status : 'draft';

        const { data, error } = await supabase.from('beats').insert(payload).select('*').single();
        if (error) {
          console.error('Admin beat insert failed:', error.message);
          return jsonResponse({ error: 'Unable to create beat' }, 500, origin);
        }
        return jsonResponse(data, 201, origin);
      }

      if (path.length === 3 && req.method === 'PUT') {
        const beatId = positiveInteger(path[2]);
        if (!beatId) return jsonResponse({ error: 'Invalid beat id' }, 400, origin);
        let body: Record<string, unknown>;
        try { body = await readJson(req); }
        catch { return jsonResponse({ error: 'Invalid request body' }, 400, origin); }

        const payload: Record<string, unknown> = {};
        for (const field of allowedFields) {
          if (Object.prototype.hasOwnProperty.call(body, field)) payload[field] = body[field];
        }
        if (Object.keys(payload).length === 0) return jsonResponse({ error: 'No editable fields supplied' }, 400, origin);
        if ('price' in payload && (!Number.isFinite(Number(payload.price)) || Number(payload.price) < 0)) {
          return jsonResponse({ error: 'Invalid price' }, 400, origin);
        }
        if ('status' in payload && !['draft', 'published', 'archived'].includes(String(payload.status))) {
          return jsonResponse({ error: 'Invalid status' }, 400, origin);
        }
        for (const field of ['title', 'artist', 'genre'] as const) {
          if (field in payload && (typeof payload[field] !== 'string' || !(payload[field] as string).trim())) {
            return jsonResponse({ error: `Invalid ${field}` }, 400, origin);
          }
          if (field in payload) payload[field] = (payload[field] as string).trim();
        }

        const { data, error } = await supabase.from('beats').update(payload).eq('id', beatId).select('*').maybeSingle();
        if (error) {
          console.error('Admin beat update failed:', error.message);
          return jsonResponse({ error: 'Unable to update beat' }, 500, origin);
        }
        if (!data) return jsonResponse({ error: 'Beat not found' }, 404, origin);
        return jsonResponse(data, 200, origin);
      }

      if (path.length === 3 && req.method === 'DELETE') {
        const beatId = positiveInteger(path[2]);
        if (!beatId) return jsonResponse({ error: 'Invalid beat id' }, 400, origin);
        const { data, error } = await supabase.from('beats').delete().eq('id', beatId).select('id').maybeSingle();
        if (error) {
          console.error('Admin beat delete failed:', error.message);
          return jsonResponse({ error: 'Unable to delete beat' }, 500, origin);
        }
        if (!data) return jsonResponse({ error: 'Beat not found' }, 404, origin);
        return jsonResponse({ success: true, id: data.id }, 200, origin);
      }

      return jsonResponse({ error: 'Route not found' }, 404, origin);
    }

    return jsonResponse({ error: 'Route not found' }, 404, origin)
  } catch (error) {
    console.error('Unhandled API error:', error instanceof Error ? error.message : 'Unknown error')
    return jsonResponse({ error: 'Internal server error' }, 500, origin)
  }
})
