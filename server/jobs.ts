import { fetchReelsForHandles, hasApify } from './apify.ts'
import { loadStore, saveStore } from './db.ts'
import { analyzeProfile } from './openai.ts'
import { scoreReels } from './scoring.ts'
import type { Lang } from './fashion.ts'

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

export type ProfileJobState = {
  status: 'idle' | 'running' | 'ok' | 'error'
  handle?: string
  startedAt?: string
  finishedAt?: string
  error?: string
  posts?: number
}

let profileJob: ProfileJobState = { status: 'idle' }

export function getProfileJob(): ProfileJobState {
  return { ...profileJob }
}

/**
 * Learn a brand's voice without blocking the HTTP request.
 * A live Apify scrape of 24 posts plus the LLM call exceeds Render's
 * load-balancer timeout, so this runs in the background like Veille.
 */
export function startProfileJob(opts: {
  handle: string
  lang?: Lang
}): { started: boolean; job: ProfileJobState } {
  if (profileJob.status === 'running') {
    return { started: false, job: getProfileJob() }
  }

  const handle = opts.handle
  const lang = opts.lang || 'fr'
  profileJob = {
    status: 'running',
    handle,
    startedAt: new Date().toISOString(),
  }

  void (async () => {
    try {
      const posts = hasApify()
        ? await fetchReelsForHandles([handle], 24)
        : loadStore().reels.filter((reel) => reel.handle === handle)
      if (!posts.length) {
        profileJob = {
          status: 'error',
          handle,
          startedAt: profileJob.startedAt,
          finishedAt: new Date().toISOString(),
          error:
            lang === 'en'
              ? `No posts retrieved for @${handle}. Check the spelling, that the account is public, and run a scan if you follow it.`
              : `Aucune publication récupérée pour @${handle}. Vérifie l’orthographe, que le compte est public, et lance une veille si tu le suis.`,
        }
        return
      }
      const profile = await analyzeProfile(handle, posts, lang)
      // Reload after the awaits so a concurrent calendar/script/veille write
      // is not overwritten by a snapshot taken before the scrape.
      const latest = loadStore()
      latest.profile = profile
      saveStore(latest)
      profileJob = {
        status: 'ok',
        handle,
        startedAt: profileJob.startedAt,
        finishedAt: new Date().toISOString(),
        posts: posts.length,
      }
    } catch (err) {
      profileJob = {
        status: 'error',
        handle,
        startedAt: profileJob.startedAt,
        finishedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'analyse profil échouée',
      }
    }
  })()

  return { started: true, job: getProfileJob() }
}
