import { useTranslation } from 'react-i18next'
import { daysUntil } from '../lib/billing'

export function renewalRelative(
  iso: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): { label: string; tone: 'soon' | 'ok' | 'overdue' } {
  const d = daysUntil(iso)
  if (d < 0) return { label: t('relative.overdue', { count: -d }), tone: 'overdue' }
  if (d === 0) return { label: t('relative.today'), tone: 'soon' }
  if (d === 1) return { label: t('relative.tomorrow'), tone: 'soon' }
  return {
    label: t('relative.inDays', { count: d }),
    tone: d <= 7 ? 'soon' : 'ok',
  }
}

export function RenewalPill({ iso }: { iso: string }) {
  const { t } = useTranslation()
  const { label, tone } = renewalRelative(iso, t)
  return <span className={`pill pill--${tone}`}>{label}</span>
}
