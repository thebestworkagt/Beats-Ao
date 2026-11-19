const DEFAULT_API_URL = 'https://bbghffltmiqcljuokbgz.supabase.co/functions/v1/api'
const DEFAULT_SITE_ORIGIN = 'https://beatsao.site'

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character])
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

function safeImageUrl(value, fallback) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return fallback
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : fallback
  } catch {
    return fallback
  }
}

function renderNotFound(template, title, message) {
  const notFound = template
    .replace('<title>Beat | Beats Ao</title>', '<title>Beat não encontrado | Beats Ao</title>')
    .replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,nofollow">')
    .replace('<div class="detail-loader" id="detailLoader">', '<div class="detail-loader" id="detailLoader" hidden>')
    .replace('<section class="detail-state" id="detailError" hidden>', '<section class="detail-state" id="detailError">')
    .replace('<h1 id="detailErrorTitle">Página não encontrada</h1>', `<h1 id="detailErrorTitle">${escapeHtml(title)}</h1>`)
    .replace('<p id="detailErrorMessage">Este endereço não corresponde a uma página disponível.</p>', `<p id="detailErrorMessage">${escapeHtml(message)}</p>`)

  return notFound
}

function renderBeatPage(template, beat, siteOrigin) {
  const title = `${beat.title || 'Beat'} — ${beat.artist || 'Beats Ao'}`
  const description = (beat.description || beat.license_summary ||
    `Ouve e descobre ${beat.title || 'este beat'} no Beats Ao.`).slice(0, 155)
  const canonical = `${siteOrigin}/beats/${encodeURIComponent(beat.slug)}/`
  const image = safeImageUrl(beat.cover, `${siteOrigin}/logo1.png`)
  const formats = beat.available_formats || {}
  const price = beat.price || 'Preço sob consulta'
  const descriptionText = beat.description || 'Ainda não foi adicionada uma descrição para este beat.'
  const licenseSummary = beat.license_summary || 'As condições de licença serão apresentadas antes da compra.'
  const licenseTerms = beat.license_terms || 'Não foram publicados termos adicionais de licença.'
  const plays = Number(beat.plays || 0)

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: beat.title || 'Beat',
    byArtist: { '@type': 'MusicGroup', name: beat.artist || 'Beats Ao' },
    genre: beat.genre || undefined,
    image,
    url: canonical
  }

  return template
    .replace('<title>Beat | Beats Ao</title>', `<title>${escapeHtml(title)}</title>`)
    .replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="index,follow">')
    .replace('content="Detalhes do beat no Beats Ao."', `content="${escapeHtml(description)}"`)
    .replace('content="Beat | Beats Ao"', `content="${escapeHtml(title)}"`)
    .replace('content="Ouve e descobre este beat no Beats Ao."', `content="${escapeHtml(description)}"`)
    .replace('content="https://beatsao.site/"', `content="${escapeHtml(canonical)}"`)
    .replace('content="https://beatsao.site/logo1.png"', `content="${escapeHtml(image)}"`)
    .replace('href="https://beatsao.site/"', `href="${escapeHtml(canonical)}"`)
    .replace('<article class="beat-detail-content" id="detailContent" hidden>', '<article class="beat-detail-content" id="detailContent" data-static-page="true">')
    .replace('<div class="detail-loader" id="detailLoader">', '<div class="detail-loader" id="detailLoader" hidden>')
    .replace('<img class="detail-cover" id="detailCover" alt="" hidden>', `<img class="detail-cover" id="detailCover" src="${escapeHtml(image)}" alt="Capa de ${escapeHtml(beat.title || 'beat')}" loading="lazy">`)
    .replace('<div class="detail-cover-placeholder" id="detailCoverPlaceholder">', '<div class="detail-cover-placeholder" id="detailCoverPlaceholder" hidden>')
    .replace('<h1 class="detail-title" id="detailTitle">Beat</h1>', `<h1 class="detail-title" id="detailTitle">${escapeHtml(beat.title || 'Beat')}</h1>`)
    .replace('<p class="detail-artist" id="detailArtist">Artista</p>', `<p class="detail-artist" id="detailArtist">${escapeHtml(beat.artist || 'Artista')}</p>`)
    .replace('<span class="detail-tag" id="detailGenre">Género</span>', `<span class="detail-tag" id="detailGenre">${escapeHtml(beat.genre || 'Género não indicado')}</span>`)
    .replace('<span class="detail-tag" id="detailBpm">BPM</span>', `<span class="detail-tag" id="detailBpm">${escapeHtml(beat.bpm ? `${beat.bpm} BPM` : 'BPM não indicado')}</span>`)
    .replace('<span class="detail-tag" id="detailKey">Tonalidade</span>', `<span class="detail-tag" id="detailKey">${escapeHtml(beat.key || 'Tonalidade não indicada')}</span>`)
    .replace('<strong id="detailPlays">0 reproduções</strong>', `<strong id="detailPlays">${plays} reproduções</strong>`)
    .replace('<div class="detail-price" id="detailPrice">—</div>', `<div class="detail-price" id="detailPrice">${escapeHtml(price)}</div>`)
    .replace('<p class="detail-description" id="detailDescription"></p>', `<p class="detail-description" id="detailDescription">${escapeHtml(descriptionText)}</p>`)
    .replace('<p class="detail-description" id="detailLicenseSummary"></p>', `<p class="detail-description" id="detailLicenseSummary">${escapeHtml(licenseSummary)}</p>`)
    .replace('<p class="detail-description" id="detailLicenseTerms"></p>', `<p class="detail-description" id="detailLicenseTerms">${escapeHtml(licenseTerms)}</p>`)
    .replace('id="detailDownloadMp3" type="button" hidden', `id="detailDownloadMp3" type="button"${formats.mp3 === true ? '' : ' hidden'}`)
    .replace('id="detailDownloadWav" type="button" hidden', `id="detailDownloadWav" type="button"${formats.wav === true ? '' : ' hidden'}`)
    .replace('<script type="application/ld+json" id="detailJsonLd">{}</script>',
      `<script type="application/ld+json" id="detailJsonLd">${safeJson(schema)}</script>`)
    .replace('</head>', `<script id="beatPageData" type="application/json">${safeJson(beat)}</script>\n</head>`)
}

export async function onRequestGet(context) {
  const { request, env, params } = context
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const siteOrigin = (env.BEATS_SITE_ORIGIN || DEFAULT_SITE_ORIGIN).replace(/\/$/, '')
  const apiBaseUrl = (env.BEATS_API_BASE_URL || DEFAULT_API_URL).replace(/\/$/, '')

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return new Response('Not found', { status: 404 })
  }

  if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
    return new Response('Cloudflare Pages ASSETS binding is unavailable.', { status: 500 })
  }

  const templateResponse = await env.ASSETS.fetch(new URL('/404.html', request.url))
  if (!templateResponse.ok) {
    return new Response('Beat page template is unavailable.', { status: 500 })
  }
  const template = await templateResponse.text()

  let apiResponse
  try {
    apiResponse = await fetch(`${apiBaseUrl}/beat/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' }
    })
  } catch {
    const html = renderNotFound(template, 'Serviço temporariamente indisponível', 'Não foi possível contactar o catálogo. Tenta novamente dentro de instantes.')
    return new Response(html, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
    })
  }

  if (apiResponse.status === 404) {
    const html = renderNotFound(template, 'Beat não encontrado', 'Este beat pode ter sido removido, arquivado ou ainda não está publicado.')
    return new Response(html, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
    })
  }

  if (!apiResponse.ok) {
    const html = renderNotFound(template, 'Não foi possível abrir este beat', 'O catálogo não respondeu corretamente. Tenta novamente mais tarde.')
    return new Response(html, {
      status: 502,
      headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
    })
  }

  let beat
  try {
    beat = await apiResponse.json()
  } catch {
    return new Response('Invalid catalog response.', { status: 502 })
  }

  if (!beat || beat.slug !== slug || !Number.isSafeInteger(Number(beat.id))) {
    return new Response('Beat not found.', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } })
  }

  const html = renderBeatPage(template, beat, siteOrigin)
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=300',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  })
}
