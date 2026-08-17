import { useEffect, useState } from 'react'
import { zackApi } from '../lib/api'
import type { CalendarItem, GeneratedScript, PhotoRemake, ScoredReel } from '../types'

type Tab = 'veille' | 'photos' | 'script' | 'calendrier' | 'chat'
type ChatMessage = { from: 'zack' | 'user'; text: string }

type AppShellProps = {
  onBack: () => void
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(Math.round(n))
}

export function AppShell({ onBack }: AppShellProps) {
  const [tab, setTab] = useState<Tab>('veille')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: 'zack',
      text: 'Salut — ajoute tes concurrents, lance une veille, ou colle un Reel à la main. Qu’est-ce qu’on fait ?',
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [handleInput, setHandleInput] = useState('')
  const [manual, setManual] = useState({ handle: '', views: '', caption: '', baseline: '' })

  async function refresh() {
    try {
      const [v, c, s, p] = await Promise.all([
        zackApi.veille(),
        zackApi.calendar(),
        zackApi.scripts(),
        zackApi.photos(),
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
      setCalendar(c.items)
      if (s.scripts[0]) setScript(s.scripts[0])
      setPhotoHits(p.hits)
      setRemakes((prev) => {
        const next = { ...prev }
        for (const rm of p.remakes) if (!next[rm.sourceReelId]) next[rm.sourceReelId] = rm
        return next
      })
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'API indisponible — lance npm run dev')
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function send() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setMessages((prev) => [...prev, { from: 'user', text }])
    try {
      const { reply } = await zackApi.chat(text)
      setMessages((prev) => [...prev, { from: 'zack', text: reply }])
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
          </p>
        </div>
        <button type="button" className="cta ghost" onClick={onBack}>
          ← Accueil
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: '#fca5a5', marginBottom: 12 }}>
          <strong>API</strong>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{error}</p>
        </div>
      )}

      <nav className="tabs tabs-5" aria-label="Navigation Zack">
        {(
          [
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

      {tab === 'veille' && (
        <VeillePanel
          hits={hits}
          accounts={accounts}
          busy={busy}
          handleInput={handleInput}
          manual={manual}
          notice={status.notice}
          apify={status.apify}
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
            try {
              const r = await zackApi.runVeille()
              setHits(r.hits)
              setStatus((s) => ({ ...s, mode: r.mode, notice: r.notice || '' }))
            } catch (e) {
              setError(e instanceof Error ? e.message : 'veille failed')
            } finally {
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

      {tab === 'script' && <ScriptPanel script={script} />}
      {tab === 'calendrier' && (
        <CalendarPanel
          items={calendar}
          onAdd={async (day, label) => {
            await zackApi.addCalendar({ day, label, status: 'ecrit' })
            const c = await zackApi.calendar()
            setCalendar(c.items)
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

function VeillePanel(props: {
  hits: ScoredReel[]
  accounts: { handle: string }[]
  busy: boolean
  handleInput: string
  manual: { handle: string; views: string; caption: string; baseline: string }
  notice: string
  apify: boolean
  onHandleInput: (v: string) => void
  onManual: (v: { handle: string; views: string; caption: string; baseline: string }) => void
  onAddAccount: () => void
  onRemoveAccount: (handle: string) => void
  onRun: () => void
  onManualAdd: () => void
  onScript: (reelId: string) => void
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
        </div>
        {props.notice && (
          <p style={{ color: 'var(--muted)', marginBottom: 0, marginTop: 10 }}>{props.notice}</p>
        )}
        {!props.apify && (
          <p style={{ color: 'var(--muted)', marginBottom: 0, marginTop: 10 }}>
            Sans APIFY_TOKEN : utilise les seeds ou ajoute un Reel à la main ci-dessous.
          </p>
        )}
      </div>

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

      {props.hits.map((reel) => (
        <article className="reel" key={reel.id}>
          <div className="thumb">{formatViews(reel.views)}</div>
          <div>
            <h4>{reel.caption || 'Reel sans caption'}</h4>
            <p>
              @{reel.handle} · baseline {formatViews(reel.baseline)}
            </p>
            <p>{reel.why}</p>
            <button
              type="button"
              className="cta ghost"
              style={{ marginTop: 8 }}
              disabled={props.busy}
              onClick={() => props.onScript(reel.id)}
            >
              Générer le script →
            </button>
          </div>
          <div className="score">
            <strong>{reel.score.toFixed(1)}×</strong>
            <span>score viral</span>
          </div>
        </article>
      ))}
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
          marché, puis le refait : à l’identique ou réécrit dans ta voix. C’est toi qui choisis.
        </p>
      </div>

      {props.hits.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Aucune photo/carrousel exceptionnel pour l’instant. Lance une veille Apify — Zack classe
            automatiquement Reels vs photos et les score séparément.
          </p>
        </div>
      )}

      {props.hits.map((post) => {
        const remake = props.remakes[post.id]
        const chosen = mode[post.id] || 'identical'
        const variant = remake ? remake[chosen] : null
        return (
          <article className="reel photo" key={post.id}>
            <div className="thumb photo-thumb">
              {post.mediaType === 'carousel' ? '❏' : '▢'}
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

function ScriptPanel({ script }: { script: GeneratedScript | null }) {
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
    </section>
  )
}

function CalendarPanel({
  items,
  onAdd,
}: {
  items: CalendarItem[]
  onAdd: (day: number, label: string) => void
}) {
  const [label, setLabel] = useState('')
  const [day, setDay] = useState('18')
  const now = new Date()
  const year = items[0]?.year ?? now.getFullYear()
  const month = items[0]?.month ?? now.getMonth() + 1
  const days = Array.from({ length: 28 }, (_, i) => i + 1)
  const byDay = Object.fromEntries(items.filter((c) => c.month === month).map((c) => [c.day, c]))

  return (
    <section className="panel calendar">
      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>
          {String(month).padStart(2, '0')}/{year}
        </h3>
        <div className="manual-grid" style={{ marginBottom: 12 }}>
          <input value={day} onChange={(e) => setDay(e.target.value)} placeholder="jour" />
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="idée / titre" />
          <button
            type="button"
            className="cta"
            onClick={() => {
              const d = Number(day)
              if (!d || !label.trim()) return
              onAdd(d, label.trim())
              setLabel('')
            }}
          >
            Ajouter
          </button>
        </div>
        <div className="weekdays">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>
        <div className="days" style={{ marginTop: 8 }}>
          {days.map((d) => {
            const item = byDay[d]
            return (
              <div className="day" key={d}>
                <span className="n">{d}</span>
                {item && <span className={`chip ${item.status}`}>{item.label}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
