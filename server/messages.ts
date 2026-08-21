import type { Lang } from './fashion.ts'

type Vars = Record<string, string | number>

const messages = {
  fr: {
    accountRequired: 'ajoute au moins 1 compte',
    handleRequired: 'handle requis',
    alreadyTracked: 'déjà suivi',
    maxAccounts: 'max 20 comptes',
    veilleStarted: 'Veille lancée en arrière-plan (1–3 min). La page se met à jour toute seule.',
    veilleRunning: 'Une veille est déjà en cours…',
    veilleNotStarted: 'Veille non démarrée',
    cronStarted: 'Veille auto démarrée (async). Le serveur reste réveillé le temps du scrape.',
    cronBadSecret: 'cron secret invalide',
    chatNeedBrand: 'Ajoute au moins une marque concurrente avant de lancer une veille.',
    chatVeilleStarted: ({ n }: Vars) =>
      `Veille lancée en arrière-plan sur ${n} marques. Reviens dans 1–3 min — l’onglet Veille se rafraîchit tout seul.`,
    chatVeilleBusy: 'Une veille tourne déjà. Je te préviens quand c’est bon.',
    chatVeilleFail: ({ err }: Vars) => `Impossible de lancer : ${err}`,
    chatRankingTitle: 'Voici le palmarès :',
    chatNoOutlier: 'Pas encore d’exception. Lance une veille d’abord.',
    chatNoScript:
      'Pas de script encore. Génère-en un depuis Veille, puis redemande « raccourcis mon accroche ».',
    chatHookDone: ({ hook, title }: Vars) =>
      `Accroche raccourcie : « ${hook} ». Appliquée au script « ${title} ».`,
    chatDiscoverTitle: 'Marques à surveiller :',
    chatNoDiscovery: 'Aucune suggestion pour l’instant.',
    chatNoReelToTranscribe: 'Aucun Reel exceptionnel à transcrire. Lance une veille.',
    chatTranscribed: ({ handle, source }: Vars) => `Transcription de @${handle} prête (${source}).`,
    chatRuleAsk: 'Dis-moi la règle à retenir, ex. « retenir : phrases de max 8 mots ».',
    chatRuleSaved: ({ rule }: Vars) => `Règle retenue pour les prochains scripts : « ${rule} ».`,
    chatIdeaAdded: ({ label }: Vars) =>
      `Idée « ${label} » ajoutée dans la boîte à idées de l’Agenda — glisse-la sur un jour.`,
    chatHelp: ({ accounts, hits, apify, llm }: Vars) =>
      `Je peux agir. Essaie : « lance une veille », « montre-moi les meilleurs », « raccourcis mon accroche », « découvre des marques », « transcris », « retenir : … », « planifie … ». État : ${accounts} marques · ${hits} exceptions · Apify ${apify} · LLM ${llm}.`,
    chatRepostStarted: ({ handle, n }: Vars) =>
      `Repost lancé : je republie ${n} vidéo(s) de @${handle} sur YouTube. L’onglet Repost suit l’avancement.`,
    chatRepostBusy: 'Un repost tourne déjà. Je te préviens quand c’est publié.',
    chatRepostFail: ({ err }: Vars) => `Repost impossible : ${err}`,
    ideaFallback: 'Idée Zack',
    privateAccount: ({ handle }: Vars) =>
      `Aucune publication récupérée pour @${handle}. Vérifie l’orthographe et que le compte est public (Zack ne peut pas lire un compte privé).`,
  },
  en: {
    accountRequired: 'add at least 1 brand',
    handleRequired: 'handle required',
    alreadyTracked: 'already tracked',
    maxAccounts: 'max 20 brands',
    veilleStarted: 'Scan started in the background (1–3 min). This page updates on its own.',
    veilleRunning: 'A scan is already running…',
    veilleNotStarted: 'Scan not started',
    cronStarted: 'Auto scan started (async). The server stays awake for the scrape.',
    cronBadSecret: 'invalid cron secret',
    chatNeedBrand: 'Add at least one competing brand before running a scan.',
    chatVeilleStarted: ({ n }: Vars) =>
      `Scan started in the background across ${n} brands. Come back in 1–3 min — the Radar tab refreshes itself.`,
    chatVeilleBusy: 'A scan is already running. I’ll tell you when it lands.',
    chatVeilleFail: ({ err }: Vars) => `Could not start: ${err}`,
    chatRankingTitle: 'Here is the ranking:',
    chatNoOutlier: 'No outlier yet. Run a scan first.',
    chatNoScript: 'No script yet. Generate one from Radar, then ask again to shorten the hook.',
    chatHookDone: ({ hook, title }: Vars) =>
      `Hook shortened: “${hook}”. Applied to the script “${title}”.`,
    chatDiscoverTitle: 'Brands worth tracking:',
    chatNoDiscovery: 'No suggestion right now.',
    chatNoReelToTranscribe: 'No outlier Reel to transcribe. Run a scan.',
    chatTranscribed: ({ handle, source }: Vars) => `Transcription for @${handle} ready (${source}).`,
    chatRuleAsk: 'Tell me the rule to save, e.g. “save: sentences under 8 words”.',
    chatRuleSaved: ({ rule }: Vars) => `Rule saved for the next scripts: “${rule}”.`,
    chatIdeaAdded: ({ label }: Vars) =>
      `Idea “${label}” added to the Calendar inbox — drag it onto a day.`,
    chatHelp: ({ accounts, hits, apify, llm }: Vars) =>
      `I can act. Try: “run a scan”, “show me the best”, “shorten my hook”, “discover brands”, “transcribe”, “save: …”, “schedule …”. State: ${accounts} brands · ${hits} outliers · Apify ${apify} · LLM ${llm}.`,
    chatRepostStarted: ({ handle, n }: Vars) =>
      `Repost started: pushing ${n} video(s) from @${handle} to YouTube. The Repost tab tracks progress.`,
    chatRepostBusy: 'A repost is already running. I’ll tell you when it lands.',
    chatRepostFail: ({ err }: Vars) => `Cannot repost: ${err}`,
    ideaFallback: 'Zack idea',
    privateAccount: ({ handle }: Vars) =>
      `No posts retrieved for @${handle}. Check the spelling and that the account is public (Zack cannot read a private account).`,
  },
} as const

export function pickLang(raw: unknown): Lang {
  return raw === 'en' ? 'en' : 'fr'
}

export function t(lang: Lang) {
  return messages[lang]
}
