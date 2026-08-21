import { fetchMediaForHandle, hasApify } from './apify.ts'
import { loadStore, normalizeHandle, saveStore, writingContext } from './db.ts'
import { generateYoutubeMetadata, localYoutubeMetadata } from './openai.ts'
import type { Lang } from './fashion.ts'
import type {
  RepostCandidate,
  RepostSettings,
  RepostState,
  RepostedItem,
  Store,
} from './types.ts'
import { envRefreshToken, fetchChannel, hasOAuthApp, uploadVideo } from './youtube.ts'

/** Au-delà, Instagram régénère ses URLs CDN : il faut re-scanner avant d'uploader. */
const FRESH_MEDIA_MS = 30 * 60_000
const MAX_VIDEO_BYTES = 300 * 1024 * 1024

export function defaultRepostSettings(): RepostSettings {
  return {
    sourceHandle: normalizeHandle(process.env.IG_SOURCE_HANDLE || 'fredjoclothing.paris'),
    youtubeHandle: process.env.YOUTUBE_HANDLE || 'fredjoclothing',
    privacyStatus: (process.env.YOUTUBE_PRIVACY as RepostSettings['privacyStatus']) || 'private',
    autoEnabled: false,
    maxPerRun: 3,
    titleStyle: 'ai',
    extraTags: [],
    markAsShorts: true,
  }
}

/** Garantit la présence du bloc repost (stores créés avant cette version). */
export function repostState(store: Store): RepostState {
  if (!store.repost) {
    store.repost = { settings: defaultRepostSettings(), candidates: [], published: [] }
  }
  store.repost.settings = { ...defaultRepostSettings(), ...store.repost.settings }
  if (!Array.isArray(store.repost.candidates)) store.repost.candidates = []
  if (!Array.isArray(store.repost.published)) store.repost.published = []
  return store.repost
}

/** Le token du store prime : il vient d'une connexion faite dans l'app. */
export function activeRefreshToken(store: Store): string {
  return repostState(store).youtubeRefreshToken || envRefreshToken()
}

export function youtubeConnected(store: Store): boolean {
  return hasOAuthApp() && Boolean(activeRefreshToken(store))
}

function publishedIndex(state: RepostState): Map<string, RepostedItem> {
  const map = new Map<string, RepostedItem>()
  for (const item of state.published) {
    map.set(item.sourceId, item)
    if (item.shortCode) map.set(item.shortCode, item)
  }
  return map
}

export function decorate(candidates: RepostCandidate[], state: RepostState): RepostCandidate[] {
  const done = publishedIndex(state)
  return candidates.map((c) => {
    const hit = done.get(c.id) || (c.shortCode ? done.get(c.shortCode) : undefined)
    return { ...c, alreadyPosted: Boolean(hit), youtubeUrl: hit?.youtubeUrl }
  })
}

/** Scrape le compte source et met les candidats en cache dans le store. */
export async function scanCandidates(handle?: string): Promise<RepostCandidate[]> {
  if (!hasApify()) throw new Error('APIFY_TOKEN manquant — impossible de lire Instagram')
  const store = loadStore()
  const state = repostState(store)
  const source = normalizeHandle(handle || state.settings.sourceHandle)
  const media = await fetchMediaForHandle(source, 30)
  if (!media.length) {
    throw new Error(`Aucun post lisible sur @${source} (compte privé ?)`)
  }
  state.settings.sourceHandle = source
  state.candidates = media
  state.settings.lastScanAt = new Date().toISOString()
  saveStore(store)
  return decorate(media, state)
}

async function downloadVideo(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`Téléchargement vidéo ${res.status}`)
  const length = Number(res.headers.get('content-length') || 0)
  if (length > MAX_VIDEO_BYTES) throw new Error('Vidéo trop lourde (> 300 Mo)')
  const buffer = Buffer.from(await res.arrayBuffer())
  if (!buffer.length) throw new Error('Vidéo vide')
  if (buffer.length > MAX_VIDEO_BYTES) throw new Error('Vidéo trop lourde (> 300 Mo)')
  return buffer
}

/** Titre + description finaux, hashtags et mention #Shorts compris. */
async function buildMetadata(
  media: RepostCandidate,
  settings: RepostSettings,
  store: Store,
  lang: Lang,
) {
  const base =
    settings.titleStyle === 'ai'
      ? await generateYoutubeMetadata(media, settings.sourceHandle, {
          writingContext: writingContext(store),
          lang,
        })
      : localYoutubeMetadata(media, settings.sourceHandle, lang)

  const shortsSuffix = settings.markAsShorts && !/#shorts/i.test(base.title) ? ' #Shorts' : ''
  const title = `${base.title.slice(0, 100 - shortsSuffix.length)}${shortsSuffix}`
  const tags = [...new Set([...base.tags, ...settings.extraTags])].filter(Boolean).slice(0, 25)
  const hashtagLine = tags
    .slice(0, 3)
    .map((t) => `#${t.replace(/\s+/g, '')}`)
    .join(' ')
  const description = [base.description, hashtagLine].filter(Boolean).join('\n\n')
  return { title, description, tags }
}

export type RepostJob = {
  kind?: 'scan' | 'publish'
  status: 'idle' | 'running' | 'ok' | 'error'
  startedAt?: string
  finishedAt?: string
  total?: number
  done?: number
  published?: RepostedItem[]
  errors?: { sourceId: string; message: string }[]
  error?: string
  summary?: string
}

let job: RepostJob = { status: 'idle' }

export function getRepostJob(): RepostJob {
  return { ...job }
}

/** Scrape Instagram en tâche de fond : Apify dépasse souvent le timeout proxy. */
export function startScanJob(handle?: string): { started: boolean; job: RepostJob } {
  if (job.status === 'running') return { started: false, job: getRepostJob() }
  if (!hasApify()) {
    job = {
      kind: 'scan',
      status: 'error',
      finishedAt: new Date().toISOString(),
      error: 'APIFY_TOKEN manquant — impossible de lire Instagram',
    }
    return { started: false, job: getRepostJob() }
  }

  job = { kind: 'scan', status: 'running', startedAt: new Date().toISOString() }
  void (async () => {
    try {
      const found = await scanCandidates(handle)
      const fresh = found.filter((c) => c.videoUrl && !c.alreadyPosted).length
      job = {
        kind: 'scan',
        status: 'ok',
        startedAt: job.startedAt,
        finishedAt: new Date().toISOString(),
        total: found.length,
        summary: `${found.length} post(s) lus · ${fresh} vidéo(s) republiable(s)`,
      }
    } catch (err) {
      job = {
        kind: 'scan',
        status: 'error',
        startedAt: job.startedAt,
        finishedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'scan échoué',
      }
    }
  })()
  return { started: true, job: getRepostJob() }
}

type PublishOptions = {
  sourceIds?: string[]
  /** Prend les N plus récents non publiés (mode auto / cron) */
  auto?: boolean
  lang?: Lang
  source?: string
}

export function startRepostJob(opts: PublishOptions = {}): { started: boolean; job: RepostJob } {
  if (job.status === 'running') return { started: false, job: getRepostJob() }

  const store = loadStore()
  if (!youtubeConnected(store)) {
    job = {
      kind: 'publish',
      status: 'error',
      finishedAt: new Date().toISOString(),
      error: hasOAuthApp()
        ? 'Chaîne YouTube non connectée — lance la connexion depuis l’onglet Repost'
        : 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants',
    }
    return { started: false, job: getRepostJob() }
  }

  job = {
    kind: 'publish',
    status: 'running',
    startedAt: new Date().toISOString(),
    done: 0,
    published: [],
    errors: [],
  }
  void runRepost(opts).catch((err) => {
    job = {
      ...job,
      status: 'error',
      finishedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'repost failed',
    }
  })
  return { started: true, job: getRepostJob() }
}

async function runRepost(opts: PublishOptions) {
  const lang: Lang = opts.lang || 'fr'
  let store = loadStore()
  let state = repostState(store)
  const settings = state.settings

  // Les URLs CDN Instagram expirent : on re-scanne si le cache a vieilli.
  const scannedAt = settings.lastScanAt ? Date.parse(settings.lastScanAt) : 0
  if (!state.candidates.length || Date.now() - scannedAt > FRESH_MEDIA_MS) {
    await scanCandidates(settings.sourceHandle)
    store = loadStore()
    state = repostState(store)
  }

  const done = publishedIndex(state)
  const isFresh = (c: RepostCandidate) =>
    Boolean(c.videoUrl) && !done.has(c.id) && !(c.shortCode && done.has(c.shortCode))

  let queue: RepostCandidate[]
  if (opts.sourceIds?.length) {
    const wanted = new Set(opts.sourceIds)
    queue = state.candidates.filter((c) => wanted.has(c.id) || (c.shortCode && wanted.has(c.shortCode)))
    const alreadyDone = queue.filter((c) => !isFresh(c) && c.videoUrl)
    queue = queue.filter(isFresh)
    if (!queue.length && alreadyDone.length) {
      job = {
        ...job,
        status: 'ok',
        finishedAt: new Date().toISOString(),
        total: 0,
        summary: 'Déjà publié sur YouTube — rien à refaire.',
      }
      return
    }
  } else {
    queue = state.candidates.filter(isFresh).slice(0, Math.max(1, settings.maxPerRun))
  }

  if (!queue.length) {
    job = {
      ...job,
      status: 'ok',
      finishedAt: new Date().toISOString(),
      total: 0,
      summary: 'Aucune vidéo Instagram à republier.',
    }
    return
  }

  job = { ...job, total: queue.length }
  const published: RepostedItem[] = []
  const errors: { sourceId: string; message: string }[] = []

  for (const media of queue) {
    try {
      const current = loadStore()
      const meta = await buildMetadata(media, settings, current, lang)
      const video = await downloadVideo(media.videoUrl!)
      const uploaded = await uploadVideo({
        refreshToken: activeRefreshToken(current),
        video,
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
        privacyStatus: settings.privacyStatus,
      })

      const item: RepostedItem = {
        id: `yt-${uploaded.videoId}`,
        sourceId: media.id,
        shortCode: media.shortCode,
        handle: media.handle,
        sourceUrl: media.url,
        thumbnailUrl: media.thumbnailUrl,
        youtubeVideoId: uploaded.videoId,
        youtubeUrl: uploaded.url,
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
        privacyStatus: settings.privacyStatus,
        postedAt: new Date().toISOString(),
      }

      // Rechargement à chaque tour : une veille peut écrire entre deux uploads.
      const fresh = loadStore()
      const freshState = repostState(fresh)
      freshState.published.unshift(item)
      freshState.published = freshState.published.slice(0, 200)
      freshState.settings.lastRunAt = item.postedAt
      saveStore(fresh)

      published.push(item)
    } catch (err) {
      errors.push({
        sourceId: media.id,
        message: err instanceof Error ? err.message : 'upload échoué',
      })
    }
    job = { ...job, done: (job.done || 0) + 1, published: [...published], errors: [...errors] }
  }

  job = {
    ...job,
    status: errors.length && !published.length ? 'error' : 'ok',
    finishedAt: new Date().toISOString(),
    published,
    errors,
    error: errors.length && !published.length ? errors[0]!.message : undefined,
    summary: `${published.length} vidéo(s) envoyée(s) sur YouTube${
      errors.length ? ` · ${errors.length} échec(s)` : ''
    }`,
  }
}

/** Connecte la chaîne : persiste le refresh token et mémorise le nom. */
export async function connectYoutube(refreshToken: string) {
  const channel = await fetchChannel(refreshToken)
  const store = loadStore()
  const state = repostState(store)
  state.youtubeRefreshToken = refreshToken
  state.youtubeChannel = channel
  if (channel.customUrl) state.settings.youtubeHandle = channel.customUrl.replace(/^@/, '')
  saveStore(store)
  return channel
}

export function disconnectYoutube() {
  const store = loadStore()
  const state = repostState(store)
  delete state.youtubeRefreshToken
  delete state.youtubeChannel
  saveStore(store)
}
