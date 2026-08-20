import { askClaudeJson, hasClaude } from '../shared/claude.ts'
import { makeStore } from '../shared/store.ts'
import { createApp, dirOf, listen, route } from '../shared/http.ts'
import { loadEnv } from '../shared/env.ts'

loadEnv()

type Voice = {
  resume: string
  regles: string[]
  linkedin: string
  instagram: string
  reel: string
  updatedAt?: string
}

type Piece = {
  id: string
  idee: string
  createdAt: string
  linkedin?: { accroche: string; post: string; hashtags: string[] }
  reel?: { accroche: string; beats: { t: string; texte: string; visuel: string }[]; cta: string }
  instagram?: { legende: string; hashtags: string[] }
}

type Data = { voice: Voice; pieces: Piece[] }

const EMPTY_VOICE: Voice = {
  resume: '',
  regles: [],
  linkedin: '',
  instagram: '',
  reel: '',
}

const store = makeStore<Data>('marketing', { voice: EMPTY_VOICE, pieces: [] })

const SYSTEM = `Tu es le directeur de création d'un entrepreneur francophone.
Tu écris pour être lu, pas pour être joli : phrases courtes, une idée par ligne, zéro jargon corporate.
Tu bannis les formules d'IA ("dans un monde où", "il est important de noter", "révolutionner").
Un post LinkedIn ne s'écrit pas comme un script TikTok : respecte les codes de chaque plateforme.`

function voiceBlock(voice: Voice): string {
  if (!voice.resume && voice.regles.length === 0) {
    return "L'utilisateur n'a pas encore défini sa voix : reste simple, direct, à la première personne."
  }
  return `VOIX DE L'UTILISATEUR — respecte-la strictement :
${voice.resume}
Règles retenues :
${voice.regles.map((r) => `- ${r}`).join('\n')}
Style LinkedIn : ${voice.linkedin}
Style Instagram : ${voice.instagram}
Style Reel/TikTok : ${voice.reel}`
}

const app = createApp(dirOf(import.meta.url), 'agence')

app.get(
  '/api/voice',
  route(async (_req, res) => {
    res.json({ voice: store.load().voice, claude: hasClaude() })
  }),
)

/** Étape 1 du post : on donne des références, Claude en tire un style réutilisable. */
app.post(
  '/api/voice/analyze',
  route(async (req, res) => {
    const references = `${req.body?.references || ''}`.trim()
    const notes = `${req.body?.notes || ''}`.trim()
    if (references.length < 40) {
      throw new Error('Colle au moins un vrai exemple de contenu (40 caractères minimum).')
    }

    const voice = await askClaudeJson<Voice>({
      system: SYSTEM,
      maxTokens: 2000,
      temperature: 0.4,
      prompt: `Voici des contenus de créateurs qui inspirent l'utilisateur, et/ou ses propres textes :

--- RÉFÉRENCES ---
${references.slice(0, 12000)}
--- FIN ---

Notes de l'utilisateur sur ce qu'il veut : ${notes || '(aucune)'}

Analyse ces références et produis un guide de style réutilisable.
Sois concret et actionnable : "phrases de moins de 12 mots", pas "ton engageant".

JSON attendu :
{
  "resume": "3 phrases qui décrivent la voix",
  "regles": ["6 à 8 règles d'écriture concrètes"],
  "linkedin": "comment écrire un post LinkedIn dans cette voix (structure + longueur)",
  "instagram": "comment écrire une légende Instagram dans cette voix",
  "reel": "comment écrire un script de reel dans cette voix (rythme, accroche)"
}`,
    })

    const saved = store.update((d) => ({ ...d, voice: { ...voice, updatedAt: new Date().toISOString() } }))
    res.json({ voice: saved.voice })
  }),
)

app.delete(
  '/api/voice',
  route(async (_req, res) => {
    store.update((d) => ({ ...d, voice: EMPTY_VOICE }))
    res.json({ voice: EMPTY_VOICE })
  }),
)

/** Étape 2 : les 3 questions du post, pour viser juste avant d'écrire. */
app.post(
  '/api/questions',
  route(async (req, res) => {
    const idee = `${req.body?.idee || ''}`.trim()
    if (!idee) throw new Error('Donne-moi une idée de départ.')

    const out = await askClaudeJson<{ questions: string[] }>({
      system: SYSTEM,
      maxTokens: 600,
      temperature: 0.5,
      prompt: `Idée de contenu : "${idee}"

Pose exactement 3 questions courtes sur l'audience et l'objectif, dont les réponses changeraient vraiment le contenu produit. Pas de question dont tu peux deviner la réponse.

JSON : { "questions": ["...", "...", "..."] }`,
    })
    res.json({ questions: out.questions?.slice(0, 3) || [] })
  }),
)

/** Étape 3 : une idée entre, trois formats calibrés sortent. */
app.post(
  '/api/generate',
  route(async (req, res) => {
    const idee = `${req.body?.idee || ''}`.trim()
    if (!idee) throw new Error('Donne-moi une idée de départ.')

    const platforms: string[] = Array.isArray(req.body?.platforms) && req.body.platforms.length
      ? req.body.platforms
      : ['linkedin', 'reel', 'instagram']
    const reponses = `${req.body?.reponses || ''}`.trim()
    const data = store.load()

    const wanted = {
      linkedin: platforms.includes('linkedin'),
      reel: platforms.includes('reel'),
      instagram: platforms.includes('instagram'),
    }

    const shape: string[] = []
    if (wanted.linkedin) {
      shape.push(`"linkedin": { "accroche": "1 ligne qui stoppe le scroll", "post": "le post complet, 900-1400 caractères, sauts de ligne compris", "hashtags": ["3 à 5"] }`)
    }
    if (wanted.reel) {
      shape.push(`"reel": { "accroche": "les 3 premières secondes", "beats": [{ "t": "0-3s", "texte": "ce qui est dit", "visuel": "ce qu'on voit à l'écran" }], "cta": "la dernière phrase" }`)
    }
    if (wanted.instagram) {
      shape.push(`"instagram": { "legende": "légende complète, 3 à 6 lignes", "hashtags": ["5 à 8"] }`)
    }

    const piece = await askClaudeJson<Omit<Piece, 'id' | 'idee' | 'createdAt'>>({
      system: SYSTEM,
      maxTokens: 3000,
      temperature: 0.8,
      prompt: `${voiceBlock(data.voice)}

IDÉE DE DÉPART : ${idee}
${reponses ? `\nCONTEXTE AUDIENCE (réponses de l'utilisateur) :\n${reponses}` : ''}

Écris le contenu demandé. Le script de reel fait ~45 secondes, découpé en 5 à 7 beats avec un minutage réaliste.
Chaque format part du même fond mais s'écrit différemment — ne recycle pas les mêmes phrases d'une plateforme à l'autre.

JSON attendu :
{
  ${shape.join(',\n  ')}
}`,
    })

    const saved: Piece = {
      id: `piece-${Date.now()}`,
      idee,
      createdAt: new Date().toISOString(),
      ...piece,
    }
    store.update((d) => ({ ...d, pieces: [saved, ...d.pieces].slice(0, 60) }))
    res.json({ piece: saved })
  }),
)

app.get(
  '/api/history',
  route(async (_req, res) => {
    res.json({ pieces: store.load().pieces })
  }),
)

app.delete(
  '/api/history',
  route(async (_req, res) => {
    store.update((d) => ({ ...d, pieces: [] }))
    res.json({ pieces: [] })
  }),
)

listen(app, 8801, 'Agence marketing', 'PORT_AGENCE')
