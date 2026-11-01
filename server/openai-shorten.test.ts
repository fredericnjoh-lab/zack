import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyShortenedHook, asPlainText } from './openai.ts'
import type { GeneratedScript } from './types.ts'

const script: GeneratedScript = {
  id: 'script-1',
  title: 'Nouveau drop vendredi.',
  sourceReelId: 'seed-1',
  createdAt: '2026-11-01T00:00:00.000Z',
  captions: { punchy: 'A', soft: 'B' },
  beats: [
    {
      time: '0:00',
      tone: 'Hook produit',
      line: 'Si ton drop ne casse pas la courbe, ce n’est pas un drop.',
      subtitle: 'Accroche drop',
    },
    {
      time: '0:05',
      tone: 'Preuve',
      line: 'Signal : 22× la médiane.',
      subtitle: 'Score',
    },
  ],
}

test('asPlainText unwraps the shapes Claude uses instead of a string', () => {
  assert.equal(asPlainText('  New drop tonight  ', 'fb'), 'New drop tonight')
  assert.equal(asPlainText({ text: 'New drop tonight' }, 'fb'), 'New drop tonight')
  assert.equal(asPlainText({ hook: 'Drop live.' }, 'fb'), 'Drop live.')
  assert.equal(asPlainText(['New', 'drop', 'tonight'], 'fb'), 'New drop tonight')
  assert.equal(asPlainText({ nope: true }, 'fallback'), 'fallback')
  assert.equal(asPlainText('', 'fallback'), 'fallback')
})

test('applyShortenedHook keeps beat.line a string when the model returns an object', () => {
  const { hook, beats } = applyShortenedHook(script, {
    hook: { text: 'Ton drop doit casser la courbe.' },
    tone: { value: 'urgent' },
    subtitle: { line: 'DROP' },
  })
  assert.equal(hook, 'Ton drop doit casser la courbe.')
  assert.equal(typeof beats[0]!.line, 'string')
  assert.equal(beats[0]!.line, 'Ton drop doit casser la courbe.')
  assert.equal(beats[0]!.tone, 'urgent')
  assert.equal(beats[0]!.subtitle, 'DROP')
  assert.equal(beats[1]!.line, 'Signal : 22× la médiane.')
  // React would throw if line were still an object.
  assert.doesNotThrow(() => String(beats[0]!.line).slice(0, 12))
})

test('applyShortenedHook falls back to the current line when hook is not text', () => {
  const { hook, beats } = applyShortenedHook(script, { hook: { nested: true } })
  assert.equal(typeof hook, 'string')
  assert.match(hook, /Si ton drop/)
  assert.equal(typeof beats[0]!.line, 'string')
  assert.equal(beats[0]!.tone, 'Hook produit')
})

test('applyShortenedHook does not throw when beats was persisted as a string', () => {
  const poisoned = { ...script, beats: 'hook then proof' as unknown as GeneratedScript['beats'] }
  const { hook, beats } = applyShortenedHook(poisoned, { hook: 'Drop live now.' })
  assert.equal(hook, 'Drop live now.')
  assert.deepEqual(beats, [])
})
