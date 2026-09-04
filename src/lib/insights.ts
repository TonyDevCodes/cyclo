import type {
  AnnualSwitchInsight,
  CategoryId,
  CategorySpend,
  OverlapInsight,
  PriceHistoryInsight,
  Subscription,
  TrendPoint,
} from '../types'
import { annualAmount, monthlyAmount } from './billing'
import { convert } from './money'
import { CATEGORY_IDS } from './categories'
import { annualPlanEstimate } from './annualPlans'

/** Monthly cost of a subscription expressed in the primary currency. */
export function monthlyInPrimary(sub: Subscription, primary: string): number {
  return convert(monthlyAmount(sub), sub.currency, primary)
}

export function annualInPrimary(sub: Subscription, primary: string): number {
  return convert(annualAmount(sub), sub.currency, primary)
}

export function totalMonthly(subs: Subscription[], primary: string): number {
  return subs
    .filter((s) => s.active)
    .reduce((sum, s) => sum + monthlyInPrimary(s, primary), 0)
}

export function totalAnnual(subs: Subscription[], primary: string): number {
  return totalMonthly(subs, primary) * 12
}

/** True when active subscriptions span more than one currency. */
export function hasMixedCurrencies(subs: Subscription[], primary: string): boolean {
  return subs.some((s) => s.active && s.currency !== primary)
}

export function spendByCategory(subs: Subscription[], primary: string): CategorySpend[] {
  const active = subs.filter((s) => s.active)
  const rows: CategorySpend[] = []
  for (const category of CATEGORY_IDS) {
    const inCat = active.filter((s) => s.category === category)
    if (inCat.length === 0) continue
    const monthly = inCat.reduce((sum, s) => sum + monthlyInPrimary(s, primary), 0)
    rows.push({ category, monthly, annual: monthly * 12, count: inCat.length })
  }
  return rows.sort((a, b) => b.monthly - a.monthly)
}

/**
 * The single category with the highest monthly spend right now, or null when
 * there is no spend to rank. Recomputed from the current data on every call —
 * it never pins to a category.
 */
export function topSpendCategory(
  subs: Subscription[],
  primary: string,
): CategoryId | null {
  const rows = spendByCategory(subs, primary)
  if (rows.length === 0 || rows[0].monthly <= 0) return null
  return rows[0].category
}

/**
 * Projected monthly spend for each of the last `months` months.
 * A subscription contributes its normalised monthly cost from the month it was
 * created, so the line genuinely grows as the user's stack is built up.
 */
export function spendTrend(
  subs: Subscription[],
  primary: string,
  months = 12,
  lang: 'en' | 'de' | 'fr' | 'es' = 'en',
): TrendPoint[] {
  const now = new Date()
  const points: TrendPoint[] = []
  const fmt = new Intl.DateTimeFormat(
    { en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' }[lang],
    { month: 'short' },
  )
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthly = subs
      .filter((s) => s.active && new Date(s.createdAt) <= endOfMonth)
      .reduce((sum, s) => sum + monthlyInPrimary(s, primary), 0)
    points.push({ month: monthKey, label: fmt.format(d), monthly })
  }
  return points
}

/**
 * Overlaps: two or more active subscriptions sharing a category.
 * Framed as a gentle "possible savings" hint — the estimated saving assumes the
 * user could drop everything except the cheapest option in that category.
 */
export function detectOverlaps(subs: Subscription[], primary: string): OverlapInsight[] {
  const active = subs.filter((s) => s.active)
  const groups = new Map<CategoryId, Subscription[]>()
  for (const s of active) {
    const list = groups.get(s.category) ?? []
    list.push(s)
    groups.set(s.category, list)
  }

  const result: OverlapInsight[] = []
  for (const [category, list] of groups) {
    if (list.length < 2) continue
    const withCost = list
      .map((s) => ({ s, m: monthlyInPrimary(s, primary) }))
      .sort((a, b) => b.m - a.m)
    const monthlyTotal = withCost.reduce((sum, x) => sum + x.m, 0)
    const cheapest = withCost[withCost.length - 1].m
    result.push({
      category,
      subscriptions: withCost.map((x) => x.s),
      monthlyTotal,
      potentialMonthlySaving: monthlyTotal - cheapest,
    })
  }
  return result.sort((a, b) => b.potentialMonthlySaving - a.potentialMonthlySaving)
}

export interface UpcomingRenewal {
  sub: Subscription
  days: number
}

export function upcomingRenewals(
  subs: Subscription[],
  withinDays = 45,
): UpcomingRenewal[] {
  return subs
    .filter((s) => s.active)
    .map((s) => ({ sub: s, days: daysUntilIso(s.nextRenewal) }))
    .filter((r) => r.days <= withinDays)
    .sort((a, b) => a.days - b.days)
}

function daysUntilIso(iso: string): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, (m || 1) - 1, d || 1).getTime()
  return Math.round((target - start) / 86_400_000)
}

export interface ExtremeSubs {
  mostExpensive?: { sub: Subscription; monthly: number }
  cheapest?: { sub: Subscription; monthly: number }
  averageMonthly: number
}

export function extremes(subs: Subscription[], primary: string): ExtremeSubs {
  const active = subs.filter((s) => s.active)
  if (active.length === 0) return { averageMonthly: 0 }
  const ranked = active
    .map((sub) => ({ sub, monthly: monthlyInPrimary(sub, primary) }))
    .sort((a, b) => b.monthly - a.monthly)
  const average =
    ranked.reduce((sum, r) => sum + r.monthly, 0) / ranked.length
  return {
    mostExpensive: ranked[0],
    cheapest: ranked[ranked.length - 1],
    averageMonthly: average,
  }
}

/**
 * Subscriptions that have had at least one recorded price change, framed as a
 * gentle "here's how this has moved" note. Prices stay in each subscription's
 * own currency — no conversion, so the numbers match what the user typed.
 */
export function priceChanges(subs: Subscription[]): PriceHistoryInsight[] {
  const out: PriceHistoryInsight[] = []
  for (const sub of subs) {
    const hist = sub.priceHistory
    if (!hist || hist.length === 0) continue
    const firstPrice = hist[0].previousPrice
    const currentPrice = sub.price
    if (!(firstPrice > 0)) continue
    out.push({
      sub,
      firstPrice,
      currentPrice,
      currency: sub.currency,
      pctChange: ((currentPrice - firstPrice) / firstPrice) * 100,
      since: hist[0].changedAt,
      changeCount: hist.length,
    })
  }
  return out.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange))
}

/**
 * Monthly subscriptions whose service (per the local catalog) commonly has a
 * cheaper annual plan. The saving is a rough, clearly-labelled estimate — a
 * conservative discount applied to twelve months at the current monthly price.
 * Same "gentle observation, not a verdict" framing as the overlap detector.
 */
export function annualSwitchSuggestions(subs: Subscription[]): AnnualSwitchInsight[] {
  const out: AnnualSwitchInsight[] = []
  for (const sub of subs) {
    if (!sub.active || sub.billingCycle !== 'monthly') continue
    const est = annualPlanEstimate(sub.name)
    if (!est) continue
    const yearAtMonthly = sub.price * 12
    const estimatedAnnualCost = yearAtMonthly * (1 - est.discountPct / 100)
    const estimatedSaving = yearAtMonthly - estimatedAnnualCost
    if (estimatedSaving < 1) continue
    out.push({
      sub,
      yearAtMonthly,
      estimatedAnnualCost,
      estimatedSaving,
      discountPct: est.discountPct,
    })
  }
  return out.sort((a, b) => b.estimatedSaving - a.estimatedSaving)
}
