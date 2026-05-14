'use client'

import { useEffect } from 'react'

export const ALTARIS_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'Arabic' },
  { code: 'bn', label: 'Bengali' },
  { code: 'bg', label: 'Bulgarian' },
  { code: 'zh-CN', label: 'Chinese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'el', label: 'Greek' },
  { code: 'hi', label: 'Hindi' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'id', label: 'Indonesian' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ro', label: 'Romanian' },
  { code: 'ru', label: 'Russian' },
  { code: 'es', label: 'Spanish' },
  { code: 'sw', label: 'Swahili' },
  { code: 'sv', label: 'Swedish' },
  { code: 'th', label: 'Thai' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ur', label: 'Urdu' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'yo', label: 'Yoruba' },
]

declare global {
  interface Window {
    googleTranslateElementInit?: () => void
    google?: any
  }
}

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`
  try {
    document.cookie = `${name}=${value};path=/;domain=${window.location.hostname};max-age=${maxAge};SameSite=Lax`
  } catch {}
}

function getSavedLanguage() {
  if (typeof window === 'undefined') return 'en'
  return window.localStorage.getItem('altaris_language') || 'en'
}

export function applyAltarisLanguage(code: string, reloadEnglish = false) {
  const value = code === 'en' ? '/en/en' : `/en/${code}`
  setCookie('googtrans', value)
  document.documentElement.lang = code
  try { window.localStorage.setItem('altaris_language', code) } catch {}

  const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo')
  if (combo) {
    combo.value = code
    combo.dispatchEvent(new Event('change'))
  }

  if (code === 'en' && reloadEnglish) window.location.reload()
}

export default function LanguageTranslator() {
  useEffect(() => {
    const saved = getSavedLanguage()
    let scriptRequested = false

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return
      if (!document.querySelector('#google_translate_element .goog-te-gadget')) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: ALTARIS_LANGUAGES.map((item) => item.code).join(','),
            autoDisplay: false,
          },
          'google_translate_element'
        )
      }
      setTimeout(() => applyAltarisLanguage(saved), 500)
    }

    const loadTranslate = () => {
      if (window.google?.translate?.TranslateElement) {
        window.googleTranslateElementInit?.()
        return
      }
      if (scriptRequested || document.querySelector('script[data-altaris-google-translate]')) return
      scriptRequested = true
      const script = document.createElement('script')
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      script.setAttribute('data-altaris-google-translate', 'true')
      document.body.appendChild(script)
    }

    const onChangeLanguage = (event: Event) => {
      const detail = (event as CustomEvent<{ language?: string; reloadEnglish?: boolean }>).detail
      if (!detail?.language) return
      if (detail.language !== 'en') loadTranslate()
      applyAltarisLanguage(detail.language, Boolean(detail.reloadEnglish))
    }

    window.addEventListener('altaris:set-language', onChangeLanguage as EventListener)

    if (saved !== 'en') loadTranslate()

    return () => window.removeEventListener('altaris:set-language', onChangeLanguage as EventListener)
  }, [])

  return <div id="google_translate_element" className="notranslate" translate="no" aria-hidden="true" />
}
