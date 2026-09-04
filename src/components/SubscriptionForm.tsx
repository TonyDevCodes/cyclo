import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  BillingCycle,
  CategoryId,
  Subscription,
  SubscriptionDraft,
} from '../types'
import { BILLING_CYCLES } from '../types'
import { CATEGORY_IDS } from '../lib/categories'
import { CURRENCIES } from '../lib/money'
import { suggestCategory } from '../lib/categorization'
import { todayISO } from '../lib/billing'
import { Modal } from './Modal'

interface Props {
  initial?: Subscription
  defaultCurrency: string
  onSubmit: (draft: SubscriptionDraft) => void
  onClose: () => void
}

interface FormState {
  name: string
  price: string
  currency: string
  billingCycle: BillingCycle
  customIntervalDays: string
  category: CategoryId
  nextRenewal: string
  notes: string
  active: boolean
  /** true once the user has picked a category by hand — stops auto-suggest overriding it. */
  categoryTouched: boolean
}

function initialState(initial: Subscription | undefined, defaultCurrency: string): FormState {
  if (initial) {
    return {
      name: initial.name,
      price: String(initial.price),
      currency: initial.currency,
      billingCycle: initial.billingCycle,
      customIntervalDays: String(initial.customIntervalDays ?? 30),
      category: initial.category,
      nextRenewal: initial.nextRenewal,
      notes: initial.notes ?? '',
      active: initial.active,
      categoryTouched: true,
    }
  }
  return {
    name: '',
    price: '',
    currency: defaultCurrency,
    billingCycle: 'monthly',
    customIntervalDays: '30',
    category: 'other',
    nextRenewal: todayISO(),
    notes: '',
    active: true,
    categoryTouched: false,
  }
}

export function SubscriptionForm({ initial, defaultCurrency, onSubmit, onClose }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(() => initialState(initial, defaultCurrency))
  const [submitted, setSubmitted] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Live category suggestion from the local dataset.
  const suggestion = useMemo<CategoryId | null>(() => {
    const s = suggestCategory(form.name)
    return s && s !== form.category ? s : null
  }, [form.name, form.category])

  const priceNum = Number(form.price.replace(',', '.'))
  const intervalNum = Number(form.customIntervalDays)

  const errors = {
    name: form.name.trim() ? '' : t('form.errName'),
    price: Number.isFinite(priceNum) && priceNum > 0 ? '' : t('form.errPrice'),
    date: /^\d{4}-\d{2}-\d{2}$/.test(form.nextRenewal) ? '' : t('form.errDate'),
    interval:
      form.billingCycle !== 'custom' || (Number.isFinite(intervalNum) && intervalNum >= 1)
        ? ''
        : t('form.errInterval'),
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const handleNameChange = (value: string) => {
    setForm((f) => {
      const next = { ...f, name: value }
      if (!f.categoryTouched) {
        const s = suggestCategory(value)
        if (s) next.category = s
      }
      return next
    })
  }

  const handleSubmit = () => {
    setSubmitted(true)
    if (hasErrors) return
    const draft: SubscriptionDraft = {
      name: form.name.trim(),
      price: Math.round(priceNum * 100) / 100,
      currency: form.currency,
      billingCycle: form.billingCycle,
      customIntervalDays:
        form.billingCycle === 'custom' ? Math.round(intervalNum) : undefined,
      category: form.category,
      nextRenewal: form.nextRenewal,
      notes: form.notes.trim() || undefined,
      active: form.active,
    }
    onSubmit(draft)
  }

  const showErr = (key: keyof typeof errors) => (submitted ? errors[key] : '')

  return (
    <Modal
      title={initial ? t('form.editTitle') : t('form.addTitle')}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn--primary" onClick={handleSubmit}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <div className="field field--full">
          <label htmlFor="f-name">{t('form.name')}</label>
          <input
            id="f-name"
            className="input"
            value={form.name}
            placeholder={t('form.namePlaceholder')}
            onChange={(e) => handleNameChange(e.target.value)}
            autoComplete="off"
          />
          {showErr('name') && <span className="field__err">{errors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="f-price">{t('form.price')}</label>
          <div className="price-row">
            <input
              id="f-price"
              className="input"
              inputMode="decimal"
              value={form.price}
              placeholder="0.00"
              onChange={(e) => set('price', e.target.value)}
            />
            <select
              className="select"
              aria-label={t('form.currency')}
              value={form.currency}
              onChange={(e) => set('currency', e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {showErr('price') && <span className="field__err">{errors.price}</span>}
        </div>

        <div className="field">
          <label htmlFor="f-cycle">{t('form.billingCycle')}</label>
          <select
            id="f-cycle"
            className="select"
            value={form.billingCycle}
            onChange={(e) => set('billingCycle', e.target.value as BillingCycle)}
          >
            {BILLING_CYCLES.map((c) => (
              <option key={c} value={c}>
                {t(`cycle.${c}`)}
              </option>
            ))}
          </select>
        </div>

        {form.billingCycle === 'custom' && (
          <div className="field">
            <label htmlFor="f-interval">{t('form.customInterval')}</label>
            <div className="price-row">
              <input
                id="f-interval"
                className="input"
                inputMode="numeric"
                value={form.customIntervalDays}
                onChange={(e) => set('customIntervalDays', e.target.value)}
              />
              <span
                className="select"
                style={{ display: 'grid', placeItems: 'center', pointerEvents: 'none' }}
              >
                {t('form.customIntervalSuffix')}
              </span>
            </div>
            {showErr('interval') && (
              <span className="field__err">{errors.interval}</span>
            )}
          </div>
        )}

        <div className="field">
          <label htmlFor="f-date">{t('form.nextRenewal')}</label>
          <input
            id="f-date"
            className="input"
            type="date"
            value={form.nextRenewal}
            onChange={(e) => set('nextRenewal', e.target.value)}
          />
          {showErr('date') && <span className="field__err">{errors.date}</span>}
        </div>

        <div className="field field--full">
          <label htmlFor="f-cat">{t('form.category')}</label>
          <select
            id="f-cat"
            className="select"
            value={form.category}
            onChange={(e) => {
              set('category', e.target.value as CategoryId)
              set('categoryTouched', true)
            }}
          >
            {CATEGORY_IDS.map((c) => (
              <option key={c} value={c}>
                {t(`category.${c}`)}
              </option>
            ))}
          </select>
          {suggestion && (
            <span className="suggestion">
              {t('form.suggested', { category: t(`category.${suggestion}`) })}
              <button
                type="button"
                onClick={() => {
                  set('category', suggestion)
                  set('categoryTouched', true)
                }}
              >
                {t('form.useSuggestion')}
              </button>
            </span>
          )}
        </div>

        <div className="field field--full">
          <label htmlFor="f-notes">
            {t('form.notes')} <span className="opt">({t('common.optional')})</span>
          </label>
          <textarea
            id="f-notes"
            value={form.notes}
            placeholder={t('form.notesPlaceholder')}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        <div className="field field--full">
          <div className="setting-row" style={{ padding: 0, border: 'none' }}>
            <div className="setting-row__text">
              <b>{t('form.active')}</b>
              <p>{t('form.activeHint')}</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
              />
              <span className="switch__track" />
            </label>
          </div>
        </div>
      </form>
    </Modal>
  )
}
