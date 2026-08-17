import type { Reel } from './types.ts'
import { normalizeHandle } from './db.ts'

type ApifyItem = {
  id?: string
  shortCode?: string
  url?: string
  caption?: string
  ownerUsername?: string
  videoViewCount?: number
  videoPlayCount?: number
  likesCount?: number
  commentsCount?: number
  timestamp?: string
  productType?: string
  type?: string
}

export function hasApify(): boolean {
  return Boolean(process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN)
}

function token(): string {
  return process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN || ''
}

/** Pull recent posts/reels for handles via Apify Instagram Scraper. */
export async function fetchReelsForHandles(handles: string[], limitPerAccount = 12): Promise<Reel[]> {
  if (!hasApify()) {
    throw new Error('APIFY_TOKEN manquant')
  }

  const directUrls = handles.map((h) => `https://www.instagram.com/${normalizeHandle(h)}/`)
  const actor = 'apify/instagram-scraper'
  const runRes = await fetch(`https://api.apify.com/v2/acts/${actor}/runs?token=${encodeURIComponent(token())}&waitForFinish=120`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      directUrls,
      resultsType: 'posts',
      resultsLimit: limitPerAccount * handles.length,
      searchLimit: 1,
    }),
  })

  if (!runRes.ok) {
    const body = await runRes.text()
    throw new Error(`Apify run failed: ${runRes.status} ${body}`)
  }

  const run = (await runRes.json()) as { data?: { defaultDatasetId?: string; status?: string } }
  const datasetId = run.data?.defaultDatasetId
  if (!datasetId) throw new Error('Apify: dataset introuvable')

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token())}&clean=true&format=json`,
  )
  if (!itemsRes.ok) throw new Error(`Apify dataset failed: ${itemsRes.status}`)
  const items = (await itemsRes.json()) as ApifyItem[]

  const reels: Reel[] = []
  for (const item of items) {
    const views = Number(item.videoViewCount ?? item.videoPlayCount ?? 0)
    const handle = normalizeHandle(item.ownerUsername || '')
    if (!handle || views <= 0) continue
    // Prefer video/reel-like items; still keep high-view posts if labeled
    const type = `${item.productType || ''} ${item.type || ''}`.toLowerCase()
    if (type && !/(reel|video|clips)/.test(type) && views < 5_000) continue

    reels.push({
      id: String(item.id || item.shortCode || `${handle}-${views}`),
      handle,
      shortCode: item.shortCode,
      url: item.url || (item.shortCode ? `https://www.instagram.com/reel/${item.shortCode}/` : undefined),
      caption: (item.caption || '').slice(0, 280),
      views,
      likes: item.likesCount,
      comments: item.commentsCount,
      takenAt: item.timestamp,
      source: 'apify',
    })
  }

  return reels
}
