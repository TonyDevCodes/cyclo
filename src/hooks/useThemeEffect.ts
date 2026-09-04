import { useEffect } from 'react'
import type { ThemeMode } from '../types'

/**
 * Reflects the chosen theme onto <html data-theme> and mirrors it to
 * localStorage so the inline script in index.html can apply it before first
 * paint on the next visit (no flash of the wrong theme).
 */
export function useThemeEffect(theme: ThemeMode): void {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F7F4EF' : '#0E1420')
    try {
      localStorage.setItem('cyclo:theme', theme)
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [theme])
}
