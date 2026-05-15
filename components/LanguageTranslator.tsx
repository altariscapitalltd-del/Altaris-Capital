'use client'

import { useEffect, useState, useCallback } from 'react'

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
    googleTranslateApiLoaded?: boolean
  }
}

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`
  try {
    const domain = window.location.hostname
    document.cookie = `${name}=${value};path=/;domain=${domain};max-age=${maxAge};SameSite=Lax`
    // Also set for root domain
    if (domain.startsWith('www.')) {
      document.cookie = `${name}=${value};path=/;domain=${domain.slice(4)};max-age=${maxAge};SameSite=Lax`
    }
  } catch {}
}

function getSavedLanguage(): string {
  if (typeof window === 'undefined') return 'en'
  try {
    return window.localStorage.getItem('altaris_language') || 'en'
  } catch {
    return 'en'
  }
}

export function applyAltarisLanguage(code: string, reloadEnglish = false) {
  if (typeof window === 'undefined') return

  const value = code === 'en' ? '/en/en' : `/en/${code}`
  setCookie('googtrans', value)
  document.documentElement.lang = code

  try {
    window.localStorage.setItem('altaris_language', code)
  } catch {}

  // Dispatch custom event for other components to react
  window.dispatchEvent(new CustomEvent('altaris:language-changed', { detail: { language: code } }))

  const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo')
  if (combo) {
    combo.value = code
    combo.dispatchEvent(new Event('change'))
  }

  if (code === 'en' && reloadEnglish) {
    window.location.reload()
  }
}

export default function LanguageTranslator() {
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [initAttempted, setInitAttempted] = useState(false)

  const initTranslate = useCallback(() => {
    if (typeof window === 'undefined') return
    if (!window.google?.translate?.TranslateElement) return
    if (initAttempted) return

    setInitAttempted(true)

    try {
      const element = document.getElementById('google_translate_element')
      if (!element) return

      // Check if already initialized
      if (element.querySelector('.goog-te-gadget')) return

      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: ALTARIS_LANGUAGES.map((item) => item.code).join(','),
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.HORIZONTAL,
        },
        'google_translate_element'
      )

      // Apply saved language after initialization
      const savedLang = getSavedLanguage()
      if (savedLang !== 'en') {
        setTimeout(() => {
          applyAltarisLanguage(savedLang)
        }, 800)
      }
    } catch (e) {
      console.warn('Google Translate init error:', e)
    }
  }, [initAttempted])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = getSavedLanguage()
    let scriptAdded = false

    // Define the global init function
    window.googleTranslateElementInit = () => {
      window.googleTranslateApiLoaded = true
      setScriptLoaded(true)
      initTranslate()
    }

    const loadTranslate = () => {
      // If Google Translate API is already loaded, initialize directly
      if (window.google?.translate?.TranslateElement) {
        window.googleTranslateApiLoaded = true
        setScriptLoaded(true)
        initTranslate()
        return
      }

      // Check if script already exists
      if (document.querySelector('script[data-altaris-google-translate]')) return

      scriptAdded = true
      const script = document.createElement('script')
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      script.defer = true
      script.setAttribute('data-altaris-google-translate', 'true')
      script.onerror = () => {
        console.warn('Google Translate script failed to load')
        setScriptLoaded(false)
      }
      document.body.appendChild(script)
    }

    const onChangeLanguage = (event: Event) => {
      const detail = (event as CustomEvent<{ language?: string; reloadEnglish?: boolean }>).detail
      if (!detail?.language) return
      if (detail.language !== 'en' && !scriptLoaded) {
        loadTranslate()
      }
      applyAltarisLanguage(detail.language, Boolean(detail.reloadEnglish))
    }

    window.addEventListener('altaris:set-language', onChangeLanguage as EventListener)

    // Only load the script if a non-English language is saved
    if (saved !== 'en') {
      loadTranslate()
    }

    return () => {
      window.removeEventListener('altaris:set-language', onChangeLanguage as EventListener)
    }
  }, [initTranslate, scriptLoaded])

  return (
    <div
      id="google_translate_element"
      className="notranslate"
      translate="no"
      aria-hidden="true"
      style={{ position: 'absolute', visibility: 'hidden', height: 0, overflow: 'hidden' }}
    />
  )
}

// ─── Language Selector Component ──────────────────────────────────────────
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const [current, setCurrent] = useState('en')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = getSavedLanguage()
    setCurrent(saved)

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.language) setCurrent(detail.language)
    }
    window.addEventListener('altaris:language-changed', handler)
    return () => window.removeEventListener('altaris:language-changed', handler)
  }, [])

  const selectLanguage = (code: string) => {
    window.dispatchEvent(new CustomEvent('altaris:set-language', { detail: { language: code, reloadEnglish: code === 'en' } }))
    setCurrent(code)
    setOpen(false)
  }

  const currentLang = ALTARIS_LANGUAGES.find((l) => l.code === current)

  if (compact) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
            borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)',
            color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" /></svg>
          {currentLang?.label || 'English'}
        </button>
        {open && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
            boxShadow: 'var(--shadow-md)', zIndex: 100, minWidth: 180, maxHeight: 300, overflowY: 'auto',
          }}>
            {ALTARIS_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px',
                  border: 'none', background: current === lang.code ? 'rgba(242,186,14,0.1)' : 'transparent',
                  color: current === lang.code ? 'var(--brand-primary)' : 'var(--text-primary)',
                  fontSize: 13, fontWeight: current === lang.code ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                  textAlign: 'left', transition: 'background .15s',
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Language</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {ALTARIS_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => selectLanguage(lang.code)}
            style={{
              padding: '10px 12px', borderRadius: 10, border: '1px solid',
              borderColor: current === lang.code ? 'var(--brand-primary)' : 'var(--border)',
              background: current === lang.code ? 'rgba(242,186,14,0.1)' : 'var(--bg-card)',
              color: current === lang.code ? 'var(--brand-primary)' : 'var(--text-primary)',
              fontSize: 12, fontWeight: current === lang.code ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all .15s',
            }}
            className="pressable"
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  )
}
