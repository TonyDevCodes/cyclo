import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import type { AppLanguage, CategoryId, SortKey, Subscription } from '../types'
import { CATEGORY_IDS } from '../lib/categories'
import { monthlyAmount, daysUntil } from '../lib/billing'
import { SubscriptionCard } from './SubscriptionCard'
import { SubscriptionForm } from './SubscriptionForm'
import { ConfirmDialog } from './Modal'
import { EmptyState } from './EmptyState'
import { IconPlus, IconSearch } from './icons'

interface Props {
  addSignal: number
}

const SORT_KEYS: SortKey[] = ['renewal', 'price', 'name', 'category']

export function SubscriptionsView({ addSignal }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as AppLanguage
  const {
    subscriptions,
    preferences,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    setActive,
    updatePreferences,
  } = useApp()

  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryId | 'all'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | undefined>(undefined)
  const [deleting, setDeleting] = useState<Subscription | undefined>(undefined)
  const seenSignal = useRef(addSignal)

  // A bump on addSignal (from the mobile FAB) opens a fresh add form.
  useEffect(() => {
    if (addSignal !== seenSignal.current) {
      seenSignal.current = addSignal
      setEditing(undefined)
      setFormOpen(true)
    }
  }, [addSignal])

  const sort = preferences.listSort

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = subscriptions.filter((s) => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        (s.notes ?? '').toLowerCase().includes(q)
      )
    })
    const sorted = [...rows].sort((a, b) => {
      switch (sort) {
        case 'price':
          return monthlyAmount(b) - monthlyAmount(a)
        case 'name':
          return a.name.localeCompare(b.name, lang)
        case 'category':
          return (
            t(`category.${a.category}`).localeCompare(t(`category.${b.category}`), lang) ||
            a.name.localeCompare(b.name, lang)
          )
        case 'renewal':
        default:
          return daysUntil(a.nextRenewal) - daysUntil(b.nextRenewal)
      }
    })
    // Paused always sink below active.
    return sorted.sort((a, b) => Number(b.active) - Number(a.active))
  }, [subscriptions, query, categoryFilter, sort, lang, t])

  const activeCount = subscriptions.filter((s) => s.active).length
  const hasFilters = query.trim() !== '' || categoryFilter !== 'all'

  const openAdd = () => {
    setEditing(undefined)
    setFormOpen(true)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('subscriptions.title')}</h1>
          <p>
            {t('subscriptions.summary', { count: subscriptions.length })} ·{' '}
            {t('subscriptions.activeCount', { count: activeCount })}
          </p>
        </div>
        <button className="btn btn--primary" onClick={openAdd}>
          <IconPlus width={16} height={16} />
          {t('common.addSubscription')}
        </button>
      </div>

      {subscriptions.length > 0 && (
        <div className="toolbar">
          <div className="toolbar__search">
            <IconSearch />
            <input
              className="input"
              value={query}
              placeholder={t('subscriptions.searchPlaceholder')}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="field-inline">
            <label htmlFor="cat-filter">{t('subscriptions.filterCategory')}</label>
            <select
              id="cat-filter"
              className="select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryId | 'all')}
            >
              <option value="all">{t('subscriptions.allCategories')}</option>
              {CATEGORY_IDS.map((c) => (
                <option key={c} value={c}>
                  {t(`category.${c}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="field-inline">
            <label htmlFor="sort">{t('subscriptions.sortBy')}</label>
            <select
              id="sort"
              className="select"
              value={sort}
              onChange={(e) =>
                void updatePreferences({ listSort: e.target.value as SortKey })
              }
            >
              {SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`subscriptions.sort.${k}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {subscriptions.length === 0 ? (
        <EmptyState
          title={t('subscriptions.noneYet')}
          body={t('subscriptions.noneYetHint')}
          action={
            <button className="btn btn--primary" onClick={openAdd}>
              <IconPlus width={16} height={16} />
              {t('common.addSubscription')}
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('subscriptions.noMatches')}
          action={
            <button
              className="btn"
              onClick={() => {
                setQuery('')
                setCategoryFilter('all')
              }}
            >
              {t('subscriptions.clearFilters')}
            </button>
          }
        />
      ) : (
        <div className="sub-list">
          {filtered.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              language={lang}
              theme={preferences.theme}
              onEdit={(s) => {
                setEditing(s)
                setFormOpen(true)
              }}
              onDelete={(s) => setDeleting(s)}
              onToggleActive={(s) => void setActive(s.id, !s.active)}
            />
          ))}
        </div>
      )}

      {hasFilters && filtered.length > 0 && (
        <button
          className="btn btn--ghost btn--sm"
          style={{ marginTop: 12 }}
          onClick={() => {
            setQuery('')
            setCategoryFilter('all')
          }}
        >
          {t('subscriptions.clearFilters')}
        </button>
      )}

      {formOpen && (
        <SubscriptionForm
          initial={editing}
          defaultCurrency={preferences.primaryCurrency}
          onClose={() => setFormOpen(false)}
          onSubmit={(draft) => {
            if (editing) void updateSubscription(editing.id, draft)
            else void addSubscription(draft)
            setFormOpen(false)
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={t('subscriptions.deleteTitle', { name: deleting.name })}
          body={t('subscriptions.deleteBody')}
          confirmLabel={t('common.delete')}
          danger
          onCancel={() => setDeleting(undefined)}
          onConfirm={() => {
            void deleteSubscription(deleting.id)
            setDeleting(undefined)
          }}
        />
      )}
    </>
  )
}
