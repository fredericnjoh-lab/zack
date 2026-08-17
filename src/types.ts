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
  baseline: number
  score: number
  why: string
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

export type StatusPayload = {
  ok: true
  apify: boolean
  openai: boolean
  accounts: number
  reels: number
  lastVeilleAt?: string
  lastVeilleMode?: string
}
