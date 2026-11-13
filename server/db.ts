import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Store } from './types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultDataDir = join(__dirname, '..', 'data')

export type PersistenceStatus = {
  backend: 'local' | 'upstash'
  configured: boolean
  restored: boolean
  durableWrites: boolean
  lastSyncedAt?: string
  lastError?: string
}

const persistenceStatus: PersistenceStatus = {
  backend: 'local',
  configured: false,
  restored: false,
  durableWrites: false,
}

let remoteWriteQueue: Promise<void> = Promise.resolve()
let remoteWritesEnabled = false

function dataDir(): string {
  return process.env.ZACK_DATA_DIR || defaultDataDir
}

function storePath(): string {
  return join(dataDir(), 'store.json')
}

function remoteKey(): string {
  return process.env.ZACK_STORE_KEY || 'zack:store'
}

const seed: Store = {
  accounts: [
    { handle: 'atelierlumiere', addedAt: new Date().toISOString() },
    { handle: 'studio.nord', addedAt: new Date().toISOString() },
    { handle: 'capucinemode', addedAt: new Date().toISOString() },
  ],
  reels: [
    {
      id: 'seed-1',
      handle: 'atelierlumiere',
      caption: 'Hook avant / après en 2s',
      views: 842_000,
      source: 'seed',
      takenAt: new Date().toISOString(),
    },
    {
      id: 'seed-2',
      handle: 'atelierlumiere',
      caption: 'Routine matin créateur',
      views: 41_000,
      source: 'seed',
    },
    {
      id: 'seed-3',
      handle: 'atelierlumiere',
      caption: '3 outils que j’utilise',
      views: 36_000,
      source: 'seed',
    },
    {
      id: 'seed-4',
      handle: 'atelierlumiere',
      caption: 'Erreur fatale en Reel',
      views: 38_000,
      source: 'seed',
    },
    {
      id: 'seed-5',
      handle: 'studio.nord',
      caption: 'Liste 3 erreurs en voice-over',
      views: 291_000,
      source: 'seed',
    },
    {
      id: 'seed-6',
      handle: 'studio.nord',
      caption: 'Setup bureau 2026',
      views: 24_000,
      source: 'seed',
    },
    {
      id: 'seed-7',
      handle: 'studio.nord',
      caption: 'Mon process montage',
      views: 19_000,
      source: 'seed',
    },
    {
      id: 'seed-8',
      handle: 'studio.nord',
      caption: 'B-roll only',
      views: 21_000,
      source: 'seed',
    },
    {
      id: 'seed-9',
      handle: 'capucinemode',
      caption: 'Carrousel myth vs vrai',
      views: 118_000,
      source: 'seed',
    },
    {
      id: 'seed-10',
      handle: 'capucinemode',
      caption: 'Look du jour',
      views: 14_000,
      source: 'seed',
    },
    {
      id: 'seed-11',
      handle: 'capucinemode',
      caption: 'Essayage express',
      views: 11_000,
      source: 'seed',
    },
    {
      id: 'seed-12',
      handle: 'capucinemode',
      caption: 'Haul express',
      views: 12_000,
      source: 'seed',
    },
  ],
  calendar: [
    { id: 'c1', day: 17, month: 8, year: 2026, label: 'Hook avant/après', status: 'ecrit' },
    { id: 'c2', day: 18, month: 8, year: 2026, label: '3 erreurs VO', status: 'tourne' },
    { id: 'c3', day: 20, month: 8, year: 2026, label: 'Myth vs vrai', status: 'ecrit' },
    { id: 'c4', day: 22, month: 8, year: 2026, label: 'Veille du lundi', status: 'publie' },
  ],
  scripts: [],
  remakes: [],
  lastVeilleMode: 'seed',
}

// A few seed photo/carousel posts so the Photos tab is usable without Apify.
seed.reels.push(
  {
    id: 'seed-p1',
    handle: 'capucinemode',
    caption: 'Carrousel : 5 pièces intemporelles de l’automne',
    views: 48_000,
    likes: 48_000,
    source: 'seed',
    mediaType: 'carousel',
  },
  {
    id: 'seed-p2',
    handle: 'capucinemode',
    caption: 'Photo lookbook studio',
    views: 9_000,
    likes: 9_000,
    source: 'seed',
    mediaType: 'photo',
  },
  {
    id: 'seed-p3',
    handle: 'capucinemode',
    caption: 'Photo miroir du matin',
    views: 7_500,
    likes: 7_500,
    source: 'seed',
    mediaType: 'photo',
  },
  {
    id: 'seed-p4',
    handle: 'studio.nord',
    caption: 'Carrousel : avant / après réaménagement',
    views: 62_000,
    likes: 62_000,
    source: 'seed',
    mediaType: 'carousel',
  },
  {
    id: 'seed-p5',
    handle: 'studio.nord',
    caption: 'Photo produit sur fond neutre',
    views: 8_800,
    likes: 8_800,
    source: 'seed',
    mediaType: 'photo',
  },
)

function ensure() {
  if (!existsSync(dataDir())) mkdirSync(dataDir(), { recursive: true })
  if (!existsSync(storePath())) writeLocalStore(seed)
}

function normalizeStore(store: Store): Store {
  if (!Array.isArray(store.remakes)) store.remakes = []
  if (!Array.isArray(store.transcriptions)) store.transcriptions = []
  if (!Array.isArray(store.discoveries)) store.discoveries = []
  if (
    !store.writingGuide ||
    !Array.isArray(store.writingGuide.documents) ||
    !Array.isArray(store.writingGuide.learnedRules)
  ) {
    store.writingGuide = { documents: [], learnedRules: [] }
  }
  if (
    !store.autoVeille ||
    typeof store.autoVeille.enabled !== 'boolean' ||
    !Number.isInteger(store.autoVeille.hour)
  ) {
    store.autoVeille = { enabled: false, hour: 7 }
  }
  return store
}

function isStore(value: unknown): value is Store {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Store>
  return (
    Array.isArray(candidate.accounts) &&
    Array.isArray(candidate.reels) &&
    Array.isArray(candidate.calendar) &&
    Array.isArray(candidate.scripts) &&
    (candidate.remakes === undefined || Array.isArray(candidate.remakes)) &&
    (candidate.transcriptions === undefined || Array.isArray(candidate.transcriptions)) &&
    (candidate.discoveries === undefined || Array.isArray(candidate.discoveries)) &&
    (candidate.writingGuide === undefined ||
      (candidate.writingGuide !== null &&
        typeof candidate.writingGuide === 'object' &&
        Array.isArray(candidate.writingGuide.documents) &&
        Array.isArray(candidate.writingGuide.learnedRules))) &&
    (candidate.autoVeille === undefined ||
      (candidate.autoVeille !== null &&
        typeof candidate.autoVeille === 'object' &&
        typeof candidate.autoVeille.enabled === 'boolean' &&
        Number.isInteger(candidate.autoVeille.hour)))
  )
}

/** Rename keeps readers from ever observing a half-written JSON file. */
function writeLocalStore(store: Store) {
  if (!existsSync(dataDir())) mkdirSync(dataDir(), { recursive: true })
  const path = storePath()
  const temporaryPath = `${path}.${process.pid}.tmp`
  writeFileSync(temporaryPath, JSON.stringify(store, null, 2))
  renameSync(temporaryPath, path)
}

function remoteConfig(): { url: string; token: string } | undefined {
  const rawUrl = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!rawUrl || !token) return undefined

  try {
    const url = new URL(rawUrl)
    const localTest =
      process.env.NODE_ENV === 'test' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
    if (url.protocol !== 'https:' && !localTest) {
      throw new Error('UPSTASH_REDIS_REST_URL doit utiliser https')
    }
    return { url: url.toString().replace(/\/$/, ''), token }
  } catch (error) {
    persistenceStatus.lastError =
      error instanceof Error ? error.message : 'configuration de persistance invalide'
    return undefined
  }
}

async function redisCommand(command: string[]): Promise<unknown> {
  const config = remoteConfig()
  if (!config) throw new Error('persistance distante non configurée')
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    throw new Error(`Upstash indisponible (HTTP ${response.status})`)
  }
  const payload = (await response.json()) as { result?: unknown; error?: string }
  if (payload.error) throw new Error(`Upstash: ${payload.error}`)
  return payload.result
}

async function writeRemoteStore(serialized: string): Promise<void> {
  const result = await redisCommand(['SET', remoteKey(), serialized])
  if (result !== 'OK') throw new Error('Upstash n’a pas confirmé la sauvegarde')
  persistenceStatus.lastSyncedAt = new Date().toISOString()
  persistenceStatus.lastError = undefined
}

function queueRemoteStore(store: Store) {
  if (!remoteConfig() || !remoteWritesEnabled) return
  const serialized = JSON.stringify(store)
  remoteWriteQueue = remoteWriteQueue
    .then(() => writeRemoteStore(serialized))
    .catch((error) => {
      persistenceStatus.lastError =
        error instanceof Error ? error.message : 'sauvegarde distante échouée'
      console.error(`[persistence] ${persistenceStatus.lastError}`)
    })
}

export function loadStore(): Store {
  ensure()
  return normalizeStore(JSON.parse(readFileSync(storePath(), 'utf8')) as Store)
}

/** Profile rules + règles apprises + extraits docs → contexte d’écriture. */
export function writingContext(store: Store): string {
  const guide = store.writingGuide || { documents: [], learnedRules: [] }
  const parts: string[] = []
  if (store.profile) {
    parts.push(`PROFIL @${store.profile.handle}: ${store.profile.voice}`)
    if (store.profile.rules.length) parts.push(`Règles profil: ${store.profile.rules.join('; ')}`)
    if (store.profile.pillars.length) parts.push(`Piliers: ${store.profile.pillars.join('; ')}`)
  }
  if (guide.learnedRules.length) {
    parts.push(`Règles retenues: ${guide.learnedRules.join('; ')}`)
  }
  for (const doc of guide.documents.slice(0, 5)) {
    parts.push(`Doc « ${doc.name} »: ${doc.content.slice(0, 1200)}`)
  }
  return parts.join('\n')
}

export function saveStore(store: Store) {
  const normalized = normalizeStore(store)
  writeLocalStore(normalized)
  queueRemoteStore(normalized)
}

/**
 * Load → mutate → save without an await in between.
 * Node is single-threaded, so this keeps concurrent request handlers from
 * clobbering each other as long as callers do their awaits first.
 */
export function updateStore(mutator: (store: Store) => void): Store {
  const store = loadStore()
  mutator(store)
  saveStore(store)
  return store
}

/**
 * Restore the last durable snapshot before Express accepts traffic.
 * With no remote configuration Zack keeps its original local-only behavior.
 */
export async function initializeStore(): Promise<PersistenceStatus> {
  const config = remoteConfig()
  remoteWritesEnabled = false
  persistenceStatus.configured = Boolean(config)
  persistenceStatus.backend = config ? 'upstash' : 'local'
  persistenceStatus.restored = false
  persistenceStatus.durableWrites = false
  persistenceStatus.lastSyncedAt = undefined
  if (!config) {
    ensure()
    return getPersistenceStatus()
  }

  try {
    let result: unknown
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await redisCommand(['GET', remoteKey()])
        break
      } catch (error) {
        if (attempt === 3) throw error
        const delay = process.env.NODE_ENV === 'test' ? 10 : attempt * 500
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
    if (typeof result === 'string') {
      const parsed: unknown = JSON.parse(result)
      if (!isStore(parsed)) throw new Error('snapshot Upstash invalide')
      writeLocalStore(normalizeStore(parsed))
      persistenceStatus.restored = true
      persistenceStatus.lastSyncedAt = new Date().toISOString()
      persistenceStatus.lastError = undefined
      console.log(`[persistence] snapshot restauré depuis Upstash (${parsed.reels.length} médias)`)
    } else if (result === null || result === undefined) {
      const local = loadStore()
      await writeRemoteStore(JSON.stringify(local))
      console.log('[persistence] snapshot Upstash initialisé')
    } else {
      throw new Error('réponse Upstash invalide')
    }
    remoteWritesEnabled = true
    persistenceStatus.durableWrites = true
  } catch (error) {
    ensure()
    persistenceStatus.lastError =
      error instanceof Error ? error.message : 'restauration distante échouée'
    console.error(`[persistence] ${persistenceStatus.lastError}; stockage local conservé`)
  }
  return getPersistenceStatus()
}

export function getPersistenceStatus(): PersistenceStatus {
  return { ...persistenceStatus }
}

/** Wait for queued writes during tests or graceful shutdown. */
export async function flushStoreWrites(): Promise<void> {
  while (true) {
    const pending = remoteWriteQueue
    await pending
    if (pending === remoteWriteQueue) return
  }
}

/** Accepts "@nom", "nom", or a full instagram.com profile URL. */
export function normalizeHandle(raw: string): string {
  let value = raw.trim()
  if (/instagram\.com/i.test(value)) {
    try {
      const url = new URL(value.startsWith('http') ? value : `https://${value}`)
      value = url.pathname.split('/').filter(Boolean)[0] || ''
    } catch {
      value = value.split('instagram.com/')[1] || value
    }
  }
  return value
    .split(/[/?#]/)[0]!
    .replace(/^@/, '')
    .trim()
    .toLowerCase()
}
