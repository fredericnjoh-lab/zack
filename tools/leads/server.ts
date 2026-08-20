import { askClaudeJson, hasClaude } from '../shared/claude.ts'
import { hasApify, runActor } from '../shared/apify.ts'
import { makeStore } from '../shared/store.ts'
import { createApp, dirOf, listen, route } from '../shared/http.ts'
import { loadEnv } from '../shared/env.ts'

loadEnv()

type Lead = {
  id: string
  nom: string
  categorie?: string
  adresse?: string
  ville?: string
  telephone?: string
  site?: string
  email?: string
  note?: number
  avis?: number
  mapsUrl?: string
  score?: number
  raison?: string
  accroche?: string
  recherche: string
  ajouteLe: string
}

type Job = {
  status: 'idle' | 'running' | 'ok' | 'error'
  etape?: string
  trouves?: number
  error?: string
  startedAt?: string
  finishedAt?: string
}

type Data = { leads: Lead[]; offre: string }

const store = makeStore<Data>('leads', { leads: [], offre: '' })
let job: Job = { status: 'idle' }

const ACTOR = process.env.APIFY_MAPS_ACTOR || 'compass~crawler-google-places'

function str(row: Record<string, unknown>, key: string): string | undefined {
  const value = row[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function num(row: Record<string, unknown>, key: string): number | undefined {
  const value = row[key]
  return typeof value === 'number' ? value : undefined
}

function toLead(row: Record<string, unknown>, recherche: string): Lead | null {
  const nom = str(row, 'title') || str(row, 'name')
  if (!nom) return null

  const emails = row['emails']
  return {
    id: str(row, 'placeId') || `lead-${nom}-${str(row, 'address') || ''}`.slice(0, 120),
    nom,
    categorie: str(row, 'categoryName'),
    adresse: str(row, 'address'),
    ville: str(row, 'city'),
    telephone: str(row, 'phone') || str(row, 'phoneUnformatted'),
    site: str(row, 'website'),
    email: Array.isArray(emails) && typeof emails[0] === 'string' ? emails[0] : undefined,
    note: num(row, 'totalScore'),
    avis: num(row, 'reviewsCount'),
    mapsUrl: str(row, 'url'),
    recherche,
    ajouteLe: new Date().toISOString(),
  }
}

/** Claude note chaque lead sur 100 pour l'offre, et écrit la phrase d'accroche. */
async function scoreBatch(leads: Lead[], offre: string): Promise<void> {
  const notes = await askClaudeJson<{
    scores: { i: number; score: number; raison: string; accroche: string }[]
  }>({
    system: `Tu qualifies des prospects pour un entrepreneur francophone.
Tu es sévère : un score au-dessus de 70 doit se mériter. Pas de flatterie, pas de score par défaut.`,
    maxTokens: 3000,
    temperature: 0.3,
    prompt: `OFFRE DE L'UTILISATEUR : ${offre}

PROSPECTS (index → fiche Google Maps) :
${leads.map((l, i) => `${i}. ${l.nom} — ${l.categorie || 'catégorie inconnue'} — ${l.ville || ''} — note ${l.note ?? '?'}/5 sur ${l.avis ?? 0} avis — site : ${l.site || 'aucun'}`).join('\n')}

Pour chacun : un score de pertinence 0-100 pour CETTE offre, la raison en une phrase, et une accroche personnalisée d'une phrase utilisable en premier message.
Un prospect sans site web, ou avec peu d'avis, n'est pas forcément mauvais : dis pourquoi.

JSON : { "scores": [{ "i": 0, "score": 82, "raison": "...", "accroche": "..." }] }`,
  })

  for (const s of notes.scores || []) {
    const lead = leads[s.i]
    if (!lead) continue
    lead.score = Math.max(0, Math.min(100, Math.round(s.score)))
    lead.raison = s.raison
    lead.accroche = s.accroche
  }
}

/** Le scrape tourne en tâche de fond : une requête HTTP ne survivrait pas à 3 minutes d'attente. */
function startJob(metier: string, ville: string, limit: number, offre: string): void {
  const recherche = `${metier} à ${ville}`
  job = { status: 'running', etape: `Robot Google Maps lancé sur « ${recherche} »…`, startedAt: new Date().toISOString() }

  void (async () => {
    try {
      const rows = await runActor(ACTOR, {
        searchStringsArray: [`${metier} ${ville}`],
        maxCrawledPlacesPerSearch: limit,
        language: 'fr',
        skipClosedPlaces: true,
      })

      const fresh: Lead[] = []
      for (const row of rows) {
        const lead = toLead(row, recherche)
        if (lead) fresh.push(lead)
      }

      job = { ...job, etape: `${fresh.length} fiches récupérées. Qualification par Claude…`, trouves: fresh.length }

      if (offre && hasClaude()) {
        for (let i = 0; i < fresh.length; i += 15) {
          const batch = fresh.slice(i, i + 15)
          try {
            await scoreBatch(batch, offre)
          } catch (err) {
            // Un lot raté ne doit pas jeter les 200 fiches déjà payées.
            console.error('scoring batch failed:', err instanceof Error ? err.message : err)
          }
          job = { ...job, etape: `Qualification ${Math.min(i + 15, fresh.length)}/${fresh.length}…` }
        }
      }

      store.update((d) => {
        const known = new Map(d.leads.map((l) => [l.id, l]))
        for (const lead of fresh) known.set(lead.id, { ...known.get(lead.id), ...lead })
        return { ...d, offre: offre || d.offre, leads: [...known.values()] }
      })

      job = {
        status: 'ok',
        startedAt: job.startedAt,
        finishedAt: new Date().toISOString(),
        trouves: fresh.length,
        etape: `${fresh.length} prospects ajoutés.`,
      }
    } catch (err) {
      job = {
        status: 'error',
        startedAt: job.startedAt,
        finishedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'scrape failed',
      }
    }
  })()
}

const app = createApp(dirOf(import.meta.url), 'leads')

app.post(
  '/api/scrape',
  route(async (req, res) => {
    if (job.status === 'running') throw new Error('Une extraction tourne déjà.')
    if (!hasApify()) throw new Error('APIFY_TOKEN manquant — ajoute-le dans .env puis relance.')

    const metier = `${req.body?.metier || ''}`.trim()
    const ville = `${req.body?.ville || ''}`.trim()
    const offre = `${req.body?.offre || ''}`.trim()
    const limit = Math.min(Math.max(Number(req.body?.limit) || 50, 1), 500)
    if (!metier || !ville) throw new Error('Il me faut au moins un métier et une ville.')

    startJob(metier, ville, limit, offre)
    res.json({ job })
  }),
)

app.get(
  '/api/job',
  route(async (_req, res) => {
    res.json({ job, claude: hasClaude(), apify: hasApify() })
  }),
)

app.get(
  '/api/leads',
  route(async (_req, res) => {
    const { leads, offre } = store.load()
    const sorted = [...leads].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    res.json({ leads: sorted, offre })
  }),
)

/** Export CSV : le pont vers n'importe quel CRM. */
app.get(
  '/api/leads.csv',
  route(async (_req, res) => {
    const cols: (keyof Lead)[] = ['score', 'nom', 'categorie', 'ville', 'telephone', 'email', 'site', 'note', 'avis', 'raison', 'accroche', 'mapsUrl']
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [...store.load().leads].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    const csv = [cols.join(','), ...rows.map((l) => cols.map((c) => cell(l[c])).join(','))].join('\n')

    res.setHeader('content-type', 'text/csv; charset=utf-8')
    res.setHeader('content-disposition', 'attachment; filename="leads.csv"')
    res.send(`﻿${csv}`)
  }),
)

app.delete(
  '/api/leads',
  route(async (_req, res) => {
    store.update((d) => ({ ...d, leads: [] }))
    res.json({ leads: [] })
  }),
)

listen(app, 8802, 'Machine à leads', 'PORT_LEADS')
