import { dict, type Lang } from '../lib/i18n'

type LandingProps = {
  onTry: () => void
  lang: Lang
}

export function Landing({ onTry, lang }: LandingProps) {
  const t = dict[lang]

  return (
    <main className="landing">
      <section className="landing-hero" aria-label="Zack">
        <div className="landing-hero-media" aria-hidden="true">
          <img src={`${import.meta.env.BASE_URL}zack-hero-fashion.jpg`} alt="" />
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
