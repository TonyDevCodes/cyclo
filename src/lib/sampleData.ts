import type { PriceChange, Subscription } from '../types'
import { normalizeNextRenewal, toISODate } from './billing'

function id(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

function monthsAgo(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString()
}

function monthsAgoDate(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return toISODate(d)
}

interface SeedPriceChange {
  previousPrice: number
  newPrice: number
  monthsAgo: number
}

interface Seed {
  name: string
  price: number
  currency: string
  billingCycle: Subscription['billingCycle']
  category: Subscription['category']
  renewalInDays: number
  createdMonthsAgo: number
  notes?: string
  active?: boolean
  customIntervalDays?: number
  priceChanges?: SeedPriceChange[]
}

const SEEDS: Seed[] = [
  { name: 'Netflix', price: 13.99, currency: 'EUR', billingCycle: 'monthly', category: 'streaming', renewalInDays: 6, createdMonthsAgo: 11, priceChanges: [{ previousPrice: 10.99, newPrice: 13.99, monthsAgo: 6 }] },
  { name: 'Disney+', price: 89.9, currency: 'EUR', billingCycle: 'yearly', category: 'streaming', renewalInDays: 40, createdMonthsAgo: 9, notes: 'Annual plan — cheaper than monthly.' },
  { name: 'Spotify Family', price: 17.99, currency: 'EUR', billingCycle: 'monthly', category: 'music', renewalInDays: 2, createdMonthsAgo: 10, priceChanges: [{ previousPrice: 15.99, newPrice: 17.99, monthsAgo: 3 }] },
  { name: 'YouTube Premium', price: 12.99, currency: 'EUR', billingCycle: 'monthly', category: 'music', renewalInDays: 19, createdMonthsAgo: 4 },
  { name: 'Adobe Creative Cloud', price: 59.99, currency: 'EUR', billingCycle: 'monthly', category: 'software', renewalInDays: 12, createdMonthsAgo: 8, notes: 'Photography + Premiere.' },
  { name: 'Microsoft 365', price: 99, currency: 'EUR', billingCycle: 'yearly', category: 'software', renewalInDays: 63, createdMonthsAgo: 7 },
  { name: '1Password', price: 35.88, currency: 'USD', billingCycle: 'yearly', category: 'software', renewalInDays: 88, createdMonthsAgo: 12 },
  { name: 'iCloud+ 2TB', price: 9.99, currency: 'EUR', billingCycle: 'monthly', category: 'cloud', renewalInDays: 9, createdMonthsAgo: 12 },
  { name: 'Backblaze', price: 99, currency: 'USD', billingCycle: 'yearly', category: 'cloud', renewalInDays: 150, createdMonthsAgo: 6 },
  { name: 'ChatGPT Plus', price: 20, currency: 'USD', billingCycle: 'monthly', category: 'ai', renewalInDays: 4, createdMonthsAgo: 5 },
  { name: 'GitHub Copilot', price: 100, currency: 'USD', billingCycle: 'yearly', category: 'ai', renewalInDays: 210, createdMonthsAgo: 6 },
  { name: 'Xbox Game Pass Ultimate', price: 14.99, currency: 'EUR', billingCycle: 'monthly', category: 'gaming', renewalInDays: 15, createdMonthsAgo: 3 },
  { name: 'The Economist', price: 199, currency: 'EUR', billingCycle: 'yearly', category: 'news', renewalInDays: 95, createdMonthsAgo: 9 },
  { name: 'Substack — Platformer', price: 8, currency: 'USD', billingCycle: 'monthly', category: 'news', renewalInDays: 24, createdMonthsAgo: 2, active: false, notes: 'Paused — read enough of it for free.' },
  { name: 'Urban Sports Club', price: 59, currency: 'EUR', billingCycle: 'monthly', category: 'fitness', renewalInDays: 1, createdMonthsAgo: 6 },
  { name: 'Home & Contents Insurance', price: 142, currency: 'EUR', billingCycle: 'yearly', category: 'insurance', renewalInDays: 30, createdMonthsAgo: 12 },
  { name: 'example.com domain', price: 12, currency: 'EUR', billingCycle: 'yearly', category: 'domains', renewalInDays: 220, createdMonthsAgo: 12 },
  { name: 'Namecheap — 3 domains', price: 41, currency: 'USD', billingCycle: 'yearly', category: 'domains', renewalInDays: 275, createdMonthsAgo: 12 },
  { name: 'Duolingo Plus', price: 6.99, currency: 'EUR', billingCycle: 'monthly', category: 'education', renewalInDays: 11, createdMonthsAgo: 5 },
  { name: 'Amazon Prime', price: 89.9, currency: 'EUR', billingCycle: 'yearly', category: 'shopping', renewalInDays: 52, createdMonthsAgo: 12 },
  { name: 'YNAB', price: 109, currency: 'USD', billingCycle: 'yearly', category: 'finance', renewalInDays: 130, createdMonthsAgo: 10 },
  { name: 'Mobile plan', price: 20, currency: 'EUR', billingCycle: 'custom', category: 'utilities', renewalInDays: 7, createdMonthsAgo: 12, customIntervalDays: 28, notes: 'Billed every 4 weeks.' },
]

export function buildSampleData(): Subscription[] {
  return SEEDS.map((seed) => {
    const created = monthsAgo(seed.createdMonthsAgo)
    const priceHistory: PriceChange[] | undefined = seed.priceChanges
      ?.slice()
      .sort((a, b) => b.monthsAgo - a.monthsAgo)
      .map((pc) => ({
        previousPrice: pc.previousPrice,
        newPrice: pc.newPrice,
        currency: seed.currency,
        changedAt: monthsAgoDate(pc.monthsAgo),
      }))
    return {
      id: id(),
      name: seed.name,
      price: seed.price,
      currency: seed.currency,
      billingCycle: seed.billingCycle,
      customIntervalDays: seed.customIntervalDays,
      category: seed.category,
      nextRenewal: normalizeNextRenewal(
        daysFromNow(seed.renewalInDays),
        seed.billingCycle,
        seed.customIntervalDays,
      ),
      notes: seed.notes,
      active: seed.active ?? true,
      createdAt: created,
      updatedAt: created,
      priceHistory,
    }
  })
}
