import type { BillingCycle, Subscription } from '../types'

export const DAY_MS = 86_400_000
const AVG_DAYS_PER_MONTH = 365.25 / 12

/** Days in one billing period. */
export function cycleDays(cycle: BillingCycle, customIntervalDays?: number): number {
  switch (cycle) {
    case 'weekly':
      return 7
    case 'monthly':
      return AVG_DAYS_PER_MONTH
    case 'quarterly':
      return AVG_DAYS_PER_MONTH * 3
    case 'yearly':
      return 365.25
    case 'custom':
      return Math.max(1, customIntervalDays ?? 30)
  }
}

/** Cost of a subscription normalised to one month, in its own currency. */
export function monthlyAmount(sub: Pick<Subscription, 'price' | 'billingCycle' | 'customIntervalDays'>): number {
  const days = cycleDays(sub.billingCycle, sub.customIntervalDays)
  return (sub.price * AVG_DAYS_PER_MONTH) / days
}

/** Cost normalised to one year, in its own currency. */
export function annualAmount(sub: Pick<Subscription, 'price' | 'billingCycle' | 'customIntervalDays'>): number {
  return monthlyAmount(sub) * 12
}

/** Parse a yyyy-mm-dd string to a local Date at midnight. */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** Format a Date to yyyy-mm-dd (local). */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** Whole days from today until the given renewal date (negative = overdue). */
export function daysUntil(iso: string, from: Date = new Date()): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const target = parseDate(iso).getTime()
  return Math.round((target - start) / DAY_MS)
}

/** Advance a date by one billing cycle, keeping the day-of-month where possible. */
export function addCycle(iso: string, cycle: BillingCycle, customIntervalDays?: number): string {
  const d = parseDate(iso)
  switch (cycle) {
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      break
    case 'quarterly':
      d.setMonth(d.getMonth() + 3)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1)
      break
    case 'custom':
      d.setDate(d.getDate() + Math.max(1, customIntervalDays ?? 30))
      break
  }
  return toISODate(d)
}

/**
 * Roll a renewal date forward until it is today or later.
 * Used so a subscription that was added with a past date still shows a sensible
 * "next renewal" without the user having to touch it.
 */
export function normalizeNextRenewal(
  iso: string,
  cycle: BillingCycle,
  customIntervalDays?: number,
): string {
  let next = iso
  let guard = 0
  while (daysUntil(next) < 0 && guard < 600) {
    next = addCycle(next, cycle, customIntervalDays)
    guard++
  }
  return next
}
