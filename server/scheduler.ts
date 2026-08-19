import { loadStore } from './db.ts'
import { getVeilleJob, startVeilleJob } from './jobs.ts'

/** Current hour in Europe/Paris (0–23). */
export function parisHour(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now)
  return Number(parts.find((p) => p.type === 'hour')?.value || 0)
}

function parisDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function alreadyRanToday(lastRunAt?: string): boolean {
  if (!lastRunAt) return false
  return parisDateKey(new Date(lastRunAt)) === parisDateKey()
}

export type AutoVeilleResult = {
  ran: boolean
  reason: string
  hits?: number
  summary?: string
}

/** Run competitor scrape if auto-veille is due for the configured Paris hour. */
export async function maybeRunAutoVeille(force = false): Promise<AutoVeilleResult> {
  const store = loadStore()
  const settings = store.autoVeille || { enabled: false, hour: 7 }
  if (!force && !settings.enabled) {
    return { ran: false, reason: 'auto-veille désactivée' }
  }
  if (!force && parisHour() !== settings.hour) {
    return { ran: false, reason: `pas encore ${settings.hour}h (Paris)` }
  }
  if (!force && alreadyRanToday(settings.lastRunAt)) {
    return { ran: false, reason: 'déjà lancée aujourd’hui' }
  }
  if (store.accounts.length === 0) {
    return { ran: false, reason: 'aucun compte suivi' }
  }

  const job = getVeilleJob()
  if (job.status === 'running') {
    return { ran: false, reason: 'veille déjà en cours' }
  }

  const { started } = startVeilleJob({ source: force ? 'cron' : 'scheduler' })
  if (!started) {
    const again = getVeilleJob()
    return { ran: false, reason: again.error || 'non démarrée' }
  }

  const deadline = Date.now() + 90_000
  while (getVeilleJob().status === 'running' && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000))
  }
  const done = getVeilleJob()
  if (done.status === 'ok') {
    return { ran: true, reason: 'ok', hits: done.hits, summary: done.summary }
  }
  if (done.status === 'running') {
    return { ran: true, reason: 'started_async', summary: 'Veille encore en cours…' }
  }
  return { ran: false, reason: done.error || 'échec auto-veille' }
}

/** Poll every minute while awake (Render free sleeps — GitHub cron is the reliable path). */
export function startAutoVeilleLoop() {
  const tick = () => {
    void maybeRunAutoVeille(false).then((r) => {
      if (r.ran) console.log(`[auto-veille] ${r.summary || r.reason}`)
    })
  }
  setTimeout(tick, 15_000)
  setInterval(tick, 60_000)
}
