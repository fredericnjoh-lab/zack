import type {
  DiscoveredAccount,
  RepostCandidate,
  GeneratedScript,
  PhotoRemake,
  ProfileAnalysis,
  Reel,
  ScoredReel,
  Transcription,
} from './types.ts'
import {
  FASHION_DISCOVERY_SEEDS,
  fashionAngleHint,
  fashionSystem,
  type Lang,
} from './fashion.ts'

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
  extras?: { writingContext?: string; transcription?: Transcription; lang?: Lang },
): Promise<GeneratedScript> {
  const lang: Lang = extras?.lang || 'fr'
  const title = (reel.caption || 'Script Zack').split('\n')[0]!.slice(0, 80)
  const provider = llmProvider()

  if (provider === 'local') {
    return localScript(reel, title, extras?.transcription, lang)
  }

  const prompt = buildPrompt(reel, profile, extras)
  const content =
    provider === 'claude' ? await callClaude(prompt, lang) : await callOpenAI(prompt, lang)

  const parsed = parseScriptJson(content)
  const fallback = localScript(reel, title, extras?.transcription, lang)

  return {
    id: `script-${Date.now()}`,
    title,
    sourceReelId: reel.id,
    beats: parsed.beats?.length ? parsed.beats : fallback.beats,
    captions: parsed.captions || fallback.captions,
    createdAt: new Date().toISOString(),
    transcriptionId: extras?.transcription?.id,
  }
}

/** OCR frame + reconstruction transcription + 2 légendes. */
export async function transcribeReel(reel: ScoredReel, lang: Lang = 'fr'): Promise<Transcription> {
  const provider = llmProvider()
  const fallback = localTranscription(reel, lang)

  if (provider === 'local') return fallback

  let ocrFromVision = ''
  if (reel.imageUrl && provider === 'claude') {
    try {
      ocrFromVision = await ocrFrameWithClaude(reel.imageUrl)
    } catch {
      ocrFromVision = ''
    }
  }

  const angle = fashionAngleHint(reel.caption)
  const prompt = `${fashionSystem(lang)}

À partir d'un Reel MARQUE concurrente, produis une transcription utile pour refaire le contenu (drop / fit / packing / lookbook).
Marque: @${reel.handle}
Angle détecté: ${angle}
Caption: ${reel.caption || '(vide)'}
Texte lu à l'écran (OCR): ${ocrFromVision || '(aucun — déduis depuis la caption)'}
Score viral: ${reel.score.toFixed(1)}×

Réponds UNIQUEMENT en JSON:
{
  "ocrText": "texte affiché à l'écran (ou vide)",
  "spokenGuess": "voix-off / paroles reconstituées seconde par seconde en FR, ton marque",
  "fullTranscript": "transcription complète prête à tourner",
  "captions": {"punchy":"légende A drop/fit prête à coller","soft":"légende B plus soft brand"}
}`

  try {
    const content = provider === 'claude' ? await callClaude(prompt, lang) : await callOpenAI(prompt, lang)
    const parsed = parseTranscriptionJson(content)
    return {
      id: `tr-${Date.now()}`,
      reelId: reel.id,
      handle: reel.handle,
      ocrText: parsed.ocrText || ocrFromVision || fallback.ocrText,
      spokenGuess: parsed.spokenGuess || fallback.spokenGuess,
      fullTranscript: parsed.fullTranscript || fallback.fullTranscript,
      captions: parsed.captions || fallback.captions,
      source: ocrFromVision ? 'vision' : 'caption',
      createdAt: new Date().toISOString(),
    }
  } catch {
    return {
      ...fallback,
      ocrText: ocrFromVision || fallback.ocrText,
      source: ocrFromVision ? 'vision' : 'local',
    }
  }
}

export async function discoverAccounts(
  watched: string[],
  profile?: ProfileAnalysis,
  writingContext = '',
  lang: Lang = 'fr',
): Promise<DiscoveredAccount[]> {
  const provider = llmProvider()
  const nicheHint =
    profile?.pillars?.join(', ') ||
    writingContext.slice(0, 400) ||
    watched.slice(0, 5).join(', ')

  if (provider === 'local') {
    return localDiscoveries(watched, lang)
  }

  const prompt = `${fashionSystem(lang)}

L'utilisateur gère une MARQUE DE VÊTEMENTS. Il suit déjà: ${watched.map((h) => `@${h}`).join(', ') || '(aucun)'}.
Contexte / ADN: ${nicheHint || 'streetwear / mode DTC'}
Suggère 6 comptes Instagram RÉELS et publics — UNIQUEMENT des marques de vêtements / sneakers / streetwear (pas des influenceurs perso), du même segment prix/style, qu'il ne suit probablement pas encore.
Réponds UNIQUEMENT en JSON:
{"accounts":[{"handle":"sans @","reason":"pourquoi cette marque concurrente","nicheFit":"segment (ex streetwear UK premium)","estimatedFollowers":"ex 120k"}]}`

  try {
    const content = provider === 'claude' ? await callClaude(prompt, lang) : await callOpenAI(prompt, lang)
    const parsed = parseDiscoverJson(content)
    const blocked = new Set(watched.map((h) => h.toLowerCase()))
    const now = new Date().toISOString()
    return (parsed.accounts || [])
      .map((a) => ({
        handle: String(a.handle || '')
          .replace(/^@/, '')
          .trim()
          .toLowerCase(),
        reason: String(a.reason || 'Marque proche de ton segment'),
        nicheFit: String(a.nicheFit || 'mode / streetwear'),
        estimatedFollowers: a.estimatedFollowers ? String(a.estimatedFollowers) : undefined,
        verified: false,
        suggestedAt: now,
      }))
      .filter((a) => a.handle && !blocked.has(a.handle))
      .slice(0, 6)
  } catch {
    return localDiscoveries(watched, lang)
  }
}

export async function shortenHook(
  script: GeneratedScript,
  writingContext = '',
  lang: Lang = 'fr',
): Promise<{ hook: string; beats: GeneratedScript['beats'] }> {
  const first = script.beats[0]
  const provider = llmProvider()
  if (provider === 'local') {
    const hook = (first?.line || script.title).split(/[.!?]/)[0]!.slice(0, 90)
    const beats = script.beats.map((b, i) =>
      i === 0 ? { ...b, line: hook, subtitle: hook.slice(0, 40) } : b,
    )
    return { hook, beats }
  }

  const prompt = `Raccourcis l'accroche de ce script Reel. Garde le punch, max 12 mots.
Titre: ${script.title}
Accroche actuelle: ${first?.line || ''}
${writingContext ? `Contexte écriture:\n${writingContext.slice(0, 800)}` : ''}

Réponds UNIQUEMENT en JSON:
{"hook":"...","tone":"...","subtitle":"..."}`

  const content = provider === 'claude' ? await callClaude(prompt, lang) : await callOpenAI(prompt, lang)
  const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  let parsed: { hook?: string; tone?: string; subtitle?: string } = {}
  try {
    parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned) as typeof parsed
  } catch {
    parsed = {}
  }
  const hook = parsed.hook || (first?.line || script.title).slice(0, 80)
  const beats = script.beats.map((b, i) =>
    i === 0
      ? {
          ...b,
          line: hook,
          tone: parsed.tone || b.tone,
          subtitle: parsed.subtitle || hook.slice(0, 42),
        }
      : b,
  )
  return { hook, beats }
}

async function ocrFrameWithClaude(imageUrl: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || ''
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5'
  const upstream = await fetch(imageUrl, { headers: { 'user-agent': 'Mozilla/5.0' } })
  if (!upstream.ok) throw new Error('image fetch failed')
  const buf = Buffer.from(await upstream.arrayBuffer())
  if (buf.byteLength > 4_500_000) throw new Error('image too large')
  const contentType = upstream.headers.get('content-type') || 'image/jpeg'
  const mediaType = contentType.includes('png')
    ? 'image/png'
    : contentType.includes('webp')
      ? 'image/webp'
      : contentType.includes('gif')
        ? 'image/gif'
        : 'image/jpeg'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: buf.toString('base64'),
              },
            },
            {
              type: 'text',
              text: 'Lis tout le texte visible à l’écran (OCR). Réponds uniquement avec le texte lu, ligne par ligne. Si aucun texte: (vide).',
            },
          ],
        },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Claude vision failed: ${res.status} ${body}`)
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  return (data.content?.find((c) => c.type === 'text')?.text || '').trim()
}

function localTranscription(reel: ScoredReel, lang: Lang = 'fr'): Transcription {
  const caption = reel.caption || (lang === 'en' ? 'Competitor hook' : 'Hook concurrent')
  const en = lang === 'en'
  return {
    id: `tr-${Date.now()}`,
    reelId: reel.id,
    handle: reel.handle,
    ocrText: caption,
    spokenGuess: en ? `VO: ${caption}. Proof. CTA.` : `VO: ${caption}. Preuve. CTA.`,
    fullTranscript: en
      ? `[0:00] ${caption}\n[0:05] Proof / detail\n[0:12] CTA`
      : `[0:00] ${caption}\n[0:05] Preuve / détail\n[0:12] CTA`,
    captions: {
      punchy: en ? `${caption} — here's our take.` : `${caption} — voici notre take.`,
      soft: en
        ? `Spotted on @${reel.handle} (${reel.score.toFixed(1)}×). Our angle:`
        : `Vu chez @${reel.handle} (${reel.score.toFixed(1)}×). Notre angle :`,
    },
    source: 'local',
    createdAt: new Date().toISOString(),
  }
}

function localDiscoveries(watched: string[], lang: Lang = 'fr'): DiscoveredAccount[] {
  const blocked = new Set(watched.map((h) => h.toLowerCase()))
  const now = new Date().toISOString()
  const en = lang === 'en'
  return FASHION_DISCOVERY_SEEDS.filter((h) => !blocked.has(h))
    .slice(0, 6)
    .map((handle) => ({
      handle,
      reason: en
        ? 'Brand from the same universe (streetwear / fashion). Add ANTHROPIC_API_KEY for suggestions tuned to your DNA.'
        : 'Marque du même univers (streetwear / mode). Ajoute ANTHROPIC_API_KEY pour des suggestions calibrées à ton ADN.',
      nicheFit: en ? 'clothing brands' : 'marques de vêtements',
      verified: false,
      suggestedAt: now,
    }))
}

function parseTranscriptionJson(content: string): Partial<Transcription> {
  const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    return JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned) as Partial<Transcription>
  } catch {
    return {}
  }
}

function parseDiscoverJson(content: string): {
  accounts?: { handle?: string; reason?: string; nicheFit?: string; estimatedFollowers?: string }[]
} {
  const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    return JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned) as {
      accounts?: { handle?: string; reason?: string; nicheFit?: string; estimatedFollowers?: string }[]
    }
  } catch {
    return {}
  }
}

/** Photos/carrousels : explique pourquoi ça marche, puis refait (identique + dans ta voix). */
export async function generatePhotoRemake(
  reel: ScoredReel,
  profile?: ProfileAnalysis,
  lang: Lang = 'fr',
): Promise<PhotoRemake> {
  const provider = llmProvider()
  const fallback = localRemake(reel, lang)
  if (provider === 'local') return fallback

  const kind = reel.mediaType === 'carousel' ? 'carrousel' : 'photo'
  const angle = fashionAngleHint(reel.caption)
  const voice = profile
    ? `\nMARQUE UTILISATEUR @${profile.handle}: ${profile.voice}\nRègles: ${profile.rules.join('; ')}\nPiliers: ${profile.pillars.join('; ')}`
    : ''
  const prompt = `${fashionSystem(lang)}

Analyse cette publication ${kind} qui a sur-performé chez une marque concurrente, puis produis deux remakes PRODUIT / COLLECTION.
Marque: @${reel.handle}
Type: ${kind}
Angle détecté: ${angle}
Likes: ${reel.views} (score ${reel.score.toFixed(1)}× la médiane ${kind} du compte)
Légende d'origine: ${reel.caption || '(vide)'}
${voice}

Réponds UNIQUEMENT en JSON valide (pas de markdown):
{
  "why": "2-3 phrases: pourquoi CETTE publi a marché (hook produit, styling, structure carrousel, émotion marque).",
  "identical": {
    "caption": "reprise fidèle de l'angle, adaptée FR, prête à publier pour une marque",
    "hashtags": ["#streetwear","#..."],
    "shotList": ["slide/plan 1: produit...", "slide/plan 2: ..."]
  },
  "inVoice": {
    "caption": "même concept réécrit dans la voix de LA marque utilisateur",
    "hashtags": ["#..."],
    "shotList": ["slide/plan 1: ...", "slide/plan 2: ..."]
  }
}
3 à 5 éléments de shotList par version — parlons packing, fit, fabric, drop, pas lifestyle générique.`

  try {
    const content = provider === 'claude' ? await callClaude(prompt, lang) : await callOpenAI(prompt, lang)
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

export async function analyzeProfile(handle: string, posts: Reel[], lang: Lang = 'fr'): Promise<ProfileAnalysis> {
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
    voice: 'Voix de marque directe, visuelle, centrée produit et attitude.',
    pillars: ['Produit / drop', 'Fit & styling', 'Communauté / UGC'],
    strengths: ['Identité visuelle cohérente', 'Formats produit réguliers'],
    opportunities: ['Hooks drop plus clairs', 'Plus de behind the stitch'],
    rules: ['Phrases courtes', 'Un angle par post (drop OU fit OU packing)', 'CTA shop naturel'],
    topFormats,
    posts,
  }
  if (!hasLLM()) return fallback

  const samples = posts.slice(0, 20).map((p) => ({
    type: p.mediaType || 'reel',
    performance: p.views,
    caption: (p.caption || '').slice(0, 500),
    angle: fashionAngleHint(p.caption),
  }))
  const prompt = `${fashionSystem(lang)}

Analyse le profil Instagram @${handle} — c'est une MARQUE DE VÊTEMENTS (ou aspire à en être une).
Apprends sa voix de marque pour scripts drop / fit / lookbook.
Posts: ${JSON.stringify(samples)}
Réponds uniquement en JSON:
{"voice":"description précise de la voix de marque","pillars":["..."],"strengths":["..."],"opportunities":["..."],"rules":["règles d'écriture concrètes pour la marque"]}
3 à 5 éléments par liste.`
  const content = llmProvider() === 'claude' ? await callClaude(prompt, lang) : await callOpenAI(prompt, lang)
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

function localRemake(reel: ScoredReel, lang: Lang = 'fr'): PhotoRemake {
  const en = lang === 'en'
  const kind = reel.mediaType === 'carousel' ? (en ? 'carousel' : 'carrousel') : 'photo'
  const angle = fashionAngleHint(reel.caption)
  const base = (reel.caption || '').slice(0, 120)
  return {
    id: `remake-${Date.now()}`,
    sourceReelId: reel.id,
    handle: reel.handle,
    why: en
      ? `This ${kind} (${angle}) hits ${reel.score.toFixed(1)}× the usual likes of @${reel.handle}: product hook plus framing that stops the scroll. Keep the structure, not the words.`
      : `Cette ${kind} (${angle}) fait ${reel.score.toFixed(1)}× les likes habituels de @${reel.handle} : hook produit + framing qui arrête le scroll. On garde la structure, pas les mots.`,
    identical: {
      caption: base
        ? en
          ? `Same ${angle} angle: ${base}`
          : `Même angle ${angle} : ${base}`
        : en
          ? `Same ${angle} structure as the ${kind} that landed.`
          : `Même structure ${angle} que la ${kind} qui a cartonné.`,
      hashtags: ['#streetwear', '#fitcheck', '#newdrop'],
      shotList: en
        ? [`Slide 1: product hook (${angle})`, 'Slide 2: fabric / fit detail', 'Slide 3: shop CTA / link in bio']
        : [`Slide 1 : hook produit (${angle})`, 'Slide 2 : détail matière / fit', 'Slide 3 : CTA shop / link in bio'],
    },
    inVoice: {
      caption: en
        ? 'Same drop idea, told in our brand voice — not a copy.'
        : 'Même idée drop, racontée dans notre voix de marque — pas une copie.',
      hashtags: ['#brandvoice', '#behindthestitch'],
      shotList: en
        ? ['Slide 1: our brand hook', 'Slide 2: our proof / fit', 'Slide 3: our CTA']
        : ['Slide 1 : notre hook marque', 'Slide 2 : notre preuve / fit', 'Slide 3 : notre CTA'],
    },
    createdAt: new Date().toISOString(),
  }
}

function buildPrompt(
  reel: ScoredReel,
  profile?: ProfileAnalysis,
  extras?: { writingContext?: string; transcription?: Transcription; lang?: Lang },
): string {
  const angle = fashionAngleHint(reel.caption)
  const voice = extras?.writingContext
    ? `\nVOIX / MÉTHODE DE MARQUE:\n${extras.writingContext}`
    : profile
      ? `\nMARQUE @${profile.handle}: ${profile.voice}\nRègles: ${profile.rules.join('; ')}\nPiliers: ${profile.pillars.join('; ')}`
      : ''
  const transcript = extras?.transcription
    ? `\nTranscription / OCR du Reel:\nOCR: ${extras.transcription.ocrText}\nParlé: ${extras.transcription.spokenGuess}\nComplet: ${extras.transcription.fullTranscript}`
    : ''
  return `${fashionSystem(extras?.lang || 'fr')}

À partir de ce Reel d'une marque concurrente, écris un script ORIGINAL dans la voix de LA marque utilisateur (pas une copie).
Angle détecté: ${angle} — structure le script autour de cet angle mode (drop, fit check, packing, etc.).
Reel @${reel.handle} — ${reel.views} vues — score viral ${reel.score.toFixed(1)}× (baseline ${Math.round(reel.baseline)}).
Caption: ${reel.caption || '(vide)'}
${transcript}
${voice}

Réponds UNIQUEMENT en JSON valide (pas de markdown):
{
  "beats": [{"time":"0:00","tone":"...","line":"...","subtitle":"..."}],
  "captions": {"punchy":"...","soft":"..."}
}
4 à 6 beats, total ~15-25s. CTA shop / link in bio OK en fin.`
}

async function callClaude(prompt: string, lang: Lang = 'fr'): Promise<string> {
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
      system: `${fashionSystem(lang)}\nOutput valid JSON only, no markdown fences.`,
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

async function callOpenAI(prompt: string, lang: Lang = 'fr'): Promise<string> {
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
        { role: 'system', content: `${fashionSystem(lang)}\nOutput valid JSON only.` },
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

function localScript(
  reel: ScoredReel,
  title: string,
  transcription?: Transcription,
  lang: Lang = 'fr',
): GeneratedScript {
  const en = lang === 'en'
  const angle = fashionAngleHint(reel.caption)
  const hook =
    transcription?.spokenGuess?.split(/[.!?]/)[0] ||
    reel.caption ||
    (en ? 'New drop' : 'Nouveau drop')
  return {
    id: `script-${Date.now()}`,
    title,
    sourceReelId: reel.id,
    createdAt: new Date().toISOString(),
    transcriptionId: transcription?.id,
    captions: transcription?.captions || {
      punchy: en
        ? `${angle.replace(/_/g, ' ')} · ${reel.score.toFixed(1)}× the baseline of @${reel.handle}. We rebuild it our way.`
        : `${angle.replace(/_/g, ' ')} · ${reel.score.toFixed(1)}× la baseline de @${reel.handle}. On le refait à notre façon.`,
      soft: en
        ? `On @${reel.handle}, this ${angle} format hit ${formatViews(reel.views)} vs ~${formatViews(reel.baseline)} usually. Here's our brand take.`
        : `Chez @${reel.handle}, ce format ${angle} a fait ${formatViews(reel.views)} vs ~${formatViews(reel.baseline)} d’habitude. Voici notre take marque.`,
    },
    beats: [
      {
        time: '0:00',
        tone: en ? 'Product hook, straight to camera' : 'Hook produit, regard caméra',
        line: String(hook).slice(0, 140),
        subtitle: en ? `${angle} hook` : `Accroche ${angle}`,
      },
      {
        time: '0:05',
        tone: en ? 'Proof' : 'Preuve',
        line: en
          ? `Signal: ${reel.score.toFixed(1)}× the brand median (${formatViews(reel.views)} vs ${formatViews(reel.baseline)}).`
          : `Signal : ${reel.score.toFixed(1)}× la médiane de la marque (${formatViews(reel.views)} vs ${formatViews(reel.baseline)}).`,
        subtitle: `Score ${reel.score.toFixed(1)}×`,
      },
      {
        time: '0:10',
        tone: en ? 'Fit / detail' : 'Fit / détail',
        line: transcription?.ocrText
          ? en
            ? `On-screen text: “${transcription.ocrText.slice(0, 90)}”. Keep the ${angle} structure, not the words.`
            : `Texte écran : « ${transcription.ocrText.slice(0, 90)} ». On garde la structure ${angle}, pas les mots.`
          : reel.caption
            ? en
              ? `Competitor angle: “${reel.caption.slice(0, 90)}”. We rebuild it in our brand voice.`
              : `Angle concurrent : « ${reel.caption.slice(0, 90)} ». On le refait dans notre voix de marque.`
            : en
              ? `${angle} structure: hook → product proof → shop CTA.`
              : `Structure ${angle} : hook → preuve produit → CTA shop.`,
        subtitle: en ? 'Structure, not copy' : 'Structure, pas copie',
      },
      {
        time: '0:16',
        tone: 'CTA',
        line: 'Link in bio. Drop live. No apologies.',
        subtitle: en ? 'Ready to shoot' : 'Prêt à filmer',
      },
    ],
  }
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

export type YoutubeMetadata = { title: string; description: string; tags: string[] }

/** Nettoie une légende Instagram pour en tirer un titre lisible. */
function captionTitle(caption: string, fallback: string): string {
  const strip = (line: string) =>
    line
      .replace(/#[\p{L}\p{N}_]+/gu, '')
      .replace(/@[\w.]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  // Une légende commence souvent par des hashtags : on garde la première ligne
  // qui dit encore quelque chose une fois les # et @ retirés.
  const clean = caption.split('\n').map(strip).find(Boolean) || strip(caption)
  return (clean || fallback).slice(0, 95)
}

function captionTags(caption: string): string[] {
  const found = caption.match(/#[\p{L}\p{N}_]+/gu) || []
  return [...new Set(found.map((t) => t.slice(1).toLowerCase()))].slice(0, 15)
}

export function localYoutubeMetadata(
  media: RepostCandidate,
  handle: string,
  lang: Lang = 'fr',
): YoutubeMetadata {
  const title = captionTitle(media.caption || '', lang === 'fr' ? 'Nouvelle pièce' : 'New drop')
  const credit =
    lang === 'fr'
      ? `Publié à l’origine sur Instagram @${handle}`
      : `Originally posted on Instagram @${handle}`
  const description = [(media.caption || '').trim(), [credit, media.url ? `→ ${media.url}` : '']
    .filter(Boolean)
    .join('\n')]
    .filter(Boolean)
    .join('\n\n')
  return { title, description, tags: captionTags(media.caption || '') }
}

/** Titre + description + tags optimisés YouTube à partir du post Instagram. */
export async function generateYoutubeMetadata(
  media: RepostCandidate,
  handle: string,
  extras?: { writingContext?: string; lang?: Lang },
): Promise<YoutubeMetadata> {
  const lang: Lang = extras?.lang || 'fr'
  const fallback = localYoutubeMetadata(media, handle, lang)
  const provider = llmProvider()
  if (provider === 'local') return fallback

  const prompt = [
    lang === 'fr'
      ? `Tu prépares la republication d'un Reel Instagram de la marque @${handle} en Short YouTube.`
      : `You are repurposing an Instagram Reel from the brand @${handle} into a YouTube Short.`,
    `Légende Instagram: ${(media.caption || '(vide)').slice(0, 900)}`,
    media.views ? `Vues Instagram: ${media.views}` : '',
    extras?.writingContext ? `Contexte de marque:\n${extras.writingContext.slice(0, 1500)}` : '',
    lang === 'fr'
      ? 'Rends UNIQUEMENT ce JSON: {"title": "titre YouTube accrocheur < 90 caractères, sans hashtag", "description": "3 à 5 lignes, ton de la marque, finir par un appel à l’action", "tags": ["10 mots-clés YouTube en minuscules, sans #"]}'
      : 'Return ONLY this JSON: {"title": "catchy YouTube title < 90 chars, no hashtag", "description": "3-5 lines in brand voice, end with a call to action", "tags": ["10 lowercase YouTube keywords, no #"]}',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const content = provider === 'claude' ? await callClaude(prompt, lang) : await callOpenAI(prompt, lang)
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim()) as Partial<YoutubeMetadata>
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t).replace(/^#/, '').trim()).filter(Boolean)
      : []
    return {
      title: (parsed.title || fallback.title).slice(0, 95),
      description: parsed.description || fallback.description,
      tags: [...new Set([...tags, ...fallback.tags])].slice(0, 20),
    }
  } catch {
    return fallback
  }
}
