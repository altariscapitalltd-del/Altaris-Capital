'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type LanguageCode = 'en' | 'fr' | 'es' | 'pt' | 'de' | 'it' | 'zh' | 'ja' | 'ar' | 'ru'

type LanguageContextValue = {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>('en')

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (key: string) => key,
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
