import type { CalendarItem, GeneratedScript, ScoredReel, StatusPayload } from '../types'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  }
  return data as T
}

export const zackApi = {
  health: () => api<StatusPayload>('/api/health'),
  veille: () =>
    api<{
      accounts: { handle: string }[]
      hits: ScoredReel[]
      allCount: number
      lastVeilleAt?: string
      lastVeilleMode?: string
      apify: boolean
      openai: boolean
      llm?: string
      claude?: boolean
    }>('/api/veille'),
  runVeille: () =>
    api<{ mode: string; hits: ScoredReel[]; notice?: string; fetched: number }>('/api/veille/run', {
      method: 'POST',
      body: '{}',
    }),
  addAccount: (handle: string) =>
    api<{ accounts: { handle: string }[] }>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ handle }),
    }),
  removeAccount: (handle: string) =>
    api<{ accounts: { handle: string }[] }>(`/api/accounts/${encodeURIComponent(handle)}`, {
      method: 'DELETE',
    }),
  addManualReel: (payload: {
    handle: string
    views: number
    caption?: string
    baseline?: number
  }) =>
    api<{ hits: ScoredReel[] }>('/api/reels/manual', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  calendar: () => api<{ items: CalendarItem[] }>('/api/calendar'),
  addCalendar: (payload: { day: number; label: string; status?: 'ecrit' | 'tourne' | 'publie' }) =>
    api<{ items: CalendarItem[] }>('/api/calendar', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  scripts: () => api<{ scripts: GeneratedScript[] }>('/api/scripts'),
  generateScript: (reelId: string) =>
    api<{ script: GeneratedScript; openai: boolean }>('/api/scripts/generate', {
      method: 'POST',
      body: JSON.stringify({ reelId }),
    }),
  chat: (message: string) => api<{ reply: string }>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
}
