export type Account = {
  handle: string
  addedAt: string
}

export type MediaType = 'reel' | 'photo' | 'carousel'

export type Reel = {
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
}

export type ScoredReel = Reel & {
  baseline: number
  score: number
  why: string
  /** Which engagement signal was used as the baseline metric. */
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
  posts: Reel[]
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
}

export type Store = {
  accounts: Account[]
  reels: Reel[]
  calendar: CalendarItem[]
  scripts: GeneratedScript[]
  remakes: PhotoRemake[]
  profile?: ProfileAnalysis
  lastVeilleAt?: string
  lastVeilleMode?: 'apify' | 'manual' | 'seed'
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
