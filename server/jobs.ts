import { fetchReelsForHandles, hasApify } from './apify.ts'
import { loadStore, updateStore } from './db.ts'
import { scoreReels } from './scoring.ts'
import type { Reel } from './types.ts'

export type JobState = {
  status: 'idle' | 'running' | 'ok' | 'error'
  startedAt?: string
  finishedAt?: string
  mode?: string
  fetched?: number
  hits?: number
  error?: string
  summary?: string
}

let veilleJob: JobState = { status: 'idle' }

export function getVeilleJob(): JobState {
  return { ...veilleJob }
}

/**
 * Fold a scrape into the latest reel list.
 * - Keep manual entries (users typed those in).
 * - Keep posts for accounts the scrape did not return (partial/timeout).
 * - Replace only the followed accounts that actually came back.
 */
export function mergeFetchedReels(
  existing: Reel[],
  fetched: Reel[],
  followedHandles: string[],
): Reel[] {
  const followed = new Set(followedHandles)
  const fetchedHandles = new Set(fetched.map((reel) => reel.handle))
  const keep = existing.filter((reel) => {
    if (reel.source === 'manual') return true
    if (!followed.has(reel.handle)) return true
    if (!fetchedHandles.has(reel.handle)) return true
    return false
  })
  return [...keep, ...fetched]
}

function palmaresSummary(reels: Reel[]): { hits: number; summary: string } {
  const hits = scoreReels(reels)
  const top = hits.slice(0, 5)
  const summary =
    top.length === 0
      ? 'Palmarès : aucune exception ≥ 2,5×.'
      : `Palmarès : ${top.map((h) => `@${h.handle} ${h.score.toFixed(1)}×`).join(' · ')}`
  return { hits: hits.length, summary }
}

/** Run Apify scrape in the background so Render HTTP timeouts don't kill the request. */
export function startVeilleJob(opts?: { source?: string }): { started: boolean; job: JobState } {
  if (veilleJob.status === 'running') {
    return { started: false, job: getVeilleJob() }
  }

  const store = loadStore()
  if (store.accounts.length === 0) {
    veilleJob = {
      status: 'error',
      finishedAt: new Date().toISOString(),
      error: 'ajoute au moins 1 compte',
    }
    return { started: false, job: getVeilleJob() }
  }

  veilleJob = {
    status: 'running',
    startedAt: new Date().toISOString(),
    summary: opts?.source === 'cron' ? 'Veille auto en cours…' : 'Veille en cours…',
  }

  void (async () => {
    try {
      if (hasApify()) {
        const handles = loadStore().accounts.map((a) => a.handle)
        const fetched = await fetchReelsForHandles(handles)
        const lastVeilleAt = new Date().toISOString()
        let hits = 0
        let summary = ''
        // Reload just before write: the scrape can take minutes, and calendar /
        // scripts / rules saved in that window must not be overwritten.
        updateStore((current) => {
          current.reels = mergeFetchedReels(
            current.reels,
            fetched,
            current.accounts.map((a) => a.handle),
          )
          current.lastVeilleMode = 'apify'
          current.lastVeilleAt = lastVeilleAt
          const scored = palmaresSummary(current.reels)
          hits = scored.hits
          summary = scored.summary
          if (!current.autoVeille) current.autoVeille = { enabled: true, hour: 7 }
          current.autoVeille.lastRunAt = lastVeilleAt
          current.autoVeille.lastPalmaresSummary = summary
        })
        veilleJob = {
          status: 'ok',
          startedAt: veilleJob.startedAt,
          finishedAt: new Date().toISOString(),
          mode: 'apify',
          fetched: fetched.length,
          hits,
          summary,
        }
        return
      }

      let mode: 'manual' | 'seed' = 'seed'
      let fetched = 0
      let hits = 0
      updateStore((current) => {
        mode = current.reels.some((r) => r.source === 'manual') ? 'manual' : 'seed'
        current.lastVeilleMode = mode
        current.lastVeilleAt = new Date().toISOString()
        fetched = current.reels.length
        hits = scoreReels(current.reels).length
      })
      veilleJob = {
        status: 'ok',
        startedAt: veilleJob.startedAt,
        finishedAt: new Date().toISOString(),
        mode,
        fetched,
        hits,
        summary: 'Veille locale recalculée (pas de APIFY_TOKEN).',
      }
    } catch (err) {
      veilleJob = {
        status: 'error',
        startedAt: veilleJob.startedAt,
        finishedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'veille failed',
      }
    }
  })()

  return { started: true, job: getVeilleJob() }
}
