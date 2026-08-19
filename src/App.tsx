import { useState } from 'react'
import { AppShell } from './components/AppShell'
import { Landing } from './components/Landing'
import { StickyHeader } from './components/StickyHeader'

export default function App() {
  const [mode, setMode] = useState<'landing' | 'app'>('landing')

  if (mode === 'app') {
    return (
      <div className="app-root">
        <AppShell onBack={() => setMode('landing')} />
      </div>
    )
  }

  return (
    <div className="app-root app-landing">
      <StickyHeader onTry={() => setMode('app')} />
      <Landing onTry={() => setMode('app')} />
    </div>
  )
}
