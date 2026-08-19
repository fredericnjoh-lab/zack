import type {
  AutoVeilleSettings,
  CalendarItem,
  DiscoveredAccount,
  GeneratedScript,
  PhotoRemake,
  ProfileAnalysis,
  ScoredReel,
  StatusPayload,
  Transcription,
  VeilleJob,
  WritingGuide,
} from '../types'

async function api<T>(path: string, init?: RequestInit & { retries?: number }): Promise<T> {
  const retries = init?.retries ?? 0
  const { retries: _ignored, ...rest } = init || {}
  let lastErr: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(path, {
        headers: { 'content-type': 'application/json', ...(rest.headers || {}) },
        ...rest,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
      }
      return data as T
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error('API failed')
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
  throw lastErr || new Error('API failed')
}

export const zackApi = {
  health: () => api<StatusPayload>('/api/health', { retries: 3 }),
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
      autoVeille?: AutoVeilleSettings
      discoveries?: DiscoveredAccount[]
      job?: VeilleJob
    }>('/api/veille', { retries: 3 }),
  veilleJob: () => api<{ job: VeilleJob }>('/api/veille/job', { retries: 2 }),
  runVeille: () =>
    api<{
      mode: string
      hits: ScoredReel[]
      notice?: string
      fetched: number
      async?: boolean
      started?: boolean
      job?: VeilleJob
    }>('/api/veille/run', {
      method: 'POST',
      body: '{}',
      retries: 2,
    }),
  setAutoVeille: (payload: { enabled?: boolean; hour?: number }) =>
    api<{ autoVeille: AutoVeilleSettings }>('/api/auto-veille', {
      method: 'POST',
      body: JSON.stringify(payload),
      retries: 2,
    }),
  runAutoVeille: (force = true) =>
    api<{
      ran: boolean
      reason: string
      summary?: string
      autoVeille?: AutoVeilleSettings
      hits?: ScoredReel[]
      job?: VeilleJob
      async?: boolean
    }>('/api/auto-veille/run', {
      method: 'POST',
      body: JSON.stringify({ force, async: true }),
      retries: 2,
    }),
  discover: () =>
    api<{ discoveries: DiscoveredAccount[]; llm: string }>('/api/discover', {
      method: 'POST',
      body: '{}',
      retries: 1,
    }),
  addAccount: (handle: string) =>
    api<{ accounts: { handle: string }[] }>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ handle }),
      retries: 2,
    }),
  removeAccount: (handle: string) =>
    api<{ accounts: { handle: string }[] }>(`/api/accounts/${encodeURIComponent(handle)}`, {
      method: 'DELETE',
      retries: 2,
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
  calendar: () => api<{ items: CalendarItem[] }>('/api/calendar', { retries: 3 }),
  addCalendar: (payload: {
    day: number
    label: string
    status?: 'ecrit' | 'tourne' | 'publie'
  }) =>
    api<{ items: CalendarItem[] }>('/api/calendar', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  patchCalendar: (
    id: string,
    payload: Partial<Pick<CalendarItem, 'day' | 'status' | 'label' | 'month' | 'year'>>,
  ) =>
    api<{ items: CalendarItem[] }>(`/api/calendar/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  scripts: () => api<{ scripts: GeneratedScript[] }>('/api/scripts', { retries: 2 }),
  generateScript: (reelId: string) =>
    api<{ script: GeneratedScript; openai: boolean }>('/api/scripts/generate', {
      method: 'POST',
      body: JSON.stringify({ reelId }),
    }),
  shortenScript: (id: string) =>
    api<{ script: GeneratedScript; hook: string }>(`/api/scripts/${encodeURIComponent(id)}/shorten`, {
      method: 'POST',
      body: '{}',
    }),
  rememberRule: (rule: string) =>
    api<{ writingGuide: WritingGuide; profile: ProfileAnalysis | null }>('/api/writing/rules', {
      method: 'POST',
      body: JSON.stringify({ rule }),
    }),
  transcribe: (reelId: string) =>
    api<{ transcription: Transcription; llm: string }>(
      `/api/reels/${encodeURIComponent(reelId)}/transcribe`,
      { method: 'POST', body: '{}' },
    ),
  transcriptions: () =>
    api<{ transcriptions: Transcription[] }>('/api/transcriptions', { retries: 2 }),
  photos: () => api<{ hits: ScoredReel[]; remakes: PhotoRemake[] }>('/api/photos', { retries: 2 }),
  remakePhoto: (reelId: string) =>
    api<{ remake: PhotoRemake; llm: string }>('/api/photos/remake', {
      method: 'POST',
      body: JSON.stringify({ reelId }),
    }),
  profile: () =>
    api<{ profile: ProfileAnalysis | null; writingGuide?: WritingGuide }>('/api/profile', {
      retries: 3,
    }),
  analyzeProfile: (handle: string) =>
    api<{ profile: ProfileAnalysis; llm: string }>('/api/profile/analyze', {
      method: 'POST',
      body: JSON.stringify({ handle }),
    }),
  writing: () => api<{ writingGuide: WritingGuide }>('/api/writing', { retries: 2 }),
  addDocument: (name: string, content: string) =>
    api<{ writingGuide: WritingGuide }>('/api/writing/documents', {
      method: 'POST',
      body: JSON.stringify({ name, content }),
    }),
  removeDocument: (id: string) =>
    api<{ writingGuide: WritingGuide }>(`/api/writing/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  chat: (message: string) =>
    api<{
      reply: string
      actions?: string[]
      hits?: ScoredReel[]
      script?: GeneratedScript
      discoveries?: DiscoveredAccount[]
      transcription?: Transcription
      job?: VeilleJob
    }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
      retries: 1,
    }),
}
