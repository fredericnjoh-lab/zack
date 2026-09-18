import type { Transcription } from './types.ts'

/** Flatten LLM JSON that ignored the string schema (array of lines, {text}, etc.). */
export function asPlainText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (Array.isArray(value)) {
    const parts = value.map((item) => asPlainText(item, '')).filter((item) => item.trim())
    return parts.length ? parts.join('\n') : fallback
  }
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>
    for (const key of ['text', 'line', 'content', 'transcript', 'value']) {
      const inner = rec[key]
      if (typeof inner === 'string' && inner.trim()) return inner
    }
  }
  return fallback
}

export function asCaptionPair(
  value: unknown,
  fallback: { punchy: string; soft: string },
): { punchy: string; soft: string } {
  if (typeof value === 'string' && value.trim()) {
    return { punchy: value, soft: fallback.soft }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
  const rec = value as Record<string, unknown>
  const punchy = asPlainText(rec.punchy, '')
  const soft = asPlainText(rec.soft, '')
  if (!punchy && !soft) return fallback
  return {
    punchy: punchy || fallback.punchy,
    soft: soft || fallback.soft,
  }
}

export function sanitizeTranscription(raw: Transcription): Transcription {
  const empty = { punchy: '', soft: '' }
  const source = raw.source
  return {
    ...raw,
    reelId: typeof raw.reelId === 'string' ? raw.reelId : String(raw.reelId ?? ''),
    handle: typeof raw.handle === 'string' ? raw.handle : String(raw.handle ?? ''),
    ocrText: asPlainText(raw.ocrText, ''),
    spokenGuess: asPlainText(raw.spokenGuess, ''),
    fullTranscript: asPlainText(raw.fullTranscript, ''),
    captions: asCaptionPair(raw.captions, empty),
    source: source === 'vision' || source === 'caption' || source === 'local' ? source : 'local',
  }
}
