import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = resolve(projectRoot, process.env.DIST_DIR || 'dist')
const apiBaseUrl = (process.env.BEATS_API_BASE_URL ||
  'https://bbghffltmiqcljuokbgz.supabase.co/functions/v1/api').replace(/\/$/, '')
const siteOrigin = (process.env.BEATS_SITE_ORIGIN || 'https://beatsao.site').replace(/\/$/, '')
const outputRelative = relative(projectRoot, outputDir)
if (!outputRelative || outputRelative.startsWith('..') || isAbsolute(outputRelative)) {
  throw new Error('DIST_DIR must be a child directory of the repository root.')
}

const publicFiles = [
  'index.html',
  '404.html',
  'CNAME',
  'sitemap.xml',
  'logo.png',
  'logo1.png',
  'eu.jpg',
  'googlebf9468f7f5a4a305.html'
]

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character])
}

function safeJsonForHtml(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

async function copyPublicShell() {
  await rm(outputDir, { recursive: true, force: true })
  await mkdir(outputDir, { recursive: true })

  for (const relativePath of publicFiles) {
    try {
      await cp(join(projectRoot, relativePath), join(outputDir, relativePath))
    } catch (error) {
      if (relativePath === 'googlebf9468f7f5a4a305.html') continue
      throw new Error(`Could not copy ${relativePath}: ${error.message}`)
    }
  }

  await cp(join(projectRoot, 'assets'), join(outputDir, 'assets'), { recursive: true })
  await writeFile(join(outputDir, '.nojekyll'), '')
}

function buildPage(template, beat) {
  const title = `${beat.title || 'Beat'} — ${beat.artist || 'Beats Ao'}`
  const description = (beat.description || beat.license_summary ||
    `Ouve e descobre ${beat.title || 'este beat'} no Beats Ao.`).slice(0, 155)
  const canonical = `${siteOrigin}/beats/${encodeURIComponent(beat.slug)}/`
  const image = typeof beat.cover === 'string' && /^https?:\/\//i.test(beat.cover)
    ? beat.cover
    : `${siteOrigin}/logo1.png`

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: beat.title || 'Beat',
    byArtist: { '@type': 'MusicGroup', name: beat.artist || 'Beats Ao' },
    genre: beat.genre || undefined,
    image,
    url: canonical
  }

  const formats = beat.available_formats || {}
  const price = beat.price || 'Preço sob consulta'
  const descriptionText = beat.description || 'Ainda não foi adicionada uma descrição para este beat.'
  const licenseSummary = beat.license_summary || 'As condições de licença serão apresentadas antes da compra.'
  const licenseTerms = beat.license_terms || 'Não foram publicados termos adicionais de licença.'
  const plays = Number(beat.plays || 0)

  return template
    .replace('<title>Beat | Beats Ao</title>', `<title>${escapeHtml(title)}</title>`)
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
    .replace('content="Detalhes do beat no Beats Ao."', `content="${escapeHtml(description)}"`)
    .replace('content="Beat | Beats Ao"', `content="${escapeHtml(title)}"`)
    .replace('content="Ouve e descobre este beat no Beats Ao."', `content="${escapeHtml(description)}"`)
    .replace('content="https://beatsao.site/"', `content="${escapeHtml(canonical)}"`)
    .replace('content="https://beatsao.site/logo1.png"', `content="${escapeHtml(image)}"`)
    .replace('href="https://beatsao.site/"', `href="${escapeHtml(canonical)}"`)
    .replace('<script type="application/ld+json" id="detailJsonLd">{}</script>',
      `<script type="application/ld+json" id="detailJsonLd">${safeJsonForHtml(schema)}</script>`)
    .replace('</head>', `<script id="beatPageData" type="application/json">${safeJsonForHtml(beat)}</script>\\n</head>`)
}
async function main() {
  const response = await fetch(`${apiBaseUrl}/beats`, {
    headers: { Accept: 'application/json' }
  })

  if (!response.ok) {
    throw new Error(`Catalog API returned HTTP ${response.status}; no pages generated.`)
  }

  const payload = await response.json()
  if (!Array.isArray(payload)) {
    throw new Error('Catalog API response must be a JSON array.')
  }

  const template = await readFile(join(projectRoot, '404.html'), 'utf8')
  await copyPublicShell()

  const validBeats = payload.filter((beat) =>
    beat && typeof beat.slug === 'string' &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(beat.slug) &&
    typeof beat.id === 'number'
  )

  const seenSlugs = new Set()
  const sitemapEntries = []
  const lastmod = new Date().toISOString().slice(0, 10)

  for (const beat of validBeats) {
    if (seenSlugs.has(beat.slug)) {
      throw new Error(`Duplicate beat slug detected: ${beat.slug}`)
    }
    seenSlugs.add(beat.slug)

    const pageDir = join(outputDir, 'beats', beat.slug)
    await mkdir(pageDir, { recursive: true })
    await writeFile(join(pageDir, 'index.html'), buildPage(template, beat), 'utf8')

    const canonical = `${siteOrigin}/beats/${encodeURIComponent(beat.slug)}/`
    sitemapEntries.push([
      '  <url>',
      `    <loc>${escapeHtml(canonical)}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      '    <changefreq>weekly</changefreq>',
      '    <priority>0.8</priority>',
      '  </url>'
    ].join('\n'))
  }

  const sitemapPath = join(outputDir, 'sitemap.xml')
  let sitemap = await readFile(sitemapPath, 'utf8')
  sitemap = sitemap.replace(/\s*<url>\s*<loc>https:\/\/beatsao\.site\/beats\/.*?<\/url>/gs, '')
  sitemap = sitemap.replace('</urlset>', `${sitemapEntries.length ? '\n' + sitemapEntries.join('\n') + '\n' : ''}</urlset>`)
  await writeFile(sitemapPath, sitemap, 'utf8')

  console.log(`Generated static site with ${validBeats.length} beat page(s) in ${outputDir}`)
  if (validBeats.length !== payload.length) {
    console.warn(`Skipped ${payload.length - validBeats.length} record(s) with invalid or missing slug/id.`)
  }
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})
