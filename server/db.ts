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
  lastVeilleMode: 'seed',
}

function ensure() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  if (!existsSync(storePath)) writeFileSync(storePath, JSON.stringify(seed, null, 2))
}

export function loadStore(): Store {
  ensure()
  return JSON.parse(readFileSync(storePath, 'utf8')) as Store
}

export function saveStore(store: Store) {
  ensure()
  writeFileSync(storePath, JSON.stringify(store, null, 2))
}

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, '').replace(/\/$/, '').toLowerCase()
}
