import type { MediaType, Reel } from './types.ts'
import { normalizeHandle } from './db.ts'

export type ApifyItem = {
  id?: string
  shortCode?: string
  url?: string
  displayUrl?: string
  caption?: string
  ownerUsername?: string
  videoViewCount?: number
  videoPlayCount?: number
  likesCount?: number
  commentsCount?: number
  timestamp?: string
  productType?: string
  type?: string
  images?: string[]
  childPosts?: unknown[]
}

/** First finite number > 0. `??` is wrong here: Instagram often sends `videoViewCount: 0`. */
export function firstPositiveMetric(...values: unknown[]): number {
  for (const value of values) {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function classify(item: ApifyItem): MediaType {
  const type = `${item.type || ''}`.toLowerCase()
  const product = `${item.productType || ''}`.toLowerCase()
  if (product.includes('clips') || type.includes('video')) return 'reel'
  if (type.includes('sidecar') || (Array.isArray(item.childPosts) && item.childPosts.length > 1)) {
    return 'carousel'
  }
  return 'photo'
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
  // Apify addresses actors as owner~name in REST paths, not owner/name.
  const actor = process.env.APIFY_ACTOR || 'apify~instagram-scraper'
  const runRes = await fetch(`https://api.apify.com/v2/acts/${actor}/runs?token=${encodeURIComponent(token())}&waitForFinish=180`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      directUrls,
      resultsType: 'posts',
      resultsLimit: limitPerAccount,
      addParentData: false,
    }),
  })

  if (!runRes.ok) {
    const body = await runRes.text()
    throw new Error(`Apify run failed: ${runRes.status} ${body}`)
  }

  const run = (await runRes.json()) as {
    data?: { id?: string; defaultDatasetId?: string; status?: string }
  }
  const datasetId = run.data?.defaultDatasetId
  const runId = run.data?.id
  if (!datasetId) throw new Error('Apify: dataset introuvable')

  // waitForFinish caps out well before a long scrape ends, so keep polling.
  let status = run.data?.status
  const deadline = Date.now() + 5 * 60_000
  while (runId && status && !['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    if (Date.now() > deadline) break
    await new Promise((r) => setTimeout(r, 5000))
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${encodeURIComponent(token())}`,
    )
    if (!statusRes.ok) break
    const statusBody = (await statusRes.json()) as { data?: { status?: string } }
    status = statusBody.data?.status
  }

  if (status === 'FAILED' || status === 'ABORTED') {
    throw new Error(`Apify run ${status.toLowerCase()} — vérifie les comptes suivis`)
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token())}&clean=true&format=json`,
  )
  if (!itemsRes.ok) throw new Error(`Apify dataset failed: ${itemsRes.status}`)
  const items = (await itemsRes.json()) as ApifyItem[]
  return mapApifyItems(items)
}

/** Map a scraper row to a stored reel. Drops items with no usable handle or reach. */
export function mapApifyItem(item: ApifyItem): Reel | undefined {
  const handle = normalizeHandle(item.ownerUsername || '')
  if (!handle) return undefined

  const mediaType = classify(item)
  // Play count is what Instagram shows on Reels. Legacy `videoViewCount` is often
  // 0 or several times smaller when both fields are present — prefer plays so a
  // mix of the two metrics cannot invent or hide outliers. Photos have no plays.
  const views =
    mediaType === 'reel'
      ? firstPositiveMetric(item.videoPlayCount, item.videoViewCount, item.likesCount)
      : firstPositiveMetric(item.likesCount)
  if (views <= 0) return undefined

  return {
    id: String(item.id || item.shortCode || `${handle}-${views}`),
    handle,
    shortCode: item.shortCode,
    url:
      item.url ||
      (item.shortCode
        ? `https://www.instagram.com/${mediaType === 'reel' ? 'reel' : 'p'}/${item.shortCode}/`
        : undefined),
    caption: (item.caption || '').slice(0, 280),
    views,
    likes: item.likesCount,
    comments: item.commentsCount,
    takenAt: item.timestamp,
    source: 'apify',
    mediaType,
    imageUrl: item.displayUrl || item.images?.[0],
  }
}

export function mapApifyItems(items: ApifyItem[]): Reel[] {
  const reels: Reel[] = []
  for (const item of items) {
    const reel = mapApifyItem(item)
    if (reel) reels.push(reel)
  }
  return reels
}
