import type { AppLanguage } from '../types'

/** Currencies offered in the form's picker. */
export const CURRENCIES: readonly string[] = [
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'CAD',
  'AUD',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'JPY',
  'INR',
  'BRL',
]

/**
 * Approximate static exchange rates, expressed as "1 unit of currency = N EUR".
 * Offline-first: Cyclo never fetches live FX. These are only used to roll up
 * totals when a user mixes currencies, and the UI labels such totals as approximate.
 */
const TO_EUR: Record<string, number> = {
  EUR: 1,
  USD: 0.92,
  GBP: 1.17,
  CHF: 1.03,
  CAD: 0.67,
  AUD: 0.61,
  SEK: 0.088,
  NOK: 0.086,
  DKK: 0.134,
  PLN: 0.23,
  JPY: 0.0062,
  INR: 0.011,
  BRL: 0.17,
}

export function convert(amount: number, from: string, to: string): number {
  if (from === to) return amount
  const fromRate = TO_EUR[from] ?? 1
  const toRate = TO_EUR[to] ?? 1
  return (amount * fromRate) / toRate
}

const LOCALE_BY_LANG: Record<AppLanguage, string> = {
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
}

export function formatMoney(
  amount: number,
  currency: string,
  language: AppLanguage = 'en',
  opts: { maximumFractionDigits?: number } = {},
): string {
  const locale = LOCALE_BY_LANG[language] ?? 'en-US'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: opts.maximumFractionDigits ?? 2,
    }).format(Number.isFinite(amount) ? amount : 0)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function formatDate(iso: string, language: AppLanguage = 'en'): string {
  const locale = LOCALE_BY_LANG[language] ?? 'en-US'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, d || 1)
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  } catch {
    return iso
  }
}
