'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const TYPE_ICON: Record<string, { bg: string; icon: JSX.Element }> = {
  investment: {
    bg: 'rgba(242,186,14,0.12)',
    icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#F2BA0E" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
  },
  deposit: {
    bg: 'rgba(14,203,129,0.12)',
    icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#0ECB81" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
  },
  withdrawal: {
    bg: 'rgba(246,70,93,0.12)',
    icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#F6465D" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
  },
  kyc: {
    bg: 'rgba(132,142,156,0.12)',
    icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#848E9C" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  },
}

function getTypeIcon(category?: string) {
  return TYPE_ICON[category ?? ''] ?? {
    bg: 'rgba(255,255,255,0.06)',
    icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
  }
}

function NotifSkel() {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-elevated)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 13, width: '55%', background: 'var(--bg-elevated)', borderRadius: 5, marginBottom: 8 }} />
        <div style={{ height: 11, width: '85%', background: 'var(--bg-elevated)', borderRadius: 4, marginBottom: 6 }} />
        <div style={{ height: 10, width: '28%', background: 'var(--bg-elevated)', borderRadius: 4 }} />
      </div>
    </div>
  )
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000)    return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [selected, setSelected] = useState<any|null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/user/notifications')
    const data = await res.json().catch(() => ({}))
    setNotifications(data.notifications || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function markAllRead() {
    if (notifications.length === 0) return
    setMarking(true)
    await fetch('/api/user/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) })
    await load()
    window.dispatchEvent(new Event('notifications:updated'))
    setMarking(false)
  }

  async function openNotification(n: any) {
    setSelected(n)
    if (!n.read) {
      await fetch('/api/user/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [n.id] }) })
      await load()
      window.dispatchEvent(new Event('notifications:updated'))
    }
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <div style={{ padding: '12px 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Link href="/settings" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'var(--text-secondary)' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Notifications</h1>
        <button onClick={markAllRead} disabled={marking || notifications.length === 0}
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: marking ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {marking ? 'Marking…' : 'Mark all read'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => <NotifSkel key={i} />)}
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>All caught up</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Notifications about your account and investments will appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map((n) => {
            const { bg, icon } = getTypeIcon(n.category)
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotification(n)}
                style={{ textAlign: 'left', background: n.read ? 'var(--bg-card)' : 'var(--bg-elevated)', border: `1px solid ${n.read ? 'var(--border)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 12, padding: 14, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', transition: 'background .15s' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, color: 'var(--text-primary)' }}>{n.title}</div>
                      {!n.read && <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(242,186,14,0.12)', color: 'var(--brand-primary)', whiteSpace: 'nowrap', flexShrink: 0 }}>NEW</span>}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.45, marginBottom: 6 }}>{n.body}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(n.createdAt)}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: 16,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 22,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              style={{ position: 'absolute', top: 14, right: 14, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
              aria-label="Close"
            >
              ×
            </button>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{selected.title}</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{new Date(selected.createdAt).toLocaleString()}</div>
            <div style={{ marginTop: 14, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>{selected.body}</div>
            {selected.url && (
              <Link href={selected.url} style={{ display: 'block', marginTop: 14, color: 'var(--brand-primary)', fontWeight: 600, fontSize: 14 }}>
                View details →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
