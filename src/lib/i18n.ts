export type Lang = 'fr' | 'en'

type Copy = {
  tagline: string
  open: string
  back: string

  heroTitle: string
  heroLead: string
  heroMeta: string

  productKicker: string
  productTitle: string
  productBody: string
  screenshotAlt: string

  useCasesKicker: string
  useCasesTitle: string
  useCasesLead: string
  useCases: {
    id: string
    label: string
    title: string
    body: string
    bullets: string[]
    image: string
    alt: string
  }[]

  editorialKicker: string
  editorialTitle: string
  editorialBody: string
  editorialCta: string
  founderPhotoAlt: string
  shootPhotoAlt: string

  systemKicker: string
  flow: { n: string; title: string; body: string }[]

  leverKicker: string
  leverTitle: string
  stack: { label: string; value: string }[]

  endTitle: string

  tabs: Record<'profil' | 'veille' | 'photos' | 'script' | 'calendrier' | 'repost' | 'chat', string>
  app: AppCopy
}

type RepostCopy = {
  kicker: string
  title: string
  body: string
  sourceLabel: string
  sourcePlaceholder: string
  connectTitle: string
  connectBody: string
  connect: string
  connectedTo: (channel: string) => string
  disconnect: string
  notConfigured: string
  scan: string
  scanning: string
  publish: (n: number) => string
  publishing: string
  selectAll: string
  clearSelection: string
  noApify: string
  empty: string
  emptyHint: string
  alreadyPosted: string
  photoOnly: string
  watchOnYoutube: string
  viewSource: string
  privacy: string
  privacyPrivate: string
  privacyUnlisted: string
  privacyPublic: string
  titleStyle: string
  styleAi: string
  styleCaption: string
  shortsLabel: string
  autoLabel: string
  maxPerRun: string
  saved: string
  lastScan: (when: string) => string
  lastRun: (when: string) => string
  viewsLabel: string
  historyTitle: string
  historyEmpty: string
  running: string
  copyrightNote: string
}

type AppCopy = {
  brands: string
  outliers: string
  localMode: string
  scanning: string

  connection: string
  api: string
  wakingUp: string
  retry: string
  coldStart: (message: string) => string
  apiDown: string
  apiOffline: string

  jobRunningTitle: string
  jobRunningBody: string
  veilleDone: string
  veilleFailed: string

  chatGreeting: string
  chatPlaceholder: string
  chatSend: string
  chatAria: string

  errGeneric: string
  errProfile: string
  errUpload: string
  errScript: string
  errTranscribe: string
  errDiscover: string
  errRemake: string
  errShorten: string
  errVeille: string
  errRepost: string

  repost: RepostCopy

  dnaKicker: string
  dnaTitle: string
  dnaBody: string
  handlePlaceholder: string
  handleAria: string
  analyzing: string
  analyze: string

  methodTitle: string
  methodBody: string
  docNamePlaceholder: string
  docContentPlaceholder: string
  docSubmit: string
  remove: string
  rulePlaceholder: string
  remember: string

  postsAnalyzed: string
  pillarsCount: string
  profileLearned: string
  yourVoice: string
  pillars: string
  strengths: string
  opportunities: string
  views: string
  likes: string

  followed: string
  outliersThreshold: string
  bestScore: string
  competitorsTitle: string
  addBrandPlaceholder: string
  addBrandAria: string
  add: string
  removeTitle: string
  running: string
  runApify: string
  recompute: string
  discoverBrands: string

  autoTitle: string
  autoBody: string
  enable: string
  hour: string

  discoveryTitle: string
  verified: string
  follow: string

  manualTitle: string
  manualHandle: string
  manualViews: string
  manualBaseline: string
  manualCaption: string
  save: string

  noCaption: string
  baseline: string
  transcription: string
  transcribeCta: string
  scriptCta: string
  viralScore: string
  thumbAlt: (handle: string) => string
  postAlt: (handle: string) => string

  productTitle: string
  productBody: string
  productEmpty: string
  noPostCaption: string
  carousel: string
  photo: string
  baselineLikes: string
  analyzingPost: string
  remakeCta: string
  whyItWorks: string
  identical: string
  inVoice: string
  caption: string
  shotList: string

  noScriptTitle: string
  noScriptBody: string
  generatedOn: string
  beats: string
  shorten: string
  subtitle: string
  captionsTitle: string
  punchy: string
  soft: string
  ruleTitle: string
  ruleBody: string
  ruleExample: string

  ideasTitle: string
  ideasBody: string
  ideaPlaceholder: string
  addToInbox: string
  noIdeas: string
  dragHint: string
  weekdays: string[]
  locale: string
}

const fr: Copy = {
  tagline: 'marques de vêtements',
  open: 'Ouvrir Zack',
  back: '← Accueil',

  heroTitle: 'Tes concurrents t’ont déjà dit quoi filmer.',
  heroLead:
    'Zack scanne leurs Reels, isole les vraies exceptions — pas les vues brutes — et te rend un script prêt à tourner dans la voix de ta marque.',
  heroMeta: 'Streetwear · DTC · ready-to-wear',

  productKicker: 'Le signal, pas le bruit',
  productTitle: 'Vois le marché comme une équipe contenu.',
  productBody:
    'Chaque matin, Zack classe les publications qui dépassent vraiment la norme de leur marque. Tu sais quoi étudier avant de décider quoi tourner.',
  screenshotAlt: 'Tableau de veille Zack avec scores viraux et marques concurrentes',

  useCasesKicker: 'Cas d’usage',
  useCasesTitle: 'Un même signal. Cinq décisions plus rapides.',
  useCasesLead:
    'Choisis ton point de départ : une marque à surveiller, un format à reconstruire ou un calendrier à remplir.',
  useCases: [
    {
      id: 'radar',
      label: 'Détecter',
      title: 'Repère le post qui change la trajectoire d’une marque.',
      body:
        'Zack compare chaque Reel à la médiane du compte et du même format. Un 8k vues peut être un meilleur signal qu’un 800k.',
      bullets: [
        'Score viral relatif, pas classement aux vues brutes',
        'Veille automatique de 3 à 20 marques',
        'Découverte de concurrents du même segment',
      ],
      image: 'screenshots/zack-01-radar-tab.webp',
      alt: 'Veille concurrentielle Zack avec score viral',
    },
    {
      id: 'product',
      label: 'Reconstruire',
      title: 'Transforme un carrousel gagnant en brief produit.',
      body:
        'Zack explique pourquoi le visuel a fonctionné, puis livre la légende, les hashtags et le plan de prises — fidèle à la structure ou réécrit dans ta voix.',
      bullets: [
        'Photos et carrousels scorés séparément',
        'Mode à l’identique ou dans ma voix',
        'Shot list prête pour le studio',
      ],
      image: 'screenshots/zack-02-produit-tab.webp',
      alt: 'Remake de publication produit dans Zack',
    },
    {
      id: 'script',
      label: 'Tourner',
      title: 'Passe du Reel concurrent au script prêt caméra.',
      body:
        'OCR du texte à l’écran, séquençage seconde par seconde, ton de jeu et sous-titres : l’équipe reçoit un plan de tournage, pas une page blanche.',
      bullets: [
        'Accroche, beats et CTA minutés',
        'Deux légendes prêtes à publier',
        'Règles de marque mémorisées',
      ],
      image: 'screenshots/zack-03-script-tab.webp',
      alt: 'Script Reel minuté généré par Zack',
    },
    {
      id: 'calendar',
      label: 'Planifier',
      title: 'Fais atterrir les bons formats dans la semaine.',
      body:
        'Glisse les idées retenues dans le calendrier et fais-les avancer de écrit à tourné, puis publié. La veille devient une cadence.',
      bullets: [
        'Boîte à idées reliée au calendrier',
        'Statuts écrit, tourné et publié',
        'Une vue commune pour le prochain drop',
      ],
      image: 'screenshots/zack-04-calendar-tab.webp',
      alt: 'Calendrier éditorial Zack pour une marque de vêtements',
    },
    {
      id: 'brand',
      label: 'Aligner',
      title: 'Apprends à Zack ce que ta marque ne dirait jamais.',
      body:
        'Analyse ton compte, dépose ton brand book et retiens chaque correction. Les prochains scripts partent de ta voix, pas d’un ton IA générique.',
      bullets: [
        'Analyse des piliers et formats de la marque',
        'Brand book et briefs intégrés',
        'Corrections transformées en règles',
      ],
      image: 'screenshots/zack-05-brand-tab.webp',
      alt: 'Espace ADN de marque dans Zack',
    },
  ],

  editorialKicker: 'Du signal au studio',
  editorialTitle: 'Pensé pour les équipes qui ont un drop à sortir — pas un feed à analyser.',
  editorialBody:
    'Fondateur seul, social manager ou petite équipe créative : Zack raccourcit la distance entre “ça marche chez eux” et “voici ce qu’on tourne demain”.',
  editorialCta: 'Voir Zack en action',
  founderPhotoAlt: 'Fondateur de marque streetwear analysant Instagram dans son studio',
  shootPhotoAlt: 'Équipe créative pendant un shooting de contenu streetwear',

  systemKicker: 'Système',
  flow: [
    {
      n: '01',
      title: 'Mesure',
      body: 'Score viral = performance ÷ médiane du compte. Une marque à 8k vues peut battre une marque à 800k.',
    },
    {
      n: '02',
      title: 'Isole',
      body: 'Zack garde les sorties de rythme : le drop, le fit check, le lookbook qui cassent la courbe.',
    },
    {
      n: '03',
      title: 'Reproduit',
      body: 'OCR du texte à l’écran, script minuté, deux légendes, remake produit — sans copier les mots.',
    },
  ],

  leverKicker: 'Levier tech',
  leverTitle: 'Pas un générateur de légendes. Un pipeline.',
  stack: [
    { label: 'Signal', value: 'Score × contre la médiane de chaque marque, par type de média' },
    { label: 'Capture', value: 'Scrape Instagram réel + lecture du texte affiché à l’écran' },
    { label: 'Voix', value: 'Brand book, règles retenues, corrections mémorisées' },
    { label: 'Rythme', value: 'Palmarès automatique le matin, agenda écrit / tourné / publié' },
  ],

  endTitle: 'Ajoute tes concurrents. Filme demain.',

  tabs: {
    profil: 'Marque',
    veille: 'Veille',
    photos: 'Produit',
    script: 'Script',
    calendrier: 'Agenda',
    repost: 'Repost',
    chat: 'Zack',
  },

  app: {
    brands: 'marques',
    outliers: 'exceptions',
    localMode: 'local',
    scanning: 'veille en cours…',

    connection: 'Connexion',
    api: 'API',
    wakingUp: 'Réveil du serveur Render…',
    retry: 'Réessayer',
    coldStart: (message) => `${message} — le serveur Render se réveille (30–60 s), réessai auto…`,
    apiDown: 'API indisponible — réveil Render en cours…',
    apiOffline: 'API hors ligne. Relance `npm run dev` dans le dossier zack.',

    jobRunningTitle: 'Veille en cours',
    jobRunningBody: 'Apify scanne tes marques (1–3 min). La page se met à jour automatiquement.',
    veilleDone: 'Veille terminée.',
    veilleFailed: 'Veille échouée',

    chatGreeting:
      'Salut — ajoute tes marques concurrentes, lance une veille, ou colle un Reel drop/fit. Qu’est-ce qu’on fait ?',
    chatPlaceholder: 'lance une veille…',
    chatSend: 'Envoyer',
    chatAria: 'Message à Zack',

    errGeneric: 'erreur',
    errProfile: 'analyse de marque échouée',
    errUpload: 'dépôt du document échoué',
    errScript: 'génération du script échouée',
    errTranscribe: 'transcription échouée',
    errDiscover: 'découverte échouée',
    errRemake: 'remake échoué',
    errShorten: 'raccourci échoué',
    errVeille: 'veille échouée',
    errRepost: 'repost échoué',

    repost: {
      kicker: 'Instagram → YouTube',
      title: 'Republie ton contenu Instagram sur ta chaîne YouTube.',
      body:
        'Zack lit ton compte Instagram, récupère les vidéos, réécrit titre et description pour YouTube, puis les envoie en Shorts sur ta chaîne. Chaque post n’est publié qu’une fois.',
      sourceLabel: 'Compte Instagram source',
      sourcePlaceholder: 'fredjoclothing.paris',
      connectTitle: 'Chaîne YouTube',
      connectBody: 'Connecte la chaîne qui recevra les vidéos. Zack ne demande que le droit de publier.',
      connect: 'Connecter YouTube',
      connectedTo: (channel: string) => `Connecté à ${channel}`,
      disconnect: 'Déconnecter',
      notConfigured:
        'Ajoute GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET (Google Cloud → OAuth) pour activer la publication.',
      scan: 'Lire mon Instagram',
      scanning: 'Lecture Instagram…',
      publish: (n: number) => (n <= 1 ? 'Publier sur YouTube' : `Publier ${n} vidéos sur YouTube`),
      publishing: 'Envoi vers YouTube…',
      selectAll: 'Tout sélectionner',
      clearSelection: 'Vider la sélection',
      noApify: 'APIFY_TOKEN manquant — Zack ne peut pas lire Instagram.',
      empty: 'Aucune vidéo récupérée pour l’instant.',
      emptyHint: 'Lance « Lire mon Instagram » pour charger tes derniers posts.',
      alreadyPosted: 'Déjà sur YouTube',
      photoOnly: 'Photo — pas de vidéo à republier',
      watchOnYoutube: 'Voir sur YouTube',
      viewSource: 'Post Instagram',
      privacy: 'Visibilité YouTube',
      privacyPrivate: 'Privée',
      privacyUnlisted: 'Non répertoriée',
      privacyPublic: 'Publique',
      titleStyle: 'Titre et description',
      styleAi: 'Réécrits par Claude (SEO YouTube)',
      styleCaption: 'Légende Instagram telle quelle',
      shortsLabel: 'Ajouter #Shorts au titre',
      autoLabel: 'Repost auto chaque matin',
      maxPerRun: 'Vidéos par run auto',
      saved: 'Réglages enregistrés',
      lastScan: (when: string) => `Dernière lecture Instagram : ${when}`,
      lastRun: (when: string) => `Dernier repost : ${when}`,
      viewsLabel: 'vues',
      historyTitle: 'Déjà republié',
      historyEmpty: 'Rien encore publié sur YouTube.',
      running: 'Repost en cours — tu peux quitter l’onglet, ça continue côté serveur.',
      copyrightNote:
        'Republie uniquement tes propres vidéos. Une musique protégée dans un Reel peut déclencher une revendication Content ID sur YouTube.',
    },

    dnaKicker: 'ADN de marque',
    dnaTitle: 'Apprends à Zack la voix de ta marque',
    dnaBody:
      'Zack analyse tes publications, ton ton streetwear / DTC, tes piliers — et apprend aussi de ton brand book et des règles que tu retiens.',
    handlePlaceholder: '@ton_compte_instagram',
    handleAria: 'Compte Instagram de ta marque',
    analyzing: 'Analyse 1–3 min…',
    analyze: 'Analyser ma marque',

    methodTitle: 'Ta méthode d’écriture',
    methodBody: 'Dépose un brief, un guide de ton, ou un vieux script. Zack s’en sert pour les prochains.',
    docNamePlaceholder: 'Nom du document',
    docContentPlaceholder: 'Colle ton guide / brief ici…',
    docSubmit: 'Déposer le document',
    remove: 'Retirer',
    rulePlaceholder: 'Règle à retenir (ex. max 8 mots dans l’accroche)',
    remember: 'Retenir',

    postsAnalyzed: 'publications analysées',
    pillarsCount: 'piliers éditoriaux',
    profileLearned: 'marque apprise',
    yourVoice: 'Ta voix',
    pillars: 'Piliers',
    strengths: 'Forces',
    opportunities: 'Opportunités',
    views: 'vues',
    likes: 'likes',

    followed: 'marques suivies',
    outliersThreshold: 'exceptions ≥ 2,5×',
    bestScore: 'meilleur score',
    competitorsTitle: 'Tes marques concurrentes',
    addBrandPlaceholder: '@marque_instagram',
    addBrandAria: 'Ajouter une marque',
    add: 'Ajouter',
    removeTitle: 'Retirer',
    running: 'Veille…',
    runApify: 'Lancer la veille Apify',
    recompute: 'Recalculer la veille',
    discoverBrands: 'Découvrir des marques',

    autoTitle: 'Veille automatique',
    autoBody:
      'Active ici + le cron GitHub (chaque matin ~7h Paris). Zack réveille Render et lance la veille tout seul.',
    enable: 'Activer',
    hour: 'Heure',

    discoveryTitle: 'Découverte de marques',
    verified: 'vérifié',
    follow: 'Suivre',

    manualTitle: 'Ajouter un Reel à la main',
    manualHandle: '@marque',
    manualViews: 'vues (ex 842000)',
    manualBaseline: 'baseline habituelle (ex 38000)',
    manualCaption: 'accroche / légende',
    save: 'Enregistrer',

    noCaption: 'Reel sans légende',
    baseline: 'baseline',
    transcription: 'Transcription',
    transcribeCta: 'Transcrire + légendes',
    scriptCta: 'Générer le script →',
    viralScore: 'score viral',
    thumbAlt: (handle) => `Miniature @${handle}`,
    postAlt: (handle) => `Publication @${handle}`,

    productTitle: 'Photos & carrousels produit',
    productBody:
      'Lookbooks, packing, fit checks. Zack sort ce qui cartonne chez les concurrents, explique pourquoi, puis le refait : à l’identique ou dans la voix de ta marque.',
    productEmpty: 'Aucune photo/carrousel exceptionnel pour l’instant. Lance une veille Apify.',
    noPostCaption: 'Publication sans légende',
    carousel: 'carrousel',
    photo: 'photo',
    baselineLikes: 'likes',
    analyzingPost: 'Zack analyse…',
    remakeCta: 'Refaire cette publication',
    whyItWorks: 'Pourquoi ça marche',
    identical: 'À l’identique',
    inVoice: 'Dans ma voix',
    caption: 'Légende',
    shotList: 'Plan de tournage',

    noScriptTitle: 'Pas encore de script',
    noScriptBody: 'Depuis Veille, clique « Générer le script » sur une exception.',
    generatedOn: 'Généré',
    beats: 'beats',
    shorten: 'Raccourcir l’accroche',
    subtitle: 'Sous-titre',
    captionsTitle: 'Légendes',
    punchy: 'A — punchy',
    soft: 'B — soft',
    ruleTitle: 'Retenir une règle',
    ruleBody: 'Tu corriges un script ? Zack peut retenir la règle pour tous les suivants.',
    ruleExample: 'ex. toujours commencer par une question',

    ideasTitle: 'Boîte à idées',
    ideasBody:
      'Ajoute une idée, puis glisse-la sur un jour. Clique une puce pour cycler écrit → tourné → publié.',
    ideaPlaceholder: 'idée / titre',
    addToInbox: 'Ajouter à la boîte',
    noIdeas: 'Aucune idée en attente',
    dragHint: 'Glisser sur un jour · clic = changer le statut',
    weekdays: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
    locale: 'fr-FR',
  },
}

const en: Copy = {
  tagline: 'for clothing brands',
  open: 'Open Zack',
  back: '← Home',

  heroTitle: 'Your competitors already told you what to shoot.',
  heroLead:
    'Zack scans their Reels, isolates the real outliers — not raw views — and hands back a shoot-ready script in your brand’s voice.',
  heroMeta: 'Streetwear · DTC · ready-to-wear',

  productKicker: 'Signal, not noise',
  productTitle: 'See the market like a content team.',
  productBody:
    'Every morning, Zack ranks the posts that genuinely outperform each brand’s norm. You know what to study before deciding what to shoot.',
  screenshotAlt: 'Zack monitoring dashboard with viral scores and competing brands',

  useCasesKicker: 'Use cases',
  useCasesTitle: 'One signal. Five faster decisions.',
  useCasesLead:
    'Choose your starting point: a brand to monitor, a format to rebuild, or a calendar to fill.',
  useCases: [
    {
      id: 'radar',
      label: 'Detect',
      title: 'Spot the post that changes a brand’s trajectory.',
      body:
        'Zack compares every Reel with that account’s median for the same format. An 8k-view post can be a stronger signal than an 800k one.',
      bullets: [
        'Relative viral score, not raw-view rankings',
        'Automatic monitoring for 3 to 20 brands',
        'Discovery of competitors in the same segment',
      ],
      image: 'screenshots/zack-01-radar-tab.webp',
      alt: 'Zack competitor radar with viral score',
    },
    {
      id: 'product',
      label: 'Rebuild',
      title: 'Turn a winning carousel into a product brief.',
      body:
        'Zack explains why the visual landed, then delivers the caption, hashtags and shot plan — faithful to the structure or rewritten in your voice.',
      bullets: [
        'Photos and carousels scored separately',
        'Identical or in-my-voice mode',
        'Studio-ready shot list',
      ],
      image: 'screenshots/zack-02-produit-tab.webp',
      alt: 'Product post remake in Zack',
    },
    {
      id: 'script',
      label: 'Shoot',
      title: 'Go from competitor Reel to camera-ready script.',
      body:
        'On-screen OCR, second-by-second sequencing, delivery tone and subtitles: the team gets a shooting plan, not a blank page.',
      bullets: [
        'Timed hook, beats and CTA',
        'Two publish-ready captions',
        'Brand rules remembered',
      ],
      image: 'screenshots/zack-03-script-tab.webp',
      alt: 'Timed Reel script generated by Zack',
    },
    {
      id: 'calendar',
      label: 'Plan',
      title: 'Land the right formats in this week’s calendar.',
      body:
        'Drag selected ideas into the calendar and move them from written to shot to posted. Monitoring becomes a cadence.',
      bullets: [
        'Idea inbox connected to the calendar',
        'Written, shot and posted statuses',
        'One view for the next drop',
      ],
      image: 'screenshots/zack-04-calendar-tab.webp',
      alt: 'Zack editorial calendar for a clothing brand',
    },
    {
      id: 'brand',
      label: 'Align',
      title: 'Teach Zack what your brand would never say.',
      body:
        'Analyze your account, upload your brand book and save every correction. The next scripts start from your voice, not generic AI tone.',
      bullets: [
        'Brand pillars and format analysis',
        'Brand book and briefs built in',
        'Corrections turned into rules',
      ],
      image: 'screenshots/zack-05-brand-tab.webp',
      alt: 'Brand DNA workspace in Zack',
    },
  ],

  editorialKicker: 'From signal to studio',
  editorialTitle: 'Built for teams with a drop to ship — not a feed to analyze.',
  editorialBody:
    'Solo founder, social manager or small creative team: Zack shortens the distance between “it works for them” and “this is what we shoot tomorrow”.',
  editorialCta: 'See Zack in action',
  founderPhotoAlt: 'Streetwear founder reviewing Instagram in their studio',
  shootPhotoAlt: 'Creative team producing streetwear content',

  systemKicker: 'System',
  flow: [
    {
      n: '01',
      title: 'Measure',
      body: 'Viral score = performance ÷ that account’s median. An 8k-view brand can beat an 800k one.',
    },
    {
      n: '02',
      title: 'Isolate',
      body: 'Zack keeps only the breakouts: the drop, fit check or lookbook that snaps the curve.',
    },
    {
      n: '03',
      title: 'Rebuild',
      body: 'On-screen OCR, timed script, two captions, product remake — structure, never copy-paste.',
    },
  ],

  leverKicker: 'Tech leverage',
  leverTitle: 'Not a caption generator. A pipeline.',
  stack: [
    { label: 'Signal', value: 'Score × against each brand’s median, per media type' },
    { label: 'Capture', value: 'Real Instagram scrape plus on-screen text reading' },
    { label: 'Voice', value: 'Brand book, saved rules, remembered corrections' },
    { label: 'Cadence', value: 'Automatic morning ranking, calendar written / shot / posted' },
  ],

  endTitle: 'Add your competitors. Shoot tomorrow.',

  tabs: {
    profil: 'Brand',
    veille: 'Radar',
    photos: 'Product',
    script: 'Script',
    calendrier: 'Calendar',
    repost: 'Repost',
    chat: 'Zack',
  },

  app: {
    brands: 'brands',
    outliers: 'outliers',
    localMode: 'local',
    scanning: 'scanning…',

    connection: 'Connecting',
    api: 'API',
    wakingUp: 'Waking the Render server…',
    retry: 'Retry',
    coldStart: (message) => `${message} — Render is waking up (30–60s), retrying automatically…`,
    apiDown: 'API unavailable — waking Render…',
    apiOffline: 'API offline. Run `npm run dev` in the zack folder.',

    jobRunningTitle: 'Scan running',
    jobRunningBody: 'Apify is scanning your brands (1–3 min). This page updates on its own.',
    veilleDone: 'Scan complete.',
    veilleFailed: 'Scan failed',

    chatGreeting:
      'Hey — add your competing brands, run a scan, or paste a drop/fit Reel. What are we doing?',
    chatPlaceholder: 'run a scan…',
    chatSend: 'Send',
    chatAria: 'Message Zack',

    errGeneric: 'error',
    errProfile: 'brand analysis failed',
    errUpload: 'document upload failed',
    errScript: 'script generation failed',
    errTranscribe: 'transcription failed',
    errDiscover: 'discovery failed',
    errRemake: 'remake failed',
    errShorten: 'shortening failed',
    errVeille: 'scan failed',
    errRepost: 'repost failed',

    repost: {
      kicker: 'Instagram → YouTube',
      title: 'Repost your Instagram content to your YouTube channel.',
      body:
        'Zack reads your Instagram account, pulls the videos, rewrites title and description for YouTube, then uploads them as Shorts. Each post is published only once.',
      sourceLabel: 'Source Instagram account',
      sourcePlaceholder: 'fredjoclothing.paris',
      connectTitle: 'YouTube channel',
      connectBody: 'Connect the channel that will receive the videos. Zack only asks for upload rights.',
      connect: 'Connect YouTube',
      connectedTo: (channel: string) => `Connected to ${channel}`,
      disconnect: 'Disconnect',
      notConfigured:
        'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (Google Cloud → OAuth) to enable publishing.',
      scan: 'Read my Instagram',
      scanning: 'Reading Instagram…',
      publish: (n: number) => (n <= 1 ? 'Publish to YouTube' : `Publish ${n} videos to YouTube`),
      publishing: 'Uploading to YouTube…',
      selectAll: 'Select all',
      clearSelection: 'Clear selection',
      noApify: 'APIFY_TOKEN missing — Zack cannot read Instagram.',
      empty: 'No video pulled yet.',
      emptyHint: 'Run “Read my Instagram” to load your latest posts.',
      alreadyPosted: 'Already on YouTube',
      photoOnly: 'Photo — no video to repost',
      watchOnYoutube: 'Watch on YouTube',
      viewSource: 'Instagram post',
      privacy: 'YouTube visibility',
      privacyPrivate: 'Private',
      privacyUnlisted: 'Unlisted',
      privacyPublic: 'Public',
      titleStyle: 'Title and description',
      styleAi: 'Rewritten by Claude (YouTube SEO)',
      styleCaption: 'Instagram caption as is',
      shortsLabel: 'Append #Shorts to the title',
      autoLabel: 'Auto repost every morning',
      maxPerRun: 'Videos per auto run',
      saved: 'Settings saved',
      lastScan: (when: string) => `Last Instagram read: ${when}`,
      lastRun: (when: string) => `Last repost: ${when}`,
      viewsLabel: 'views',
      historyTitle: 'Already reposted',
      historyEmpty: 'Nothing published to YouTube yet.',
      running: 'Repost running — you can leave this tab, it keeps going server-side.',
      copyrightNote:
        'Only repost your own videos. Licensed music inside a Reel can trigger a Content ID claim on YouTube.',
    },

    dnaKicker: 'Brand DNA',
    dnaTitle: 'Teach Zack your brand voice',
    dnaBody:
      'Zack reads your posts, your streetwear / DTC tone and your pillars — and also learns from your brand book and the rules you save.',
    handlePlaceholder: '@your_instagram_handle',
    handleAria: 'Your brand Instagram handle',
    analyzing: 'Analyzing 1–3 min…',
    analyze: 'Analyze my brand',

    methodTitle: 'Your writing method',
    methodBody: 'Drop a brief, a tone guide, or an old script. Zack uses it for every next one.',
    docNamePlaceholder: 'Document name',
    docContentPlaceholder: 'Paste your guide / brief here…',
    docSubmit: 'Upload document',
    remove: 'Remove',
    rulePlaceholder: 'Rule to save (e.g. hook under 8 words)',
    remember: 'Save rule',

    postsAnalyzed: 'posts analyzed',
    pillarsCount: 'content pillars',
    profileLearned: 'brand learned',
    yourVoice: 'Your voice',
    pillars: 'Pillars',
    strengths: 'Strengths',
    opportunities: 'Opportunities',
    views: 'views',
    likes: 'likes',

    followed: 'brands tracked',
    outliersThreshold: 'outliers ≥ 2.5×',
    bestScore: 'best score',
    competitorsTitle: 'Your competing brands',
    addBrandPlaceholder: '@brand_instagram',
    addBrandAria: 'Add a brand',
    add: 'Add',
    removeTitle: 'Remove',
    running: 'Scanning…',
    runApify: 'Run Apify scan',
    recompute: 'Recompute scan',
    discoverBrands: 'Discover brands',

    autoTitle: 'Automatic scan',
    autoBody:
      'Turn it on here plus the GitHub cron (every morning ~7am Paris). Zack wakes Render and runs the scan by itself.',
    enable: 'Enable',
    hour: 'Time',

    discoveryTitle: 'Brand discovery',
    verified: 'verified',
    follow: 'Track',

    manualTitle: 'Add a Reel manually',
    manualHandle: '@brand',
    manualViews: 'views (e.g. 842000)',
    manualBaseline: 'usual baseline (e.g. 38000)',
    manualCaption: 'hook / caption',
    save: 'Save',

    noCaption: 'Reel without caption',
    baseline: 'baseline',
    transcription: 'Transcription',
    transcribeCta: 'Transcribe + captions',
    scriptCta: 'Generate script →',
    viralScore: 'viral score',
    thumbAlt: (handle) => `Thumbnail @${handle}`,
    postAlt: (handle) => `Post @${handle}`,

    productTitle: 'Product photos & carousels',
    productBody:
      'Lookbooks, packing, fit checks. Zack surfaces what lands for competitors, explains why, then rebuilds it: identical or in your brand voice.',
    productEmpty: 'No outlier photo/carousel yet. Run an Apify scan.',
    noPostCaption: 'Post without caption',
    carousel: 'carousel',
    photo: 'photo',
    baselineLikes: 'likes',
    analyzingPost: 'Zack is analyzing…',
    remakeCta: 'Rebuild this post',
    whyItWorks: 'Why it works',
    identical: 'Identical',
    inVoice: 'In my voice',
    caption: 'Caption',
    shotList: 'Shot list',

    noScriptTitle: 'No script yet',
    noScriptBody: 'From Radar, hit “Generate script” on an outlier.',
    generatedOn: 'Generated',
    beats: 'beats',
    shorten: 'Shorten the hook',
    subtitle: 'Subtitle',
    captionsTitle: 'Captions',
    punchy: 'A — punchy',
    soft: 'B — soft',
    ruleTitle: 'Save a rule',
    ruleBody: 'Fixing a script? Zack can keep that rule for every next one.',
    ruleExample: 'e.g. always open with a question',

    ideasTitle: 'Idea inbox',
    ideasBody: 'Add an idea, then drag it onto a day. Click a chip to cycle written → shot → posted.',
    ideaPlaceholder: 'idea / title',
    addToInbox: 'Add to inbox',
    noIdeas: 'No idea waiting',
    dragHint: 'Drag onto a day · click to change status',
    weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    locale: 'en-GB',
  },
}

export const dict: Record<Lang, Copy> = { fr, en }

export function detectLang(): Lang {
  if (typeof window === 'undefined') return 'fr'
  const saved = window.localStorage.getItem('zack-lang')
  if (saved === 'fr' || saved === 'en') return saved
  return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export function persistLang(lang: Lang) {
  try {
    window.localStorage.setItem('zack-lang', lang)
  } catch {
    /* private mode */
  }
}
