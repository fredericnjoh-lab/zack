export type Lang = 'fr' | 'en'

export const dict = {
  fr: {
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
  },

  en: {
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
  },
} as const

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
