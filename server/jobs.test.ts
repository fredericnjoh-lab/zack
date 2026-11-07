import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeScrapedReels } from './jobs.ts'
import type { Reel } from './types.ts'

function reel(partial: Partial<Reel> & Pick<Reel, 'id' | 'handle' | 'source' | 'views'>): Reel {
  return { ...partial }
}

const accounts = [{ handle: 'atelierlumiere' }, { handle: 'studio.nord' }]

test('keeps a manual Reel for a followed brand after an Apify scrape', () => {
  const existing = [
    reel({ id: 'manual-1', handle: 'atelierlumiere', source: 'manual', views: 900_000, caption: 'vu en story' }),
    reel({ id: 'old-apify', handle: 'atelierlumiere', source: 'apify', views: 12_000 }),
  ]
  const fetched = [reel({ id: 'new-apify', handle: 'atelierlumiere', source: 'apify', views: 15_000 })]

  const merged = mergeScrapedReels(existing, fetched, accounts)
  assert.deepEqual(
    merged.map((item) => item.id),
    ['manual-1', 'new-apify'],
  )
})

test('does not wipe a followed brand whose scrape came back empty', () => {
  const existing = [
    reel({ id: 'studio-hit', handle: 'studio.nord', source: 'apify', views: 291_000 }),
    reel({ id: 'studio-base', handle: 'studio.nord', source: 'apify', views: 24_000 }),
    reel({ id: 'atelier-old', handle: 'atelierlumiere', source: 'apify', views: 40_000 }),
  ]
  // Apify returned posts for atelierlumiere only — studio.nord was private / filtered to 0 views.
  const fetched = [reel({ id: 'atelier-new', handle: 'atelierlumiere', source: 'apify', views: 48_000 })]

  const merged = mergeScrapedReels(existing, fetched, accounts)
  assert.deepEqual(
    merged.map((item) => item.id),
    ['studio-hit', 'studio-base', 'atelier-new'],
  )
})

test('an empty scrape leaves the previous snapshot in place', () => {
  const existing = [
    reel({ id: 'live-1', handle: 'atelierlumiere', source: 'apify', views: 80_000 }),
    reel({ id: 'manual-1', handle: 'atelierlumiere', source: 'manual', views: 12_000 }),
  ]
  const merged = mergeScrapedReels(existing, [], accounts)
  assert.deepEqual(
    merged.map((item) => item.id),
    ['live-1', 'manual-1'],
  )
})

test('still replaces seed/apify posts for a handle that did return items', () => {
  const existing = [
    reel({ id: 'seed-1', handle: 'atelierlumiere', source: 'seed', views: 842_000 }),
    reel({ id: 'old-apify', handle: 'atelierlumiere', source: 'apify', views: 12_000 }),
    reel({ id: 'unfollowed', handle: 'capucinemode', source: 'apify', views: 9_000 }),
  ]
  const fetched = [reel({ id: 'fresh', handle: 'atelierlumiere', source: 'apify', views: 20_000 })]

  const merged = mergeScrapedReels(existing, fetched, accounts)
  assert.deepEqual(
    merged.map((item) => item.id),
    ['unfollowed', 'fresh'],
  )
})
