import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import type { AppLanguage } from './types'
import en from './locales/en.json'
import de from './locales/de.json'
import fr from './locales/fr.json'
import es from './locales/es.json'

export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = ['en', 'de', 'fr', 'es']

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      fr: { translation: fr },
      es: { translation: es },
    },
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LANGUAGES],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    // Resources are bundled, so there is nothing async to wait on.
    react: { useSuspense: false },
    initImmediate: false,
    detection: {
      // Cyclo persists language in its own preferences store; this is only the
      // first-run guess.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'cyclo:lng',
      caches: [],
    },
  })

export function setLanguage(lng: AppLanguage): void {
  void i18n.changeLanguage(lng)
  try {
    localStorage.setItem('cyclo:lng', lng)
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export default i18n
