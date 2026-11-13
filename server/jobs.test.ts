import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeFetchedReels } from './jobs.ts'
import type { Reel } from './types.ts'

function reel(partial: Partial<Reel> & Pick<Reel, 'id' | 'handle' | 'source'>): Reel {
  return {
    views: 1000,
    ...partial,
  }
}

test('keeps historical posts when a scrape returns nothing for that account', () => {
  const existing = [
    reel({ id: 'old-a', handle: 'brand.a', source: 'apify', views: 50_000 }),
    reel({ id: 'old-b', handle: 'brand.b', source: 'apify', views: 20_000 }),
  ]
  const merged = mergeFetchedReels(existing, [], ['brand.a', 'brand.b'])
  assert.deepEqual(
    merged.map((item) => item.id),
    ['old-a', 'old-b'],
  )
})

test('replaces only accounts the scrape actually returned', () => {
  const existing = [
    reel({ id: 'old-a', handle: 'brand.a', source: 'apify' }),
    reel({ id: 'old-b', handle: 'brand.b', source: 'apify' }),
    reel({ id: 'old-c', handle: 'brand.c', source: 'apify' }),
  ]
  const fetched = [reel({ id: 'new-a', handle: 'brand.a', source: 'apify', views: 80_000 })]
  const merged = mergeFetchedReels(existing, fetched, ['brand.a', 'brand.b', 'brand.c'])
  assert.deepEqual(
    merged.map((item) => item.id),
    ['old-b', 'old-c', 'new-a'],
  )
})

test('never drops manual reels for followed accounts', () => {
  const existing = [
    reel({ id: 'manual-1', handle: 'brand.a', source: 'manual', views: 12_000 }),
    reel({ id: 'old-a', handle: 'brand.a', source: 'apify', views: 40_000 }),
  ]
  const fetched = [reel({ id: 'new-a', handle: 'brand.a', source: 'apify', views: 90_000 })]
  const merged = mergeFetchedReels(existing, fetched, ['brand.a'])
  assert.deepEqual(
    merged.map((item) => item.id),
    ['manual-1', 'new-a'],
  )
})

test('keeps reels for accounts that are no longer followed', () => {
  const existing = [
    reel({ id: 'unfollowed', handle: 'old.brand', source: 'apify' }),
    reel({ id: 'old-a', handle: 'brand.a', source: 'apify' }),
  ]
  const fetched = [reel({ id: 'new-a', handle: 'brand.a', source: 'apify' })]
  const merged = mergeFetchedReels(existing, fetched, ['brand.a'])
  assert.deepEqual(
    merged.map((item) => item.id),
    ['unfollowed', 'new-a'],
  )
})
