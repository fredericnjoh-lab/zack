import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, normalize, sep } from 'node:path'
import { askClaudeJson, hasClaude } from '../shared/claude.ts'
import { makeStore } from '../shared/store.ts'
import { createApp, dirOf, listen, route } from '../shared/http.ts'
import { loadEnv } from '../shared/env.ts'

loadEnv()

type Plan = {
  nom: string
  slug: string
  pitch: string
  plusPetiteVersion: string
  donnees: string[]
  ecrans: string[]
  routes: string[]
  aPlusTard: string[]
}

type Projet = { slug: string; nom: string; pitch: string; fichiers: string[]; creeLe: string }
type Data = { projets: Projet[] }

const here = dirOf(import.meta.url)
const generatedDir = join(here, 'generated')
const store = makeStore<Data>('builder', { projets: [] })

const SYSTEM = `Tu es l'associé technique d'un entrepreneur francophone qui ne sait pas coder.
Tu ne lui vends pas le logiciel de ses rêves : tu lui livres la plus petite version qui lui fait gagner sa première heure.
Tu parles en français, sans jargon, et tu assumes des choix à sa place plutôt que de lui poser des questions techniques.`

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** Le modèle propose les chemins : on n'accepte qu'un chemin relatif simple. */
function safeRelative(path: string): boolean {
  if (!path || path.length > 120) return false
  if (path.startsWith('/') || path.startsWith('\\') || /^[a-zA-Z]:/.test(path)) return false
  if (!/^[a-zA-Z0-9._/-]+$/.test(path)) return false
  return !path.split('/').includes('..')
}

/** Le contrat que le code généré doit respecter pour démarrer du premier coup. */
const CONTRAT = `Le fichier server.ts généré tourne dans un repo qui a DÉJÀ express, zod et tsx installés.
Il est placé dans tools/builder/generated/<slug>/server.ts et doit utiliser EXACTEMENT ces briques maison :

import { askClaudeJson, askClaude, hasClaude } from '../../../shared/claude.ts'
import { makeStore } from '../../../shared/store.ts'
import { createApp, dirOf, listen, route } from '../../../shared/http.ts'

- createApp(dirOf(import.meta.url), '<slug>') → une app Express qui sert déjà ./public en statique et expose /api/health.
- makeStore<T>('<slug>', seed) → { load(), save(v), update(fn) } : un fichier JSON, rien d'autre.
- route(async (req, res) => { ... }) → enveloppe chaque handler ; un throw devient un message d'erreur lisible.
- askClaudeJson<T>({ system, prompt, maxTokens, temperature }) → appelle Claude et renvoie du JSON parsé.
- listen(app, 8810, '<Nom>') → dernière ligne du fichier.

Contraintes :
- TypeScript ESM, imports avec l'extension .ts, jamais de require, jamais de dépendance externe nouvelle.
- public/index.html est une seule page autonome : HTML + CSS + JS vanilla dans le fichier, aucun CDN, aucun build.
- Thème sombre : fond #0b0d12, panneaux #131720, bordures #262d3b, texte #e8ecf4, accent #ff5c39.
- Toute l'interface est en français et s'adresse à quelqu'un qui ne code pas.
- Le code doit tourner tel quel : pas de TODO, pas de fonction laissée vide.`

const app = createApp(here, 'builder')

/** Étape 1 : ne pas écrire une ligne avant d'avoir compris la douleur. */
app.post(
  '/api/questions',
  route(async (req, res) => {
    const metier = `${req.body?.metier || ''}`.trim()
    const douleur = `${req.body?.douleur || ''}`.trim()
    const methode = `${req.body?.methode || ''}`.trim()
    if (!metier || !douleur) throw new Error('Dis-moi au moins ton métier et ce qui te fait perdre du temps.')

    const out = await askClaudeJson<{ questions: string[] }>({
      system: SYSTEM,
      maxTokens: 800,
      temperature: 0.5,
      prompt: `Métier : ${metier}
Ce qui lui fait perdre du temps : ${douleur}
Comment il s'y prend aujourd'hui : ${methode || '(non précisé)'}

Pose 5 questions courtes, en français simple, dont les réponses changeraient vraiment l'outil à construire.
Interdit : questions techniques (base de données, hébergement, framework) — tu décides à sa place.
Autorisé : volume, fréquence, qui s'en sert, ce qui doit sortir à la fin, ce qui existe déjà.

JSON : { "questions": ["...", "...", "...", "...", "..."] }`,
    })
    res.json({ questions: out.questions?.slice(0, 5) || [] })
  }),
)

/** Étape 2 : la plus petite version utile, écrite noir sur blanc avant de coder. */
app.post(
  '/api/plan',
  route(async (req, res) => {
    const brief = `${req.body?.brief || ''}`.trim()
    const reponses = `${req.body?.reponses || ''}`.trim()
    if (!brief) throw new Error('Il me faut le brief de départ.')

    const plan = await askClaudeJson<Plan>({
      system: SYSTEM,
      maxTokens: 2000,
      temperature: 0.4,
      prompt: `BRIEF :
${brief}
${reponses ? `\nRÉPONSES AUX QUESTIONS :\n${reponses}` : ''}

Propose la PLUS PETITE version utile de l'outil : un seul écran, une seule chose qu'il fait vraiment bien.
Tout ce qui est tentant mais pas indispensable part dans "aPlusTard".

JSON :
{
  "nom": "nom court de l'outil",
  "slug": "nom-en-minuscules-avec-tirets",
  "pitch": "une phrase : ce que l'outil fait, pour qui",
  "plusPetiteVersion": "3 phrases : ce qu'on construit maintenant, et ce que ça lui fait gagner dès demain",
  "donnees": ["les 3 à 6 informations que l'outil stocke"],
  "ecrans": ["ce qu'on voit à l'écran, bloc par bloc"],
  "routes": ["POST /api/... — ce que ça fait"],
  "aPlusTard": ["ce qu'on ajoutera une fois que la V1 sert vraiment"]
}`,
    })

    plan.slug = slugify(plan.slug || plan.nom || 'mon-outil') || 'mon-outil'
    res.json({ plan })
  }),
)

/** Étape 3 : le plan devient des fichiers sur le disque. */
app.post(
  '/api/generate',
  route(async (req, res) => {
    const plan = req.body?.plan as Plan | undefined
    if (!plan?.nom) throw new Error("Génère d'abord un plan.")

    const slug = slugify(plan.slug || plan.nom)
    if (!slug) throw new Error('Nom de projet invalide.')

    const out = await askClaudeJson<{ fichiers: { chemin: string; contenu: string }[] }>({
      system: SYSTEM,
      maxTokens: 16000,
      temperature: 0.3,
      prompt: `${CONTRAT}

OUTIL À ÉCRIRE
Nom : ${plan.nom}
Slug : ${slug}
Pitch : ${plan.pitch}
Version à livrer : ${plan.plusPetiteVersion}
Données stockées : ${(plan.donnees || []).join(' · ')}
Écrans : ${(plan.ecrans || []).join(' · ')}
Routes : ${(plan.routes || []).join(' · ')}

Écris exactement 3 fichiers, complets, sans abréviation ni "...":
1. "server.ts"
2. "public/index.html"
3. "README.md" — en français, pour quelqu'un qui ne code pas : à quoi sert l'outil, comment le lancer (npx tsx tools/builder/generated/${slug}/server.ts), quelle clé mettre dans .env, et les 3 premières améliorations à demander à Claude Code.

JSON : { "fichiers": [{ "chemin": "server.ts", "contenu": "..." }] }`,
    })

    const projectDir = join(generatedDir, slug)
    const written: string[] = []

    for (const file of out.fichiers || []) {
      if (typeof file.contenu !== 'string' || !file.contenu.trim()) continue
      // Un chemin douteux est rejeté, jamais réécrit : on n'écrit que sous projectDir.
      if (!safeRelative(`${file.chemin || ''}`)) continue

      const relative = normalize(`${file.chemin}`)
      const target = join(projectDir, relative)
      if (!target.startsWith(projectDir + sep)) continue

      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, file.contenu)
      written.push(relative)
    }

    if (written.length === 0) throw new Error("Claude n'a renvoyé aucun fichier exploitable. Relance la génération.")

    const projet: Projet = {
      slug,
      nom: plan.nom,
      pitch: plan.pitch,
      fichiers: written,
      creeLe: new Date().toISOString(),
    }
    store.update((d) => ({ projets: [projet, ...d.projets.filter((p) => p.slug !== slug)] }))

    res.json({ projet, commande: `npx tsx tools/builder/generated/${slug}/server.ts` })
  }),
)

app.get(
  '/api/projects',
  route(async (_req, res) => {
    res.json({ projets: store.load().projets, claude: hasClaude() })
  }),
)

app.get(
  '/api/projects/:slug',
  route(async (req, res) => {
    const slug = slugify(req.params.slug)
    const projectDir = join(generatedDir, slug)
    if (!slug || !projectDir.startsWith(generatedDir)) throw new Error('Projet inconnu.')

    let entries: string[]
    try {
      entries = readdirSync(projectDir, { recursive: true }) as string[]
    } catch {
      throw new Error('Projet introuvable sur le disque.')
    }

    const fichiers = entries
      .filter((name) => statSync(join(projectDir, name)).isFile())
      .map((name) => ({ chemin: name, contenu: readFileSync(join(projectDir, name), 'utf8') }))

    res.json({ slug, fichiers, commande: `npx tsx tools/builder/generated/${slug}/server.ts` })
  }),
)

listen(app, 8803, "Générateur d'outils", 'PORT_BUILDER')
