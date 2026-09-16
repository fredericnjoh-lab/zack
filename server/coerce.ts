import type { GeneratedScript, PhotoRemake, ProfileAnalysis, ScriptBeat } from './types.ts'

/** LLM JSON often returns a list field as a single string (or a mixed array). */
export function asStringList(value: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(value)) {
    const items = value.flatMap((item) => {
      if (typeof item === 'string') {
        const trimmed = item.trim()
        return trimmed ? [trimmed] : []
      }
      if (typeof item === 'number' && Number.isFinite(item)) return [String(item)]
      return []
    })
    return items.length ? items : fallback
  }
  if (typeof value === 'string' && value.trim()) {
    const parts = value
      .split(/[\n;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
    return parts.length ? parts : fallback
  }
  return fallback
}

export function asBeats(value: unknown, fallback: ScriptBeat[]): ScriptBeat[] {
  if (!Array.isArray(value)) return fallback
  const beats: ScriptBeat[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const beat = item as Record<string, unknown>
    const line = typeof beat.line === 'string' ? beat.line.trim() : ''
    if (!line) continue
    beats.push({
      time: typeof beat.time === 'string' ? beat.time : '',
      tone: typeof beat.tone === 'string' ? beat.tone : '',
      line,
      subtitle: typeof beat.subtitle === 'string' ? beat.subtitle : '',
    })
  }
  return beats.length ? beats : fallback
}

export function asCaptions(
  value: unknown,
  fallback: GeneratedScript['captions'],
): GeneratedScript['captions'] {
  if (!value || typeof value !== 'object') return fallback
  const captions = value as Record<string, unknown>
  const punchy = typeof captions.punchy === 'string' ? captions.punchy : ''
  const soft = typeof captions.soft === 'string' ? captions.soft : ''
  if (!punchy && !soft) return fallback
  return {
    punchy: punchy || fallback.punchy,
    soft: soft || fallback.soft,
  }
}

export function asRemakeVariant(
  value: unknown,
  fallback: PhotoRemake['identical'],
): PhotoRemake['identical'] {
  if (!value || typeof value !== 'object') return fallback
  const variant = value as Record<string, unknown>
  const caption = typeof variant.caption === 'string' ? variant.caption.trim() : ''
  return {
    caption: caption || fallback.caption,
    hashtags: asStringList(variant.hashtags, fallback.hashtags),
    shotList: asStringList(variant.shotList, fallback.shotList),
  }
}

export function sanitizeProfileAnalysis(profile: ProfileAnalysis): ProfileAnalysis {
  return {
    ...profile,
    voice: typeof profile.voice === 'string' ? profile.voice : String(profile.voice ?? ''),
    pillars: asStringList(profile.pillars, []),
    strengths: asStringList(profile.strengths, []),
    opportunities: asStringList(profile.opportunities, []),
    rules: asStringList(profile.rules, []),
    posts: Array.isArray(profile.posts) ? profile.posts : [],
    topFormats: Array.isArray(profile.topFormats) ? profile.topFormats : [],
  }
}

export function sanitizeRemake(remake: PhotoRemake): PhotoRemake {
  const empty = { caption: '', hashtags: [] as string[], shotList: [] as string[] }
  return {
    ...remake,
    why: typeof remake.why === 'string' ? remake.why : '',
    identical: asRemakeVariant(remake.identical, empty),
    inVoice: asRemakeVariant(remake.inVoice, empty),
  }
}

export function sanitizeScript(script: GeneratedScript): GeneratedScript {
  const emptyBeats: ScriptBeat[] = []
  const emptyCaptions = { punchy: '', soft: '' }
  return {
    ...script,
    beats: asBeats(script.beats, emptyBeats),
    captions: asCaptions(script.captions, emptyCaptions),
  }
}
