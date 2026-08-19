import { dict, type Lang } from '../lib/i18n'

type StickyHeaderProps = {
  onTry: () => void
  lang: Lang
  onLang: (lang: Lang) => void
}

export function StickyHeader({ onTry, lang, onLang }: StickyHeaderProps) {
  const t = dict[lang]

  return (
    <header className="sticky-bar sticky-clinical">
      <div className="brand">
        <strong>Zack</strong>
        <span>{t.tagline}</span>
      </div>
      <div className="header-actions">
        <LangToggle lang={lang} onLang={onLang} />
        <button type="button" className="cta ghost" onClick={onTry}>
          {t.open}
        </button>
      </div>
    </header>
  )
}

export function LangToggle({ lang, onLang }: { lang: Lang; onLang: (lang: Lang) => void }) {
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      {(['fr', 'en'] as const).map((code) => (
        <button
          key={code}
          type="button"
          className={`lang-btn${lang === code ? ' active' : ''}`}
          aria-pressed={lang === code}
          onClick={() => onLang(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
