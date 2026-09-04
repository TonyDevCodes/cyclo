import { useTranslation } from 'react-i18next'
import type { AppLanguage, Subscription, ThemeMode } from '../types'
import { monthlyAmount } from '../lib/billing'
import { formatMoney, formatDate } from '../lib/money'
import { categoryColor } from '../lib/categories'
import { CategoryBadge } from './CategoryBadge'
import { RenewalPill } from './RenewalPill'
import { IconEdit, IconPause, IconPlay, IconTrash } from './icons'

interface Props {
  sub: Subscription
  language: AppLanguage
  theme: ThemeMode
  onEdit: (sub: Subscription) => void
  onDelete: (sub: Subscription) => void
  onToggleActive: (sub: Subscription) => void
}

export function SubscriptionCard({
  sub,
  language,
  theme,
  onEdit,
  onDelete,
  onToggleActive,
}: Props) {
  const { t } = useTranslation()
  const cycleLabel =
    sub.billingCycle === 'custom'
      ? t('cycle.customEvery', { count: sub.customIntervalDays ?? 30 })
      : t(`cycle.${sub.billingCycle}`)

  return (
    <div
      className={`sub-card${sub.active ? '' : ' sub-card--paused'}`}
      style={{ borderLeftColor: categoryColor(sub.category, theme) }}
    >
      <div className="sub-card__cat">
        <CategoryBadge category={sub.category} hideLabel theme={theme} />
      </div>

      <div className="sub-card__main">
        <div className="sub-card__title">
          <span className="sub-card__name">{sub.name}</span>
          {!sub.active && <span className="badge-muted">{t('subscriptions.paused')}</span>}
          {sub.active && <RenewalPill iso={sub.nextRenewal} />}
        </div>
        <div className="sub-card__meta">
          <span>{cycleLabel}</span>
          <span>{t('subscriptions.renews', { date: formatDate(sub.nextRenewal, language) })}</span>
          <span>{t(`category.${sub.category}`)}</span>
        </div>
        {sub.notes && <div className="sub-card__note">{sub.notes}</div>}
      </div>

      <div className="sub-card__price">
        <b>{formatMoney(sub.price, sub.currency, language)}</b>
        <span>
          ≈ {formatMoney(monthlyAmount(sub), sub.currency, language)}
          {t('units.perMonth')}
        </span>
      </div>

      <div className="sub-card__actions">
        <button
          className="icon-btn"
          onClick={() => onToggleActive(sub)}
          aria-label={sub.active ? t('subscriptions.pause') : t('subscriptions.resume')}
          title={sub.active ? t('subscriptions.pause') : t('subscriptions.resume')}
        >
          {sub.active ? <IconPause /> : <IconPlay />}
        </button>
        <button
          className="icon-btn"
          onClick={() => onEdit(sub)}
          aria-label={t('common.edit')}
          title={t('common.edit')}
        >
          <IconEdit />
        </button>
        <button
          className="icon-btn"
          onClick={() => onDelete(sub)}
          aria-label={t('common.delete')}
          title={t('common.delete')}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  )
}
