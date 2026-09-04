import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppProvider, useApp } from './context/AppContext'
import { useThemeEffect } from './hooks/useThemeEffect'
import { useRenewalReminders } from './hooks/useRenewalReminders'
import { Sidebar, MobileNav, type ViewId } from './components/Nav'
import { DashboardView } from './components/DashboardView'
import { SubscriptionsView } from './components/SubscriptionsView'
import { InsightsView } from './components/InsightsView'
import { SettingsView } from './components/SettingsView'

function Shell() {
  const { t } = useTranslation()
  const { preferences, ready } = useApp()
  const [view, setView] = useState<ViewId>('dashboard')
  const [addSignal, setAddSignal] = useState(0)

  useThemeEffect(preferences.theme)
  useRenewalReminders()

  const navigate = useCallback((v: ViewId) => {
    setView(v)
    window.scrollTo({ top: 0 })
  }, [])

  const triggerAdd = useCallback(() => {
    setView('subscriptions')
    setAddSignal((n) => n + 1)
  }, [])

  if (!ready) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>{t('app.name')}</span>
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar view={view} onNavigate={navigate} />
      <main className="main">
        <div className="main__inner">
          {view === 'dashboard' && (
            <DashboardView
              onAdd={triggerAdd}
              onGoInsights={() => navigate('insights')}
              onGoSubscriptions={() => navigate('subscriptions')}
            />
          )}
          {view === 'subscriptions' && <SubscriptionsView addSignal={addSignal} />}
          {view === 'insights' && <InsightsView />}
          {view === 'settings' && <SettingsView />}
        </div>
      </main>
      <MobileNav view={view} onNavigate={navigate} />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
