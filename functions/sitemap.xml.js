const DEFAULT_API_URL = 'https://bbghffltmiqcljuokbgz.supabase.co/functions/v1/api'
const SITE_ORIGIN = 'https://beatsao.site'

function xmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  })[character])
}

export async function onRequestGet({ request, env }) {
  const apiBaseUrl = (env.BEATS_API_BASE_URL || DEFAULT_API_URL).replace(/\/$/, '')
  try {
    const response = await fetch(`${apiBaseUrl}/beats`, {
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) throw new Error(`Catalog returned ${response.status}`)

    const beats = await response.json()
    if (!Array.isArray(beats)) throw new Error('Invalid catalog payload')

    const entries = new Map()
    entries.set(SITE_ORIGIN + '/', [
      '  <url>',
      `    <loc>${SITE_ORIGIN}/</loc>`,
      `    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>`,
      '    <changefreq>weekly</changefreq>',
      '    <priority>1.0</priority>',
      '  </url>'
    ].join('\n'))

    for (const beat of beats) {
      if (!beat || typeof beat.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(beat.slug)) continue
      const loc = `${SITE_ORIGIN}/beats/${encodeURIComponent(beat.slug)}/`
      entries.set(loc, [
        '  <url>',
        `    <loc>${xmlEscape(loc)}</loc>`,
        `    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>`,
        '    <changefreq>weekly</changefreq>',
        '    <priority>0.8</priority>',
        '  </url>'
      ].join('\n'))
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries.values(),
      '</urlset>'
    ].join('\n')

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=0, s-maxage=900, stale-while-revalidate=1800'
      }
    })
  } catch {
    const asset = await env.ASSETS.fetch(new URL('/sitemap.xml', request.url))
    return new Response(asset.body, {
      status: asset.status,
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'no-store',
        'X-Sitemap-Fallback': 'static'
      }
    })
  }
}
