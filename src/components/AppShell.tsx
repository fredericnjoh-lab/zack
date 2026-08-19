import { useEffect, useState } from 'react'
import { zackApi } from '../lib/api'
import { dict, type Lang } from '../lib/i18n'
import { LangToggle } from './StickyHeader'
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
type AppCopy = (typeof dict)['fr']['app']

type AppShellProps = {
  onBack: () => void
  lang: Lang
  onLang: (lang: Lang) => void
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

export function AppShell({ onBack, lang, onLang }: AppShellProps) {
  const t = dict[lang]
  const c = t.app
  const [tab, setTab] = useState<Tab>('veille')
  const [messages, setMessages] = useState<ChatMessage[]>([])
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

  // The greeting follows the active language until the user starts talking.
  useEffect(() => {
    setMessages((prev) => (prev.length > 1 ? prev : [{ from: 'zack', text: c.chatGreeting }]))
  }, [c.chatGreeting])

  async function refresh() {
    setWaking(true)
    try {
      const [v, cal, s, p, own, tr] = await Promise.all([
        zackApi.veille(lang),
        zackApi.calendar(),
        zackApi.scripts(),
        zackApi.photos(lang),
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
      setCalendar(cal.items)
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
      setTranscriptions(Object.fromEntries(tr.transcriptions.map((item) => [item.reelId, item])))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? c.coldStart(e.message) : c.apiDown)
      setTimeout(() => {
        void refreshQuiet()
      }, 8000)
    } finally {
      setWaking(false)
    }
  }

  async function refreshQuiet() {
    try {
      const v = await zackApi.veille(lang)
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
  }, [lang])

  useEffect(() => {
    if (job.status !== 'running') return
    const id = setInterval(() => {
      void (async () => {
        try {
          const { job: next } = await zackApi.veilleJob()
          setJob(next)
          if (next.status === 'ok') {
            await refreshQuiet()
            setStatus((s) => ({ ...s, notice: next.summary || c.veilleDone }))
            setBusy(false)
          }
          if (next.status === 'error') {
            setError(next.error || c.veilleFailed)
            setBusy(false)
          }
        } catch {
          /* ignore transient */
        }
      })()
    }, 2500)
    return () => clearInterval(id)
  }, [job.status, c.veilleDone, c.veilleFailed])

  async function send() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setMessages((prev) => [...prev, { from: 'user', text }])
    try {
      const result = await zackApi.chat(text, lang)
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
      setMessages((prev) => [...prev, { from: 'zack', text: c.apiOffline }])
    }
  }

  return (
    <div className="shell">
      <div className="shell-top">
        <div>
          <h1>Zack</h1>
          <p>
            {accounts.length} {c.brands} · {hits.length} {c.outliers}
            {status.apify ? ' · Apify ON' : ` · ${c.localMode}`}
            {status.openai ? (status.llm === 'claude' ? ' · Claude ON' : ' · LLM ON') : ''}
            {autoVeille.enabled ? ` · auto ${autoVeille.hour}h` : ''}
            {job.status === 'running' ? ` · ${c.scanning}` : ''}
          </p>
        </div>
        <div className="header-actions">
          <LangToggle lang={lang} onLang={onLang} />
          <button type="button" className="cta ghost" onClick={onBack}>
            {t.back}
          </button>
        </div>
      </div>

      {(error || waking) && (
        <div className="card" style={{ borderColor: error ? '#fca5a5' : 'var(--line)', marginBottom: 12 }}>
          <strong>{waking && !error ? c.connection : c.api}</strong>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{error || c.wakingUp}</p>
          {error && (
            <button
              type="button"
              className="cta ghost"
              style={{ marginTop: 8 }}
              onClick={() => void refresh()}
            >
              {c.retry}
            </button>
          )}
        </div>
      )}

      {job.status === 'running' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <strong>{c.jobRunningTitle}</strong>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{c.jobRunningBody}</p>
        </div>
      )}

      <nav className="tabs tabs-6" aria-label="Zack">
        {(
          [
            ['profil', t.tabs.profil],
            ['veille', t.tabs.veille],
            ['photos', t.tabs.photos],
            ['script', t.tabs.script],
            ['calendrier', t.tabs.calendrier],
            ['chat', t.tabs.chat],
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
          c={c}
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
              setError(e instanceof Error ? e.message : c.errProfile)
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
              setError(e instanceof Error ? e.message : c.errUpload)
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
          c={c}
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
              setError(e instanceof Error ? e.message : c.errGeneric)
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
              setError(e instanceof Error ? e.message : c.errVeille)
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
              setError(e instanceof Error ? e.message : c.errGeneric)
            } finally {
              setBusy(false)
            }
          }}
          onScript={async (reelId) => {
            setBusy(true)
            try {
              const r = await zackApi.generateScript(reelId, lang)
              setScript(r.script)
              setTab('script')
            } catch (e) {
              setError(e instanceof Error ? e.message : c.errScript)
            } finally {
              setBusy(false)
            }
          }}
          onTranscribe={async (reelId) => {
            setBusy(true)
            try {
              const r = await zackApi.transcribe(reelId, lang)
              setTranscriptions((prev) => ({ ...prev, [reelId]: r.transcription }))
            } catch (e) {
              setError(e instanceof Error ? e.message : c.errTranscribe)
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
              const r = await zackApi.discover(lang)
              setDiscoveries(r.discoveries)
            } catch (e) {
              setError(e instanceof Error ? e.message : c.errDiscover)
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
              setError(e instanceof Error ? e.message : c.errGeneric)
            } finally {
              setBusy(false)
            }
          }}
        />
      )}

      {tab === 'photos' && (
        <PhotosPanel
          c={c}
          hits={photoHits}
          remakes={remakes}
          busy={busy}
          onRemake={async (reelId) => {
            setBusy(true)
            try {
              const r = await zackApi.remakePhoto(reelId, lang)
              setRemakes((prev) => ({ ...prev, [reelId]: r.remake }))
            } catch (e) {
              setError(e instanceof Error ? e.message : c.errRemake)
            } finally {
              setBusy(false)
            }
          }}
        />
      )}

      {tab === 'script' && (
        <ScriptPanel
          c={c}
          script={script}
          busy={busy}
          onShorten={async () => {
            if (!script) return
            setBusy(true)
            try {
              const r = await zackApi.shortenScript(script.id, lang)
              setScript(r.script)
            } catch (e) {
              setError(e instanceof Error ? e.message : c.errShorten)
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
          c={c}
          items={calendar}
          onAdd={async (day, label) => {
            await zackApi.addCalendar({ day, label, status: 'ecrit' })
            const cal = await zackApi.calendar()
            setCalendar(cal.items)
          }}
          onMove={async (id, day) => {
            const r = await zackApi.patchCalendar(id, { day })
            setCalendar(r.items)
          }}
          onCycleStatus={async (id, itemStatus) => {
            const r = await zackApi.patchCalendar(id, { status: itemStatus })
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
              placeholder={c.chatPlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void send()
              }}
              aria-label={c.chatAria}
            />
            <button type="button" className="cta" onClick={() => void send()}>
              {c.chatSend}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function ProfilePanel(props: {
  c: AppCopy
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
  const { c } = props
  const [docName, setDocName] = useState('')
  const [docContent, setDocContent] = useState('')
  const [ruleDraft, setRuleDraft] = useState('')

  return (
    <section className="panel">
      <div className="card profile-hero">
        <div>
          <span className="eyebrow">{c.dnaKicker}</span>
          <h3>{c.dnaTitle}</h3>
          <p>{c.dnaBody}</p>
        </div>
        <div className="chat-input">
          <input
            value={props.handle}
            onChange={(e) => props.onHandle(e.target.value)}
            placeholder={c.handlePlaceholder}
            aria-label={c.handleAria}
          />
          <button type="button" className="cta" disabled={props.busy} onClick={props.onAnalyze}>
            {props.busy ? c.analyzing : c.analyze}
          </button>
        </div>
      </div>

      <div className="card feature">
        <h3>{c.methodTitle}</h3>
        <p style={{ color: 'var(--muted)' }}>{c.methodBody}</p>
        <div className="manual-grid">
          <input
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder={c.docNamePlaceholder}
          />
          <textarea
            className="doc-area"
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            placeholder={c.docContentPlaceholder}
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
            {c.docSubmit}
          </button>
        </div>
        {props.writingGuide.documents.length > 0 && (
          <ul className="doc-list">
            {props.writingGuide.documents.map((d) => (
              <li key={d.id}>
                <strong>{d.name}</strong>
                <span>{d.content.slice(0, 80)}…</span>
                <button type="button" className="cta ghost" onClick={() => props.onRemoveDocument(d.id)}>
                  {c.remove}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="chat-input" style={{ marginTop: 12 }}>
          <input
            value={ruleDraft}
            onChange={(e) => setRuleDraft(e.target.value)}
            placeholder={c.rulePlaceholder}
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
            {c.remember}
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
              <span>{c.postsAnalyzed}</span>
            </div>
            <div className="metric">
              <strong>{props.profile.pillars.length}</strong>
              <span>{c.pillarsCount}</span>
            </div>
            <div className="metric">
              <strong>@{props.profile.handle}</strong>
              <span>{c.profileLearned}</span>
            </div>
          </div>

          <div className="card feature">
            <h3>{c.yourVoice}</h3>
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
              <h3>{c.pillars}</h3>
              <ul>
                {props.profile.pillars.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="card feature">
              <h3>{c.strengths}</h3>
              <ul>
                {props.profile.strengths.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="card feature">
              <h3>{c.opportunities}</h3>
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
                  <img src={imageProxy(post.imageUrl)} alt={c.postAlt(post.handle)} loading="lazy" />
                ) : (
                  <span>{post.mediaType === 'carousel' ? '❏' : '▶'}</span>
                )}
                <small>
                  {formatViews(post.views)} {post.mediaType === 'reel' ? c.views : c.likes}
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
  c: AppCopy
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
  const { c } = props

  return (
    <section className="panel">
      <div className="metric-row">
        <div className="metric">
          <strong>{props.accounts.length}</strong>
          <span>{c.followed}</span>
        </div>
        <div className="metric">
          <strong>{props.hits.length}</strong>
          <span>{c.outliersThreshold}</span>
        </div>
        <div className="metric">
          <strong>{props.hits[0] ? `${props.hits[0].score.toFixed(1)}×` : '—'}</strong>
          <span>{c.bestScore}</span>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>{c.competitorsTitle}</h3>
        <div className="chat-input" style={{ marginBottom: 10 }}>
          <input
            value={props.handleInput}
            onChange={(e) => props.onHandleInput(e.target.value)}
            placeholder={c.addBrandPlaceholder}
            aria-label={c.addBrandAria}
          />
          <button type="button" className="cta" disabled={props.busy} onClick={props.onAddAccount}>
            {c.add}
          </button>
        </div>
        <div className="accounts">
          {props.accounts.map((a) => (
            <button
              type="button"
              className="pill"
              key={a.handle}
              title={c.removeTitle}
              onClick={() => props.onRemoveAccount(a.handle)}
            >
              @{a.handle} ×
            </button>
          ))}
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="cta" disabled={props.busy} onClick={props.onRun}>
            {props.busy ? c.running : props.apify ? c.runApify : c.recompute}
          </button>
          <button type="button" className="cta ghost" disabled={props.busy} onClick={props.onDiscover}>
            {c.discoverBrands}
          </button>
        </div>
        {props.notice && (
          <p style={{ color: 'var(--muted)', marginBottom: 0, marginTop: 10 }}>{props.notice}</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>{c.autoTitle}</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>{c.autoBody}</p>
        <div className="manual-grid auto-veille-row">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={props.autoVeille.enabled}
              onChange={(e) => props.onAutoVeille(e.target.checked, props.autoVeille.hour)}
            />
            {c.enable}
          </label>
          <label>
            {c.hour}{' '}
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
          <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>{c.discoveryTitle}</h3>
          {props.discoveries.map((d) => (
            <div className="discovery-row" key={d.handle}>
              <div>
                <strong>@{d.handle}</strong>
                {d.verified && <span className="pill">{c.verified}</span>}
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
                {c.follow}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>{c.manualTitle}</h3>
        <div className="manual-grid">
          <input
            value={props.manual.handle}
            onChange={(e) => props.onManual({ ...props.manual, handle: e.target.value })}
            placeholder={c.manualHandle}
          />
          <input
            value={props.manual.views}
            onChange={(e) => props.onManual({ ...props.manual, views: e.target.value })}
            placeholder={c.manualViews}
            inputMode="numeric"
          />
          <input
            value={props.manual.baseline}
            onChange={(e) => props.onManual({ ...props.manual, baseline: e.target.value })}
            placeholder={c.manualBaseline}
            inputMode="numeric"
          />
          <input
            value={props.manual.caption}
            onChange={(e) => props.onManual({ ...props.manual, caption: e.target.value })}
            placeholder={c.manualCaption}
          />
          <button type="button" className="cta" disabled={props.busy} onClick={props.onManualAdd}>
            {c.save}
          </button>
        </div>
      </div>

      {props.hits.map((reel) => {
        const tr = props.transcriptions[reel.id]
        return (
          <article className="reel" key={reel.id}>
            <div className="thumb media-thumb">
              {reel.imageUrl ? (
                <img src={imageProxy(reel.imageUrl)} alt={c.thumbAlt(reel.handle)} loading="lazy" />
              ) : null}
              <span>{formatViews(reel.views)}</span>
            </div>
            <div>
              <h4>{reel.caption || c.noCaption}</h4>
              <p>
                @{reel.handle} · {c.baseline} {formatViews(reel.baseline)}
              </p>
              <p>{reel.why}</p>
              {tr && (
                <div className="tr-box">
                  <strong>
                    {c.transcription} ({tr.source})
                  </strong>
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
                  {c.transcribeCta}
                </button>
                <button
                  type="button"
                  className="cta ghost"
                  disabled={props.busy}
                  onClick={() => props.onScript(reel.id)}
                >
                  {c.scriptCta}
                </button>
              </div>
            </div>
            <div className="score">
              <strong>{reel.score.toFixed(1)}×</strong>
              <span>{c.viralScore}</span>
            </div>
          </article>
        )
      })}
    </section>
  )
}

function PhotosPanel(props: {
  c: AppCopy
  hits: ScoredReel[]
  remakes: Record<string, PhotoRemake>
  busy: boolean
  onRemake: (reelId: string) => void
}) {
  const { c } = props
  const [openId, setOpenId] = useState<string | null>(null)
  const [mode, setMode] = useState<Record<string, 'identical' | 'inVoice'>>({})

  return (
    <section className="panel">
      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>{c.productTitle}</h3>
        <p style={{ color: 'var(--muted)', margin: 0 }}>{c.productBody}</p>
      </div>

      {props.hits.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--muted)', margin: 0 }}>{c.productEmpty}</p>
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
                <img src={imageProxy(post.imageUrl)} alt={c.postAlt(post.handle)} loading="lazy" />
              ) : (
                <b>{post.mediaType === 'carousel' ? '❏' : '▢'}</b>
              )}
              <span>{formatViews(post.views)}</span>
            </div>
            <div style={{ gridColumn: '2 / -1' }}>
              <h4>{post.caption || c.noPostCaption}</h4>
              <p>
                @{post.handle} · {post.mediaType === 'carousel' ? c.carousel : c.photo} · {c.baseline}{' '}
                {formatViews(post.baseline)} {c.baselineLikes}
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
                  {props.busy && openId === post.id ? c.analyzingPost : c.remakeCta}
                </button>
              )}

              {remake && (
                <div className="remake">
                  <div className="remake-why">
                    <strong>{c.whyItWorks}</strong>
                    <p>{remake.why}</p>
                  </div>
                  <div className="seg">
                    <button
                      type="button"
                      className={`seg-btn${chosen === 'identical' ? ' active' : ''}`}
                      onClick={() => setMode((m) => ({ ...m, [post.id]: 'identical' }))}
                    >
                      {c.identical}
                    </button>
                    <button
                      type="button"
                      className={`seg-btn${chosen === 'inVoice' ? ' active' : ''}`}
                      onClick={() => setMode((m) => ({ ...m, [post.id]: 'inVoice' }))}
                    >
                      {c.inVoice}
                    </button>
                  </div>
                  {variant && (
                    <div className="remake-body">
                      <label>{c.caption}</label>
                      <p className="remake-caption">{variant.caption}</p>
                      {variant.shotList?.length > 0 && (
                        <>
                          <label>{c.shotList}</label>
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
  c,
  script,
  busy,
  onShorten,
  onRememberRule,
}: {
  c: AppCopy
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
          <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>{c.noScriptTitle}</h3>
          <p style={{ color: 'var(--muted)', marginBottom: 0 }}>{c.noScriptBody}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="panel">
      <article className="script">
        <h3>{script.title}</h3>
        <p className="meta">
          {c.generatedOn} {new Date(script.createdAt).toLocaleString(c.locale)} · {script.beats.length}{' '}
          {c.beats}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" className="cta ghost" disabled={busy} onClick={onShorten}>
            {c.shorten}
          </button>
        </div>
        {script.beats.map((beat) => (
          <div className="beat" key={`${beat.time}-${beat.subtitle}`}>
            <time>{beat.time}</time>
            <div>
              <strong>{beat.tone}</strong>
              <p>{beat.line}</p>
              <p>
                {c.subtitle} : « {beat.subtitle} »
              </p>
            </div>
          </div>
        ))}
      </article>
      <div className="card feature">
        <h3>{c.captionsTitle}</h3>
        <p>
          <strong>{c.punchy} :</strong> {script.captions.punchy}
        </p>
        <p>
          <strong>{c.soft} :</strong> {script.captions.soft}
        </p>
      </div>
      <div className="card feature">
        <h3>{c.ruleTitle}</h3>
        <p style={{ color: 'var(--muted)' }}>{c.ruleBody}</p>
        <div className="chat-input">
          <input
            value={ruleDraft}
            onChange={(e) => setRuleDraft(e.target.value)}
            placeholder={c.ruleExample}
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
            {c.remember}
          </button>
        </div>
      </div>
    </section>
  )
}

function CalendarPanel({
  c,
  items,
  onAdd,
  onMove,
  onCycleStatus,
}: {
  c: AppCopy
  items: CalendarItem[]
  onAdd: (day: number, label: string) => void
  onMove: (id: string, day: number) => void
  onCycleStatus: (id: string, status: CalendarItem['status']) => void
}) {
  const [label, setLabel] = useState('')
  const now = new Date()
  const year = items.find((item) => item.day > 0)?.year ?? now.getFullYear()
  const month = items.find((item) => item.day > 0)?.month ?? now.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const inbox = items.filter((item) => item.day === 0)
  const byDay = new Map<number, CalendarItem[]>()
  for (const item of items.filter((x) => x.month === month && x.day > 0)) {
    const list = byDay.get(item.day) || []
    list.push(item)
    byDay.set(item.day, list)
  }

  const nextStatus = (s: CalendarItem['status']): CalendarItem['status'] =>
    s === 'ecrit' ? 'tourne' : s === 'tourne' ? 'publie' : 'ecrit'

  return (
    <section className="panel calendar">
      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>{c.ideasTitle}</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>{c.ideasBody}</p>
        <div className="manual-grid" style={{ marginBottom: 12 }}>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={c.ideaPlaceholder}
          />
          <button
            type="button"
            className="cta"
            onClick={() => {
              if (!label.trim()) return
              onAdd(0, label.trim())
              setLabel('')
            }}
          >
            {c.addToInbox}
          </button>
        </div>
        <div className="idea-bank">
          {inbox.length === 0 && <span style={{ color: 'var(--muted)' }}>{c.noIdeas}</span>}
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
              title={c.dragHint}
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
          {c.weekdays.map((d, i) => (
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
