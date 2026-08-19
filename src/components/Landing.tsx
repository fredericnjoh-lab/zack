type LandingProps = {
  onTry: () => void
}

const flow = [
  {
    n: '01',
    title: 'Surveille',
    body: '3 à 20 marques concurrentes. Scrape réel. Score viral = perf ÷ médiane du compte.',
  },
  {
    n: '02',
    title: 'Détecte',
    body: 'Uniquement les exceptions. Drop, fit, lookbook qui sortent du rythme habituel.',
  },
  {
    n: '03',
    title: 'Produis',
    body: 'Script seconde par seconde, OCR écran, légendes, remake dans la voix de ta marque.',
  },
]

const stack = [
  { label: 'Signal', value: 'Score × vs médiane marque — pas les vues brutes' },
  { label: 'Capture', value: 'OCR du texte à l’écran + structure du Reel' },
  { label: 'Voix', value: 'Brand book, règles retenues, ton manifesto' },
  { label: 'Rythme', value: 'Palmarès auto le matin · agenda écrit / tourné / publié' },
]

export function Landing({ onTry }: LandingProps) {
  return (
    <main className="landing">
      <section className="landing-hero" aria-label="Zack">
        <div className="landing-hero-media" aria-hidden="true">
          <img src={`${import.meta.env.BASE_URL}zack-hero-fashion.jpg`} alt="" />
        </div>
        <div className="landing-hero-veil" aria-hidden="true" />
        <div className="landing-hero-copy">
          <p className="landing-brand">Zack</p>
          <h1>Veille Instagram pour marques de vêtements.</h1>
          <p className="landing-lead">
            Concurrent → exception → script. Scrape réel, score viral, Claude.
          </p>
          <div className="landing-cta-row">
            <button type="button" className="cta landing-cta" onClick={onTry}>
              Ouvrir Zack
            </button>
            <p className="landing-meta">Streetwear · DTC · ready-to-wear</p>
          </div>
        </div>
      </section>

      <section className="landing-block">
        <p className="landing-kicker">Système</p>
        <ol className="landing-flow">
          {flow.map((step) => (
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
        <p className="landing-kicker">Levier tech</p>
        <h2 className="landing-block-title">Pas un générateur de captions. Un pipeline.</h2>
        <dl className="landing-stack">
          {stack.map((row) => (
            <div key={row.label} className="landing-stack-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="landing-block landing-end">
        <p className="landing-brand landing-brand-sm">Zack</p>
        <h2 className="landing-block-title">Ajoute tes concurrents. Filme demain.</h2>
        <button type="button" className="cta landing-cta" onClick={onTry}>
          Ouvrir Zack
        </button>
      </section>
    </main>
  )
}
