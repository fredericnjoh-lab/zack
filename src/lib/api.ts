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
  WritingGuide,
} from '../types'

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
      autoVeille?: AutoVeilleSettings
      discoveries?: DiscoveredAccount[]
    }>('/api/veille'),
  runVeille: () =>
    api<{ mode: string; hits: ScoredReel[]; notice?: string; fetched: number }>('/api/veille/run', {
      method: 'POST',
      body: '{}',
    }),
  setAutoVeille: (payload: { enabled?: boolean; hour?: number }) =>
    api<{ autoVeille: AutoVeilleSettings }>('/api/auto-veille', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  runAutoVeille: (force = true) =>
    api<{
      ran: boolean
      reason: string
      summary?: string
      autoVeille: AutoVeilleSettings
      hits: ScoredReel[]
    }>('/api/auto-veille/run', {
      method: 'POST',
      body: JSON.stringify({ force }),
    }),
  discover: () =>
    api<{ discoveries: DiscoveredAccount[]; llm: string }>('/api/discover', {
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
  scripts: () => api<{ scripts: GeneratedScript[] }>('/api/scripts'),
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
  transcriptions: () => api<{ transcriptions: Transcription[] }>('/api/transcriptions'),
  photos: () => api<{ hits: ScoredReel[]; remakes: PhotoRemake[] }>('/api/photos'),
  remakePhoto: (reelId: string) =>
    api<{ remake: PhotoRemake; llm: string }>('/api/photos/remake', {
      method: 'POST',
      body: JSON.stringify({ reelId }),
    }),
  profile: () =>
    api<{ profile: ProfileAnalysis | null; writingGuide?: WritingGuide }>('/api/profile'),
  analyzeProfile: (handle: string) =>
    api<{ profile: ProfileAnalysis; llm: string }>('/api/profile/analyze', {
      method: 'POST',
      body: JSON.stringify({ handle }),
    }),
  writing: () => api<{ writingGuide: WritingGuide }>('/api/writing'),
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
    }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
}
