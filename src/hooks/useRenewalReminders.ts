import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { runReminderCheck } from '../lib/notifications'
import { monthlyAmount } from '../lib/billing'
import { formatMoney } from '../lib/money'
import type { Subscription } from '../types'

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // hourly while the app is open

/**
 * While Cyclo is open, periodically checks for renewals inside the lead window
 * and fires local notifications. Purely client-side: there is no push server.
 */
export function useRenewalReminders(): void {
  const { subscriptions, preferences, markNotified } = useApp()
  const { t, i18n } = useTranslation()

  useEffect(() => {
    if (!preferences.notificationsEnabled) return

    let stopped = false

    const amountFor = (sub: Subscription) =>
      formatMoney(monthlyAmount(sub), sub.currency, preferences.language)

    const copy = {
      title: (name: string) => t('notify.renewalTitle', { name }),
      body: (name: string, days: number, amount: string) => {
        if (days <= 0) return t('notify.renewalBodyToday', { name, amount })
        if (days === 1) return t('notify.renewalBodyTomorrow', { name, amount })
        return t('notify.renewalBody', { name, amount, count: days })
      },
    }

    const check = async () => {
      const notified = await runReminderCheck(
        subscriptions,
        preferences.notificationLeadDays,
        copy,
        amountFor,
      )
      if (!stopped && notified.length > 0) {
        await markNotified(notified, new Date().toISOString().slice(0, 10))
      }
    }

    const first = setTimeout(check, 4000)
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    return () => {
      stopped = true
      clearTimeout(first)
      clearInterval(interval)
    }
  }, [
    subscriptions,
    preferences.notificationsEnabled,
    preferences.notificationLeadDays,
    preferences.language,
    markNotified,
    t,
    i18n.language,
  ])
}
