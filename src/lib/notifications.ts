import type { Subscription } from '../types'
import { daysUntil, todayISO } from './billing'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission {
  return notificationsSupported() ? Notification.permission : 'denied'
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

async function show(title: string, options: NotificationOptions): Promise<void> {
  if (notificationPermission() !== 'granted') return
  // Prefer the service worker registration so notifications survive a backgrounded tab.
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, options)
      return
    } catch {
      /* fall through to page-level notification */
    }
  }
  try {
    new Notification(title, options)
  } catch {
    /* ignore — some browsers only allow SW notifications */
  }
}

export function showTestNotification(title: string, body: string): Promise<void> {
  return show(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'cyclo-test',
  })
}

export interface DueReminder {
  sub: Subscription
  days: number
}

/** Subscriptions whose next renewal falls within the lead window and today. */
export function dueReminders(subs: Subscription[], leadDays: number): DueReminder[] {
  const today = todayISO()
  return subs
    .filter((s) => s.active)
    .map((s) => ({ sub: s, days: daysUntil(s.nextRenewal) }))
    .filter(({ sub, days }) => days >= 0 && days <= leadDays && sub.lastNotifiedFor !== today)
}

export interface ReminderCopy {
  title: (name: string) => string
  body: (name: string, days: number, amount: string) => string
}

/**
 * Fire reminders for everything currently due. Returns the ids that were notified
 * so the caller can persist `lastNotifiedFor` and avoid repeats within a day.
 */
export async function runReminderCheck(
  subs: Subscription[],
  leadDays: number,
  copy: ReminderCopy,
  amountFor: (sub: Subscription) => string,
): Promise<string[]> {
  if (notificationPermission() !== 'granted') return []
  const due = dueReminders(subs, leadDays)
  const notified: string[] = []
  for (const { sub, days } of due) {
    await show(copy.title(sub.name), {
      body: copy.body(sub.name, days, amountFor(sub)),
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `cyclo-renewal-${sub.id}`,
      requireInteraction: false,
    })
    notified.push(sub.id)
  }
  return notified
}
