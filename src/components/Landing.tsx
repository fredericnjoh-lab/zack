import { Icon } from './Icon'

const steps = [
  {
    icon: 'search' as const,
    title: '1. Il surveille',
    body: 'Tu lui donnes 3 à 20 marques concurrentes (streetwear, ready-to-wear, DTC). Zack scrape leurs Reels et calcule le score viral : combien de fois un post dépasse l’audience habituelle de la marque.',
  },
  {
    icon: 'bolt' as const,
    title: '2. Il détecte',
    body: 'Pas le post avec le plus de vues brutes : les vraies exceptions — drop, fit check ou lookbook qui explosent par rapport au rythme normal du concurrent.',
  },
  {
    icon: 'pen' as const,
    title: '3. Il écrit',
    body: 'Tu choisis le Reel, Zack lit le texte à l’écran et en tire un script seconde par seconde dans la voix de ta marque : timing, ton, sous-titres. Prêt à tourner le prochain drop.',
  },
]

const extras = [
  {
    icon: 'calendar' as const,
    title: 'Calendrier de tournage',
    body: 'Glisse une idée drop / fit / packing sur un jour. Vue mois : écrit, tourné, publié — comme un planning collection.',
  },
  {
    icon: 'image' as const,
    title: 'Photos & carrousels produit',
    body: 'Zack sort les lookbooks et carrousels qui cartonnent, explique pourquoi, puis les refait : à l’identique, ou dans l’ADN de ta marque.',
  },
  {
    icon: 'book' as const,
    title: 'Voix de marque, apprise',
    body: 'Dépose ton brand book, tes slogans, tes règles. Quand tu corriges un script, Zack retient la règle pour tous les suivants.',
  },
  {
    icon: 'clock' as const,
    title: 'Palmarès du matin',
    body: 'Veille auto sur tes concurrents mode. Ton top exceptions est prêt avant le café — sans ouvrir Instagram.',
  },
  {
    icon: 'compass' as const,
    title: 'Découverte de marques',
    body: 'Zack te propose des marques du même segment (prix, style, geo) que tu ne suis pas encore, avec un vrai signal de perf.',
  },
  {
    icon: 'chat' as const,
    title: 'Parle à Zack',
    body: '« lance une veille », « montre le top drop », « raccourcis mon accroche ». Il agit — scrape, score, script.',
  },
  {
    icon: 'grid' as const,
    title: 'OCR & légendes produit',
    body: 'Même sans voix-off : Zack lit le texte à l’écran du Reel. Tu repars avec deux légendes prêtes à coller (punchy / soft).',
  },
]

const angles = [
  { label: 'Drop', hint: 'lancement / restock' },
  { label: 'Fit check', hint: 'porté, rue, studio' },
  { label: 'Packing', hint: 'unboxing marque' },
  { label: 'Behind the stitch', hint: 'coulisses atelier' },
  { label: 'Social proof', hint: 'UGC / clients' },
  { label: 'Lookbook', hint: 'carrousel collection' },
]

type LandingProps = {
  onTry: () => void
}

export function Landing({ onTry }: LandingProps) {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Zack · marques de vêtements</p>
        <h1>Zack travaille, tu drops</h1>
        <p>
          La veille Instagram des marques de mode — score viral concurrent, script
          prêt à filmer, calendrier de tournage. Propulsé par scrape réel + Claude.
        </p>
        <div className="hero-actions">
          <button type="button" className="cta" onClick={onTry}>
            Essayer Zack →
          </button>
          <span className="hero-note">Streetwear · DTC · ready-to-wear</span>
        </div>
        <div className="angle-strip" aria-label="Angles mode">
          {angles.map((a) => (
            <span className="angle-chip" key={a.label}>
              <strong>{a.label}</strong>
              <span>{a.hint}</span>
            </span>
          ))}
        </div>
        <div className="proof">
          {[
            { value: 'Score ×', label: 'vs médiane marque' },
            { value: 'OCR', label: 'texte à l’écran' },
            { value: '7h', label: 'palmarès auto' },
          ].map((item) => (
            <div className="proof-item" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <p className="eyebrow">Comment ça marche</p>
          <h2 className="section-title">Surveille. Détecte. Filme.</h2>
        </div>
        <div className="steps">
          {steps.map((step) => (
            <article className="card feature" key={step.title}>
              <Icon name={step.icon} />
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <p className="eyebrow">Fait pour les marques</p>
          <h2 className="section-title">Du concurrent au prochain drop</h2>
        </div>
        {extras.map((item) => (
          <article className="card feature" key={item.title}>
            <Icon name={item.icon} />
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className="footer-cta">
        <h2 className="section-title">Prêt à outfiler ta veille ?</h2>
        <p>Ajoute tes marques concurrentes, lance une veille, récupère un script.</p>
        <button type="button" className="cta" onClick={onTry}>
          Essayer Zack →
        </button>
      </section>
    </main>
  )
}
