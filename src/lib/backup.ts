import type { BackupFile, Preferences, PriceChange, Subscription } from '../types'
import { BILLING_CYCLES, DEFAULT_PREFERENCES } from '../types'
import { CATEGORY_IDS } from './categories'

export function buildBackup(
  subscriptions: Subscription[],
  preferences: Preferences,
): BackupFile {
  return {
    app: 'cyclo',
    version: 1,
    exportedAt: new Date().toISOString(),
    subscriptions,
    preferences,
  }
}

export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cyclo-backup-${backup.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export class ImportError extends Error {}

function isCategory(value: unknown): value is Subscription['category'] {
  return typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value)
}

function isCycle(value: unknown): value is Subscription['billingCycle'] {
  return typeof value === 'string' && (BILLING_CYCLES as readonly string[]).includes(value)
}

function coerceSubscription(raw: unknown, index: number): Subscription {
  if (typeof raw !== 'object' || raw === null) {
    throw new ImportError(`Entry ${index + 1} is not an object`)
  }
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  const price = typeof r.price === 'number' ? r.price : Number(r.price)
  if (!name) throw new ImportError(`Entry ${index + 1} is missing a name`)
  if (!Number.isFinite(price)) throw new ImportError(`"${name}" has an invalid price`)

  const now = new Date().toISOString()
  const nextRenewal =
    typeof r.nextRenewal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.nextRenewal)
      ? r.nextRenewal
      : now.slice(0, 10)

  return {
    id: typeof r.id === 'string' && r.id ? r.id : cryptoId(),
    name,
    price,
    currency: typeof r.currency === 'string' && r.currency ? r.currency : 'EUR',
    billingCycle: isCycle(r.billingCycle) ? r.billingCycle : 'monthly',
    customIntervalDays:
      typeof r.customIntervalDays === 'number' ? r.customIntervalDays : undefined,
    category: isCategory(r.category) ? r.category : 'other',
    nextRenewal,
    notes: typeof r.notes === 'string' ? r.notes : undefined,
    active: typeof r.active === 'boolean' ? r.active : true,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
    lastNotifiedFor:
      typeof r.lastNotifiedFor === 'string' ? r.lastNotifiedFor : undefined,
    priceHistory: coercePriceHistory(r.priceHistory),
  }
}

function coercePriceHistory(raw: unknown): PriceChange[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: PriceChange[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const r = item as Record<string, unknown>
    const previousPrice =
      typeof r.previousPrice === 'number' ? r.previousPrice : Number(r.previousPrice)
    const newPrice = typeof r.newPrice === 'number' ? r.newPrice : Number(r.newPrice)
    if (!Number.isFinite(previousPrice) || !Number.isFinite(newPrice)) continue
    out.push({
      previousPrice,
      newPrice,
      currency: typeof r.currency === 'string' && r.currency ? r.currency : 'EUR',
      changedAt:
        typeof r.changedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.changedAt)
          ? r.changedAt
          : new Date().toISOString().slice(0, 10),
    })
  }
  return out.length ? out : undefined
}

function cryptoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export interface ParsedBackup {
  subscriptions: Subscription[]
  preferences: Preferences
}

export function parseBackup(text: string): ParsedBackup {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new ImportError('The file is not valid JSON')
  }
  if (typeof json !== 'object' || json === null) {
    throw new ImportError('The file does not contain a Cyclo backup')
  }
  const obj = json as Record<string, unknown>
  const rawSubs = Array.isArray(obj.subscriptions) ? obj.subscriptions : null
  if (!rawSubs) {
    throw new ImportError('No "subscriptions" list found in the file')
  }

  const subscriptions = rawSubs.map((raw, i) => coerceSubscription(raw, i))
  const prefsRaw =
    typeof obj.preferences === 'object' && obj.preferences !== null
      ? (obj.preferences as Partial<Preferences>)
      : {}
  const preferences: Preferences = { ...DEFAULT_PREFERENCES, ...prefsRaw }

  return { subscriptions, preferences }
}
