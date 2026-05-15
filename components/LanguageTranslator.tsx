'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Francais', flag: '🇫🇷' },
  { code: 'es', name: 'Espanol', flag: '🇪🇸' },
  { code: 'pt', name: 'Portugues', flag: '🇵🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
]

interface Props {
  variant?: 'compact' | 'full'
}

export default function LanguageTranslator({ variant = 'compact' }: Props) {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]

  if (variant === 'compact') {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all"
          aria-label="Select language"
        >
          <span className="text-sm">{current.flag}</span>
          <span className="text-[11px] font-bold text-[#999] uppercase hidden sm:inline">{current.code}</span>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#666" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        {open && (
          <div className="absolute right-0 top-10 bg-[#111] border border-[var(--border)] rounded-xl p-1.5 z-50 min-w-[180px] shadow-2xl">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => { setLanguage(l.code as any); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                  language === l.code
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'hover:bg-white/[0.03] text-[var(--text-secondary)]'
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <span className="text-xs font-bold">{l.name}</span>
                {language === l.code && (
                  <svg className="ml-auto" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1">
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            onClick={() => setLanguage(l.code as any)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
              language === l.code
                ? 'bg-[var(--primary)]/10 border-[var(--primary)]/25'
                : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
            }`}
          >
            <span className="text-xl">{l.flag}</span>
            <div className="text-left">
              <div className={`text-sm font-bold ${language === l.code ? 'text-[var(--primary)]' : ''}`}>{l.name}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase">{l.code}</div>
            </div>
            {language === l.code && (
              <div className="ml-auto w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
