import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Store } from './types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'data')
const storePath = join(dataDir, 'store.json')

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
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  if (!existsSync(storePath)) writeFileSync(storePath, JSON.stringify(seed, null, 2))
}

export function loadStore(): Store {
  ensure()
  const store = JSON.parse(readFileSync(storePath, 'utf8')) as Store
  if (!store.remakes) store.remakes = []
  return store
}

export function saveStore(store: Store) {
  ensure()
  writeFileSync(storePath, JSON.stringify(store, null, 2))
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
