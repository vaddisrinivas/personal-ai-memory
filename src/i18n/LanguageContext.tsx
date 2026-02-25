import React, { createContext, useCallback, useContext, useState } from 'react'
import type { LangCode, Translations } from './translations'
import { LANG_NAMES, translations } from './translations'

const STORAGE_KEY = 'ai-memory-lang'

function detectLang(): LangCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null
    if (stored && stored in translations) return stored
  } catch {
    // localStorage may be unavailable in some extension contexts
  }
  const nav = navigator.language ?? ''
  if (nav.startsWith('zh-TW') || nav.startsWith('zh-Hant')) return 'zh-TW'
  if (nav.startsWith('zh')) return 'zh-CN'
  if (nav.startsWith('ja')) return 'ja'
  if (nav.startsWith('ko')) return 'ko'
  if (nav.startsWith('es')) return 'es'
  if (nav.startsWith('fr')) return 'fr'
  if (nav.startsWith('de')) return 'de'
  return 'en'
}

interface LanguageContextValue {
  lang: LangCode
  setLang: (lang: LangCode) => void
  t: Translations
  langNames: typeof LANG_NAMES
  langCodes: LangCode[]
}

const ALL_LANGS = Object.keys(LANG_NAMES) as LangCode[]

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => void 0,
  t: translations['en'],
  langNames: LANG_NAMES,
  langCodes: ALL_LANGS,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(detectLang)

  const setLang = useCallback((next: LangCode) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }, [])

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, t: translations[lang], langNames: LANG_NAMES, langCodes: ALL_LANGS }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  return useContext(LanguageContext)
}
