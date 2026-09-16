import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  asBeats,
  asCaptions,
  asRemakeVariant,
  asStringList,
  sanitizeProfileAnalysis,
  sanitizeRemake,
  sanitizeScript,
} from './coerce.ts'
import type { PhotoRemake, ProfileAnalysis } from './types.ts'

test('asStringList accepts arrays and splits a single LLM string', () => {
  assert.deepEqual(asStringList(['  Produit  ', '', 'Fit & styling']), ['Produit', 'Fit & styling'])
  assert.deepEqual(asStringList('Phrases courtes; Un angle par post'), [
    'Phrases courtes',
    'Un angle par post',
  ])
  assert.deepEqual(asStringList('Hooks drop plus clairs\nPlus de UGC'), [
    'Hooks drop plus clairs',
    'Plus de UGC',
  ])
  assert.deepEqual(asStringList(undefined, ['fallback']), ['fallback'])
  assert.deepEqual(asStringList({ nope: true }, ['fallback']), ['fallback'])
})

test('sanitizeProfileAnalysis makes list fields safe to .map / .join / .unshift', () => {
  const poisoned = {
    handle: 'atelierlumiere',
    analyzedAt: '2026-09-16T00:00:00.000Z',
    postsAnalyzed: 4,
    voice: 'voix directe',
    pillars: 'Produit / drop; Fit & styling',
    strengths: 'Identité visuelle',
    opportunities: ['Hooks plus clairs'],
    rules: 'Phrases courtes',
    topFormats: [],
    posts: [],
  } as unknown as ProfileAnalysis

  const repaired = sanitizeProfileAnalysis(poisoned)
  assert.deepEqual(repaired.pillars, ['Produit / drop', 'Fit & styling'])
  assert.deepEqual(repaired.strengths, ['Identité visuelle'])
  assert.deepEqual(repaired.opportunities, ['Hooks plus clairs'])
  assert.deepEqual(repaired.rules, ['Phrases courtes'])
  assert.equal(repaired.rules.join('; '), 'Phrases courtes')
  repaired.rules.unshift('CTA shop naturel')
  assert.equal(repaired.rules[0], 'CTA shop naturel')
})

test('asBeats ignores a string payload so the UI does not call .map on a string', () => {
  const fallback = [
    { time: '0:00', tone: 'hook', line: 'fallback line', subtitle: 'fb' },
  ]
  assert.deepEqual(asBeats('hook then proof then CTA', fallback), fallback)
  assert.deepEqual(asBeats([{ time: '0:00', line: 'Vrai hook', subtitle: 'H', tone: 'direct' }], fallback), [
    { time: '0:00', tone: 'direct', line: 'Vrai hook', subtitle: 'H' },
  ])
})

test('asCaptions and remake variants stay objects the UI can read', () => {
  const captions = { punchy: 'A', soft: 'B' }
  assert.deepEqual(asCaptions('not-an-object', captions), captions)
  assert.deepEqual(asCaptions({ punchy: 'New hook', extra: true }, captions), {
    punchy: 'New hook',
    soft: 'B',
  })

  const variant = { caption: 'keep', hashtags: ['#a'], shotList: ['slide 1'] }
  assert.deepEqual(asRemakeVariant({ caption: 'new', hashtags: '#drop; #fit', shotList: 'plan 1\nplan 2' }, variant), {
    caption: 'new',
    hashtags: ['#drop', '#fit'],
    shotList: ['plan 1', 'plan 2'],
  })
})

test('sanitizeRemake / sanitizeScript never leave non-arrays on mapped fields', () => {
  const remake = sanitizeRemake({
    id: 'remake-1',
    sourceReelId: 'r1',
    handle: 'studio.nord',
    why: 'works',
    identical: { caption: 'cap', hashtags: '#tag' as unknown as string[], shotList: 'slide' as unknown as string[] },
    inVoice: undefined as unknown as PhotoRemake['inVoice'],
    createdAt: '2026-09-16T00:00:00.000Z',
  })
  assert.equal(Array.isArray(remake.identical.hashtags), true)
  assert.equal(Array.isArray(remake.identical.shotList), true)
  assert.equal(Array.isArray(remake.inVoice.hashtags), true)

  const script = sanitizeScript({
    id: 'script-1',
    title: 'Drop',
    beats: 'not beats' as unknown as [],
    captions: 'nope' as unknown as { punchy: string; soft: string },
    createdAt: '2026-09-16T00:00:00.000Z',
  })
  assert.deepEqual(script.beats, [])
  assert.deepEqual(script.captions, { punchy: '', soft: '' })
})
