import cors from 'cors'
import express from 'express'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { fetchReelsForHandles, hasApify } from './apify.ts'
import { loadStore, normalizeHandle, saveStore } from './db.ts'
import { generatePhotoRemake, generateScriptFromReel, hasLLM, llmProvider } from './openai.ts'
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
app.use(express.json({ limit: '1mb' }))

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
  const scored = scoreReels(store.reels)
  res.json({
    accounts: store.accounts,
    hits: scored,
    allCount: store.reels.length,
    lastVeilleAt: store.lastVeilleAt,
    lastVeilleMode: store.lastVeilleMode,
    apify: hasApify(),
    openai: hasLLM(),
    llm: llmProvider(),
    claude: llmProvider() === 'claude',
  })
})

app.post('/api/veille/run', async (req, res) => {
  const store = loadStore()
  if (store.accounts.length === 0) {
    return res.status(400).json({ error: 'ajoute au moins 1 compte' })
  }

  try {
    if (hasApify()) {
      const fetched = await fetchReelsForHandles(store.accounts.map((a) => a.handle))
      // Replace reels for watched handles when Apify returns data
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

    // Without Apify: re-score existing (seed/manual) data so the product stays usable
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

  // If user provides a baseline (audience habituelle), seed 3 synthetic normal reels
  // so the outlier scores correctly even as a first entry.
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
      day: z.number().int().min(1).max(31),
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
    const script = await generateScriptFromReel(reel)
    store.scripts.unshift(script)
    saveStore(store)
    res.json({ script, openai: hasLLM(), llm: llmProvider() })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'script failed' })
  }
})

app.get('/api/photos', (_req, res) => {
  const store = loadStore()
  res.json({ hits: scorePhotos(store.reels), remakes: store.remakes.slice(0, 10) })
})

app.post('/api/photos/remake', async (req, res) => {
  const parsed = z.object({ reelId: z.string().min(1) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'reelId requis' })
  const store = loadStore()
  const hits = scorePhotos(store.reels, 0)
  const reel = hits.find((r) => r.id === parsed.data.reelId)
  if (!reel) return res.status(404).json({ error: 'publication introuvable' })
  try {
    const remake = await generatePhotoRemake(reel)
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
  const llm = llmProvider()

  if (text.includes('veille') || text.includes('lance')) {
    return res.json({
      reply: hasApify()
        ? `Je peux lancer une vraie veille Apify sur ${store.accounts.length} comptes. Clique « Lancer la veille » dans l’onglet Veille.`
        : `Veille locale prête : ${hits.length} exceptions (≥2,5×). Ajoute APIFY_TOKEN pour scraper Instagram automatiquement.`,
    })
  }
  if (text.includes('meilleur') || text.includes('top')) {
    const top = hits[0]
    return res.json({
      reply: top
        ? `Top : @${top.handle} à ${top.score.toFixed(1)}× (${format(top.views)} vues, baseline ${format(top.baseline)}). Génère un script depuis la fiche Veille.`
        : 'Pas encore d’exception. Ajoute des Reels manuellement ou lance une veille.',
    })
  }
  if (text.includes('accroche') || text.includes('script')) {
    return res.json({
      reply:
        llm === 'claude'
          ? 'OK — choisis un Reel dans Veille puis « Générer le script » (Claude branché).'
          : llm === 'openai'
            ? 'OK — choisis un Reel dans Veille puis « Générer le script » (OpenAI branché).'
            : 'Scripts locaux dispo sans clé. Pour Claude, ajoute ANTHROPIC_API_KEY.',
    })
  }
  res.json({
    reply: `Compte : ${store.accounts.length} suivis · ${hits.length} hits viraux · Apify ${hasApify() ? 'ON' : 'OFF'} · LLM ${llm}. Dis « lance une veille », « montre-moi les meilleurs », ou « script ».`,
  })
})

function format(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(Math.round(n))
}

// Serve the built frontend so app + API live on a single stable port.
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
})
