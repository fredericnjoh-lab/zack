import { fetchReelsForHandles, hasApify } from './apify.ts'
import { loadStore, saveStore } from './db.ts'
import { scoreReels } from './scoring.ts'

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

  try {
    if (hasApify()) {
      const fetched = await fetchReelsForHandles(store.accounts.map((a) => a.handle))
      const other = store.reels.filter((r) => !store.accounts.some((a) => a.handle === r.handle))
      store.reels = [...other, ...fetched]
      store.lastVeilleMode = 'apify'
    } else {
      store.lastVeilleMode = store.reels.some((r) => r.source === 'manual') ? 'manual' : 'seed'
    }
    store.lastVeilleAt = new Date().toISOString()
    const hits = scoreReels(store.reels)
    const top = hits.slice(0, 5)
    const summary =
      top.length === 0
        ? 'Palmarès du jour : aucune exception ≥ 2,5×.'
        : `Palmarès du jour : ${top
            .map((h) => `@${h.handle} ${h.score.toFixed(1)}×`)
            .join(' · ')}`

    store.autoVeille = {
      ...settings,
      enabled: settings.enabled || force,
      hour: settings.hour,
      lastRunAt: store.lastVeilleAt,
      lastPalmaresSummary: summary,
    }
    saveStore(store)
    return { ran: true, reason: 'ok', hits: hits.length, summary }
  } catch (err) {
    return {
      ran: false,
      reason: err instanceof Error ? err.message : 'échec auto-veille',
    }
  }
}

/** Poll every minute; safe no-op when not due. */
export function startAutoVeilleLoop() {
  const tick = () => {
    void maybeRunAutoVeille(false).then((r) => {
      if (r.ran) console.log(`[auto-veille] ${r.summary}`)
    })
  }
  // First check shortly after boot, then every minute.
  setTimeout(tick, 15_000)
  setInterval(tick, 60_000)
}
