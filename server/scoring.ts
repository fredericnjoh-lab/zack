import type { Reel, ScoredReel } from './types.ts'

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!
}

/** Score viral = vues / médiane des Reels du même compte (baseline locale). */
export function scoreReels(reels: Reel[], minScore = 2.5): ScoredReel[] {
  const byHandle = new Map<string, Reel[]>()
  for (const reel of reels) {
    const list = byHandle.get(reel.handle) ?? []
    list.push(reel)
    byHandle.set(reel.handle, list)
  }

  const baselines = new Map<string, number>()
  for (const [handle, list] of byHandle) {
    baselines.set(handle, median(list.map((r) => r.views)) || 1)
  }

  return reels
    .map((reel) => {
      const baseline = baselines.get(reel.handle) || 1
      const score = reel.views / baseline
      const why =
        score >= minScore
          ? `${score.toFixed(1)}× la médiane du compte — vraie exception, pas juste du volume.`
          : `${score.toFixed(1)}× la médiane — dans le rythme habituel.`
      return { ...reel, baseline, score, why }
    })
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
}
