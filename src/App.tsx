import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { Landing } from './components/Landing'
import { StickyHeader } from './components/StickyHeader'
import { detectLang, persistLang, type Lang } from './lib/i18n'

export default function App() {
  const [mode, setMode] = useState<'landing' | 'app'>('landing')
  const [lang, setLang] = useState<Lang>(() => detectLang())

  useEffect(() => {
    persistLang(lang)
    document.documentElement.lang = lang
  }, [lang])

  if (mode === 'app') {
    return (
      <div className="app-root">
        <AppShell onBack={() => setMode('landing')} lang={lang} onLang={setLang} />
      </div>
    )
  }

  return (
    <div className="app-root app-landing">
      <StickyHeader onTry={() => setMode('app')} lang={lang} onLang={setLang} />
      <Landing onTry={() => setMode('app')} lang={lang} />
    </div>
  )
}
