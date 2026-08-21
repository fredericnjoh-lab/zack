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
  /** 0 = boîte à idées (pas encore planifié) */
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

export type AutoVeilleSettings = {
  enabled: boolean
  /** Heure locale Europe/Paris (0–23) */
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

export type Store = {
  accounts: Account[]
  reels: Reel[]
  calendar: CalendarItem[]
  scripts: GeneratedScript[]
  remakes: PhotoRemake[]
  profile?: ProfileAnalysis
  lastVeilleAt?: string
  lastVeilleMode?: 'apify' | 'manual' | 'seed'
  transcriptions?: Transcription[]
  writingGuide?: WritingGuide
  autoVeille?: AutoVeilleSettings
  discoveries?: DiscoveredAccount[]
  repost?: RepostState
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

/** Un post Instagram source, candidat au repost YouTube. */
export type RepostCandidate = {
  /** id Instagram (ou shortCode en secours) */
  id: string
  shortCode?: string
  handle: string
  url?: string
  caption?: string
  /** URL directe du .mp4 (absente pour photos/carrousels) */
  videoUrl?: string
  thumbnailUrl?: string
  durationSec?: number
  takenAt?: string
  views?: number
  likes?: number
  comments?: number
  mediaType: MediaType
  /** Rempli côté API : déjà publié sur YouTube ? */
  alreadyPosted?: boolean
  youtubeUrl?: string
}

export type RepostPrivacy = 'private' | 'unlisted' | 'public'

export type RepostedItem = {
  id: string
  /** RepostCandidate.id d'origine — clé de dédoublonnage */
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
  /** Compte Instagram source (le tien) */
  sourceHandle: string
  /** Chaîne YouTube cible, pour affichage uniquement */
  youtubeHandle?: string
  privacyStatus: RepostPrivacy
  /** Repost auto au passage du cron quotidien */
  autoEnabled: boolean
  /** Nombre max de vidéos publiées par run */
  maxPerRun: number
  /** 'ai' = titre/description réécrits par Claude pour le SEO YouTube */
  titleStyle: 'caption' | 'ai'
  /** Hashtags ajoutés à chaque description */
  extraTags: string[]
  /** Ajoute #Shorts au titre pour forcer le format vertical */
  markAsShorts: boolean
  lastScanAt?: string
  lastRunAt?: string
}

export type YoutubeChannel = {
  id: string
  title: string
  customUrl?: string
}

export type RepostState = {
  settings: RepostSettings
  candidates: RepostCandidate[]
  published: RepostedItem[]
  /** Obtenu via l'écran OAuth, persiste le lien à la chaîne */
  youtubeRefreshToken?: string
  youtubeChannel?: YoutubeChannel
}
