import type { CategoryId, ThemeMode } from '../types'

export interface CategoryMeta {
  id: CategoryId
  /** Fixed accent colour for dark mode — used consistently across list, dashboard
   *  and charts. Never varies by spend ranking or amount. */
  color: string
  /** Darker / more saturated variant for light mode, so small dots and thin
   *  borders keep enough contrast against the cream background. */
  colorLight: string
  /** Single glyph used in badges — no icon dependency. */
  glyph: string
}

/**
 * A fixed, distinct palette. Hues are spread around the wheel and kept legible
 * on the dark navy background — gold, emerald/teal, sky-blue plus a handful of
 * further hues so all 15 categories stay tellable apart in the donut and lists.
 * The colour a category gets does NOT depend on how much is spent in it.
 */
export const CATEGORIES: readonly CategoryMeta[] = [
  { id: 'streaming', color: '#E8B24A', colorLight: '#B07E1F', glyph: '▶' },
  { id: 'music', color: '#2FB79C', colorLight: '#1C8A76', glyph: '♪' },
  { id: 'software', color: '#4FA6E8', colorLight: '#2C7CBE', glyph: '{ }' },
  { id: 'cloud', color: '#7C83EA', colorLight: '#565EC8', glyph: '☁' },
  { id: 'ai', color: '#C071D8', colorLight: '#9A45B4', glyph: '✦' },
  { id: 'gaming', color: '#EC6588', colorLight: '#CE3A62', glyph: '◈' },
  { id: 'news', color: '#E7823A', colorLight: '#BF5F1B', glyph: '❋' },
  { id: 'fitness', color: '#5FBE5A', colorLight: '#3E9A3A', glyph: '❤' },
  { id: 'insurance', color: '#6E93B4', colorLight: '#4C7089', glyph: '⛨' },
  { id: 'domains', color: '#33C2CE', colorLight: '#1A929C', glyph: '@' },
  { id: 'education', color: '#9A6FE0', colorLight: '#7247BE', glyph: '✎' },
  { id: 'shopping', color: '#F0855F', colorLight: '#CD5C36', glyph: '⛒' },
  { id: 'finance', color: '#A9C443', colorLight: '#7E961E', glyph: '$' },
  { id: 'utilities', color: '#5566C7', colorLight: '#3C49A6', glyph: '⚙' },
  { id: 'other', color: '#9A9088', colorLight: '#726A61', glyph: '•' },
] as const

const BY_ID = new Map<CategoryId, CategoryMeta>(CATEGORIES.map((c) => [c.id, c]))

export function categoryMeta(id: CategoryId): CategoryMeta {
  return BY_ID.get(id) ?? BY_ID.get('other')!
}

/** Best-effort read of the active theme when a caller can't pass it explicitly. */
function activeTheme(): ThemeMode {
  if (
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light'
  ) {
    return 'light'
  }
  return 'dark'
}

/**
 * The category's fixed colour for the given theme. Callers that already hold the
 * theme should pass it; otherwise the current `data-theme` attribute is used.
 */
export function categoryColor(id: CategoryId, theme?: ThemeMode): string {
  const meta = categoryMeta(id)
  return (theme ?? activeTheme()) === 'light' ? meta.colorLight : meta.color
}

/** Black or near-white, whichever stays readable on top of the category colour. */
export function categoryGlyphColor(id: CategoryId, theme?: ThemeMode): string {
  const hex = categoryColor(id, theme).replace('#', '')
  const toLin = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  const r = toLin(parseInt(hex.slice(0, 2), 16) / 255)
  const g = toLin(parseInt(hex.slice(2, 4), 16) / 255)
  const b = toLin(parseInt(hex.slice(4, 6), 16) / 255)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.42 ? '#1b1205' : '#f5f5f7'
}

export const CATEGORY_IDS: readonly CategoryId[] = CATEGORIES.map((c) => c.id)
