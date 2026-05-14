'use client'
import { useEffect, useState } from 'react'

type Log = { id: string; action: string; adminId: string; createdAt: string; targetUserId?: string | null }

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Log[]>([])

  useEffect(() => {
    fetch('/api/admin/audit').then((r) => r.json()).then((d) => setLogs(d.logs || [])).catch(() => {})
  }, [])

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Audit Logs</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Trace administrative activity across the platform.</p>
      <div style={{ marginTop: 14, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}>Action</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Admin</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Target</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>{log.action}</td>
                <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>{log.adminId}</td>
                <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>{log.targetUserId || '-'}</td>
                <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
