import catalog from './serviceCatalog.json'

interface AnnualPlansData {
  note: string
  defaultDiscountPct: number
  discounts: Record<string, number>
}

const DATA = catalog.annualPlans as AnnualPlansData
const DISCOUNTS = DATA.discounts

// Longest keys first so "adobe creative cloud" wins over "adobe".
const KEYS = Object.keys(DISCOUNTS).sort((a, b) => b.length - a.length)

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export interface AnnualPlanEstimate {
  /** Rough percentage a yearly plan is assumed to save versus paying monthly. */
  discountPct: number
  /** Always false here — Cyclo never claims an exact annual price. */
  exact: false
}

/**
 * Look up a rough annual-plan discount for a subscription name using only the
 * local catalog. Returns null when the service isn't one we know commonly offers
 * an annual option — the caller then shows nothing rather than guessing.
 */
export function annualPlanEstimate(name: string): AnnualPlanEstimate | null {
  const q = normalize(name)
  if (q.length < 2) return null

  const direct = DISCOUNTS[q]
  if (typeof direct === 'number') return { discountPct: direct, exact: false }

  for (const key of KEYS) {
    if (
      q === key ||
      q.startsWith(key + ' ') ||
      q.endsWith(' ' + key) ||
      q.includes(' ' + key + ' ') ||
      (key.length >= 4 && q.includes(key))
    ) {
      const pct = DISCOUNTS[key] ?? DATA.defaultDiscountPct
      return { discountPct: pct, exact: false }
    }
  }
  return null
}
