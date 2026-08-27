import { useState, type PointerEvent } from 'react'
import { dict, type Lang } from '../lib/i18n'

type LandingProps = {
  onTry: () => void
  lang: Lang
}

export function Landing({ onTry, lang }: LandingProps) {
  const t = dict[lang]
  const [activeUseCase, setActiveUseCase] = useState(t.useCases[0].id)
  const active = t.useCases.find((item) => item.id === activeUseCase) || t.useCases[0]

  function tiltScene(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    event.currentTarget.style.setProperty('--scene-x', `${x * 10}deg`)
    event.currentTarget.style.setProperty('--scene-y', `${y * -8}deg`)
  }

  function resetScene(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty('--scene-x', '0deg')
    event.currentTarget.style.setProperty('--scene-y', '0deg')
  }

  return (
    <main className="landing landing-3d">
      <section className="landing-hero landing-hero-3d" aria-label="Zack">
        <div className="hero-grid-glow" aria-hidden="true" />
        <div className="landing-hero-copy">
          <p className="hero-pill">
            <span />
            {t.productKicker}
          </p>
          <p className="landing-brand">Zack</p>
          <h1>{t.heroTitle}</h1>
          <p className="landing-lead">{t.heroLead}</p>
          <div className="landing-cta-row">
            <button type="button" className="cta landing-cta landing-cta-3d" onClick={onTry}>
              <span>{t.open}</span>
              <b aria-hidden="true">↗</b>
            </button>
            <p className="landing-meta">{t.heroMeta}</p>
          </div>
          <div className="hero-proof" aria-label={t.systemKicker}>
            <div>
              <strong>22.1×</strong>
              <span>{t.app.viralScore}</span>
            </div>
            <div>
              <strong>3–20</strong>
              <span>{t.app.brands}</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>{t.app.scanning.replace('…', '')}</span>
            </div>
          </div>
        </div>

        <div
          className="hero-scene-wrap"
          aria-hidden="true"
          onPointerMove={tiltScene}
          onPointerLeave={resetScene}
        >
          <div className="hero-scene">
            <div className="scene-orbit scene-orbit-a" />
            <div className="scene-orbit scene-orbit-b" />
            <div className="scene-sphere">
              <span>Z</span>
            </div>

            <div className="scene-card scene-card-main">
              <div className="scene-card-top">
                <span className="scene-avatar">A</span>
                <div>
                  <strong>@atelierlumiere</strong>
                  <small>REEL · 00:14</small>
                </div>
                <i>•••</i>
              </div>
              <div className="scene-fashion">
                <span className="scene-fashion-copy">NEW<br />DROP</span>
                <span className="scene-model" />
              </div>
              <div className="scene-card-bottom">
                <strong>842k</strong>
                <span>38k baseline</span>
              </div>
            </div>

            <div className="scene-card scene-card-score">
              <small>{t.app.viralScore}</small>
              <strong>22.1×</strong>
              <span className="scene-sparkline">
                <i /><i /><i /><i /><i />
              </span>
            </div>

            <div className="scene-card scene-card-script">
              <span className="scene-status-dot" />
              <small>{t.tabs.script}</small>
              <strong>00:00 — HOOK</strong>
              <p>“Si ton drop ne casse pas la courbe…”</p>
            </div>

            <div className="scene-chip scene-chip-live">
              <span />
              LIVE SIGNAL
            </div>
            <div className="scene-chip scene-chip-ai">AI READY</div>
          </div>
        </div>
      </section>

      <div className="signal-marquee" aria-hidden="true">
        <div>
          {[...t.flow, ...t.flow].map((step, index) => (
            <span key={`${step.n}-${index}`}>
              {step.title} <i>✦</i>
            </span>
          ))}
        </div>
      </div>

      <section className="landing-block product-proof">
        <div className="proof-copy">
          <p className="landing-kicker">{t.productKicker}</p>
          <h2 className="landing-block-title">{t.productTitle}</h2>
          <p className="landing-section-lead">{t.productBody}</p>
        </div>
        <div className="product-window">
          <div className="product-window-bar" aria-hidden="true">
            <span />
            <span />
            <span />
            <strong>Zack / Radar</strong>
          </div>
          <div className="radar-demo" role="img" aria-label={t.screenshotAlt}>
            <aside>
              <strong>ZACK</strong>
              {Object.values(t.tabs).slice(0, 4).map((tab, index) => (
                <span className={index === 1 ? 'active' : ''} key={tab}>
                  <i>{String(index + 1).padStart(2, '0')}</i>
                  {tab}
                </span>
              ))}
            </aside>
            <div className="radar-demo-main">
              <div className="radar-demo-head">
                <div>
                  <small>{t.app.competitorsTitle}</small>
                  <h3>{t.productTitle}</h3>
                </div>
                <span>{t.app.runApify}</span>
              </div>
              <div className="radar-metrics">
                <span><strong>06</strong>{t.app.followed}</span>
                <span><strong>12</strong>{t.app.outliers}</span>
                <span><strong>22.1×</strong>{t.app.bestScore}</span>
              </div>
              <div className="radar-list">
                {[
                  ['@atelierlumiere', '842k', '22.1×'],
                  ['@studio.nord', '291k', '13.8×'],
                  ['@capucinemode', '118k', '9.8×'],
                ].map(([handle, views, score], index) => (
                  <div className="radar-row" key={handle}>
                    <span className={`radar-thumb radar-thumb-${index + 1}`}>
                      <i>{views}</i>
                    </span>
                    <span>
                      <strong>{handle}</strong>
                      <small>{t.app.baseline} · {index === 0 ? '38k' : index === 1 ? '21k' : '12k'}</small>
                    </span>
                    <b>{score}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-block use-cases">
        <div className="use-cases-head">
          <p className="landing-kicker">{t.useCasesKicker}</p>
          <h2 className="landing-block-title">{t.useCasesTitle}</h2>
          <p className="landing-section-lead">{t.useCasesLead}</p>
        </div>

        <div className="use-case-tabs" role="tablist" aria-label={t.useCasesKicker}>
          {t.useCases.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === active.id}
              aria-controls="zack-use-case"
              className={`use-case-tab${item.id === active.id ? ' active' : ''}`}
              onClick={() => setActiveUseCase(item.id)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              {item.label}
            </button>
          ))}
        </div>

        <article className="use-case-stage" id="zack-use-case" role="tabpanel">
          <div className="use-case-copy">
            <p className="use-case-label">{active.label}</p>
            <h3>{active.title}</h3>
            <p>{active.body}</p>
            <ul>
              {active.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
          <div className={`use-case-visual use-case-visual-3d visual-${active.id}`} role="img" aria-label={active.alt}>
            <div className="case-scene">
              <div className="case-screen">
                <div className="case-screen-bar">
                  <span>ZACK / {active.label}</span>
                  <i>● ● ●</i>
                </div>
                <div className="case-screen-body">
                  <small>{String(t.useCases.findIndex((item) => item.id === active.id) + 1).padStart(2, '0')}</small>
                  <strong>{active.title}</strong>
                  <div className="case-lines"><i /><i /><i /></div>
                </div>
              </div>
              <div className="case-phone">
                <span className="case-phone-notch" />
                <div className="case-phone-art"><b>{active.label}</b></div>
                <strong>{active.id === 'radar' ? '22.1×' : 'READY'}</strong>
              </div>
              <div className="case-float-card">
                <i>✦</i>
                <span>{active.bullets[0]}</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="landing-block editorial-story">
        <div className="editorial-copy">
          <p className="landing-kicker">{t.editorialKicker}</p>
          <h2 className="landing-block-title">{t.editorialTitle}</h2>
          <p className="landing-section-lead">{t.editorialBody}</p>
          <button type="button" className="cta" onClick={onTry}>
            {t.editorialCta}
          </button>
        </div>
        <div className="editorial-photos">
          <div className="editorial-orbit" aria-hidden="true" />
          <figure className="editorial-photo editorial-photo-main" aria-label={t.founderPhotoAlt}>
            <div className="editorial-art">
              <span>DROP<br />SIGNAL</span>
              <i>22.1×</i>
              <b>ZACK®</b>
            </div>
          </figure>
          <figure className="editorial-photo editorial-photo-secondary" aria-label={t.shootPhotoAlt}>
            <div className="editorial-card-inner">
              <small>CONTENT / 04</small>
              <strong>FROM<br />SIGNAL<br />TO SHOOT</strong>
              <span>↗</span>
            </div>
          </figure>
        </div>
      </section>

      <section className="landing-block">
        <p className="landing-kicker">{t.systemKicker}</p>
        <ol className="landing-flow">
          {t.flow.map((step) => (
            <li key={step.n}>
              <span className="landing-n">{step.n}</span>
              <div>
                <h2>{step.title}</h2>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-block">
        <p className="landing-kicker">{t.leverKicker}</p>
        <h2 className="landing-block-title">{t.leverTitle}</h2>
        <dl className="landing-stack">
          {t.stack.map((row) => (
            <div key={row.label} className="landing-stack-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="landing-block landing-end">
        <p className="landing-brand landing-brand-sm">Zack</p>
        <h2 className="landing-block-title">{t.endTitle}</h2>
        <button type="button" className="cta landing-cta" onClick={onTry}>
          {t.open}
        </button>
      </section>
    </main>
  )
}
