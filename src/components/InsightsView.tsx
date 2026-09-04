import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import type { AppLanguage } from '../types'
import {
  annualSwitchSuggestions,
  detectOverlaps,
  extremes,
  monthlyInPrimary,
  priceChanges,
  spendByCategory,
  topSpendCategory,
} from '../lib/insights'
import { formatMoney } from '../lib/money'
import { parseDate } from '../lib/billing'
import { categoryColor } from '../lib/categories'
import { CategoryBadge } from './CategoryBadge'
import { EmptyState } from './EmptyState'
import { IconSparkle } from './icons'

const LOCALE_BY_LANG: Record<AppLanguage, string> = {
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
}

/** "March" — or "March 2025" when the change happened in an earlier year. */
function monthLabel(iso: string, lang: AppLanguage): string {
  const date = parseDate(iso)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  try {
    return new Intl.DateTimeFormat(LOCALE_BY_LANG[lang] ?? 'en-US', {
      month: 'long',
      year: sameYear ? undefined : 'numeric',
    }).format(date)
  } catch {
    return iso
  }
}

export function InsightsView() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as AppLanguage
  const { subscriptions, preferences } = useApp()
  const currency = preferences.primaryCurrency
  const theme = preferences.theme

  const data = useMemo(() => {
    const overlaps = detectOverlaps(subscriptions, currency)
    const byCategory = spendByCategory(subscriptions, currency)
    const topCategory = topSpendCategory(subscriptions, currency)
    const ext = extremes(subscriptions, currency)
    const priceHistory = priceChanges(subscriptions)
    const annualSwitch = annualSwitchSuggestions(subscriptions)

    const nameCounts = new Map<string, number>()
    for (const s of subscriptions) {
      const key = s.name.trim().toLowerCase()
      nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1)
    }
    const duplicates = [...nameCounts.entries()]
      .filter(([, n]) => n > 1)
      .map(([key, n]) => ({
        name:
          subscriptions.find((s) => s.name.trim().toLowerCase() === key)?.name ?? key,
        count: n,
      }))

    return {
      overlaps,
      byCategory,
      topCategory,
      ext,
      duplicates,
      priceHistory,
      annualSwitch,
    }
  }, [subscriptions, currency])

  const unit = t('units.perMonth')

  if (subscriptions.length === 0) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>{t('insights.title')}</h1>
            <p>{t('insights.subtitle')}</p>
          </div>
        </div>
        <EmptyState
          title={t('subscriptions.noneYet')}
          body={t('subscriptions.noneYetHint')}
        />
      </>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('insights.title')}</h1>
          <p>{t('insights.subtitle')}</p>
        </div>
      </div>

      <div className="insight-stack">
        {/* possible savings */}
        <div className="card card--pad">
          <div className="section-title">{t('insights.savingsTitle')}</div>
          {data.overlaps.length === 0 ? (
            <div className="note note--ok">{t('insights.noOverlap')}</div>
          ) : (
            <div className="insight-stack">
              {data.overlaps.map((o) => (
                <div
                  className="overlap-card"
                  key={o.category}
                  style={{ borderLeftColor: categoryColor(o.category, theme) }}
                >
                  <div className="overlap-card__head">
                    <span className="overlap-card__title">
                      {t('insights.overlapCard', {
                        count: o.subscriptions.length,
                        category: t(`category.${o.category}`),
                      })}
                    </span>
                    <span className="overlap-card__save">
                      <IconSparkle width={13} height={13} />{' '}
                      {formatMoney(o.potentialMonthlySaving, currency, lang)}
                      {unit}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4 }}>
                    {t('insights.overlapTogether', {
                      amount: formatMoney(o.monthlyTotal, currency, lang),
                      unit,
                    })}
                    {' · '}
                    {t('insights.overlapSaving', {
                      amount: formatMoney(o.potentialMonthlySaving, currency, lang),
                      unit,
                    })}
                  </div>
                  <ul className="overlap-card__list">
                    {o.subscriptions.map((s) => (
                      <li key={s.id}>
                        <span>{s.name}</span>
                        <span>
                          {formatMoney(monthlyInPrimary(s, currency), currency, lang)}
                          {unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="disclaimer">{t('insights.overlapDisclaimer')}</p>
            </div>
          )}
        </div>

        {/* monthly vs annual */}
        <div className="card card--pad">
          <div className="section-title">{t('insights.annualSwitchTitle')}</div>
          {data.annualSwitch.length === 0 ? (
            <div className="note">{t('insights.noAnnualSwitch')}</div>
          ) : (
            <div className="insight-stack">
              {data.annualSwitch.map((a) => (
                <div
                  className="overlap-card"
                  key={a.sub.id}
                  style={{ borderLeftColor: categoryColor(a.sub.category, theme) }}
                >
                  <div className="overlap-card__head">
                    <span className="overlap-card__title">
                      {t('insights.annualSwitchItem', {
                        name: a.sub.name,
                        amount: formatMoney(a.estimatedSaving, a.sub.currency, lang, {
                          maximumFractionDigits: 0,
                        }),
                      })}
                    </span>
                    <span className="overlap-card__save">
                      <IconSparkle width={13} height={13} />{' '}
                      {formatMoney(a.estimatedSaving, a.sub.currency, lang, {
                        maximumFractionDigits: 0,
                      })}
                      {t('units.perYear')}
                    </span>
                  </div>
                  <div className="overlap-card__detail">
                    {t('insights.annualSwitchDetail', {
                      pct: a.discountPct,
                      yearly: formatMoney(a.yearAtMonthly, a.sub.currency, lang, {
                        maximumFractionDigits: 0,
                      }),
                      annual: formatMoney(a.estimatedAnnualCost, a.sub.currency, lang, {
                        maximumFractionDigits: 0,
                      }),
                    })}
                  </div>
                </div>
              ))}
              <p className="disclaimer">{t('insights.annualSwitchDisclaimer')}</p>
            </div>
          )}
        </div>

        {/* price changes */}
        <div className="card card--pad">
          <div className="section-title">{t('insights.priceChangesTitle')}</div>
          {data.priceHistory.length === 0 ? (
            <div className="note">{t('insights.noPriceChanges')}</div>
          ) : (
            <ul className="insight-line-list">
              {data.priceHistory.map((p) => {
                const pct = Math.round(p.pctChange)
                const delta = `${pct > 0 ? '+' : ''}${pct}%`
                return (
                  <li key={p.sub.id}>
                    {t('insights.priceChangeItem', {
                      name: p.sub.name,
                      from: formatMoney(p.firstPrice, p.currency, lang),
                      to: formatMoney(p.currentPrice, p.currency, lang),
                      delta,
                      since: monthLabel(p.since, lang),
                    })}
                    {p.changeCount > 1 && (
                      <span className="insight-line__meta">
                        {t('insights.priceChangeTimes', { count: p.changeCount })}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* the numbers */}
        <div className="card card--pad">
          <div className="section-title">{t('insights.statsTitle')}</div>
          <div className="mini-stat-row">
            <div className="mini-stat">
              <div className="mini-stat__label">{t('insights.mostExpensive')}</div>
              <div className="mini-stat__value">
                {data.ext.mostExpensive?.sub.name ?? '—'}{' '}
                {data.ext.mostExpensive && (
                  <small>
                    {formatMoney(data.ext.mostExpensive.monthly, currency, lang)}
                    {unit}
                  </small>
                )}
              </div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat__label">{t('insights.cheapest')}</div>
              <div className="mini-stat__value">
                {data.ext.cheapest?.sub.name ?? '—'}{' '}
                {data.ext.cheapest && (
                  <small>
                    {formatMoney(data.ext.cheapest.monthly, currency, lang)}
                    {unit}
                  </small>
                )}
              </div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat__label">{t('insights.average')}</div>
              <div className="mini-stat__value">
                {formatMoney(data.ext.averageMonthly, currency, lang)}
                <small>{unit}</small>
              </div>
            </div>
          </div>
          <p className="disclaimer">
            {t('insights.spread', { count: data.byCategory.length })}
          </p>
        </div>

        {/* category totals */}
        <div className="card card--pad">
          <div className="section-title">{t('insights.categoryTotals')}</div>
          <div className="legend">
            {data.byCategory.map((row) => {
              const isTop = row.category === data.topCategory
              return (
                <div
                  className={`legend__row${isTop ? ' legend__row--top' : ''}`}
                  key={row.category}
                  style={isTop ? undefined : { padding: '6px 0' }}
                >
                  <CategoryBadge category={row.category} theme={theme} />
                  {isTop && <span className="top-badge">{t('insights.topCategory')}</span>}
                  <span className="legend__name" style={{ textAlign: 'right' }}>
                    {t('insights.categoryLine', { count: row.count })}
                  </span>
                  <span
                    className="legend__val"
                    style={{ minWidth: 150, textAlign: 'right' }}
                  >
                    {formatMoney(row.monthly, currency, lang)}
                    {unit} ·{' '}
                    {formatMoney(row.annual, currency, lang, { maximumFractionDigits: 0 })}
                    {t('units.perYear')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* duplicates */}
        <div className="card card--pad">
          <div className="section-title">{t('insights.duplicatesTitle')}</div>
          {data.duplicates.length === 0 ? (
            <div className="note">{t('insights.noDuplicates')}</div>
          ) : (
            <ul className="overlap-card__list" style={{ marginTop: 0 }}>
              {data.duplicates.map((d) => (
                <li key={d.name} style={{ borderTop: 'none' }}>
                  {t('insights.duplicateItem', { name: d.name, count: d.count })}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
