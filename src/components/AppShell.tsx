import { useState } from 'react'
import {
  calendarItems,
  chatStarter,
  reelHits,
  scriptBeats,
  watchedAccounts,
} from '../data/demo'

type Tab = 'veille' | 'script' | 'calendrier' | 'chat'
type ChatMessage = { from: 'zack' | 'user'; text: string }

type AppShellProps = {
  onBack: () => void
}

export function AppShell({ onBack }: AppShellProps) {
  const [tab, setTab] = useState<Tab>('veille')
  const [messages, setMessages] = useState<ChatMessage[]>(chatStarter)
  const [draft, setDraft] = useState('')

  function send() {
    const text = draft.trim()
    if (!text) return
    const reply = replyTo(text)
    setMessages((prev) => [...prev, { from: 'user', text }, { from: 'zack', text: reply }])
    setDraft('')
  }

  return (
    <div className="shell">
      <div className="shell-top">
        <div>
          <h1>Zack</h1>
          <p>Palmarès du jour · 6 comptes surveillés</p>
        </div>
        <button type="button" className="cta ghost" onClick={onBack}>
          ← Accueil
        </button>
      </div>

      <nav className="tabs" aria-label="Navigation Zack">
        {(
          [
            ['veille', 'Veille'],
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

      {tab === 'veille' && <VeillePanel />}
      {tab === 'script' && <ScriptPanel />}
      {tab === 'calendrier' && <CalendarPanel />}
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
                if (e.key === 'Enter') send()
              }}
              aria-label="Message à Zack"
            />
            <button type="button" className="cta" onClick={send}>
              Envoyer
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function VeillePanel() {
  return (
    <section className="panel">
      <div className="metric-row">
        <div className="metric">
          <strong>6</strong>
          <span>comptes suivis</span>
        </div>
        <div className="metric">
          <strong>14</strong>
          <span>exceptions détectées</span>
        </div>
        <div className="metric">
          <strong>22×</strong>
          <span>meilleur score viral</span>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Comptes surveillés</h3>
        <div className="accounts">
          {watchedAccounts.map((a) => (
            <span className="pill" key={a}>
              {a}
            </span>
          ))}
        </div>
      </div>

      {reelHits.map((reel) => (
        <article className="reel" key={reel.id}>
          <div className="thumb">{reel.views}</div>
          <div>
            <h4>{reel.title}</h4>
            <p>
              {reel.account} · baseline {reel.baseline}
            </p>
            <p>{reel.why}</p>
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

function ScriptPanel() {
  return (
    <section className="panel">
      <article className="script">
        <h3>Script · Hook avant / après</h3>
        <p className="meta">Dans ta voix · 18s · 2 légendes prêtes</p>
        {scriptBeats.map((beat) => (
          <div className="beat" key={beat.time}>
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
          <strong>A — punchy :</strong> « Le vrai signal n’est pas le volume. C’est le multiple. »
        </p>
        <p>
          <strong>B — soft :</strong> « J’ai arrêté de chase les vues brutes. Voici comment Zack lit un Reel. »
        </p>
      </div>
    </section>
  )
}

function CalendarPanel() {
  const days = Array.from({ length: 28 }, (_, i) => i + 1)
  const byDay = Object.fromEntries(calendarItems.map((c) => [c.day, c]))

  return (
    <section className="panel calendar">
      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Août 2026</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Écrit · Tourné · Publié — glisse une idée, la semaine se remplit.
        </p>
        <div className="weekdays">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>
        <div className="days" style={{ marginTop: 8 }}>
          {days.map((day) => {
            const item = byDay[day]
            return (
              <div className="day" key={day}>
                <span className="n">{day}</span>
                {item && <span className={`chip ${item.status}`}>{item.label}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function replyTo(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('veille') || t.includes('lance')) {
    return 'Veille lancée sur 6 comptes. 3 exceptions au-dessus de 9× — je te les affiche dans l’onglet Veille.'
  }
  if (t.includes('meilleur') || t.includes('top')) {
    return 'Top du jour : @atelierlumiere à 22,1× (hook avant/après). Tu veux le script seconde par seconde ?'
  }
  if (t.includes('accroche') || t.includes('raccourci') || t.includes('script')) {
    return 'Accroche raccourcie : « Ton Reel à 3k n’est pas un flop — c’est un mauvais dénominateur. » Je peux découper le script entier.'
  }
  return 'OK. Dis-moi : « lance une veille », « montre-moi les meilleurs », ou « raccourcis mon accroche ».'
}
