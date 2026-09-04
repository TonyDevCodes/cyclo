import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type {
  Preferences,
  PriceChange,
  Subscription,
  SubscriptionDraft,
} from '../types'
import { DEFAULT_PREFERENCES } from '../types'
import {
  clearAllData,
  db,
  loadPreferences,
  replaceAll,
  savePreferences,
} from '../lib/db'
import { normalizeNextRenewal, todayISO } from '../lib/billing'
import { setLanguage } from '../i18n'

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

interface AppContextValue {
  subscriptions: Subscription[]
  preferences: Preferences
  ready: boolean
  addSubscription: (draft: SubscriptionDraft) => Promise<Subscription>
  updateSubscription: (id: string, draft: SubscriptionDraft) => Promise<void>
  deleteSubscription: (id: string) => Promise<void>
  setActive: (id: string, active: boolean) => Promise<void>
  markNotified: (ids: string[], onDate: string) => Promise<void>
  updatePreferences: (patch: Partial<Preferences>) => Promise<void>
  importData: (subscriptions: Subscription[], preferences: Preferences) => Promise<void>
  wipe: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  const subscriptions = useLiveQuery(() => db.subscriptions.toArray(), [])

  // Initial preferences load.
  useEffect(() => {
    let cancelled = false
    void loadPreferences().then((p) => {
      if (cancelled) return
      setPreferences(p)
      setLanguage(p.language)
      setPrefsLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const persistPreferences = useCallback(async (next: Preferences) => {
    setPreferences(next)
    await savePreferences(next)
  }, [])

  const updatePreferences = useCallback(
    async (patch: Partial<Preferences>) => {
      const next = { ...preferences, ...patch }
      if (patch.language && patch.language !== preferences.language) {
        setLanguage(patch.language)
      }
      await persistPreferences(next)
    },
    [preferences, persistPreferences],
  )

  const addSubscription = useCallback(async (draft: SubscriptionDraft) => {
    const now = new Date().toISOString()
    const sub: Subscription = {
      ...draft,
      id: newId(),
      nextRenewal: normalizeNextRenewal(
        draft.nextRenewal,
        draft.billingCycle,
        draft.customIntervalDays,
      ),
      createdAt: now,
      updatedAt: now,
    }
    await db.subscriptions.put(sub)
    return sub
  }, [])

  const updateSubscription = useCallback(
    async (id: string, draft: SubscriptionDraft) => {
      const existing = await db.subscriptions.get(id)
      if (!existing) return

      // Record a price change (previous price + date) so the Insights page can
      // show a local, offline price history.
      let priceHistory = existing.priceHistory
      if (Number.isFinite(draft.price) && draft.price !== existing.price) {
        const change: PriceChange = {
          previousPrice: existing.price,
          newPrice: draft.price,
          currency: existing.currency,
          changedAt: todayISO(),
        }
        priceHistory = [...(existing.priceHistory ?? []), change]
      }

      const next: Subscription = {
        ...existing,
        ...draft,
        id,
        nextRenewal: normalizeNextRenewal(
          draft.nextRenewal,
          draft.billingCycle,
          draft.customIntervalDays,
        ),
        priceHistory,
        updatedAt: new Date().toISOString(),
      }
      await db.subscriptions.put(next)
    },
    [],
  )

  const deleteSubscription = useCallback(async (id: string) => {
    await db.subscriptions.delete(id)
  }, [])

  const setActive = useCallback(async (id: string, active: boolean) => {
    await db.subscriptions.update(id, {
      active,
      updatedAt: new Date().toISOString(),
    })
  }, [])

  const markNotified = useCallback(async (ids: string[], onDate: string) => {
    await db.transaction('rw', db.subscriptions, async () => {
      for (const id of ids) {
        await db.subscriptions.update(id, { lastNotifiedFor: onDate })
      }
    })
  }, [])

  const importData = useCallback(
    async (nextSubs: Subscription[], nextPrefs: Preferences) => {
      await replaceAll(nextSubs, nextPrefs)
      setPreferences(nextPrefs)
      setLanguage(nextPrefs.language)
    },
    [],
  )

  const wipe = useCallback(async () => {
    await clearAllData()
    setPreferences(DEFAULT_PREFERENCES)
    setLanguage(DEFAULT_PREFERENCES.language)
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      subscriptions: subscriptions ?? [],
      preferences,
      ready: prefsLoaded && subscriptions !== undefined,
      addSubscription,
      updateSubscription,
      deleteSubscription,
      setActive,
      markNotified,
      updatePreferences,
      importData,
      wipe,
    }),
    [
      subscriptions,
      preferences,
      prefsLoaded,
      addSubscription,
      updateSubscription,
      deleteSubscription,
      setActive,
      markNotified,
      updatePreferences,
      importData,
      wipe,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within an AppProvider')
  return ctx
}
