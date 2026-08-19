import { fetchReelsForHandles, hasApify } from './apify.ts'
import { loadStore, saveStore } from './db.ts'
import { scoreReels } from './scoring.ts'

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
      const current = loadStore()
      if (hasApify()) {
        const fetched = await fetchReelsForHandles(current.accounts.map((a) => a.handle))
        const other = current.reels.filter(
          (r) => !current.accounts.some((a) => a.handle === r.handle),
        )
        current.reels = [...other, ...fetched]
        current.lastVeilleMode = 'apify'
        current.lastVeilleAt = new Date().toISOString()
        const hits = scoreReels(current.reels)
        const top = hits.slice(0, 5)
        const summary =
          top.length === 0
            ? 'Palmarès : aucune exception ≥ 2,5×.'
            : `Palmarès : ${top.map((h) => `@${h.handle} ${h.score.toFixed(1)}×`).join(' · ')}`
        if (!current.autoVeille) current.autoVeille = { enabled: true, hour: 7 }
        current.autoVeille.lastRunAt = current.lastVeilleAt
        current.autoVeille.lastPalmaresSummary = summary
        saveStore(current)
        veilleJob = {
          status: 'ok',
          startedAt: veilleJob.startedAt,
          finishedAt: new Date().toISOString(),
          mode: 'apify',
          fetched: fetched.length,
          hits: hits.length,
          summary,
        }
        return
      }

      current.lastVeilleMode = current.reels.some((r) => r.source === 'manual') ? 'manual' : 'seed'
      current.lastVeilleAt = new Date().toISOString()
      const hits = scoreReels(current.reels)
      saveStore(current)
      veilleJob = {
        status: 'ok',
        startedAt: veilleJob.startedAt,
        finishedAt: new Date().toISOString(),
        mode: current.lastVeilleMode,
        fetched: current.reels.length,
        hits: hits.length,
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
