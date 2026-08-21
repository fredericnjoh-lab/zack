import type { MediaType, Reel, RepostCandidate } from './types.ts'
import { normalizeHandle } from './db.ts'

type ApifyItem = {
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
  videoUrl?: string
  videoDuration?: number
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

/** Lance l'actor sur un seul compte et rend les items bruts. */
async function runScraper(handles: string[], limitPerAccount: number): Promise<ApifyItem[]> {
  if (!hasApify()) throw new Error('APIFY_TOKEN manquant')
  const directUrls = handles.map((h) => `https://www.instagram.com/${normalizeHandle(h)}/`)
  const actor = process.env.APIFY_ACTOR || 'apify~instagram-scraper'
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${actor}/runs?token=${encodeURIComponent(token())}&waitForFinish=180`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        directUrls,
        resultsType: 'posts',
        resultsLimit: limitPerAccount,
        addParentData: false,
      }),
    },
  )
  if (!runRes.ok) throw new Error(`Apify run failed: ${runRes.status} ${await runRes.text()}`)

  const run = (await runRes.json()) as {
    data?: { id?: string; defaultDatasetId?: string; status?: string }
  }
  const datasetId = run.data?.defaultDatasetId
  const runId = run.data?.id
  if (!datasetId) throw new Error('Apify: dataset introuvable')

  let status = run.data?.status
  const deadline = Date.now() + 5 * 60_000
  while (runId && status && !['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    if (Date.now() > deadline) break
    await new Promise((r) => setTimeout(r, 5000))
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${encodeURIComponent(token())}`,
    )
    if (!statusRes.ok) break
    status = ((await statusRes.json()) as { data?: { status?: string } }).data?.status
  }
  if (status === 'FAILED' || status === 'ABORTED') {
    throw new Error(`Apify run ${status.toLowerCase()} — vérifie les comptes ciblés`)
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token())}&clean=true&format=json`,
  )
  if (!itemsRes.ok) throw new Error(`Apify dataset failed: ${itemsRes.status}`)
  return (await itemsRes.json()) as ApifyItem[]
}

/** Pull recent posts/reels for handles via Apify Instagram Scraper. */
export async function fetchReelsForHandles(handles: string[], limitPerAccount = 12): Promise<Reel[]> {
  const items = await runScraper(handles, limitPerAccount)

  const reels: Reel[] = []
  for (const item of items) {
    const handle = normalizeHandle(item.ownerUsername || '')
    if (!handle) continue

    const mediaType = classify(item)
    // Reels are scored on views; photos/carousels have none, so likes are the
    // reach proxy. Keeping the metric per media type keeps scoring honest.
    const views =
      mediaType === 'reel'
        ? Number(item.videoViewCount ?? item.videoPlayCount ?? item.likesCount ?? 0)
        : Number(item.likesCount ?? 0)
    if (views <= 0) continue

    reels.push({
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
    })
  }

  return reels
}

/**
 * Posts d'un compte avec l'URL vidéo brute — base du repost YouTube.
 * Contrairement à fetchReelsForHandles, on garde les posts à 0 vue : ce qui
 * compte ici c'est de pouvoir republier, pas de scorer.
 */
export async function fetchMediaForHandle(
  handle: string,
  limit = 24,
): Promise<RepostCandidate[]> {
  const items = await runScraper([handle], limit)
  const target = normalizeHandle(handle)
  const media: RepostCandidate[] = []

  for (const item of items) {
    const owner = normalizeHandle(item.ownerUsername || '') || target
    const mediaType = classify(item)
    const shortCode = item.shortCode
    media.push({
      id: String(item.id || shortCode || `${owner}-${media.length}`),
      shortCode,
      handle: owner,
      url:
        item.url ||
        (shortCode
          ? `https://www.instagram.com/${mediaType === 'reel' ? 'reel' : 'p'}/${shortCode}/`
          : undefined),
      caption: item.caption || '',
      videoUrl: item.videoUrl,
      thumbnailUrl: item.displayUrl || item.images?.[0],
      durationSec: item.videoDuration ? Math.round(item.videoDuration) : undefined,
      takenAt: item.timestamp,
      views: Number(item.videoViewCount ?? item.videoPlayCount ?? 0) || undefined,
      likes: item.likesCount,
      comments: item.commentsCount,
      mediaType,
    })
  }

  media.sort((a, b) => (b.takenAt || '').localeCompare(a.takenAt || ''))
  return media
}
