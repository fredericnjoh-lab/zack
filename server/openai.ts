import type {
  DiscoveredAccount,
  GeneratedScript,
  PhotoRemake,
  ProfileAnalysis,
  Reel,
  ScoredReel,
  Transcription,
} from './types.ts'
import {
  FASHION_DISCOVERY_SEEDS,
  FASHION_SYSTEM,
  fashionAngleHint,
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
  extras?: { writingContext?: string; transcription?: Transcription },
): Promise<GeneratedScript> {
  const title = (reel.caption || 'Script Zack').split('\n')[0]!.slice(0, 80)
  const provider = llmProvider()

  if (provider === 'local') {
    return localScript(reel, title, extras?.transcription)
  }

  const prompt = buildPrompt(reel, profile, extras)
  const content =
    provider === 'claude' ? await callClaude(prompt) : await callOpenAI(prompt)

  const parsed = parseScriptJson(content)
  const fallback = localScript(reel, title, extras?.transcription)

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
export async function transcribeReel(reel: ScoredReel): Promise<Transcription> {
  const provider = llmProvider()
  const fallback = localTranscription(reel)

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
  const prompt = `${FASHION_SYSTEM}

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
    const content = provider === 'claude' ? await callClaude(prompt) : await callOpenAI(prompt)
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
): Promise<DiscoveredAccount[]> {
  const provider = llmProvider()
  const nicheHint =
    profile?.pillars?.join(', ') ||
    writingContext.slice(0, 400) ||
    watched.slice(0, 5).join(', ')

  if (provider === 'local') {
    return localDiscoveries(watched)
  }

  const prompt = `${FASHION_SYSTEM}

L'utilisateur gère une MARQUE DE VÊTEMENTS. Il suit déjà: ${watched.map((h) => `@${h}`).join(', ') || '(aucun)'}.
Contexte / ADN: ${nicheHint || 'streetwear / mode DTC'}
Suggère 6 comptes Instagram RÉELS et publics — UNIQUEMENT des marques de vêtements / sneakers / streetwear (pas des influenceurs perso), du même segment prix/style, qu'il ne suit probablement pas encore.
Réponds UNIQUEMENT en JSON:
{"accounts":[{"handle":"sans @","reason":"pourquoi cette marque concurrente","nicheFit":"segment (ex streetwear UK premium)","estimatedFollowers":"ex 120k"}]}`

  try {
    const content = provider === 'claude' ? await callClaude(prompt) : await callOpenAI(prompt)
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
    return localDiscoveries(watched)
  }
}

export async function shortenHook(
  script: GeneratedScript,
  writingContext = '',
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

  const content = provider === 'claude' ? await callClaude(prompt) : await callOpenAI(prompt)
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

function localTranscription(reel: ScoredReel): Transcription {
  const caption = reel.caption || 'Hook concurrent'
  return {
    id: `tr-${Date.now()}`,
    reelId: reel.id,
    handle: reel.handle,
    ocrText: caption,
    spokenGuess: `VO: ${caption}. Preuve. CTA.`,
    fullTranscript: `[0:00] ${caption}\n[0:05] Preuve / détail\n[0:12] CTA`,
    captions: {
      punchy: `${caption} — voici mon take.`,
      soft: `J’ai vu ça chez @${reel.handle} (${reel.score.toFixed(1)}×). Mon angle :`,
    },
    source: 'local',
    createdAt: new Date().toISOString(),
  }
}

function localDiscoveries(watched: string[]): DiscoveredAccount[] {
  const blocked = new Set(watched.map((h) => h.toLowerCase()))
  const now = new Date().toISOString()
  return FASHION_DISCOVERY_SEEDS.filter((h) => !blocked.has(h))
    .slice(0, 6)
    .map((handle) => ({
      handle,
      reason: 'Marque du même univers (streetwear / mode). Ajoute ANTHROPIC_API_KEY pour des suggestions calibrées à ton ADN.',
      nicheFit: 'marques de vêtements',
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
): Promise<PhotoRemake> {
  const provider = llmProvider()
  const fallback = localRemake(reel)
  if (provider === 'local') return fallback

  const kind = reel.mediaType === 'carousel' ? 'carrousel' : 'photo'
  const angle = fashionAngleHint(reel.caption)
  const voice = profile
    ? `\nMARQUE UTILISATEUR @${profile.handle}: ${profile.voice}\nRègles: ${profile.rules.join('; ')}\nPiliers: ${profile.pillars.join('; ')}`
    : ''
  const prompt = `${FASHION_SYSTEM}

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
  const prompt = `${FASHION_SYSTEM}

Analyse le profil Instagram @${handle} — c'est une MARQUE DE VÊTEMENTS (ou aspire à en être une).
Apprends sa voix de marque pour scripts drop / fit / lookbook.
Posts: ${JSON.stringify(samples)}
Réponds uniquement en JSON:
{"voice":"description précise de la voix de marque","pillars":["..."],"strengths":["..."],"opportunities":["..."],"rules":["règles d'écriture concrètes pour la marque"]}
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
  const angle = fashionAngleHint(reel.caption)
  const base = (reel.caption || '').slice(0, 120)
  return {
    id: `remake-${Date.now()}`,
    sourceReelId: reel.id,
    handle: reel.handle,
    why: `Cette ${kind} (${angle}) fait ${reel.score.toFixed(1)}× les likes habituels de @${reel.handle} : hook produit + framing qui arrête le scroll. On garde la structure, pas les mots.`,
    identical: {
      caption: base ? `Même angle ${angle} : ${base}` : `Même structure ${angle} que la ${kind} qui a cartonné.`,
      hashtags: ['#streetwear', '#fitcheck', '#newdrop'],
      shotList: [
        `Slide 1 : hook produit (${angle})`,
        'Slide 2 : détail matière / fit',
        'Slide 3 : CTA shop / link in bio',
      ],
    },
    inVoice: {
      caption: 'Même idée drop, racontée dans notre voix de marque — pas une copie.',
      hashtags: ['#brandvoice', '#behindthestitch'],
      shotList: [
        'Slide 1 : notre hook marque',
        'Slide 2 : notre preuve / fit',
        'Slide 3 : notre CTA',
      ],
    },
    createdAt: new Date().toISOString(),
  }
}

function buildPrompt(
  reel: ScoredReel,
  profile?: ProfileAnalysis,
  extras?: { writingContext?: string; transcription?: Transcription },
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
  return `${FASHION_SYSTEM}

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
      system: FASHION_SYSTEM + '\nTu réponds uniquement en JSON valide, sans backticks markdown.',
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

function localScript(
  reel: ScoredReel,
  title: string,
  transcription?: Transcription,
): GeneratedScript {
  const angle = fashionAngleHint(reel.caption)
  const hook = transcription?.spokenGuess?.split(/[.!?]/)[0] || reel.caption || 'Nouveau drop'
  return {
    id: `script-${Date.now()}`,
    title,
    sourceReelId: reel.id,
    createdAt: new Date().toISOString(),
    transcriptionId: transcription?.id,
    captions: transcription?.captions || {
      punchy: `${angle.replace(/_/g, ' ')} · ${reel.score.toFixed(1)}× la baseline de @${reel.handle}. On le refait à notre façon.`,
      soft: `Chez @${reel.handle}, ce format ${angle} a fait ${formatViews(reel.views)} vs ~${formatViews(reel.baseline)} d’habitude. Voici notre take marque.`,
    },
    beats: [
      {
        time: '0:00',
        tone: 'Hook produit, regard caméra',
        line: String(hook).slice(0, 140),
        subtitle: `Accroche ${angle}`,
      },
      {
        time: '0:05',
        tone: 'Preuve',
        line: `Signal : ${reel.score.toFixed(1)}× la médiane de la marque (${formatViews(reel.views)} vs ${formatViews(reel.baseline)}).`,
        subtitle: `Score ${reel.score.toFixed(1)}×`,
      },
      {
        time: '0:10',
        tone: 'Fit / détail',
        line: transcription?.ocrText
          ? `Texte écran : « ${transcription.ocrText.slice(0, 90)} ». On garde la structure ${angle}, pas les mots.`
          : reel.caption
            ? `Angle concurrent : « ${reel.caption.slice(0, 90)} ». On le refait dans notre voix de marque.`
            : `Structure ${angle} : hook → preuve produit → CTA shop.`,
        subtitle: 'Structure, pas copie',
      },
      {
        time: '0:16',
        tone: 'CTA',
        line: 'Link in bio. Drop live. No apologies.',
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
