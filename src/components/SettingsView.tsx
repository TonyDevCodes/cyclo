import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import type { AppLanguage, ThemeMode } from '../types'
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../i18n'
import { CURRENCIES } from '../lib/money'
import { KNOWN_SERVICE_COUNT } from '../lib/categorization'
import { buildBackup, downloadBackup, ImportError, parseBackup } from '../lib/backup'
import { buildSampleData } from '../lib/sampleData'
import { db } from '../lib/db'
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
  showTestNotification,
} from '../lib/notifications'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { ConfirmDialog } from './Modal'
import { IconBell, IconDownload, IconShield } from './icons'

type Feedback = { kind: 'ok' | 'err'; text: string } | null

export function SettingsView() {
  const { t } = useTranslation()
  const { subscriptions, preferences, updatePreferences, importData, wipe } = useApp()
  const { canInstall, installed, promptInstall } = useInstallPrompt()

  const fileRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [permission, setPermission] = useState<NotificationPermission>(
    notificationPermission(),
  )
  const [confirm, setConfirm] = useState<'import' | 'sample' | 'clear' | null>(null)
  const [pendingImport, setPendingImport] = useState<ReturnType<
    typeof parseBackup
  > | null>(null)

  const supported = notificationsSupported()

  const handleTheme = (theme: ThemeMode) => void updatePreferences({ theme })

  const handleExport = async () => {
    const subs = await db.subscriptions.toArray()
    downloadBackup(buildBackup(subs, preferences))
    setFeedback(null)
  }

  const handleFilePicked = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = parseBackup(text)
      setPendingImport(parsed)
      setConfirm('import')
    } catch (err) {
      const message = err instanceof ImportError ? err.message : String(err)
      setFeedback({ kind: 'err', text: t('settings.importError', { message }) })
    }
  }

  const runImport = async () => {
    if (!pendingImport) return
    await importData(pendingImport.subscriptions, pendingImport.preferences)
    setFeedback({
      kind: 'ok',
      text: t('settings.importSuccess', { count: pendingImport.subscriptions.length }),
    })
    setPendingImport(null)
    setConfirm(null)
  }

  const runSample = async () => {
    const sample = buildSampleData()
    await importData(sample, { ...preferences })
    setFeedback({ kind: 'ok', text: t('settings.importSuccess', { count: sample.length }) })
    setConfirm(null)
  }

  const runClear = async () => {
    await wipe()
    setFeedback(null)
    setConfirm(null)
  }

  const enableNotifications = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === 'granted') {
      await updatePreferences({ notificationsEnabled: true })
    }
  }

  const toggleNotifications = async (on: boolean) => {
    if (on && permission !== 'granted') {
      await enableNotifications()
      return
    }
    await updatePreferences({ notificationsEnabled: on })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('settings.title')}</h1>
        </div>
      </div>

      {feedback && (
        <div
          className={`note ${feedback.kind === 'ok' ? 'note--ok' : 'note--err'}`}
          style={{ marginBottom: 18 }}
        >
          {feedback.text}
        </div>
      )}

      {/* appearance */}
      <div className="settings-group">
        <div className="section-title">{t('settings.appearance')}</div>
        <div className="setting-row">
          <div className="setting-row__text">
            <b>{t('settings.theme')}</b>
          </div>
          <div className="setting-row__control">
            <div className="seg" role="group" aria-label={t('settings.theme')}>
              <button
                aria-pressed={preferences.theme === 'dark'}
                onClick={() => handleTheme('dark')}
              >
                {t('settings.themeDark')}
              </button>
              <button
                aria-pressed={preferences.theme === 'light'}
                onClick={() => handleTheme('light')}
              >
                {t('settings.themeLight')}
              </button>
            </div>
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-row__text">
            <b>{t('settings.language')}</b>
          </div>
          <div className="setting-row__control">
            <select
              className="select"
              value={preferences.language}
              onChange={(e) =>
                void updatePreferences({ language: e.target.value as AppLanguage })
              }
            >
              {SUPPORTED_LANGUAGES.map((lng) => (
                <option key={lng} value={lng}>
                  {LANGUAGE_LABELS[lng]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* currency */}
      <div className="settings-group">
        <div className="section-title">{t('settings.currency')}</div>
        <div className="setting-row">
          <div className="setting-row__text">
            <b>{t('settings.primaryCurrency')}</b>
            <p>{t('settings.currencyHint')}</p>
          </div>
          <div className="setting-row__control">
            <select
              className="select"
              value={preferences.primaryCurrency}
              onChange={(e) =>
                void updatePreferences({ primaryCurrency: e.target.value })
              }
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* reminders */}
      <div className="settings-group">
        <div className="section-title">{t('settings.reminders')}</div>
        <div className="setting-row">
          <div className="setting-row__text">
            <b>
              <IconBell width={14} height={14} style={{ verticalAlign: '-2px' }} />{' '}
              {t('settings.reminders')}
            </b>
            <p>{t('settings.remindersHint')}</p>
          </div>
          <div className="setting-row__control">
            {!supported ? (
              <span className="note">{t('settings.notificationsUnsupported')}</span>
            ) : permission === 'denied' ? (
              <span className="note note--err">
                {t('settings.notificationsBlocked')}
              </span>
            ) : (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.notificationsEnabled && permission === 'granted'}
                  onChange={(e) => void toggleNotifications(e.target.checked)}
                />
                <span className="switch__track" />
              </label>
            )}
          </div>
        </div>

        {supported && permission !== 'denied' && (
          <>
            <div className="setting-row">
              <div className="setting-row__text">
                <b>{t('settings.leadTimePrefix')}</b>
              </div>
              <div className="setting-row__control">
                <select
                  className="select"
                  value={preferences.notificationLeadDays}
                  onChange={(e) =>
                    void updatePreferences({
                      notificationLeadDays: Number(e.target.value),
                    })
                  }
                >
                  {[1, 2, 3, 5, 7, 14].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>
                  {t('settings.leadTimeSuffix')}
                </span>
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-row__text">
                <b>{t('settings.testNotification')}</b>
              </div>
              <div className="setting-row__control">
                <button
                  className="btn btn--sm"
                  disabled={permission !== 'granted'}
                  onClick={() =>
                    void showTestNotification(
                      t('notify.testTitle'),
                      t('notify.testBody'),
                    )
                  }
                >
                  {t('settings.testNotification')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* data */}
      <div className="settings-group">
        <div className="section-title">{t('settings.data')}</div>

        <div className="setting-row">
          <div className="setting-row__text">
            <b>{t('settings.exportTitle')}</b>
            <p>{t('settings.exportHint')}</p>
          </div>
          <div className="setting-row__control">
            <button className="btn btn--sm" onClick={() => void handleExport()}>
              <IconDownload width={14} height={14} />
              {t('settings.exportButton')}
            </button>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-row__text">
            <b>{t('settings.importTitle')}</b>
            <p>{t('settings.importHint')}</p>
          </div>
          <div className="setting-row__control">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFilePicked(f)
                e.target.value = ''
              }}
            />
            <button className="btn btn--sm" onClick={() => fileRef.current?.click()}>
              {t('settings.importButton')}
            </button>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-row__text">
            <b>{t('settings.sampleTitle')}</b>
            <p>{t('settings.sampleHint')}</p>
          </div>
          <div className="setting-row__control">
            <button className="btn btn--sm" onClick={() => setConfirm('sample')}>
              {t('settings.sampleButton')}
            </button>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-row__text">
            <b>{t('settings.clearTitle')}</b>
            <p>{t('settings.clearHint')}</p>
          </div>
          <div className="setting-row__control">
            <button
              className="btn btn--sm btn--danger"
              disabled={subscriptions.length === 0}
              onClick={() => setConfirm('clear')}
            >
              {t('settings.clearButton')}
            </button>
          </div>
        </div>
      </div>

      {/* install */}
      {(canInstall || installed) && (
        <div className="settings-group">
          <div className="section-title">PWA</div>
          <div className="setting-row">
            <div className="setting-row__text">
              <b>{installed ? t('app.installed') : t('app.install')}</b>
            </div>
            <div className="setting-row__control">
              <button
                className="btn btn--sm"
                disabled={!canInstall}
                onClick={() => void promptInstall()}
              >
                {t('app.install')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* privacy */}
      <div className="settings-group">
        <div className="section-title">{t('settings.about')}</div>
        <div className="privacy-box">
          <IconShield width={16} height={16} style={{ verticalAlign: '-3px' }} />{' '}
          <b>{t('settings.about')}.</b> {t('settings.aboutBody')}
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-mute)' }}>
            {t('settings.knownServices', { count: KNOWN_SERVICE_COUNT })}
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 12 }}>
          {t('settings.footer')}
        </p>
      </div>

      {confirm === 'import' && pendingImport && (
        <ConfirmDialog
          title={t('settings.importTitle')}
          body={t('settings.importConfirm')}
          confirmLabel={t('settings.importButton')}
          onCancel={() => {
            setConfirm(null)
            setPendingImport(null)
          }}
          onConfirm={() => void runImport()}
        />
      )}
      {confirm === 'sample' && (
        <ConfirmDialog
          title={t('settings.sampleTitle')}
          body={t('settings.sampleConfirm')}
          confirmLabel={t('settings.sampleButton')}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void runSample()}
        />
      )}
      {confirm === 'clear' && (
        <ConfirmDialog
          title={t('settings.clearTitle')}
          body={t('settings.clearConfirm')}
          confirmLabel={t('settings.clearButton')}
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => void runClear()}
        />
      )}
    </>
  )
}
