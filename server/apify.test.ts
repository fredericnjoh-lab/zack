import assert from 'node:assert/strict'
import { test } from 'node:test'
import { firstPositiveMetric, mapApifyItem, mapApifyItems } from './apify.ts'

test('firstPositiveMetric skips 0, null, NaN and non-numeric values', () => {
  assert.equal(firstPositiveMetric(0, null, undefined, 'nope', 241_820), 241_820)
  assert.equal(firstPositiveMetric(0, 52_248), 52_248)
  assert.equal(firstPositiveMetric(), 0)
})

test('reel with videoViewCount 0 still imports the Instagram play count', () => {
  const reel = mapApifyItem({
    id: 'viral-hidden-views',
    ownerUsername: 'atelierlumiere',
    type: 'Video',
    productType: 'clips',
    shortCode: 'AbC123',
    videoViewCount: 0,
    videoPlayCount: 842_000,
    likesCount: 12_000,
    caption: 'Hook avant / après en 2s',
  })
  assert.ok(reel)
  assert.equal(reel!.views, 842_000)
  assert.equal(reel!.mediaType, 'reel')
  assert.equal(reel!.handle, 'atelierlumiere')
})

test('prefers play count over a smaller legacy videoViewCount so mixed fields cannot invent outliers', () => {
  const [legacy, playsOnly] = mapApifyItems([
    {
      id: 'both-fields',
      ownerUsername: 'studio.nord',
      type: 'Video',
      productType: 'clips',
      videoViewCount: 41_365,
      videoPlayCount: 241_820,
    },
    {
      id: 'plays-only',
      ownerUsername: 'studio.nord',
      type: 'Video',
      productType: 'clips',
      videoViewCount: 0,
      videoPlayCount: 241_820,
    },
  ])
  assert.equal(legacy?.views, 241_820)
  assert.equal(playsOnly?.views, 241_820)
})

test('drops a reel that has no positive play, view, or like count', () => {
  assert.equal(
    mapApifyItem({
      id: 'empty',
      ownerUsername: 'capucinemode',
      type: 'Video',
      productType: 'clips',
      videoViewCount: 0,
      videoPlayCount: 0,
      likesCount: 0,
    }),
    undefined,
  )
})

test('photos still score on likes, not play counts', () => {
  const photo = mapApifyItem({
    id: 'lookbook',
    ownerUsername: 'capucinemode',
    type: 'Image',
    likesCount: 9_000,
    videoPlayCount: 99_999,
  })
  assert.ok(photo)
  assert.equal(photo!.mediaType, 'photo')
  assert.equal(photo!.views, 9_000)
})
