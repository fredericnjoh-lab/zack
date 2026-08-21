import { useEffect, useRef, useState } from 'react'
import { zackApi } from '../lib/api'
import { dict, type Lang } from '../lib/i18n'
import type {
  RepostCandidate,
  RepostJob,
  RepostSettings,
  RepostedItem,
  YoutubeStatus,
} from '../types'

type AppCopy = (typeof dict)['fr']['app']

function imageProxy(source?: string): string | undefined {
  if (!source) return undefined
  return `/api/image?${new URLSearchParams({ url: source }).toString()}`
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(Math.round(n))
}

function formatDate(iso?: string, lang: Lang = 'fr'): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RepostPanel({ lang }: { lang: Lang }) {
  const c = dict[lang].app as AppCopy
  const r = c.repost

  const [settings, setSettings] = useState<RepostSettings | null>(null)
  const [candidates, setCandidates] = useState<RepostCandidate[]>([])
  const [published, setPublished] = useState<RepostedItem[]>([])
  const [youtube, setYoutube] = useState<YoutubeStatus>({
    configured: false,
    connected: false,
    channel: null,
  })
  const [apify, setApify] = useState(true)
  const [job, setJob] = useState<RepostJob>({ status: 'idle' })
  const [selected, setSelected] = useState<string[]>([])
  const [sourceInput, setSourceInput] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  // Ne pas écraser la saisie en cours du handle à chaque rafraîchissement.
  const sourceTouched = useRef(false)

  async function load() {
    try {
      const data = await zackApi.repost()
      setSettings(data.settings)
      setCandidates(data.candidates)
      setPublished(data.published)
      setYoutube(data.youtube)
      setApify(data.apify)
      setJob(data.job)
      if (!sourceTouched.current) setSourceInput(data.settings.sourceHandle)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : c.errRepost)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (job.status !== 'running') return
    const id = setInterval(() => {
      void (async () => {
        try {
          const { job: next } = await zackApi.repostJob()
          setJob(next)
          if (next.status === 'ok' || next.status === 'error') {
            setBusy(false)
            setNotice(next.summary || '')
            if (next.status === 'error') setError(next.error || c.errRepost)
            if (next.kind === 'publish') setSelected([])
            await load()
          }
        } catch {
          /* transient — le serveur free tier peut dormir */
        }
      })()
    }, 3000)
    return () => clearInterval(id)
  }, [job.status, c.errRepost])

  async function patch(payload: Partial<RepostSettings>) {
    try {
      const res = await zackApi.setRepostSettings(payload)
      setSettings(res.settings)
      setNotice(r.saved)
    } catch (e) {
      setError(e instanceof Error ? e.message : c.errRepost)
    }
  }

  async function scan() {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await zackApi.scanRepost(sourceInput.trim() || undefined)
      setJob(res.job)
      if (!res.started) {
        setBusy(false)
        setError(res.job.error || '')
      }
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : c.errRepost)
    }
  }

  async function publish() {
    if (!selected.length) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await zackApi.publishRepost(selected, lang)
      setJob(res.job)
      if (!res.started) {
        setBusy(false)
        setError(res.job.error || '')
      }
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : c.errRepost)
    }
  }

  async function connect() {
    try {
      const { url } = await zackApi.youtubeAuthUrl()
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      setError(e instanceof Error ? e.message : c.errRepost)
    }
  }

  const repostable = candidates.filter((item) => item.videoUrl && !item.alreadyPosted)
  const running = job.status === 'running'
  const channelName = youtube.channel?.customUrl
    ? `@${youtube.channel.customUrl.replace(/^@/, '')}`
    : youtube.channel?.title || settings?.youtubeHandle || 'YouTube'

  return (
    <section className="panel">
      <div className="card">
        <span className="eyebrow">{r.kicker}</span>
        <h3 style={{ margin: '6px 0 8px', fontFamily: 'var(--font-display)' }}>{r.title}</h3>
        <p style={{ color: 'var(--muted)', margin: 0 }}>{r.body}</p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: '#fca5a5' }}>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {!error && notice && (
        <div className="card">
          <p style={{ margin: 0, color: 'var(--muted)' }}>{notice}</p>
        </div>
      )}

      {/* Connexion de la chaîne */}
      <div className="card">
        <strong>{r.connectTitle}</strong>
        <p style={{ color: 'var(--muted)', margin: '6px 0 10px' }}>
          {youtube.connected ? r.connectedTo(channelName) : r.connectBody}
        </p>
        {!youtube.configured && (
          <p style={{ color: 'var(--muted)', margin: '0 0 10px' }}>{r.notConfigured}</p>
        )}
        <div className="accounts">
          {!youtube.connected && (
            <button
              type="button"
              className="cta"
              disabled={!youtube.configured}
              onClick={() => void connect()}
            >
              {r.connect}
            </button>
          )}
          {youtube.connected && (
            <button
              type="button"
              className="cta ghost"
              onClick={async () => {
                await zackApi.youtubeDisconnect()
                await load()
              }}
            >
              {r.disconnect}
            </button>
          )}
        </div>
      </div>

      {/* Source + réglages */}
      <div className="card">
        <strong>{r.sourceLabel}</strong>
        <div className="manual-grid" style={{ marginTop: 10 }}>
          <input
            value={sourceInput}
            placeholder={r.sourcePlaceholder}
            aria-label={r.sourceLabel}
            onChange={(e) => {
              sourceTouched.current = true
              setSourceInput(e.target.value)
            }}
          />
          <button
            type="button"
            className="cta ghost"
            disabled={busy || running || !apify}
            onClick={() => void scan()}
          >
            {running && job.kind === 'scan' ? r.scanning : r.scan}
          </button>
        </div>
        {!apify && <p style={{ color: 'var(--muted)', margin: '10px 0 0' }}>{r.noApify}</p>}

        {settings && (
          <div className="repost-settings">
            <label>
              <span>{r.privacy}</span>
              <select
                value={settings.privacyStatus}
                onChange={(e) =>
                  void patch({ privacyStatus: e.target.value as RepostSettings['privacyStatus'] })
                }
              >
                <option value="private">{r.privacyPrivate}</option>
                <option value="unlisted">{r.privacyUnlisted}</option>
                <option value="public">{r.privacyPublic}</option>
              </select>
            </label>
            <label>
              <span>{r.titleStyle}</span>
              <select
                value={settings.titleStyle}
                onChange={(e) =>
                  void patch({ titleStyle: e.target.value as RepostSettings['titleStyle'] })
                }
              >
                <option value="ai">{r.styleAi}</option>
                <option value="caption">{r.styleCaption}</option>
              </select>
            </label>
            <label>
              <span>{r.maxPerRun}</span>
              <select
                value={String(settings.maxPerRun)}
                onChange={(e) => void patch({ maxPerRun: Number(e.target.value) })}
              >
                {[1, 2, 3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="toggle-row">
              <label>
                <input
                  type="checkbox"
                  checked={settings.markAsShorts}
                  onChange={(e) => void patch({ markAsShorts: e.target.checked })}
                />{' '}
                {r.shortsLabel}
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.autoEnabled}
                  onChange={(e) => void patch({ autoEnabled: e.target.checked })}
                />{' '}
                {r.autoLabel}
              </label>
            </div>
            <p style={{ color: 'var(--muted)', margin: 0, gridColumn: '1 / -1' }}>
              {r.lastScan(formatDate(settings.lastScanAt, lang))} ·{' '}
              {r.lastRun(formatDate(settings.lastRunAt, lang))}
            </p>
          </div>
        )}
      </div>

      {running && (
        <div className="card">
          <strong>{job.kind === 'scan' ? r.scanning : r.publishing}</strong>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
            {r.running}
            {job.total ? ` (${job.done || 0}/${job.total})` : ''}
          </p>
        </div>
      )}

      {/* Sélection + publication */}
      <div className="card">
        <div className="repost-actions">
          <button
            type="button"
            className="cta"
            disabled={!selected.length || busy || running || !youtube.connected}
            onClick={() => void publish()}
          >
            {running && job.kind === 'publish' ? r.publishing : r.publish(selected.length)}
          </button>
          <button
            type="button"
            className="pill"
            disabled={!repostable.length}
            onClick={() => setSelected(repostable.map((item) => item.id))}
          >
            {r.selectAll}
          </button>
          <button
            type="button"
            className="pill"
            disabled={!selected.length}
            onClick={() => setSelected([])}
          >
            {r.clearSelection}
          </button>
        </div>
        <p style={{ color: 'var(--muted)', margin: '10px 0 0' }}>{r.copyrightNote}</p>
      </div>

      {candidates.length === 0 && (
        <div className="card">
          <strong>{r.empty}</strong>
          <p style={{ color: 'var(--muted)', margin: '6px 0 0' }}>{r.emptyHint}</p>
        </div>
      )}

      {candidates.map((item) => {
        const isVideo = Boolean(item.videoUrl)
        const checked = selected.includes(item.id)
        return (
          <article className="reel" key={item.id}>
            <div className="thumb media-thumb">
              {item.thumbnailUrl ? (
                <img src={imageProxy(item.thumbnailUrl)} alt="" loading="lazy" />
              ) : (
                <b>▢</b>
              )}
              {item.durationSec ? <span>{item.durationSec}s</span> : null}
            </div>
            <div style={{ gridColumn: '2 / -1' }}>
              <h4>{(item.caption || '—').split('\n')[0]!.slice(0, 90)}</h4>
              <p>
                @{item.handle} · {formatDate(item.takenAt, lang)}
                {item.views ? ` · ${formatCount(item.views)} ${r.viewsLabel}` : ''}
              </p>
              <div className="repost-row">
                {item.alreadyPosted ? (
                  <>
                    <span className="chip publie">{r.alreadyPosted}</span>
                    {item.youtubeUrl && (
                      <a
                        className="pill"
                        href={item.youtubeUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {r.watchOnYoutube}
                      </a>
                    )}
                  </>
                ) : isVideo ? (
                  <label className="repost-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={running}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...new Set([...prev, item.id])]
                            : prev.filter((id) => id !== item.id),
                        )
                      }
                    />{' '}
                    {r.publish(1)}
                  </label>
                ) : (
                  <span className="chip">{r.photoOnly}</span>
                )}
                {item.url && (
                  <a className="pill" href={item.url} target="_blank" rel="noreferrer noopener">
                    {r.viewSource}
                  </a>
                )}
              </div>
            </div>
          </article>
        )
      })}

      <div className="card">
        <strong>{r.historyTitle}</strong>
        {published.length === 0 && (
          <p style={{ color: 'var(--muted)', margin: '6px 0 0' }}>{r.historyEmpty}</p>
        )}
        <ul className="doc-list repost-history">
          {published.map((item) => (
            <li key={item.id}>
              <span>
                {item.title} · {formatDate(item.postedAt, lang)} · {item.privacyStatus}
              </span>
              <a
                className="pill"
                href={item.youtubeUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                {r.watchOnYoutube}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
