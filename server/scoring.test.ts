import assert from 'node:assert/strict'
import { test } from 'node:test'
import { liveReels, scoreReels } from './scoring.ts'
import type { Reel } from './types.ts'

function reel(partial: Partial<Reel> & Pick<Reel, 'id' | 'handle' | 'source' | 'views'>): Reel {
  return { ...partial }
}

test('keeps demo seeds until a live Apify scrape exists', () => {
  const reels = [
    reel({ id: 'seed-1', handle: 'atelierlumiere', source: 'seed', views: 842_000 }),
    reel({ id: 'manual-1', handle: 'my.brand', source: 'manual', views: 12_000 }),
  ]
  assert.deepEqual(
    liveReels(reels).map((item) => item.id),
    ['seed-1', 'manual-1'],
  )
})

test('drops leftover demo seeds once any Apify post is stored', () => {
  const reels = [
    reel({ id: 'seed-1', handle: 'atelierlumiere', source: 'seed', views: 842_000 }),
    reel({ id: 'seed-2', handle: 'atelierlumiere', source: 'seed', views: 41_000 }),
    reel({ id: 'live-1', handle: 'real.brand', source: 'apify', views: 9_000 }),
    reel({ id: 'manual-1', handle: 'real.brand', source: 'manual', views: 4_000 }),
  ]
  assert.deepEqual(
    liveReels(reels).map((item) => item.id),
    ['live-1', 'manual-1'],
  )
})

test('scoring the live set does not let orphaned seeds outrank real competitors', () => {
  const reels = [
    reel({ id: 'seed-1', handle: 'atelierlumiere', source: 'seed', views: 842_000 }),
    reel({ id: 'seed-2', handle: 'atelierlumiere', source: 'seed', views: 38_000 }),
    reel({ id: 'seed-3', handle: 'atelierlumiere', source: 'seed', views: 36_000 }),
    reel({ id: 'seed-4', handle: 'atelierlumiere', source: 'seed', views: 41_000 }),
    reel({ id: 'live-hit', handle: 'real.brand', source: 'apify', views: 80_000 }),
    reel({ id: 'live-base-1', handle: 'real.brand', source: 'apify', views: 10_000 }),
    reel({ id: 'live-base-2', handle: 'real.brand', source: 'apify', views: 9_000 }),
  ]

  const leaked = scoreReels(reels)
  assert.equal(leaked[0]?.id, 'seed-1')

  const scored = scoreReels(liveReels(reels))
  assert.equal(
    scored.some((item) => item.source === 'seed'),
    false,
  )
  assert.equal(scored[0]?.id, 'live-hit')
})
