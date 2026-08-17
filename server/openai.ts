import type { GeneratedScript, PhotoRemake, ProfileAnalysis, Reel, ScoredReel } from './types.ts'

export type LlmProvider = 'claude' | 'openai' | 'local'

export function llmProvider(): LlmProvider {
  if (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY) return 'claude'
  if (process.env.OPENAI_API_KEY) return 'openai'
  return 'local'
}

export function hasLLM(): boolean {
  return llmProvider() !== 'local'
}

/** @deprecated use hasLLM — kept so older imports keep working */
export function hasOpenAI(): boolean {
  return hasLLM()
}

export async function generateScriptFromReel(
  reel: ScoredReel,
  profile?: ProfileAnalysis,
): Promise<GeneratedScript> {
  const title = (reel.caption || 'Script Zack').split('\n')[0]!.slice(0, 80)
  const provider = llmProvider()

  if (provider === 'local') {
    return localScript(reel, title)
  }

  const prompt = buildPrompt(reel, profile)
  const content =
    provider === 'claude' ? await callClaude(prompt) : await callOpenAI(prompt)

  const parsed = parseScriptJson(content)
  const fallback = localScript(reel, title)

  return {
    id: `script-${Date.now()}`,
    title,
    sourceReelId: reel.id,
    beats: parsed.beats?.length ? parsed.beats : fallback.beats,
    captions: parsed.captions || fallback.captions,
    createdAt: new Date().toISOString(),
  }
}

/** Photos/carrousels : explique pourquoi ça marche, puis refait (identique + dans ta voix). */
export async function generatePhotoRemake(
  reel: ScoredReel,
  profile?: ProfileAnalysis,
): Promise<PhotoRemake> {
  const provider = llmProvider()
  const fallback = localRemake(reel)
  if (provider === 'local') return fallback

  const kind = reel.mediaType === 'carousel' ? 'carrousel' : 'photo'
  const voice = profile
    ? `\nPROFIL UTILISATEUR @${profile.handle}: ${profile.voice}\nRègles: ${profile.rules.join('; ')}\nPiliers: ${profile.pillars.join('; ')}`
    : ''
  const prompt = `Tu es Zack, expert contenu Instagram francophone.
Analyse cette publication ${kind} qui a sur-performé chez un concurrent, puis produis deux remakes.
Compte: @${reel.handle}
Type: ${kind}
Likes: ${reel.views} (score ${reel.score.toFixed(1)}× la médiane ${kind} du compte)
Légende d'origine: ${reel.caption || '(vide)'}
${voice}

Réponds UNIQUEMENT en JSON valide (pas de markdown):
{
  "why": "2-3 phrases: pourquoi CETTE publication a marché (angle, hook visuel, émotion, structure du carrousel).",
  "identical": {
    "caption": "reprise fidèle de l'angle, adaptée FR, prête à publier",
    "hashtags": ["#..."],
    "shotList": ["plan/slide 1: ...", "plan/slide 2: ..."]
  },
  "inVoice": {
    "caption": "même concept mais réécrit dans une voix perso, plus authentique",
    "hashtags": ["#..."],
    "shotList": ["plan/slide 1: ...", "plan/slide 2: ..."]
  }
}
3 à 5 éléments de shotList par version.`

  try {
    const content = provider === 'claude' ? await callClaude(prompt) : await callOpenAI(prompt)
    const parsed = parseRemakeJson(content)
    return {
      id: `remake-${Date.now()}`,
      sourceReelId: reel.id,
      handle: reel.handle,
      why: parsed.why || fallback.why,
      identical: parsed.identical || fallback.identical,
      inVoice: parsed.inVoice || fallback.inVoice,
      createdAt: new Date().toISOString(),
    }
  } catch {
    return fallback
  }
}

export async function analyzeProfile(handle: string, posts: Reel[]): Promise<ProfileAnalysis> {
  const byType = new Map<string, number[]>()
  for (const post of posts) {
    const type = post.mediaType || 'reel'
    const values = byType.get(type) || []
    values.push(post.views)
    byType.set(type, values)
  }
  const topFormats = [...byType.entries()].map(([type, values]) => ({
    type: type as 'reel' | 'photo' | 'carousel',
    average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    count: values.length,
  }))
  const fallback: ProfileAnalysis = {
    handle,
    analyzedAt: new Date().toISOString(),
    postsAnalyzed: posts.length,
    voice: 'Directe, visuelle et centrée sur le produit.',
    pillars: ['Produit', 'Coulisses', 'Communauté'],
    strengths: ['Identité cohérente', 'Formats visuels réguliers'],
    opportunities: ['Hooks plus explicites', 'Davantage de storytelling'],
    rules: ['Phrases courtes', 'Un angle par publication', 'CTA naturel en fin de légende'],
    topFormats,
    posts,
  }
  if (!hasLLM()) return fallback

  const samples = posts.slice(0, 20).map((p) => ({
    type: p.mediaType || 'reel',
    performance: p.views,
    caption: (p.caption || '').slice(0, 500),
  }))
  const prompt = `Analyse le profil Instagram @${handle} pour que Zack apprenne sa voix.
Posts: ${JSON.stringify(samples)}
Réponds uniquement en JSON:
{"voice":"description précise","pillars":["..."],"strengths":["..."],"opportunities":["..."],"rules":["règles d'écriture concrètes"]}
3 à 5 éléments par liste.`
  const content = llmProvider() === 'claude' ? await callClaude(prompt) : await callOpenAI(prompt)
  const parsed = parseProfileJson(content)
  return {
    ...fallback,
    voice: parsed.voice || fallback.voice,
    pillars: parsed.pillars || fallback.pillars,
    strengths: parsed.strengths || fallback.strengths,
    opportunities: parsed.opportunities || fallback.opportunities,
    rules: parsed.rules || fallback.rules,
  }
}

function parseProfileJson(content: string): Partial<ProfileAnalysis> {
  const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
  try {
    return JSON.parse(cleaned) as Partial<ProfileAnalysis>
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return {}
    try {
      return JSON.parse(match[0]) as Partial<ProfileAnalysis>
    } catch {
      return {}
    }
  }
}

function parseRemakeJson(content: string): Partial<Omit<PhotoRemake, 'id' | 'sourceReelId' | 'handle' | 'createdAt'>> {
  const cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s) as Record<string, unknown>
    } catch {
      return null
    }
  }
  const obj = tryParse(cleaned) || tryParse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '')
  if (!obj) return {}
  return obj as Partial<Omit<PhotoRemake, 'id' | 'sourceReelId' | 'handle' | 'createdAt'>>
}

function localRemake(reel: ScoredReel): PhotoRemake {
  const kind = reel.mediaType === 'carousel' ? 'carrousel' : 'photo'
  const base = (reel.caption || '').slice(0, 120)
  return {
    id: `remake-${Date.now()}`,
    sourceReelId: reel.id,
    handle: reel.handle,
    why: `Cette ${kind} fait ${reel.score.toFixed(1)}× les likes habituels de @${reel.handle} : angle fort + visuel qui arrête le scroll. On garde la structure, pas les mots.`,
    identical: {
      caption: base ? `Repris de l'angle qui a marché : ${base}` : `Même angle que la ${kind} qui a cartonné.`,
      hashtags: ['#inspo', '#contenu', '#instagram'],
      shotList: [
        `Slide 1 : le hook visuel identique (${kind})`,
        'Slide 2 : la preuve / le détail',
        'Slide 3 : le CTA',
      ],
    },
    inVoice: {
      caption: 'Même idée, mais racontée à ma façon — plus perso, plus vrai.',
      hashtags: ['#mavoix', '#behindthescenes'],
      shotList: [
        'Slide 1 : mon hook perso',
        'Slide 2 : mon expérience/preuve',
        'Slide 3 : mon CTA',
      ],
    },
    createdAt: new Date().toISOString(),
  }
}

function buildPrompt(reel: ScoredReel, profile?: ProfileAnalysis): string {
  const voice = profile
    ? `\nPROFIL UTILISATEUR @${profile.handle}: ${profile.voice}\nRègles: ${profile.rules.join('; ')}\nPiliers: ${profile.pillars.join('; ')}`
    : ''
  return `Tu es Zack, coach Reels Instagram francophone.
À partir de ce Reel concurrent, écris un script ORIGINAL dans la voix de l'utilisateur (pas une copie).
Reel @${reel.handle} — ${reel.views} vues — score viral ${reel.score.toFixed(1)}× (baseline ${Math.round(reel.baseline)}).
Caption: ${reel.caption || '(vide)'}
${voice}

Réponds UNIQUEMENT en JSON valide (pas de markdown):
{
  "beats": [{"time":"0:00","tone":"...","line":"...","subtitle":"..."}],
  "captions": {"punchy":"...","soft":"..."}
}
4 à 6 beats, total ~15-25s.`
}

async function callClaude(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || ''
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      temperature: 0.7,
      system: 'Tu réponds uniquement en JSON valide, sans backticks markdown.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Claude API failed: ${res.status} ${body}`)
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[]
  }
  return data.content?.find((c) => c.type === 'text')?.text || '{}'
}

async function callOpenAI(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY!
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Tu réponds uniquement en JSON valide.' },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI failed: ${res.status} ${body}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  return data.choices?.[0]?.message?.content || '{}'
}

function parseScriptJson(content: string): {
  beats?: GeneratedScript['beats']
  captions?: GeneratedScript['captions']
} {
  const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    return JSON.parse(cleaned) as {
      beats?: GeneratedScript['beats']
      captions?: GeneratedScript['captions']
    }
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return {}
    try {
      return JSON.parse(match[0]) as {
        beats?: GeneratedScript['beats']
        captions?: GeneratedScript['captions']
      }
    } catch {
      return {}
    }
  }
}

function localScript(reel: ScoredReel, title: string): GeneratedScript {
  return {
    id: `script-${Date.now()}`,
    title,
    sourceReelId: reel.id,
    createdAt: new Date().toISOString(),
    captions: {
      punchy: `Le vrai signal : ${reel.score.toFixed(1)}× la baseline — pas les vues brutes.`,
      soft: `J’ai regardé @${reel.handle} : ${Math.round(reel.views / 1000)}k vues vs ~${Math.round(reel.baseline / 1000)}k habituels. Voici mon take.`,
    },
    beats: [
      {
        time: '0:00',
        tone: 'Direct, regard caméra',
        line: `Si ton Reel fait ${formatViews(reel.views)} alors que le compte tourne autour de ${formatViews(reel.baseline)}… c’est un signal.`,
        subtitle: 'Pas les vues brutes. Le multiple.',
      },
      {
        time: '0:05',
        tone: 'Expliquer',
        line: `Zack calcule le score viral : ici ${reel.score.toFixed(1)}× la médiane du compte.`,
        subtitle: `Score ${reel.score.toFixed(1)}×`,
      },
      {
        time: '0:10',
        tone: 'Preuve',
        line: reel.caption
          ? `L’angle qui a marché : « ${reel.caption.slice(0, 90)} ». On le refait dans ta voix, pas en copiant.`
          : 'On reprend la structure (hook → preuve → CTA), pas les mots.',
        subtitle: 'Structure, pas copie',
      },
      {
        time: '0:16',
        tone: 'CTA',
        line: 'Tu veux le script complet découpé seconde par seconde ? Dis à Zack « raccourcis mon accroche ».',
        subtitle: 'Prêt à filmer',
      },
    ],
  }
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}
