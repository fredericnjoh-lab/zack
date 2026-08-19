import type { Lang } from './fashion.ts'
import type { MediaType, Reel, ScoredReel } from './types.ts'

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!
}

function group(reel: Reel): 'reel' | 'photo' {
  return reel.mediaType === 'reel' || reel.mediaType === undefined ? 'reel' : 'photo'
}

/**
 * Score = signal / médiane du MÊME compte et du MÊME type de média.
 * Reels comparés aux Reels (vues), photos/carrousels aux photos (likes).
 */
export function scoreReels(reels: Reel[], minScore = 2.5, lang: Lang = 'fr'): ScoredReel[] {
  const en = lang === 'en'
  const baselines = new Map<string, number>()
  const buckets = new Map<string, number[]>()
  for (const reel of reels) {
    const key = `${reel.handle}::${group(reel)}`
    const list = buckets.get(key) ?? []
    list.push(reel.views)
    buckets.set(key, list)
  }
  for (const [key, list] of buckets) {
    baselines.set(key, median(list) || 1)
  }

  return reels
    .map((reel) => {
      const g = group(reel)
      const baseline = baselines.get(`${reel.handle}::${g}`) || 1
      const score = reel.views / baseline
      const metric: 'vues' | 'likes' = g === 'reel' ? (en ? ('views' as 'vues') : 'vues') : 'likes'
      const label = mediaLabel(reel.mediaType, lang)
      const why =
        score >= minScore
          ? en
            ? `${score.toFixed(1)}× this account's ${label} median — real outlier (${metric}).`
            : `${score.toFixed(1)}× la médiane ${label} du compte — vraie exception (${metric}).`
          : en
            ? `${score.toFixed(1)}× the ${label} median — within the usual rhythm.`
            : `${score.toFixed(1)}× la médiane ${label} — dans le rythme habituel.`
      return { ...reel, baseline, score, why, metric }
    })
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
}

/** Only photo/carousel hits, best first. */
export function scorePhotos(reels: Reel[], minScore = 2.0, lang: Lang = 'fr'): ScoredReel[] {
  return scoreReels(
    reels.filter((r) => group(r) === 'photo'),
    minScore,
    lang,
  )
}

/** Only reel/video hits, best first. */
export function scoreReelsOnly(reels: Reel[], minScore = 2.5, lang: Lang = 'fr'): ScoredReel[] {
  return scoreReels(
    reels.filter((r) => group(r) === 'reel'),
    minScore,
    lang,
  )
}

function mediaLabel(type?: MediaType, lang: Lang = 'fr'): string {
  if (type === 'photo') return 'photo'
  if (type === 'carousel') return lang === 'en' ? 'carousel' : 'carrousel'
  return 'Reel'
}
