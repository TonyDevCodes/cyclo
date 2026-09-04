// Shared domain types for Cyclo. No enums (project uses `erasableSyntaxOnly`) —
// string-literal unions plus `as const` tables instead.

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export const BILLING_CYCLES: readonly BillingCycle[] = [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom',
] as const

export type CategoryId =
  | 'streaming'
  | 'music'
  | 'software'
  | 'cloud'
  | 'ai'
  | 'gaming'
  | 'news'
  | 'fitness'
  | 'insurance'
  | 'domains'
  | 'education'
  | 'shopping'
  | 'finance'
  | 'utilities'
  | 'other'

/** One recorded change to a subscription's price, kept for local price history. */
export interface PriceChange {
  /** Price before this change, in `currency`. */
  previousPrice: number
  /** Price after this change, in `currency`. */
  newPrice: number
  /** Currency the prices are expressed in (the subscription's currency at the time). */
  currency: string
  /** ISO date (yyyy-mm-dd) the change was recorded. */
  changedAt: string
}

export interface Subscription {
  id: string
  name: string
  price: number
  currency: string
  billingCycle: BillingCycle
  /** Days between charges — only meaningful when billingCycle === 'custom'. */
  customIntervalDays?: number
  category: CategoryId
  /** ISO date (yyyy-mm-dd) of the next renewal / charge. */
  nextRenewal: string
  notes?: string
  active: boolean
  /** ISO timestamps. */
  createdAt: string
  updatedAt: string
  /** ISO date of the last day a renewal reminder was shown, to avoid repeats. */
  lastNotifiedFor?: string
  /** Oldest-first log of price edits. Absent until the price is first changed. */
  priceHistory?: PriceChange[]
}

/** Shape used by the add/edit form before an id / timestamps are attached. */
export type SubscriptionDraft = Omit<
  Subscription,
  'id' | 'createdAt' | 'updatedAt' | 'lastNotifiedFor' | 'priceHistory'
>

export type ThemeMode = 'dark' | 'light'
export type AppLanguage = 'en' | 'de' | 'fr' | 'es'

export type SortKey = 'renewal' | 'price' | 'name' | 'category'

export interface Preferences {
  theme: ThemeMode
  language: AppLanguage
  primaryCurrency: string
  /** Days before a renewal that a reminder should fire. */
  notificationLeadDays: number
  notificationsEnabled: boolean
  listSort: SortKey
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  language: 'en',
  primaryCurrency: 'EUR',
  notificationLeadDays: 3,
  notificationsEnabled: false,
  listSort: 'renewal',
}

export interface BackupFile {
  app: 'cyclo'
  version: 1
  exportedAt: string
  subscriptions: Subscription[]
  preferences: Preferences
}

/** A detected overlap: more than one active subscription in a category. */
export interface OverlapInsight {
  category: CategoryId
  subscriptions: Subscription[]
  monthlyTotal: number
  /** Rough "keep the cheapest" saving estimate, in the primary currency. */
  potentialMonthlySaving: number
}

export interface CategorySpend {
  category: CategoryId
  monthly: number
  annual: number
  count: number
}

/** A subscription that has had at least one recorded price change. */
export interface PriceHistoryInsight {
  sub: Subscription
  /** Price before the very first recorded change, in the subscription's currency. */
  firstPrice: number
  /** Current price, in the subscription's currency. */
  currentPrice: number
  currency: string
  /** Percentage difference between `firstPrice` and `currentPrice`. */
  pctChange: number
  /** ISO date (yyyy-mm-dd) of the first recorded change. */
  since: string
  /** Total number of recorded changes. */
  changeCount: number
}

/** A monthly subscription whose known service usually has a cheaper annual plan. */
export interface AnnualSwitchInsight {
  sub: Subscription
  /** Twelve months at the current monthly price, in the subscription's currency. */
  yearAtMonthly: number
  /** Estimated cost of a year on an annual plan, in the subscription's currency. */
  estimatedAnnualCost: number
  /** Estimated yearly saving, in the subscription's currency. */
  estimatedSaving: number
  /** Rough discount percentage the estimate assumes. */
  discountPct: number
}

export interface TrendPoint {
  /** yyyy-mm */
  month: string
  label: string
  monthly: number
}
