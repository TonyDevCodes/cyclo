import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import {
  detectOverlaps,
  hasMixedCurrencies,
  spendByCategory,
  spendTrend,
  topSpendCategory,
  totalAnnual,
  totalMonthly,
  upcomingRenewals,
} from '../lib/insights'
import { formatMoney } from '../lib/money'
import { categoryColor } from '../lib/categories'
import type { AppLanguage } from '../types'
import { CategoryDonut } from './charts/CategoryDonut'
import { SpendTrendChart } from './charts/SpendTrendChart'
import { RenewalPill } from './RenewalPill'
import { EmptyState } from './EmptyState'
import { IconPlus, IconSparkle } from './icons'

interface Props {
  onAdd: () => void
  onGoInsights: () => void
  onGoSubscriptions: () => void
}

export function DashboardView({ onAdd, onGoInsights, onGoSubscriptions }: Props) {
  const { t, i18n } = useTranslation()
  const { subscriptions, preferences } = useApp()
  const lang = i18n.language as AppLanguage
  const currency = preferences.primaryCurrency
  const theme = preferences.theme

  const view = useMemo(() => {
    const monthly = totalMonthly(subscriptions, currency)
    const annual = totalAnnual(subscriptions, currency)
    const active = subscriptions.filter((s) => s.active)
    const byCategory = spendByCategory(subscriptions, currency)
    const topCategory = topSpendCategory(subscriptions, currency)
    const trend = spendTrend(subscriptions, currency, 12, lang)
    const upcoming = upcomingRenewals(subscriptions, 45)
    const dueIn30 = upcoming.filter((r) => r.days <= 30)
    const overlaps = detectOverlaps(subscriptions, currency)
    const mixed = hasMixedCurrencies(subscriptions, currency)
    return {
      monthly,
      annual,
      active,
      byCategory,
      topCategory,
      trend,
      upcoming,
      dueIn30,
      overlaps,
      mixed,
    }
  }, [subscriptions, currency, lang])

  if (subscriptions.length === 0) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>{t('dashboard.title')}</h1>
          </div>
        </div>
        <EmptyState
          title={t('subscriptions.noneYet')}
          body={t('subscriptions.noneYetHint')}
          action={
            <button className="btn btn--primary" onClick={onAdd}>
              <IconPlus width={16} height={16} />
              {t('common.addSubscription')}
            </button>
          }
        />
      </>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('dashboard.title')}</h1>
        </div>
        <button className="btn btn--primary" onClick={onAdd}>
          <IconPlus width={16} height={16} />
          {t('common.addSubscription')}
        </button>
      </div>

      {view.overlaps.length > 0 && (
        <div className="callout">
          <IconSparkle className="callout__icon" />
          <span style={{ flex: 1 }}>
            {t('dashboard.savingsTeaser', { count: view.overlaps.length })}
          </span>
          <a
            href="#insights"
            onClick={(e) => {
              e.preventDefault()
              onGoInsights()
            }}
          >
            {t('dashboard.reviewInInsights')}
          </a>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat">
          <div className="stat__label">{t('dashboard.monthlySpend')}</div>
          <div className="stat__value">
            {view.mixed && <span style={{ fontSize: 13 }}>≈ </span>}
            {formatMoney(view.monthly, currency, lang)}
          </div>
          <div className="stat__sub">
            {formatMoney(view.annual, currency, lang, { maximumFractionDigits: 0 })}
            {t('units.perYear')}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">{t('dashboard.annualSpend')}</div>
          <div className="stat__value">
            {view.mixed && <span style={{ fontSize: 13 }}>≈ </span>}
            {formatMoney(view.annual, currency, lang, { maximumFractionDigits: 0 })}
          </div>
          <div className="stat__sub">{view.mixed ? t('units.approx') : ' '}</div>
        </div>
        <div className="stat">
          <div className="stat__label">{t('dashboard.activeSubs')}</div>
          <div className="stat__value">{view.active.length}</div>
          <div className="stat__sub">
            {t('dashboard.activeSubsValue', { count: subscriptions.length })}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">{t('dashboard.next30')}</div>
          <div className="stat__value">{view.dueIn30.length}</div>
          <div className="stat__sub">
            {t('dashboard.next30Value', { count: view.upcoming.length })}
          </div>
        </div>
      </div>

      {view.mixed && (
        <div className="note" style={{ marginBottom: 16 }}>
          {t('dashboard.mixedCurrencyNote')}
        </div>
      )}

      <div className="grid-2">
        <div className="card card--pad">
          <div className="section-title">{t('dashboard.byCategory')}</div>
          <CategoryDonut
            data={view.byCategory}
            currency={currency}
            language={lang}
            theme={theme}
            topCategory={view.topCategory}
          />
          <div className="legend">
            {view.byCategory.slice(0, 8).map((row) => {
              const isTop = row.category === view.topCategory
              return (
                <div
                  className={`legend__row${isTop ? ' legend__row--top' : ''}`}
                  key={row.category}
                >
                  <span
                    className="legend__dot"
                    style={{ background: categoryColor(row.category, theme) }}
                  />
                  <span className="legend__name">{t(`category.${row.category}`)}</span>
                  {isTop && <span className="top-badge">{t('insights.topCategory')}</span>}
                  <span className="legend__val">
                    {formatMoney(row.monthly, currency, lang)}
                    {t('units.perMonth')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card card--pad">
          <div className="section-title" style={{ marginBottom: 4 }}>
            {t('dashboard.upcoming')}
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 11.5, color: 'var(--text-mute)' }}>
            {t('dashboard.next30Value', { count: view.upcoming.length })}
          </p>
          {view.upcoming.slice(0, 7).map((r) => (
            <div className="renewal-row" key={r.sub.id}>
              <span
                className="legend__dot"
                style={{ background: categoryColor(r.sub.category, theme) }}
              />
              <span className="renewal-row__name">{r.sub.name}</span>
              <span className="renewal-row__amt">
                {formatMoney(r.sub.price, r.sub.currency, lang)}
              </span>
              <RenewalPill iso={r.sub.nextRenewal} />
            </div>
          ))}
          {view.upcoming.length > 7 && (
            <button
              className="btn btn--ghost btn--sm"
              style={{ marginTop: 10 }}
              onClick={onGoSubscriptions}
            >
              {t('common.viewAll')}
            </button>
          )}
        </div>
      </div>

      <div className="card card--pad">
        <div className="section-title" style={{ marginBottom: 2 }}>
          {t('dashboard.trend')}
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--text-mute)' }}>
          {t('dashboard.trendHint')}
        </p>
        <SpendTrendChart data={view.trend} currency={currency} language={lang} />
      </div>
    </>
  )
}
