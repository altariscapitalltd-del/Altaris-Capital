'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

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

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <div style={{ padding: '12px 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Link href="/settings" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'var(--text-secondary)' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Notifications</h1>
        <button onClick={markAllRead} disabled={marking || notifications.length === 0}
          style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: marking ? 'not-allowed' : 'pointer' }}>
          {marking ? 'Marking…' : 'Mark all read'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
      ) : notifications.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No notifications yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map((n) => (
            <div key={n.id} style={{ background: n.read ? 'var(--bg-card)' : 'rgba(242,186,14,0.12)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                {n.read ? null : (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'var(--danger-bg)', color: 'var(--danger)' }}>New</span>
                )}
              </div>
              <div style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>{n.body}</div>
              {n.url && (
                <Link href={n.url} style={{ marginTop: 10, display: 'inline-block', fontSize: 12, color: 'var(--brand-primary)', fontWeight: 700 }}>View details →</Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
