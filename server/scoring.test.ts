import assert from 'node:assert/strict'
import { test } from 'node:test'
import { followedReels, scoreReels } from './scoring.ts'
import type { Reel } from './types.ts'

const atelier: Reel = {
  id: 'seed-1',
  handle: 'atelierlumiere',
  views: 842_000,
  source: 'seed',
}
const studio: Reel = {
  id: 'seed-5',
  handle: 'studio.nord',
  views: 291_000,
  source: 'seed',
}
const live: Reel = {
  id: 'apify-1',
  handle: 'rebrand',
  views: 12_000,
  source: 'apify',
}

test('followedReels drops posts from accounts the user unfollowed', () => {
  const remaining = followedReels([atelier, studio, live], [{ handle: 'rebrand' }])
  assert.deepEqual(
    remaining.map((reel) => reel.id),
    ['apify-1'],
  )
})

test('unfollowing the demo outlier removes it from the ranked radar', () => {
  const scoped = followedReels([atelier, studio], [{ handle: 'studio.nord' }])
  const hits = scoreReels(scoped, 2.5)
  assert.equal(
    hits.some((hit) => hit.handle === 'atelierlumiere'),
    false,
  )
})

test('followedReels is empty when every brand was removed', () => {
  assert.deepEqual(followedReels([atelier, studio], []), [])
})
