import { Icon } from './Icon'

const steps = [
  {
    icon: 'search' as const,
    title: '1. Il surveille',
    body: 'Tu lui donnes 3 à 20 comptes concurrents de ta niche. Zack les passe en revue tout seul et calcule pour chaque Reel son score viral : combien de fois il dépasse l’audience habituelle du compte.',
  },
  {
    icon: 'bolt' as const,
    title: '2. Il détecte',
    body: 'Pas juste « beaucoup de vues » : Zack repère les vraies exceptions, les Reels qui explosent par rapport au rythme normal du créateur.',
  },
  {
    icon: 'pen' as const,
    title: '3. Il écrit',
    body: 'Tu choisis un Reel, Zack l’écoute et en tire un script découpé seconde par seconde dans ta voix, avec le minutage, le ton à prendre et les sous-titres. Prêt à filmer.',
  },
]

const extras = [
  {
    icon: 'calendar' as const,
    title: 'Calendrier de contenu',
    body: 'Glisse une idée sur un jour et ta semaine se remplit. Une vraie vue mois, comme un agenda, où tu vois d’un coup d’œil ce qui est écrit, tourné, publié.',
  },
  {
    icon: 'image' as const,
    title: 'Photos et carrousels aussi',
    body: 'Pas que les Reels. Zack sort le meilleur des publications photo, t’explique pourquoi celle-là a marché, puis la refait : à l’identique, ou réécrite dans ta voix. C’est toi qui choisis.',
  },
  {
    icon: 'book' as const,
    title: 'Ta méthode d’écriture, apprise',
    body: 'Tu construis ton propre guide de script en discutant avec Zack, ou en déposant tes documents. Quand tu corriges un script, il te propose de retenir la règle pour tous les suivants.',
  },
  {
    icon: 'clock' as const,
    title: 'Veille automatique',
    body: 'Zack fait le tour de tes concurrents à l’heure que tu choisis. Ton palmarès du jour est prêt avant ton café, sans que tu cliques sur quoi que ce soit.',
  },
  {
    icon: 'compass' as const,
    title: 'Découverte de comptes',
    body: 'Zack te sort des créateurs de ta niche que tu ne surveilles pas encore, vérifiés, avec leurs vraies statistiques. Ta veille s’élargit toute seule.',
  },
  {
    icon: 'chat' as const,
    title: 'Parle à Zack',
    body: 'Tu lui écris comme à quelqu’un : « lance une veille », « montre-moi les meilleurs », « raccourcis mon accroche ». Il le fait et te montre chaque action.',
  },
  {
    icon: 'grid' as const,
    title: 'Transcription et légendes',
    body: 'Chaque Reel gardé est retranscrit, même sans voix (Zack lit le texte affiché à l’écran). Et tu repars avec deux versions de légende prêtes à coller.',
  },
]

type LandingProps = {
  onTry: () => void
}

export function Landing({ onTry }: LandingProps) {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Zack · veille Instagram</p>
        <h1>Zack travaille, tu filmes</h1>
        <p>
          De la veille concurrentielle au script seconde par seconde — puis au
          calendrier de tournage.
        </p>
        <div className="hero-actions">
          <button type="button" className="cta" onClick={onTry}>
            Essayer Zack →
          </button>
          <span className="hero-note">Apify + Claude branchés</span>
        </div>
        <div className="proof">
          {[
            { value: '625×', label: 'meilleur score détecté' },
            { value: '94', label: 'posts analysés / run' },
            { value: '18s', label: 'script prêt à filmer' },
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
          <h2 className="section-title">Trois gestes. Un flow.</h2>
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
          <p className="eyebrow">Tout est dedans</p>
          <h2 className="section-title">De la veille au calendrier de tournage</h2>
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
        <h2 className="section-title">Prêt à filmer plus vite ?</h2>
        <p>Ouvre Zack, lance une veille, récupère un script.</p>
        <button type="button" className="cta" onClick={onTry}>
          Essayer Zack →
        </button>
      </section>
    </main>
  )
}
