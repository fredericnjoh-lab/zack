export type Lang = 'fr' | 'en'

type Copy = {
  tagline: string
  open: string
  back: string

  heroTitle: string
  heroLead: string
  heroMeta: string

  systemKicker: string
  flow: { n: string; title: string; body: string }[]

  leverKicker: string
  leverTitle: string
  stack: { label: string; value: string }[]

  endTitle: string

  tabs: Record<'profil' | 'veille' | 'photos' | 'script' | 'calendrier' | 'chat', string>
  app: AppCopy
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
