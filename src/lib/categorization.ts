import type { CategoryId } from '../types'
import catalog from './serviceCatalog.json'

const SERVICES = catalog.services as Record<string, CategoryId>

// Pre-sort keys longest-first so "amazon prime video" wins over "amazon prime".
const KEYS = Object.keys(SERVICES).sort((a, b) => b.length - a.length)

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Suggest a category from a subscription name using only the local dataset.
 * Returns null when nothing plausible matches — the caller keeps the user's choice.
 */
export function suggestCategory(name: string): CategoryId | null {
  const q = normalize(name)
  if (q.length < 2) return null

  // Exact match first.
  if (SERVICES[q]) return SERVICES[q]

  // Whole-word / prefix containment either direction.
  for (const key of KEYS) {
    if (q === key) return SERVICES[key]
    if (q.startsWith(key + ' ') || q.endsWith(' ' + key) || q.includes(' ' + key + ' ')) {
      return SERVICES[key]
    }
    if (key.length >= 4 && q.includes(key)) return SERVICES[key]
  }

  // Token overlap as a last resort (handles "Spotify Family", "AWS eu-west").
  const tokens = q.split(' ').filter((t) => t.length >= 3)
  for (const token of tokens) {
    if (SERVICES[token]) return SERVICES[token]
  }
  return null
}

/** Number of services Cyclo can recognise offline — shown in Settings. */
export const KNOWN_SERVICE_COUNT = KEYS.length
