export type MediaType = 'reel' | 'photo' | 'carousel'

export type ScoredReel = {
  id: string
  handle: string
  shortCode?: string
  url?: string
  caption?: string
  views: number
  likes?: number
  comments?: number
  takenAt?: string
  source: 'apify' | 'manual' | 'seed'
  mediaType?: MediaType
  imageUrl?: string
  baseline: number
  score: number
  why: string
  metric: 'vues' | 'likes'
}

export type PhotoRemake = {
  id: string
  sourceReelId: string
  handle: string
  why: string
  identical: { caption: string; hashtags: string[]; shotList: string[] }
  inVoice: { caption: string; hashtags: string[]; shotList: string[] }
  createdAt: string
}

export type ProfileAnalysis = {
  handle: string
  analyzedAt: string
  postsAnalyzed: number
  voice: string
  pillars: string[]
  strengths: string[]
  opportunities: string[]
  rules: string[]
  topFormats: { type: MediaType; average: number; count: number }[]
  posts: ScoredReel[]
}

export type CalendarItem = {
  id: string
  day: number
  month: number
  year: number
  label: string
  status: 'ecrit' | 'tourne' | 'publie'
}

export type ScriptBeat = {
  time: string
  tone: string
  line: string
  subtitle: string
}

export type GeneratedScript = {
  id: string
  title: string
  sourceReelId?: string
  beats: ScriptBeat[]
  captions: { punchy: string; soft: string }
  createdAt: string
  transcriptionId?: string
}

export type Transcription = {
  id: string
  reelId: string
  handle: string
  ocrText: string
  spokenGuess: string
  fullTranscript: string
  captions: { punchy: string; soft: string }
  source: 'vision' | 'caption' | 'local'
  createdAt: string
}

export type WritingDocument = {
  id: string
  name: string
  content: string
  addedAt: string
}

export type WritingGuide = {
  documents: WritingDocument[]
  learnedRules: string[]
}

export type VeilleJob = {
  status: 'idle' | 'running' | 'ok' | 'error'
  startedAt?: string
  finishedAt?: string
  mode?: string
  fetched?: number
  hits?: number
  error?: string
  summary?: string
}

export type AutoVeilleSettings = {
  enabled: boolean
  hour: number
  lastRunAt?: string
  lastPalmaresSummary?: string
}

export type DiscoveredAccount = {
  handle: string
  reason: string
  nicheFit: string
  estimatedFollowers?: string
  sampleViews?: number
  verified: boolean
  suggestedAt: string
}

export type StatusPayload = {
  ok: true
  apify: boolean
  openai: boolean
  accounts: number
  reels: number
  lastVeilleAt?: string
  lastVeilleMode?: string
}

export type RepostPrivacy = 'private' | 'unlisted' | 'public'

export type RepostCandidate = {
  id: string
  shortCode?: string
  handle: string
  url?: string
  caption?: string
  videoUrl?: string
  thumbnailUrl?: string
  durationSec?: number
  takenAt?: string
  views?: number
  likes?: number
  comments?: number
  mediaType: MediaType
  alreadyPosted?: boolean
  youtubeUrl?: string
}

export type RepostedItem = {
  id: string
  sourceId: string
  shortCode?: string
  handle: string
  sourceUrl?: string
  thumbnailUrl?: string
  youtubeVideoId: string
  youtubeUrl: string
  title: string
  description: string
  tags: string[]
  privacyStatus: RepostPrivacy
  postedAt: string
}

export type RepostSettings = {
  sourceHandle: string
  youtubeHandle?: string
  privacyStatus: RepostPrivacy
  autoEnabled: boolean
  maxPerRun: number
  titleStyle: 'caption' | 'ai'
  extraTags: string[]
  markAsShorts: boolean
  lastScanAt?: string
  lastRunAt?: string
}

export type RepostJob = {
  kind?: 'scan' | 'publish'
  status: 'idle' | 'running' | 'ok' | 'error'
  startedAt?: string
  finishedAt?: string
  total?: number
  done?: number
  published?: RepostedItem[]
  errors?: { sourceId: string; message: string }[]
  error?: string
  summary?: string
}

export type YoutubeStatus = {
  configured: boolean
  connected: boolean
  channel: { id: string; title: string; customUrl?: string } | null
  redirectUri?: string
  fromEnv?: boolean
}
