import cors from 'cors'
import express from 'express'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { fetchReelsForHandles, hasApify } from './apify.ts'
import { loadStore, normalizeHandle, saveStore, writingContext } from './db.ts'
import {
  analyzeProfile,
  discoverAccounts,
  generatePhotoRemake,
  generateScriptFromReel,
  hasLLM,
  llmProvider,
  shortenHook,
  transcribeReel,
} from './openai.ts'
import { maybeRunAutoVeille, startAutoVeilleLoop } from './scheduler.ts'
import { scorePhotos, scoreReels } from './scoring.ts'
import type { Reel } from './types.ts'

// Load .env without extra dependency
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1]!.trim()] ??= m[2]!.trim().replace(/^["']|["']$/g, '')
  }
}

const app = express()
const PORT = Number(process.env.PORT || 8787)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  const store = loadStore()
  res.json({
    ok: true,
    apify: hasApify(),
    llm: llmProvider(),
    openai: hasLLM(),
    claude: llmProvider() === 'claude',
    accounts: store.accounts.length,
    reels: store.reels.length,
    lastVeilleAt: store.lastVeilleAt,
    lastVeilleMode: store.lastVeilleMode,
    autoVeille: store.autoVeille || { enabled: false, hour: 7 },
  })
})

app.get('/api/accounts', (_req, res) => {
  res.json({ accounts: loadStore().accounts })
})

app.post('/api/accounts', (req, res) => {
  const parsed = z.object({ handle: z.string().min(1) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'handle requis' })
  const handle = normalizeHandle(parsed.data.handle)
  const store = loadStore()
  if (store.accounts.some((a) => a.handle === handle)) {
    return res.status(409).json({ error: 'déjà suivi' })
  }
  if (store.accounts.length >= 20) {
    return res.status(400).json({ error: 'max 20 comptes' })
  }
  store.accounts.push({ handle, addedAt: new Date().toISOString() })
  saveStore(store)
  res.json({ accounts: store.accounts })
})

app.delete('/api/accounts/:handle', (req, res) => {
  const handle = normalizeHandle(req.params.handle || '')
  const store = loadStore()
  store.accounts = store.accounts.filter((a) => a.handle !== handle)
  saveStore(store)
  res.json({ accounts: store.accounts })
})

app.get('/api/veille', (_req, res) => {
  const store = loadStore()
  const liveReels = store.reels.some((r) => r.source === 'apify')
    ? store.reels.filter((r) => r.source !== 'seed')
    : store.reels
  const scored = scoreReels(liveReels)
  res.json({
    accounts: store.accounts,
    hits: scored,
    allCount: liveReels.length,
    lastVeilleAt: store.lastVeilleAt,
    lastVeilleMode: store.lastVeilleMode,
    apify: hasApify(),
    openai: hasLLM(),
    llm: llmProvider(),
    claude: llmProvider() === 'claude',
    autoVeille: store.autoVeille || { enabled: false, hour: 7 },
    discoveries: store.discoveries || [],
  })
})

app.post('/api/veille/run', async (_req, res) => {
  const store = loadStore()
  if (store.accounts.length === 0) {
    return res.status(400).json({ error: 'ajoute au moins 1 compte' })
  }

  try {
    if (hasApify()) {
      const fetched = await fetchReelsForHandles(store.accounts.map((a) => a.handle))
      const other = store.reels.filter((r) => !store.accounts.some((a) => a.handle === r.handle))
      store.reels = [...other, ...fetched]
      store.lastVeilleMode = 'apify'
      store.lastVeilleAt = new Date().toISOString()
      saveStore(store)
      return res.json({
        mode: 'apify',
        fetched: fetched.length,
        hits: scoreReels(store.reels),
      })
    }

    store.lastVeilleMode = store.reels.some((r) => r.source === 'manual') ? 'manual' : 'seed'
    store.lastVeilleAt = new Date().toISOString()
    saveStore(store)
    res.json({
      mode: store.lastVeilleMode,
      fetched: store.reels.length,
      hits: scoreReels(store.reels),
      notice:
        'Pas de APIFY_TOKEN — veille sur données locales/manuelles. Ajoute le token pour scraper Instagram.',
    })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'veille failed' })
  }
})

app.get('/api/auto-veille', (_req, res) => {
  res.json({ autoVeille: loadStore().autoVeille || { enabled: false, hour: 7 } })
})

app.post('/api/auto-veille', (req, res) => {
  const parsed = z
    .object({
      enabled: z.boolean().optional(),
      hour: z.number().int().min(0).max(23).optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'enabled/hour invalides' })
  const store = loadStore()
  store.autoVeille = {
    enabled: parsed.data.enabled ?? store.autoVeille?.enabled ?? false,
    hour: parsed.data.hour ?? store.autoVeille?.hour ?? 7,
    lastRunAt: store.autoVeille?.lastRunAt,
    lastPalmaresSummary: store.autoVeille?.lastPalmaresSummary,
  }
  saveStore(store)
  res.json({ autoVeille: store.autoVeille })
})

app.post('/api/auto-veille/run', async (req, res) => {
  const force = Boolean((req.body as { force?: boolean })?.force)
  const result = await maybeRunAutoVeille(force)
  const store = loadStore()
  res.json({
    ...result,
    autoVeille: store.autoVeille,
    hits: scoreReels(store.reels).slice(0, 10),
  })
})

app.post('/api/discover', async (_req, res) => {
  try {
    const store = loadStore()
    const suggestions = await discoverAccounts(
      store.accounts.map((a) => a.handle),
      store.profile,
      writingContext(store),
    )
    // Optional light verification: scrape first suggestion if Apify is on.
    if (hasApify() && suggestions[0]) {
      try {
        const sample = await fetchReelsForHandles([suggestions[0].handle], 3)
        if (sample.length) {
          suggestions[0].verified = true
          suggestions[0].sampleViews = Math.max(...sample.map((s) => s.views))
        }
      } catch {
        /* keep unverified */
      }
    }
    store.discoveries = suggestions
    saveStore(store)
    res.json({ discoveries: suggestions, llm: llmProvider() })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'découverte échouée' })
  }
})

app.post('/api/reels/manual', (req, res) => {
  const parsed = z
    .object({
      handle: z.string().min(1),
      views: z.number().positive(),
      caption: z.string().optional(),
      url: z.string().url().optional(),
      baseline: z.number().positive().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'handle + views requis' })

  const handle = normalizeHandle(parsed.data.handle)
  const store = loadStore()
  if (!store.accounts.some((a) => a.handle === handle)) {
    store.accounts.push({ handle, addedAt: new Date().toISOString() })
  }

  if (parsed.data.baseline && !store.reels.some((r) => r.handle === handle && r.source !== 'manual')) {
    for (let i = 0; i < 3; i++) {
      store.reels.push({
        id: `base-${handle}-${Date.now()}-${i}`,
        handle,
        views: parsed.data.baseline,
        caption: `baseline ${i + 1}`,
        source: 'manual',
        takenAt: new Date().toISOString(),
      })
    }
  }

  const reel: Reel = {
    id: `manual-${Date.now()}`,
    handle,
    views: parsed.data.views,
    caption: parsed.data.caption,
    url: parsed.data.url,
    source: 'manual',
    takenAt: new Date().toISOString(),
  }
  store.reels.push(reel)
  saveStore(store)
  res.json({ reel, hits: scoreReels(store.reels) })
})

app.get('/api/calendar', (_req, res) => {
  res.json({ items: loadStore().calendar })
})

app.post('/api/calendar', (req, res) => {
  const parsed = z
    .object({
      day: z.number().int().min(0).max(31),
      label: z.string().min(1),
      status: z.enum(['ecrit', 'tourne', 'publie']).default('ecrit'),
      month: z.number().int().min(1).max(12).optional(),
      year: z.number().int().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'day + label requis' })
  const now = new Date()
  const store = loadStore()
  const item = {
    id: `cal-${Date.now()}`,
    day: parsed.data.day,
    month: parsed.data.month ?? now.getMonth() + 1,
    year: parsed.data.year ?? now.getFullYear(),
    label: parsed.data.label,
    status: parsed.data.status,
  }
  store.calendar.push(item)
  saveStore(store)
  res.json({ items: store.calendar })
})

app.patch('/api/calendar/:id', (req, res) => {
  const parsed = z
    .object({
      day: z.number().int().min(0).max(31).optional(),
      status: z.enum(['ecrit', 'tourne', 'publie']).optional(),
      label: z.string().min(1).optional(),
      month: z.number().int().min(1).max(12).optional(),
      year: z.number().int().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'payload invalide' })
  const store = loadStore()
  const item = store.calendar.find((c) => c.id === req.params.id)
  if (!item) return res.status(404).json({ error: 'idée introuvable' })
  if (parsed.data.day !== undefined) item.day = parsed.data.day
  if (parsed.data.status) item.status = parsed.data.status
  if (parsed.data.label) item.label = parsed.data.label
  if (parsed.data.month) item.month = parsed.data.month
  if (parsed.data.year) item.year = parsed.data.year
  saveStore(store)
  res.json({ items: store.calendar })
})

app.get('/api/scripts', (_req, res) => {
  res.json({ scripts: loadStore().scripts })
})

app.post('/api/scripts/generate', async (req, res) => {
  const parsed = z.object({ reelId: z.string().min(1) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'reelId requis' })
  const store = loadStore()
  const hits = scoreReels(store.reels, 0)
  const reel = hits.find((r) => r.id === parsed.data.reelId)
  if (!reel) return res.status(404).json({ error: 'reel introuvable' })
  try {
    const transcription = (store.transcriptions || []).find((t) => t.reelId === reel.id)
    const script = await generateScriptFromReel(reel, store.profile, {
      writingContext: writingContext(store),
      transcription,
    })
    store.scripts.unshift(script)
    saveStore(store)
    res.json({ script, openai: hasLLM(), llm: llmProvider() })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'script failed' })
  }
})

app.post('/api/scripts/:id/shorten', async (req, res) => {
  const store = loadStore()
  const script = store.scripts.find((s) => s.id === req.params.id) || store.scripts[0]
  if (!script) return res.status(404).json({ error: 'aucun script' })
  try {
    const { hook, beats } = await shortenHook(script, writingContext(store))
    script.beats = beats
    saveStore(store)
    res.json({ script, hook, llm: llmProvider() })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'raccourci échoué' })
  }
})

app.post('/api/writing/rules', (req, res) => {
  const parsed = z.object({ rule: z.string().min(3).max(240) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'règle requise' })
  const store = loadStore()
  if (!store.writingGuide) store.writingGuide = { documents: [], learnedRules: [] }
  const rule = parsed.data.rule.trim()
  if (!store.writingGuide.learnedRules.includes(rule)) {
    store.writingGuide.learnedRules.unshift(rule)
    store.writingGuide.learnedRules = store.writingGuide.learnedRules.slice(0, 40)
  }
  if (store.profile && !store.profile.rules.includes(rule)) {
    store.profile.rules.unshift(rule)
  }
  saveStore(store)
  res.json({ writingGuide: store.writingGuide, profile: store.profile || null })
})

app.post('/api/scripts/:id/remember-rule', (req, res) => {
  const parsed = z.object({ rule: z.string().min(3).max(240) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'règle requise' })
  const store = loadStore()
  if (!store.writingGuide) store.writingGuide = { documents: [], learnedRules: [] }
  const rule = parsed.data.rule.trim()
  if (!store.writingGuide.learnedRules.includes(rule)) {
    store.writingGuide.learnedRules.unshift(rule)
    store.writingGuide.learnedRules = store.writingGuide.learnedRules.slice(0, 40)
  }
  if (store.profile && !store.profile.rules.includes(rule)) {
    store.profile.rules.unshift(rule)
  }
  saveStore(store)
  res.json({ writingGuide: store.writingGuide, profile: store.profile || null })
})

app.post('/api/reels/:id/transcribe', async (req, res) => {
  const store = loadStore()
  const hits = scoreReels(store.reels, 0)
  const reel = hits.find((r) => r.id === req.params.id) || store.reels.find((r) => r.id === req.params.id)
  if (!reel) return res.status(404).json({ error: 'reel introuvable' })
  const scored =
    'score' in reel
      ? (reel as ReturnType<typeof scoreReels>[number])
      : scoreReels([reel as Reel], 0)[0]!
  try {
    const transcription = await transcribeReel(scored)
    if (!store.transcriptions) store.transcriptions = []
    store.transcriptions = store.transcriptions.filter((t) => t.reelId !== scored.id)
    store.transcriptions.unshift(transcription)
    saveStore(store)
    res.json({ transcription, llm: llmProvider() })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'transcription échouée' })
  }
})

app.get('/api/transcriptions', (_req, res) => {
  res.json({ transcriptions: loadStore().transcriptions || [] })
})

app.get('/api/writing', (_req, res) => {
  const store = loadStore()
  res.json({ writingGuide: store.writingGuide || { documents: [], learnedRules: [] } })
})

app.post('/api/writing/documents', (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(1).max(120),
      content: z.string().min(10).max(50_000),
    })
    .safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'nom + contenu requis' })
  const store = loadStore()
  if (!store.writingGuide) store.writingGuide = { documents: [], learnedRules: [] }
  store.writingGuide.documents.unshift({
    id: `doc-${Date.now()}`,
    name: parsed.data.name.trim(),
    content: parsed.data.content.trim(),
    addedAt: new Date().toISOString(),
  })
  store.writingGuide.documents = store.writingGuide.documents.slice(0, 20)
  saveStore(store)
  res.json({ writingGuide: store.writingGuide })
})

app.delete('/api/writing/documents/:id', (req, res) => {
  const store = loadStore()
  if (!store.writingGuide) store.writingGuide = { documents: [], learnedRules: [] }
  store.writingGuide.documents = store.writingGuide.documents.filter((d) => d.id !== req.params.id)
  saveStore(store)
  res.json({ writingGuide: store.writingGuide })
})

app.get('/api/photos', (_req, res) => {
  const store = loadStore()
  const liveReels = store.reels.some((r) => r.source === 'apify')
    ? store.reels.filter((r) => r.source !== 'seed')
    : store.reels
  res.json({ hits: scorePhotos(liveReels), remakes: store.remakes.slice(0, 10) })
})

app.get('/api/profile', (_req, res) => {
  const store = loadStore()
  res.json({
    profile: store.profile || null,
    writingGuide: store.writingGuide || { documents: [], learnedRules: [] },
  })
})

app.post('/api/profile/analyze', async (req, res) => {
  const parsed = z.object({ handle: z.string().min(1) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'handle requis' })
  const handle = normalizeHandle(parsed.data.handle)
  try {
    const posts = hasApify()
      ? await fetchReelsForHandles([handle], 24)
      : loadStore().reels.filter((r) => r.handle === handle)
    if (!posts.length) {
      return res.status(404).json({
        error: `Aucune publication récupérée pour @${handle}. Vérifie l'orthographe, et que le compte est public (Zack ne peut pas lire un compte privé) et contient des posts.`,
      })
    }
    const profile = await analyzeProfile(handle, posts)
    const store = loadStore()
    store.profile = profile
    saveStore(store)
    res.json({ profile, llm: llmProvider() })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'analyse profil échouée' })
  }
})

app.get('/api/image', async (req, res) => {
  const raw = typeof req.query.url === 'string' ? req.query.url : ''
  try {
    const url = new URL(raw)
    const allowed = ['cdninstagram.com', 'fbcdn.net'].some(
      (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
    )
    if (url.protocol !== 'https:' || !allowed) return res.status(400).end()
    const upstream = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })
    if (!upstream.ok || !upstream.body) return res.status(502).end()
    res.setHeader('content-type', upstream.headers.get('content-type') || 'image/jpeg')
    res.setHeader('cache-control', 'public, max-age=3600')
    const bytes = Buffer.from(await upstream.arrayBuffer())
    res.send(bytes)
  } catch {
    res.status(400).end()
  }
})

app.post('/api/photos/remake', async (req, res) => {
  const parsed = z.object({ reelId: z.string().min(1) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'reelId requis' })
  const store = loadStore()
  const hits = scorePhotos(store.reels, 0)
  const reel = hits.find((r) => r.id === parsed.data.reelId)
  if (!reel) return res.status(404).json({ error: 'publication introuvable' })
  try {
    const remake = await generatePhotoRemake(reel, store.profile)
    store.remakes.unshift(remake)
    saveStore(store)
    res.json({ remake, llm: llmProvider() })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'remake failed' })
  }
})

app.post('/api/chat', async (req, res) => {
  const parsed = z.object({ message: z.string().min(1) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'message requis' })
  const text = parsed.data.message.toLowerCase()
  const store = loadStore()
  const hits = scoreReels(store.reels)
  const actions: string[] = []

  try {
    if (
      (text.includes('lance') && text.includes('veille')) ||
      text.includes('lancer une veille') ||
      text === 'veille' ||
      (text.includes('veille') && (text.includes('fais') || text.includes('run')))
    ) {
      if (store.accounts.length === 0) {
        return res.json({
          reply: 'Ajoute au moins un concurrent avant de lancer une veille.',
          actions,
        })
      }
      if (hasApify()) {
        const fetched = await fetchReelsForHandles(store.accounts.map((a) => a.handle))
        const other = store.reels.filter((r) => !store.accounts.some((a) => a.handle === r.handle))
        store.reels = [...other, ...fetched]
        store.lastVeilleMode = 'apify'
      } else {
        store.lastVeilleMode = 'seed'
      }
      store.lastVeilleAt = new Date().toISOString()
      saveStore(store)
      const nextHits = scoreReels(store.reels)
      actions.push('veille_run')
      return res.json({
        reply: `Veille lancée (${store.lastVeilleMode}). ${nextHits.length} exceptions ≥ 2,5×. Top : ${
          nextHits[0]
            ? `@${nextHits[0].handle} ${nextHits[0].score.toFixed(1)}×`
            : 'aucune pour l’instant'
        }.`,
        actions,
        hits: nextHits.slice(0, 8),
      })
    }

    if (text.includes('meilleur') || text.includes('top') || text.includes('palmarès') || text.includes('palmares')) {
      actions.push('show_top')
      const top = hits.slice(0, 5)
      return res.json({
        reply: top.length
          ? `Voici le palmarès :\n${top.map((h, i) => `${i + 1}. @${h.handle} — ${h.score.toFixed(1)}× (${format(h.views)} ${h.metric})`).join('\n')}`
          : 'Pas encore d’exception. Lance une veille d’abord.',
        actions,
        hits: top,
      })
    }

    if (text.includes('accroche') || text.includes('raccourci')) {
      const script = store.scripts[0]
      if (!script) {
        return res.json({
          reply: 'Pas de script encore. Génère-en un depuis Veille, puis redemande « raccourcis mon accroche ».',
          actions,
        })
      }
      const { hook, beats } = await shortenHook(script, writingContext(store))
      script.beats = beats
      saveStore(store)
      actions.push('shorten_hook')
      return res.json({
        reply: `Accroche raccourcie : « ${hook} ». Je l’ai appliquée au script « ${script.title} ».`,
        actions,
        script,
      })
    }

    if (text.includes('découvr') || text.includes('decouvr') || text.includes('suggère') || text.includes('suggere') || text.includes('nouveaux comptes')) {
      const discoveries = await discoverAccounts(
        store.accounts.map((a) => a.handle),
        store.profile,
        writingContext(store),
      )
      store.discoveries = discoveries
      saveStore(store)
      actions.push('discover')
      return res.json({
        reply: discoveries.length
          ? `Voici des comptes à surveiller :\n${discoveries.map((d) => `• @${d.handle} — ${d.reason}`).join('\n')}`
          : 'Aucune suggestion pour l’instant.',
        actions,
        discoveries,
      })
    }

    if (text.includes('transcri') || text.includes('légende') || text.includes('legende')) {
      const top = hits[0]
      if (!top) {
        return res.json({ reply: 'Aucun Reel exceptionnel à transcrire. Lance une veille.', actions })
      }
      const transcription = await transcribeReel(top)
      if (!store.transcriptions) store.transcriptions = []
      store.transcriptions = store.transcriptions.filter((t) => t.reelId !== top.id)
      store.transcriptions.unshift(transcription)
      saveStore(store)
      actions.push('transcribe')
      return res.json({
        reply: `Transcription de @${top.handle} prête (${transcription.source}).\nOCR: ${transcription.ocrText.slice(0, 120) || '—'}\nLégende A: ${transcription.captions.punchy}\nLégende B: ${transcription.captions.soft}`,
        actions,
        transcription,
      })
    }

    if (text.includes('règle') || text.includes('regle') || text.includes('retenir')) {
      const ruleMatch = parsed.data.message.match(/(?:règle|regle|retenir)\s*[:\-]?\s*(.+)$/i)
      const rule = ruleMatch?.[1]?.trim()
      if (!rule || rule.length < 3) {
        return res.json({
          reply: 'Dis-moi la règle à retenir, ex. « retenir : phrases de max 8 mots ».',
          actions,
        })
      }
      if (!store.writingGuide) store.writingGuide = { documents: [], learnedRules: [] }
      store.writingGuide.learnedRules.unshift(rule)
      store.writingGuide.learnedRules = store.writingGuide.learnedRules.slice(0, 40)
      saveStore(store)
      actions.push('remember_rule')
      return res.json({ reply: `Règle retenue pour les prochains scripts : « ${rule} ».`, actions })
    }

    if (text.includes('agenda') || text.includes('calendrier') || text.includes('planifie')) {
      const label =
        parsed.data.message.replace(/^(planifie|ajoute|mets)\s*/i, '').trim() ||
        store.scripts[0]?.title ||
        'Idée Zack'
      const now = new Date()
      store.calendar.push({
        id: `cal-${Date.now()}`,
        day: 0,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        label: label.slice(0, 80),
        status: 'ecrit',
      })
      saveStore(store)
      actions.push('calendar_idea')
      return res.json({
        reply: `Idée « ${label.slice(0, 80)} » ajoutée dans la boîte à idées de l’Agenda — glisse-la sur un jour.`,
        actions,
      })
    }

    res.json({
      reply: `Je peux vraiment agir. Essaie : « lance une veille », « montre-moi les meilleurs », « raccourcis mon accroche », « découvre des comptes », « transcris », « retenir : … », « planifie … ». État : ${store.accounts.length} suivis · ${hits.length} hits · Apify ${hasApify() ? 'ON' : 'OFF'} · LLM ${llmProvider()}.`,
      actions,
    })
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'chat failed',
      reply: err instanceof Error ? err.message : 'chat failed',
    })
  }
})

function format(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(Math.round(n))
}

const distDir = join(root, 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(distDir, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Zack on http://127.0.0.1:${PORT} (app + API)`)
  console.log(`Apify: ${hasApify() ? 'yes' : 'no'} · LLM: ${llmProvider()}`)
  startAutoVeilleLoop()
})
