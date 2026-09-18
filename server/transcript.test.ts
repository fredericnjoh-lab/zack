import assert from 'node:assert/strict'
import { test } from 'node:test'
import { asCaptionPair, asPlainText, sanitizeTranscription } from './transcript.ts'
import type { Transcription } from './types.ts'

test('asPlainText joins timed-line arrays the model often returns instead of a string', () => {
  assert.equal(asPlainText('VO: drop live', 'fb'), 'VO: drop live')
  assert.equal(
    asPlainText(
      [
        { time: '0:00', text: 'Hook produit' },
        { time: '0:05', line: 'Preuve fit' },
      ],
      'fb',
    ),
    'Hook produit\nPreuve fit',
  )
  assert.equal(asPlainText({ text: 'OCR écran' }, 'fb'), 'OCR écran')
  assert.equal(asPlainText({ nope: true }, 'fallback'), 'fallback')
})

test('asCaptionPair keeps punchy/soft as strings the Veille tab can render', () => {
  const fallback = { punchy: 'A', soft: 'B' }
  assert.deepEqual(asCaptionPair(undefined, fallback), fallback)
  assert.deepEqual(asCaptionPair('légende unique', fallback), { punchy: 'légende unique', soft: 'B' })
  assert.deepEqual(asCaptionPair({ punchy: { text: 'légende A' }, soft: 'légende B' }, fallback), {
    punchy: 'légende A',
    soft: 'légende B',
  })
})

test('sanitizeTranscription never leaves slice/map-unsafe fields on a persisted row', () => {
  const poisoned = {
    id: 'tr-1',
    reelId: 'seed-1',
    handle: 'atelierlumiere',
    ocrText: { text: 'NEW DROP' },
    spokenGuess: ['VO: new drop', 'Proof.', 'CTA.'],
    fullTranscript: [
      { time: '0:00', text: 'Hook' },
      { time: '0:05', text: 'Preuve' },
    ],
    captions: 'légende unique',
    source: 'caption',
    createdAt: '2026-09-18T00:00:00.000Z',
  } as unknown as Transcription

  const repaired = sanitizeTranscription(poisoned)
  assert.equal(repaired.ocrText, 'NEW DROP')
  assert.equal(repaired.spokenGuess, 'VO: new drop\nProof.\nCTA.')
  assert.equal(repaired.fullTranscript, 'Hook\nPreuve')
  assert.equal(repaired.fullTranscript.slice(0, 4), 'Hook')
  assert.deepEqual(repaired.captions, { punchy: 'légende unique', soft: '' })
  assert.equal(typeof repaired.captions.punchy, 'string')
})
