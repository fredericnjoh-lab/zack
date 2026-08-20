import { useState } from 'react'
import { dict, type Lang } from '../lib/i18n'

type LandingProps = {
  onTry: () => void
  lang: Lang
}

export function Landing({ onTry, lang }: LandingProps) {
  const t = dict[lang]
  const [activeUseCase, setActiveUseCase] = useState(t.useCases[0].id)
  const active = t.useCases.find((item) => item.id === activeUseCase) || t.useCases[0]
  const asset = (path: string) =>
    new URL(path, new URL(import.meta.env.BASE_URL, window.location.origin)).toString()

  return (
    <main className="landing">
      <section className="landing-hero" aria-label="Zack">
        <div className="landing-hero-media" aria-hidden="true">
          <img src={asset('zack-hero-fashion.webp')} alt="" />
        </div>
        <div className="landing-hero-veil" aria-hidden="true" />
        <div className="landing-hero-copy">
          <p className="landing-brand">Zack</p>
          <h1>{t.heroTitle}</h1>
          <p className="landing-lead">{t.heroLead}</p>
          <div className="landing-cta-row">
            <button type="button" className="cta landing-cta" onClick={onTry}>
              {t.open}
            </button>
            <p className="landing-meta">{t.heroMeta}</p>
          </div>
        </div>
      </section>

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
          <img
            src={asset('screenshots/zack-01-radar-tab.webp')}
            alt={t.screenshotAlt}
            loading="lazy"
          />
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
          <div className="use-case-visual">
            <img src={asset(active.image)} alt={active.alt} loading="lazy" />
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
          <figure className="editorial-photo editorial-photo-main">
            <img src={asset('zack-founder-studio.webp')} alt={t.founderPhotoAlt} loading="lazy" />
          </figure>
          <figure className="editorial-photo editorial-photo-secondary">
            <img src={asset('zack-content-shoot.webp')} alt={t.shootPhotoAlt} loading="lazy" />
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
