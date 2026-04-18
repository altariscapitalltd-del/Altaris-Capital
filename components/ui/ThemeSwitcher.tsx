'use client'
import { Moon } from 'lucide-react'

export default function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  return (
    <div
      title="Dark mode"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: compact ? '6px 10px' : '7px 12px',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Moon size={16} strokeWidth={2} />
      {!compact && <span style={{ fontSize: 12, fontWeight: 600 }}>Dark</span>}
    </div>
  )
}
