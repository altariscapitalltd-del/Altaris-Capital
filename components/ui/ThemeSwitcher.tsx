'use client'
import { useTheme } from '@/lib/theme'

const OPTIONS = [
  { id: 'dark',   icon: '🌙', label: 'Dark' },
  { id: 'light',  icon: '☀️', label: 'Light' },
  { id: 'system', icon: '💻', label: 'System' },
] as const

export default function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()

  if (compact) {
    const current = OPTIONS.find(o => o.id === theme)!
    const next = OPTIONS[(OPTIONS.findIndex(o => o.id === theme) + 1) % 3]
    return (
      <button onClick={() => setTheme(next.id)}
        title={`Switch to ${next.label} mode`}
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
        {current.icon}
        {!compact && <span style={{ fontSize: 12, fontWeight: 600 }}>{current.label}</span>}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 10, padding: 3, border: '1px solid var(--border)', gap: 2 }}>
      {OPTIONS.map(o => (
        <button key={o.id} onClick={() => setTheme(o.id)}
          style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: theme === o.id ? 'var(--brand-primary)' : 'transparent', color: theme === o.id ? '#0B0E11' : 'var(--text-muted)', fontWeight: theme === o.id ? 700 : 500, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
          <span>{o.icon}</span> {o.label}
        </button>
      ))}
    </div>
  )
}
