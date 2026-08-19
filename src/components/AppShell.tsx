import { useEffect, useState } from 'react'
import { zackApi } from '../lib/api'
import type {
  AutoVeilleSettings,
  CalendarItem,
  DiscoveredAccount,
  GeneratedScript,
  PhotoRemake,
  ProfileAnalysis,
  ScoredReel,
  Transcription,
  VeilleJob,
  WritingGuide,
} from '../types'

type Tab = 'profil' | 'veille' | 'photos' | 'script' | 'calendrier' | 'chat'
type ChatMessage = { from: 'zack' | 'user'; text: string }

type AppShellProps = {
  onBack: () => void
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(Math.round(n))
}

function imageProxy(source?: string): string | undefined {
  if (!source) return undefined
  const params = new URLSearchParams({ url: source })
  return `/api/image?${params.toString()}`
}

export function AppShell({ onBack }: AppShellProps) {
  const [tab, setTab] = useState<Tab>('veille')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: 'zack',
      text: 'Salut — je peux lancer une veille, montrer le top, raccourcir une accroche, découvrir des comptes, transcrire un Reel. Qu’est-ce qu’on fait ?',
    },
  ])
  const [draft, setDraft] = useState('')
  const [hits, setHits] = useState<ScoredReel[]>([])
  const [accounts, setAccounts] = useState<{ handle: string }[]>([])
  const [status, setStatus] = useState({
    apify: false,
    openai: false,
    llm: 'local' as string,
    mode: '',
    notice: '',
  })
  const [script, setScript] = useState<GeneratedScript | null>(null)
  const [calendar, setCalendar] = useState<CalendarItem[]>([])
  const [photoHits, setPhotoHits] = useState<ScoredReel[]>([])
  const [remakes, setRemakes] = useState<Record<string, PhotoRemake>>({})
  const [profile, setProfile] = useState<ProfileAnalysis | null>(null)
  const [writingGuide, setWritingGuide] = useState<WritingGuide>({
    documents: [],
    learnedRules: [],
  })
  const [autoVeille, setAutoVeille] = useState<AutoVeilleSettings>({
    enabled: false,
    hour: 7,
  })
  const [discoveries, setDiscoveries] = useState<DiscoveredAccount[]>([])
  const [transcriptions, setTranscriptions] = useState<Record<string, Transcription>>({})
  const [profileHandle, setProfileHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [waking, setWaking] = useState(false)
  const [job, setJob] = useState<VeilleJob>({ status: 'idle' })
  const [error, setError] = useState('')
  const [handleInput, setHandleInput] = useState('')
  const [manual, setManual] = useState({ handle: '', views: '', caption: '', baseline: '' })

  async function refresh() {
    setWaking(true)
    try {
      const [v, c, s, p, own, tr] = await Promise.all([
        zackApi.veille(),
        zackApi.calendar(),
        zackApi.scripts(),
        zackApi.photos(),
        zackApi.profile(),
        zackApi.transcriptions(),
      ])
      setHits(v.hits)
      setAccounts(v.accounts)
      setStatus({
        apify: v.apify,
        openai: v.openai,
        llm: v.llm || (v.claude ? 'claude' : v.openai ? 'openai' : 'local'),
        mode: v.lastVeilleMode || '',
        notice: '',
      })
      if (v.autoVeille) setAutoVeille(v.autoVeille)
      if (v.job) setJob(v.job)
      setDiscoveries(v.discoveries || [])
      setCalendar(c.items)
      if (s.scripts[0]) setScript(s.scripts[0])
      setPhotoHits(p.hits)
      setProfile(own.profile)
      if (own.writingGuide) setWritingGuide(own.writingGuide)
      if (own.profile) setProfileHandle(own.profile.handle)
      setRemakes((prev) => {
        const next = { ...prev }
        for (const rm of p.remakes) if (!next[rm.sourceReelId]) next[rm.sourceReelId] = rm
        return next
      })
      setTranscriptions(
        Object.fromEntries(tr.transcriptions.map((t) => [t.reelId, t])),
      )
      setError('')
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} — le serveur Render se réveille (30–60 s), réessai auto…`
          : 'API indisponible — réveil Render en cours…',
      )
      // One more delayed retry after cold start
      setTimeout(() => {
        void refreshQuiet()
      }, 8000)
    } finally {
      setWaking(false)
    }
  }

  async function refreshQuiet() {
    try {
      const v = await zackApi.veille()
      setHits(v.hits)
      setAccounts(v.accounts)
      if (v.autoVeille) setAutoVeille(v.autoVeille)
      if (v.job) setJob(v.job)
      setDiscoveries(v.discoveries || [])
      setStatus((s) => ({
        ...s,
        apify: v.apify,
        openai: v.openai,
        llm: v.llm || s.llm,
        mode: v.lastVeilleMode || s.mode,
      }))
      setError('')
    } catch {
      /* keep previous error */
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  // Poll while a background veille is running
  useEffect(() => {
    if (job.status !== 'running') return
    const id = setInterval(() => {
      void (async () => {
        try {
          const { job: next } = await zackApi.veilleJob()
          setJob(next)
          if (next.status === 'ok') {
            await refreshQuiet()
            setStatus((s) => ({ ...s, notice: next.summary || 'Veille terminée.' }))
            setBusy(false)
          }
          if (next.status === 'error') {
            setError(next.error || 'Veille échouée')
            setBusy(false)
          }
        } catch {
          /* ignore transient */
        }
      })()
    }, 2500)
    return () => clearInterval(id)
  }, [job.status])

  async function send() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setMessages((prev) => [...prev, { from: 'user', text }])
    try {
      const result = await zackApi.chat(text)
      setMessages((prev) => [...prev, { from: 'zack', text: result.reply }])
      if (result.hits) setHits(result.hits)
      if (result.script) {
        setScript(result.script)
        setTab('script')
      }
      if (result.discoveries) setDiscoveries(result.discoveries)
      if (result.transcription) {
        setTranscriptions((prev) => ({
          ...prev,
          [result.transcription!.reelId]: result.transcription!,
        }))
      }
      if (result.actions?.includes('calendar_idea') || result.actions?.includes('veille_run')) {
        await refresh()
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: 'zack', text: 'API offline. Relance `npm run dev` dans le dossier zack.' },
      ])
    }
  }

  return (
    <div className="shell">
      <div className="shell-top">
        <div>
          <h1>Zack</h1>
          <p>
            {accounts.length} comptes · {hits.length} exceptions
            {status.apify ? ' · Apify ON' : ' · mode local'}
            {status.openai ? (status.llm === 'claude' ? ' · Claude ON' : ' · LLM ON') : ''}
            {autoVeille.enabled ? ` · auto ${autoVeille.hour}h` : ''}
            {job.status === 'running' ? ' · veille en cours…' : ''}
          </p>
        </div>
        <button type="button" className="cta ghost" onClick={onBack}>
          ← Accueil
        </button>
      </div>

      {(error || waking) && (
        <div className="card" style={{ borderColor: error ? '#fca5a5' : 'var(--line)', marginBottom: 12 }}>
          <strong>{waking && !error ? 'Connexion' : 'API'}</strong>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
            {error || 'Réveil du serveur Render…'}
          </p>
          {error && (
            <button type="button" className="cta ghost" style={{ marginTop: 8 }} onClick={() => void refresh()}>
              Réessayer
            </button>
          )}
        </div>
      )}

      {job.status === 'running' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <strong>Veille en cours</strong>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
            Apify scrape tes comptes (1–3 min). La page se met à jour automatiquement.
          </p>
        </div>
      )}

      <nav className="tabs tabs-6" aria-label="Navigation Zack">
        {(
          [
            ['profil', 'Mon profil'],
            ['veille', 'Veille'],
            ['photos', 'Photos'],
            ['script', 'Script'],
            ['calendrier', 'Agenda'],
            ['chat', 'Parler'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'profil' && (
        <ProfilePanel
          profile={profile}
          writingGuide={writingGuide}
          handle={profileHandle}
          busy={busy}
          onHandle={setProfileHandle}
          onAnalyze={async () => {
            if (!profileHandle.trim()) return
            setBusy(true)
            setError('')
            try {
              const result = await zackApi.analyzeProfile(profileHandle)
              setProfile(result.profile)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'analyse profil échouée')
            } finally {
              setBusy(false)
            }
          }}
          onAddDocument={async (name, content) => {
            setBusy(true)
            try {
              const r = await zackApi.addDocument(name, content)
              setWritingGuide(r.writingGuide)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'upload échoué')
            } finally {
              setBusy(false)
            }
          }}
          onRemoveDocument={async (id) => {
            const r = await zackApi.removeDocument(id)
            setWritingGuide(r.writingGuide)
          }}
          onRememberRule={async (rule) => {
            const r = await zackApi.rememberRule(rule)
            setWritingGuide(r.writingGuide)
            if (r.profile) setProfile(r.profile)
          }}
        />
      )}

      {tab === 'veille' && (
        <VeillePanel
          hits={hits}
          accounts={accounts}
          busy={busy}
          handleInput={handleInput}
          manual={manual}
          notice={status.notice}
          apify={status.apify}
          autoVeille={autoVeille}
          discoveries={discoveries}
          transcriptions={transcriptions}
          onHandleInput={setHandleInput}
          onManual={setManual}
          onAddAccount={async () => {
            if (!handleInput.trim()) return
            setBusy(true)
            try {
              await zackApi.addAccount(handleInput)
              setHandleInput('')
              await refresh()
            } catch (e) {
              setError(e instanceof Error ? e.message : 'erreur')
            } finally {
              setBusy(false)
            }
          }}
          onRemoveAccount={async (handle) => {
            await zackApi.removeAccount(handle)
            await refresh()
          }}
          onRun={async () => {
            setBusy(true)
            setError('')
            try {
              const r = await zackApi.runVeille()
              if (r.job) setJob(r.job)
              setHits(r.hits)
              setStatus((s) => ({ ...s, mode: r.mode, notice: r.notice || '' }))
              if (r.job?.status !== 'running') setBusy(false)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'veille failed')
              setBusy(false)
            }
          }}
          onManualAdd={async () => {
            const views = Number(manual.views)
            const baseline = manual.baseline ? Number(manual.baseline) : undefined
            if (!manual.handle || !views) return
            setBusy(true)
            try {
              const r = await zackApi.addManualReel({
                handle: manual.handle,
                views,
                caption: manual.caption || undefined,
                baseline,
              })
              setHits(r.hits)
              setManual({ handle: '', views: '', caption: '', baseline: '' })
              await refresh()
            } catch (e) {
              setError(e instanceof Error ? e.message : 'erreur')
            } finally {
              setBusy(false)
            }
          }}
          onScript={async (reelId) => {
            setBusy(true)
            try {
              const r = await zackApi.generateScript(reelId)
              setScript(r.script)
              setTab('script')
            } catch (e) {
              setError(e instanceof Error ? e.message : 'script failed')
            } finally {
              setBusy(false)
            }
          }}
          onTranscribe={async (reelId) => {
            setBusy(true)
            try {
              const r = await zackApi.transcribe(reelId)
              setTranscriptions((prev) => ({ ...prev, [reelId]: r.transcription }))
            } catch (e) {
              setError(e instanceof Error ? e.message : 'transcription échouée')
            } finally {
              setBusy(false)
            }
          }}
          onAutoVeille={async (enabled, hour) => {
            const r = await zackApi.setAutoVeille({ enabled, hour })
            setAutoVeille(r.autoVeille)
          }}
          onDiscover={async () => {
            setBusy(true)
            try {
              const r = await zackApi.discover()
              setDiscoveries(r.discoveries)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'découverte échouée')
            } finally {
              setBusy(false)
            }
          }}
          onFollowDiscovery={async (handle) => {
            setBusy(true)
            try {
              await zackApi.addAccount(handle)
              await refresh()
            } catch (e) {
              setError(e instanceof Error ? e.message : 'erreur')
            } finally {
              setBusy(false)
            }
          }}
        />
      )}

      {tab === 'photos' && (
        <PhotosPanel
          hits={photoHits}
          remakes={remakes}
          busy={busy}
          onRemake={async (reelId) => {
            setBusy(true)
            try {
              const r = await zackApi.remakePhoto(reelId)
              setRemakes((prev) => ({ ...prev, [reelId]: r.remake }))
            } catch (e) {
              setError(e instanceof Error ? e.message : 'remake failed')
            } finally {
              setBusy(false)
            }
          }}
        />
      )}

      {tab === 'script' && (
        <ScriptPanel
          script={script}
          busy={busy}
          onShorten={async () => {
            if (!script) return
            setBusy(true)
            try {
              const r = await zackApi.shortenScript(script.id)
              setScript(r.script)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'raccourci échoué')
            } finally {
              setBusy(false)
            }
          }}
          onRememberRule={async (rule) => {
            const r = await zackApi.rememberRule(rule)
            setWritingGuide(r.writingGuide)
            if (r.profile) setProfile(r.profile)
          }}
        />
      )}

      {tab === 'calendrier' && (
        <CalendarPanel
          items={calendar}
          onAdd={async (day, label) => {
            await zackApi.addCalendar({ day, label, status: 'ecrit' })
            const c = await zackApi.calendar()
            setCalendar(c.items)
          }}
          onMove={async (id, day) => {
            const r = await zackApi.patchCalendar(id, { day })
            setCalendar(r.items)
          }}
          onCycleStatus={async (id, status) => {
            const r = await zackApi.patchCalendar(id, { status })
            setCalendar(r.items)
          }}
        />
      )}

      {tab === 'chat' && (
        <section className="panel chat">
          {messages.map((m, i) => (
            <div key={`${m.from}-${i}`} className={`bubble ${m.from}`}>
              {m.text}
            </div>
          ))}
          <div className="chat-input">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="lance une veille…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void send()
              }}
              aria-label="Message à Zack"
            />
            <button type="button" className="cta" onClick={() => void send()}>
              Envoyer
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function ProfilePanel(props: {
  profile: ProfileAnalysis | null
  writingGuide: WritingGuide
  handle: string
  busy: boolean
  onHandle: (value: string) => void
  onAnalyze: () => void
  onAddDocument: (name: string, content: string) => void
  onRemoveDocument: (id: string) => void
  onRememberRule: (rule: string) => void
}) {
  const [docName, setDocName] = useState('')
  const [docContent, setDocContent] = useState('')
  const [ruleDraft, setRuleDraft] = useState('')

  return (
    <section className="panel">
      <div className="card profile-hero">
        <div>
          <span className="eyebrow">Ton ADN de marque</span>
          <h3>Apprends à Zack comment tu communiques</h3>
          <p>
            Zack analyse tes publications, ta voix, tes piliers — et apprend aussi de tes documents
            et des règles que tu retiens.
          </p>
        </div>
        <div className="chat-input">
          <input
            value={props.handle}
            onChange={(e) => props.onHandle(e.target.value)}
            placeholder="@ton_compte_instagram"
            aria-label="Ton profil Instagram"
          />
          <button type="button" className="cta" disabled={props.busy} onClick={props.onAnalyze}>
            {props.busy ? 'Analyse 1–3 min…' : 'Analyser mon profil'}
          </button>
        </div>
      </div>

      <div className="card feature">
        <h3>Ta méthode d’écriture</h3>
        <p style={{ color: 'var(--muted)' }}>
          Dépose un brief, un guide de ton, ou un vieux script. Zack s’en sert pour les prochains.
        </p>
        <div className="manual-grid">
          <input
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="Nom du document"
          />
          <textarea
            className="doc-area"
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            placeholder="Colle ton guide / brief ici…"
            rows={5}
          />
          <button
            type="button"
            className="cta"
            disabled={props.busy || !docName.trim() || docContent.trim().length < 10}
            onClick={() => {
              props.onAddDocument(docName.trim(), docContent.trim())
              setDocName('')
              setDocContent('')
            }}
          >
            Déposer le document
          </button>
        </div>
        {props.writingGuide.documents.length > 0 && (
          <ul className="doc-list">
            {props.writingGuide.documents.map((d) => (
              <li key={d.id}>
                <strong>{d.name}</strong>
                <span>{d.content.slice(0, 80)}…</span>
                <button type="button" className="cta ghost" onClick={() => props.onRemoveDocument(d.id)}>
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="chat-input" style={{ marginTop: 12 }}>
          <input
            value={ruleDraft}
            onChange={(e) => setRuleDraft(e.target.value)}
            placeholder="Règle à retenir (ex. max 8 mots dans l’accroche)"
          />
          <button
            type="button"
            className="cta"
            disabled={!ruleDraft.trim()}
            onClick={() => {
              props.onRememberRule(ruleDraft.trim())
              setRuleDraft('')
            }}
          >
            Retenir
          </button>
        </div>
        {props.writingGuide.learnedRules.length > 0 && (
          <div className="accounts" style={{ marginTop: 10 }}>
            {props.writingGuide.learnedRules.map((rule) => (
              <span className="pill" key={rule}>
                {rule}
              </span>
            ))}
          </div>
        )}
      </div>

      {props.profile && (
        <>
          <div className="metric-row">
            <div className="metric">
              <strong>{props.profile.postsAnalyzed}</strong>
              <span>publications analysées</span>
            </div>
            <div className="metric">
              <strong>{props.profile.pillars.length}</strong>
              <span>piliers éditoriaux</span>
            </div>
            <div className="metric">
              <strong>@{props.profile.handle}</strong>
              <span>profil appris</span>
            </div>
          </div>

          <div className="card feature">
            <h3>Ta voix</h3>
            <p>{props.profile.voice}</p>
            <div className="accounts">
              {props.profile.rules.map((rule) => (
                <span className="pill" key={rule}>
                  {rule}
                </span>
              ))}
            </div>
          </div>

          <div className="profile-grid">
            <div className="card feature">
              <h3>Piliers</h3>
              <ul>
                {props.profile.pillars.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="card feature">
              <h3>Forces</h3>
              <ul>
                {props.profile.strengths.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="card feature">
              <h3>Opportunités</h3>
              <ul>
                {props.profile.opportunities.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="profile-gallery">
            {props.profile.posts.slice(0, 12).map((post) => (
              <a href={post.url} target="_blank" rel="noreferrer" className="profile-post" key={post.id}>
                {post.imageUrl ? (
                  <img src={imageProxy(post.imageUrl)} alt={`Publication @${post.handle}`} loading="lazy" />
                ) : (
                  <span>{post.mediaType === 'carousel' ? '❏' : '▶'}</span>
                )}
                <small>
                  {formatViews(post.views)} {post.mediaType === 'reel' ? 'vues' : 'likes'}
                </small>
              </a>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function VeillePanel(props: {
  hits: ScoredReel[]
  accounts: { handle: string }[]
  busy: boolean
  handleInput: string
  manual: { handle: string; views: string; caption: string; baseline: string }
  notice: string
  apify: boolean
  autoVeille: AutoVeilleSettings
  discoveries: DiscoveredAccount[]
  transcriptions: Record<string, Transcription>
  onHandleInput: (v: string) => void
  onManual: (v: { handle: string; views: string; caption: string; baseline: string }) => void
  onAddAccount: () => void
  onRemoveAccount: (handle: string) => void
  onRun: () => void
  onManualAdd: () => void
  onScript: (reelId: string) => void
  onTranscribe: (reelId: string) => void
  onAutoVeille: (enabled: boolean, hour: number) => void
  onDiscover: () => void
  onFollowDiscovery: (handle: string) => void
}) {
  return (
    <section className="panel">
      <div className="metric-row">
        <div className="metric">
          <strong>{props.accounts.length}</strong>
          <span>comptes suivis</span>
        </div>
        <div className="metric">
          <strong>{props.hits.length}</strong>
          <span>exceptions ≥ 2,5×</span>
        </div>
        <div className="metric">
          <strong>{props.hits[0] ? `${props.hits[0].score.toFixed(1)}×` : '—'}</strong>
          <span>meilleur score</span>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Tes concurrents</h3>
        <div className="chat-input" style={{ marginBottom: 10 }}>
          <input
            value={props.handleInput}
            onChange={(e) => props.onHandleInput(e.target.value)}
            placeholder="@compte_instagram"
            aria-label="Ajouter un compte"
          />
          <button type="button" className="cta" disabled={props.busy} onClick={props.onAddAccount}>
            Ajouter
          </button>
        </div>
        <div className="accounts">
          {props.accounts.map((a) => (
            <button
              type="button"
              className="pill"
              key={a.handle}
              title="Retirer"
              onClick={() => props.onRemoveAccount(a.handle)}
            >
              @{a.handle} ×
            </button>
          ))}
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="cta" disabled={props.busy} onClick={props.onRun}>
            {props.busy ? 'Veille…' : props.apify ? 'Lancer la veille Apify' : 'Recalculer la veille'}
          </button>
          <button type="button" className="cta ghost" disabled={props.busy} onClick={props.onDiscover}>
            Découvrir des comptes
          </button>
        </div>
        {props.notice && (
          <p style={{ color: 'var(--muted)', marginBottom: 0, marginTop: 10 }}>{props.notice}</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Veille automatique</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Active ici + le cron GitHub (chaque matin ~7h Paris). Zack réveille Render et lance la
          veille tout seul — plus besoin de cliquer.
        </p>
        <div className="manual-grid auto-veille-row">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={props.autoVeille.enabled}
              onChange={(e) => props.onAutoVeille(e.target.checked, props.autoVeille.hour)}
            />
            Activer
          </label>
          <label>
            Heure{' '}
            <select
              value={props.autoVeille.hour}
              onChange={(e) => props.onAutoVeille(props.autoVeille.enabled, Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>
        </div>
        {props.autoVeille.lastPalmaresSummary && (
          <p style={{ color: 'var(--muted)', marginBottom: 0 }}>{props.autoVeille.lastPalmaresSummary}</p>
        )}
      </div>

      {props.discoveries.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Découverte de comptes</h3>
          {props.discoveries.map((d) => (
            <div className="discovery-row" key={d.handle}>
              <div>
                <strong>@{d.handle}</strong>
                {d.verified && <span className="pill">vérifié</span>}
                <p style={{ margin: '4px 0', color: 'var(--muted)' }}>{d.reason}</p>
                <small>
                  {d.nicheFit}
                  {d.estimatedFollowers ? ` · ~${d.estimatedFollowers}` : ''}
                  {d.sampleViews ? ` · sample ${formatViews(d.sampleViews)}` : ''}
                </small>
              </div>
              <button
                type="button"
                className="cta ghost"
                disabled={props.busy || props.accounts.some((a) => a.handle === d.handle)}
                onClick={() => props.onFollowDiscovery(d.handle)}
              >
                Suivre
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Ajouter un Reel à la main</h3>
        <div className="manual-grid">
          <input
            value={props.manual.handle}
            onChange={(e) => props.onManual({ ...props.manual, handle: e.target.value })}
            placeholder="@compte"
          />
          <input
            value={props.manual.views}
            onChange={(e) => props.onManual({ ...props.manual, views: e.target.value })}
            placeholder="vues (ex 842000)"
            inputMode="numeric"
          />
          <input
            value={props.manual.baseline}
            onChange={(e) => props.onManual({ ...props.manual, baseline: e.target.value })}
            placeholder="baseline habituelle (ex 38000)"
            inputMode="numeric"
          />
          <input
            value={props.manual.caption}
            onChange={(e) => props.onManual({ ...props.manual, caption: e.target.value })}
            placeholder="accroche / caption"
          />
          <button type="button" className="cta" disabled={props.busy} onClick={props.onManualAdd}>
            Enregistrer
          </button>
        </div>
      </div>

      {props.hits.map((reel) => {
        const tr = props.transcriptions[reel.id]
        return (
          <article className="reel" key={reel.id}>
            <div className="thumb media-thumb">
              {reel.imageUrl ? (
                <img src={imageProxy(reel.imageUrl)} alt={`Miniature @${reel.handle}`} loading="lazy" />
              ) : null}
              <span>{formatViews(reel.views)}</span>
            </div>
            <div>
              <h4>{reel.caption || 'Reel sans caption'}</h4>
              <p>
                @{reel.handle} · baseline {formatViews(reel.baseline)}
              </p>
              <p>{reel.why}</p>
              {tr && (
                <div className="tr-box">
                  <strong>Transcription ({tr.source})</strong>
                  <p>{tr.fullTranscript.slice(0, 220)}</p>
                  <p>
                    <em>A:</em> {tr.captions.punchy}
                  </p>
                  <p>
                    <em>B:</em> {tr.captions.soft}
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <button
                  type="button"
                  className="cta ghost"
                  disabled={props.busy}
                  onClick={() => props.onTranscribe(reel.id)}
                >
                  Transcrire + légendes
                </button>
                <button
                  type="button"
                  className="cta ghost"
                  disabled={props.busy}
                  onClick={() => props.onScript(reel.id)}
                >
                  Générer le script →
                </button>
              </div>
            </div>
            <div className="score">
              <strong>{reel.score.toFixed(1)}×</strong>
              <span>score viral</span>
            </div>
          </article>
        )
      })}
    </section>
  )
}

function PhotosPanel(props: {
  hits: ScoredReel[]
  remakes: Record<string, PhotoRemake>
  busy: boolean
  onRemake: (reelId: string) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [mode, setMode] = useState<Record<string, 'identical' | 'inVoice'>>({})

  return (
    <section className="panel">
      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Photos & carrousels</h3>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Pas que les Reels. Zack sort le meilleur des publications photo, t’explique pourquoi ça a
          marché, puis le refait : à l’identique ou réécrit dans ta voix.
        </p>
      </div>

      {props.hits.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Aucune photo/carrousel exceptionnel pour l’instant. Lance une veille Apify.
          </p>
        </div>
      )}

      {props.hits.map((post) => {
        const remake = props.remakes[post.id]
        const chosen = mode[post.id] || 'identical'
        const variant = remake ? remake[chosen] : null
        return (
          <article className="reel photo" key={post.id}>
            <div className="thumb photo-thumb media-thumb">
              {post.imageUrl ? (
                <img src={imageProxy(post.imageUrl)} alt={`Publication @${post.handle}`} loading="lazy" />
              ) : (
                <b>{post.mediaType === 'carousel' ? '❏' : '▢'}</b>
              )}
              <span>{formatViews(post.views)}</span>
            </div>
            <div style={{ gridColumn: '2 / -1' }}>
              <h4>{post.caption || 'Publication sans légende'}</h4>
              <p>
                @{post.handle} · {post.mediaType === 'carousel' ? 'carrousel' : 'photo'} · baseline{' '}
                {formatViews(post.baseline)} likes
              </p>
              <p>
                <strong style={{ color: 'var(--blue)' }}>{post.score.toFixed(1)}×</strong> {post.why}
              </p>

              {!remake && (
                <button
                  type="button"
                  className="cta"
                  style={{ marginTop: 8 }}
                  disabled={props.busy}
                  onClick={() => {
                    setOpenId(post.id)
                    props.onRemake(post.id)
                  }}
                >
                  {props.busy && openId === post.id ? 'Zack analyse…' : 'Refaire cette publication'}
                </button>
              )}

              {remake && (
                <div className="remake">
                  <div className="remake-why">
                    <strong>Pourquoi ça marche</strong>
                    <p>{remake.why}</p>
                  </div>
                  <div className="seg">
                    <button
                      type="button"
                      className={`seg-btn${chosen === 'identical' ? ' active' : ''}`}
                      onClick={() => setMode((m) => ({ ...m, [post.id]: 'identical' }))}
                    >
                      À l’identique
                    </button>
                    <button
                      type="button"
                      className={`seg-btn${chosen === 'inVoice' ? ' active' : ''}`}
                      onClick={() => setMode((m) => ({ ...m, [post.id]: 'inVoice' }))}
                    >
                      Dans ma voix
                    </button>
                  </div>
                  {variant && (
                    <div className="remake-body">
                      <label>Légende</label>
                      <p className="remake-caption">{variant.caption}</p>
                      {variant.shotList?.length > 0 && (
                        <>
                          <label>Plan de tournage</label>
                          <ul>
                            {variant.shotList.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      {variant.hashtags?.length > 0 && (
                        <p className="remake-tags">{variant.hashtags.join(' ')}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}

function ScriptPanel({
  script,
  busy,
  onShorten,
  onRememberRule,
}: {
  script: GeneratedScript | null
  busy: boolean
  onShorten: () => void
  onRememberRule: (rule: string) => void
}) {
  const [ruleDraft, setRuleDraft] = useState('')

  if (!script) {
    return (
      <section className="panel">
        <div className="card">
          <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Pas encore de script</h3>
          <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
            Depuis Veille, clique « Générer le script » sur une exception.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="panel">
      <article className="script">
        <h3>{script.title}</h3>
        <p className="meta">
          Généré {new Date(script.createdAt).toLocaleString('fr-FR')} · {script.beats.length} beats
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" className="cta ghost" disabled={busy} onClick={onShorten}>
            Raccourcir l’accroche
          </button>
        </div>
        {script.beats.map((beat) => (
          <div className="beat" key={`${beat.time}-${beat.subtitle}`}>
            <time>{beat.time}</time>
            <div>
              <strong>{beat.tone}</strong>
              <p>{beat.line}</p>
              <p>Sous-titre : « {beat.subtitle} »</p>
            </div>
          </div>
        ))}
      </article>
      <div className="card feature">
        <h3>Légendes</h3>
        <p>
          <strong>A — punchy :</strong> {script.captions.punchy}
        </p>
        <p>
          <strong>B — soft :</strong> {script.captions.soft}
        </p>
      </div>
      <div className="card feature">
        <h3>Retenir une règle</h3>
        <p style={{ color: 'var(--muted)' }}>
          Tu corriges un script ? Zack peut retenir la règle pour tous les suivants.
        </p>
        <div className="chat-input">
          <input
            value={ruleDraft}
            onChange={(e) => setRuleDraft(e.target.value)}
            placeholder="ex. toujours commencer par une question"
          />
          <button
            type="button"
            className="cta"
            disabled={!ruleDraft.trim()}
            onClick={() => {
              onRememberRule(ruleDraft.trim())
              setRuleDraft('')
            }}
          >
            Retenir
          </button>
        </div>
      </div>
    </section>
  )
}

function CalendarPanel({
  items,
  onAdd,
  onMove,
  onCycleStatus,
}: {
  items: CalendarItem[]
  onAdd: (day: number, label: string) => void
  onMove: (id: string, day: number) => void
  onCycleStatus: (id: string, status: CalendarItem['status']) => void
}) {
  const [label, setLabel] = useState('')
  const now = new Date()
  const year = items.find((c) => c.day > 0)?.year ?? now.getFullYear()
  const month = items.find((c) => c.day > 0)?.month ?? now.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const inbox = items.filter((c) => c.day === 0)
  const byDay = new Map<number, CalendarItem[]>()
  for (const item of items.filter((c) => c.month === month && c.day > 0)) {
    const list = byDay.get(item.day) || []
    list.push(item)
    byDay.set(item.day, list)
  }

  const nextStatus = (s: CalendarItem['status']): CalendarItem['status'] =>
    s === 'ecrit' ? 'tourne' : s === 'tourne' ? 'publie' : 'ecrit'

  return (
    <section className="panel calendar">
      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Boîte à idées</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Ajoute une idée, puis glisse-la sur un jour. Clique une puce pour cycle écrit → tourné → publié.
        </p>
        <div className="manual-grid" style={{ marginBottom: 12 }}>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="idée / titre" />
          <button
            type="button"
            className="cta"
            onClick={() => {
              if (!label.trim()) return
              onAdd(0, label.trim())
              setLabel('')
            }}
          >
            Ajouter à la boîte
          </button>
        </div>
        <div className="idea-bank">
          {inbox.length === 0 && <span style={{ color: 'var(--muted)' }}>Aucune idée en attente</span>}
          {inbox.map((item) => (
            <span
              key={item.id}
              className={`chip ${item.status} draggable`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', item.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onClick={() => onCycleStatus(item.id, nextStatus(item.status))}
              title="Glisser sur un jour · clic = changer statut"
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>
          {String(month).padStart(2, '0')}/{year}
        </h3>
        <div className="weekdays">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>
        <div className="days" style={{ marginTop: 8 }}>
          {days.map((d) => {
            const dayItems = byDay.get(d) || []
            return (
              <div
                className="day droppable"
                key={d}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('text/plain')
                  if (id) onMove(id, d)
                }}
              >
                <span className="n">{d}</span>
                {dayItems.map((item) => (
                  <span
                    key={item.id}
                    className={`chip ${item.status} draggable`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', item.id)
                    }}
                    onClick={() => onCycleStatus(item.id, nextStatus(item.status))}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
