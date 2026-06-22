'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Plan = {
  id: string
  name: string
  description?: string | null
  category: string
  symbol: string
  image?: string | null
  dailyRoi: number
  duration: number
  minDeposit: number
  riskLevel: number
  badge?: string | null
  isActive: boolean
  sortOrder: number
}

const EMPTY: Omit<Plan, 'id' | 'isActive' | 'sortOrder'> = {
  name: '', description: '', category: 'Crypto', symbol: '', dailyRoi: 0.01, duration: 30, minDeposit: 100, riskLevel: 3, badge: '', image: ''
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [form, setForm] = useState<any>(EMPTY)
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function load() {
    fetch('/api/admin/investment-plans')
      .then(r => r.json())
      .then(d => { setPlans(d.plans || []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null); setForm({ ...EMPTY, sortOrder: plans.length + 1, isActive: true }); setMsg(null)
  }
  function openEdit(plan: Plan) {
    setEditing(plan); setForm({ ...plan }); setMsg(null)
  }

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const method = editing ? 'PUT' : 'POST'
      const body = editing ? { ...form, id: editing.id } : form
      const res = await fetch('/api/admin/investment-plans', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); setMsg('Error: ' + (d.error || 'Save failed')); return }
      setEditing(null); setForm(EMPTY); load()
    } finally { setSaving(false) }
  }

  async function toggleActive(plan: Plan) {
    await fetch('/api/admin/investment-plans', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: plan.id, isActive: !plan.isActive }) })
    load()
  }

  async function deletePlan(id: string) {
    if (!confirm('Delete this plan?')) return
    await fetch(`/api/admin/investment-plans?id=${id}`, { method: 'DELETE' })
    load()
  }

  const isFormOpen = form.name !== undefined && (editing !== null || form.name !== undefined)
  const showForm = editing !== null || (form && Object.keys(form).length > 1 && form.name !== EMPTY.name) || false
  const [showNew, setShowNew] = useState(false)

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Link href="/admin/dashboard" style={{ color: '#aaa', fontSize: 12, textDecoration: 'none', marginBottom: 8, display: 'block' }}>← Back to dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Investment Plans</h1>
          <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>{plans.length} plans · DB-driven</div>
        </div>
        <button onClick={() => { setEditing(null); setForm({ ...EMPTY, sortOrder: plans.length + 1, isActive: true }); setShowNew(true) }}
          style={{ padding: '10px 20px', background: '#C9A227', color: '#000', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
          + New Plan
        </button>
      </div>

      {msg && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#2d1a1a', color: '#F6465D', fontSize: 13 }}>{msg}</div>}

      {/* New / Edit form */}
      {(showNew || editing) && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{editing ? `Edit: ${editing.name}` : 'New Investment Plan'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {([
              ['name', 'Plan Name', 'text'],
              ['symbol', 'Symbol (BTC, ETH...)', 'text'],
              ['category', 'Category', 'text'],
              ['badge', 'Badge (Hot, Popular...)', 'text'],
              ['description', 'Description', 'text'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label style={{ display: 'block', color: '#888', fontSize: 11, marginBottom: 5 }}>{label}</label>
                <input value={form[key] || ''} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            {/* Image upload or URL */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', color: '#888', fontSize: 11, marginBottom: 5 }}>Coin Image (upload SVG/PNG or paste URL)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={form.image || ''} onChange={e => setForm((f: any) => ({ ...f, image: e.target.value }))}
                  placeholder="https://... or upload →"
                  style={{ flex: 1, background: '#0a0a0a', color: '#fff', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                <label style={{ padding: '9px 14px', background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, color: '#ccc', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                  Upload
                  <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = ev => { if (ev.target?.result) setForm((f: any) => ({ ...f, image: ev.target!.result as string })) }
                    reader.readAsDataURL(file)
                  }} />
                </label>
                {form.image && (
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: '#111', border: '1px solid #222', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={form.image} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} onError={() => {}} />
                  </div>
                )}
              </div>
            </div>
            {([
              ['dailyRoi', 'Daily ROI (0.024 = 2.4%)', 'number'],
              ['duration', 'Duration (days)', 'number'],
              ['minDeposit', 'Min Deposit ($)', 'number'],
              ['riskLevel', 'Risk Level (1-5)', 'number'],
              ['sortOrder', 'Sort Order', 'number'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label style={{ display: 'block', color: '#888', fontSize: 11, marginBottom: 5 }}>{label}</label>
                <input type="number" value={form[key] ?? ''} onChange={e => setForm((f: any) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#ccc', fontSize: 13 }}>
              <input type="checkbox" checked={form.isActive !== false} onChange={e => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} />
              Active (visible to users)
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={save} disabled={saving} style={{ padding: '10px 20px', background: '#C9A227', color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save Plan'}</button>
            <button onClick={() => { setEditing(null); setShowNew(false); setForm(EMPTY) }} style={{ padding: '10px 20px', background: '#1a1a1a', color: '#888', border: '1px solid #222', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Plans table */}
      {loading ? (
        <div style={{ color: '#888', padding: 40, textAlign: 'center' }}>Loading plans...</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {plans.map(plan => (
            <div key={plan.id} style={{ background: '#0E0E0E', border: '1px solid #1a1a1a', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, opacity: plan.isActive ? 1 : 0.5 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#C9A227', flexShrink: 0 }}>{plan.symbol.slice(0,4)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {plan.name}
                  {plan.badge && <span style={{ fontSize: 9, fontWeight: 900, background: '#C9A22720', color: '#C9A227', padding: '2px 7px', borderRadius: 4 }}>{plan.badge}</span>}
                  {!plan.isActive && <span style={{ fontSize: 9, fontWeight: 900, background: '#33000d', color: '#F6465D', padding: '2px 7px', borderRadius: 4 }}>INACTIVE</span>}
                </div>
                <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{plan.category} · {plan.symbol} · {plan.duration}d · ${plan.minDeposit} min</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: '#C9A227' }}>{(plan.dailyRoi * 100).toFixed(2)}%</div>
                <div style={{ color: '#555', fontSize: 9, fontWeight: 700 }}>DAILY</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => openEdit(plan)} style={{ padding: '6px 12px', background: '#1a1a1a', border: '1px solid #222', color: '#ccc', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => toggleActive(plan)} style={{ padding: '6px 12px', background: plan.isActive ? '#1a2e1a' : '#1a1a1a', border: `1px solid ${plan.isActive ? '#0ECB8140' : '#333'}`, color: plan.isActive ? '#0ECB81' : '#888', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>{plan.isActive ? 'Disable' : 'Enable'}</button>
                <button onClick={() => deletePlan(plan.id)} style={{ padding: '6px 12px', background: '#2d1a1a', border: '1px solid #F6465D30', color: '#F6465D', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
