export type ContentStatus = 'ecrit' | 'tourne' | 'publie'

export type ReelHit = {
  id: string
  account: string
  title: string
  views: string
  baseline: string
  score: number
  why: string
}

export type Beat = {
  time: string
  tone: string
  line: string
  subtitle: string
}

export type CalendarItem = {
  day: number
  label: string
  status: ContentStatus
}

export const watchedAccounts = [
  '@atelierlumiere',
  '@capucinemode',
  '@studio.nord',
  '@daily.crea',
  '@niche.foodie',
  '@frameandgo',
]

export const reelHits: ReelHit[] = [
  {
    id: '1',
    account: '@atelierlumiere',
    title: 'Hook “avant / après” en 2s',
    views: '842k',
    baseline: '38k',
    score: 22.1,
    why: '22× l’audience habituelle — pas juste “beaucoup de vues”.',
  },
  {
    id: '2',
    account: '@studio.nord',
    title: 'Liste 3 erreurs en voice-over',
    views: '291k',
    baseline: '21k',
    score: 13.8,
    why: 'Exception nette vs médiane des 30 derniers Reels.',
  },
  {
    id: '3',
    account: '@capucinemode',
    title: 'Carrousel “myth vs vrai”',
    views: '118k',
    baseline: '12k',
    score: 9.8,
    why: 'Photo/carrousel au-dessus du rythme du compte.',
  },
]

export const scriptBeats: Beat[] = [
  {
    time: '0:00',
    tone: 'Direct, regard caméra',
    line: 'Si ton Reel flatte à 3k vues alors que ton compte tourne à 40k… tu rates le vrai signal.',
    subtitle: 'Si ton Reel flatte à 3k…',
  },
  {
    time: '0:04',
    tone: 'Expliquer, calme',
    line: 'Zack compare chaque Reel à l’audience habituelle du compte. Pas le volume brut.',
    subtitle: 'Zack compare à l’audience habituelle',
  },
  {
    time: '0:09',
    tone: 'Preuve, rythme',
    line: 'Exemple : 842k vues sur un compte à 38k de baseline. Score viral 22×.',
    subtitle: 'Score viral 22×',
  },
  {
    time: '0:14',
    tone: 'CTA, sourire',
    line: 'Tu choisis le format, Zack te sort le script seconde par seconde. Prêt à filmer.',
    subtitle: 'Prêt à filmer.',
  },
]

export const calendarItems: CalendarItem[] = [
  { day: 17, label: 'Hook avant/après', status: 'ecrit' },
  { day: 18, label: '3 erreurs VO', status: 'tourne' },
  { day: 20, label: 'Myth vs vrai', status: 'ecrit' },
  { day: 22, label: 'Veille du lundi', status: 'publie' },
]

export const chatStarter = [
  {
    from: 'zack' as const,
    text: 'Salut — je peux lancer une veille, te sortir les meilleurs Reels, ou raccourcir une accroche. Qu’est-ce qu’on fait ?',
  },
]
