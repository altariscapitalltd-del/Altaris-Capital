'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AltarisLogoMark } from '@/components/AltarisLogo'

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token  = params.get('token') || ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState('')
  const [showPw,    setShowPw]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const res  = await fetch('/api/auth/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    setLoading(false)
    if (res.ok) { setDone(true); setTimeout(() => router.push('/login'), 3000) }
    else { const d = await res.json(); setError(d.error || 'Reset failed') }
  }

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.match(/[A-Z]/) && password.match(/[0-9]/) ? 3 : 2
  const strColors = ['', 'var(--danger)', 'var(--gold)', 'var(--success)']
  const strLabels = ['', 'Weak', 'Good', 'Strong']

  return (
    <div className="card" style={{ padding:26 }}>
      {done ? (
        <div style={{ textAlign:'center', padding:'8px 0' }}>
          <div style={{ width:54, height:54, borderRadius:'50%', background:'var(--success-bg)', border:'1px solid var(--success)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', color:'var(--success)' }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 className="font-display" style={{ fontSize:20, fontWeight:600, marginBottom:8, color:'var(--success)' }}>Password updated</h2>
          <p style={{ color:'var(--text-secondary)', fontSize:13 }}>Redirecting you to sign in…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {!token && (
            <div style={{ background:'var(--danger-bg)', border:'1px solid var(--danger)', borderRadius:10, padding:'12px 14px', color:'var(--danger)', fontSize:13 }}>
              Invalid or missing reset token. Please request a new link.
            </div>
          )}

          <div>
            <label className="eyebrow" style={{ display:'block', marginBottom:9 }}>New password</label>
            <div style={{ position:'relative' }}>
              <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? 'text' : 'password'} required disabled={!token}
                className="input" style={{ paddingRight:54 }} placeholder="At least 8 characters" />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {password.length > 0 && (
              <div style={{ display:'flex', gap:4, marginTop:8, alignItems:'center' }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i <= strength ? strColors[strength] : 'var(--bg-elevated)', transition:'background .3s' }}/>
                ))}
                <span style={{ fontSize:11, color:strColors[strength], fontWeight:600, marginLeft:4, minWidth:40 }}>{strLabels[strength]}</span>
              </div>
            )}
          </div>

          <div>
            <label className="eyebrow" style={{ display:'block', marginBottom:9 }}>Confirm password</label>
            <input value={confirm} onChange={e => setConfirm(e.target.value)} type={showPw ? 'text' : 'password'} required disabled={!token}
              className="input" style={{ borderColor: confirm && confirm !== password ? 'var(--danger)' : undefined }}
              placeholder="Repeat password" />
          </div>

          {error && (
            <div style={{ background:'var(--danger-bg)', border:'1px solid var(--danger)', borderRadius:10, padding:'10px 14px', color:'var(--danger)', fontSize:13 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !token} className="btn-primary" style={{ marginTop:4, opacity: (loading || !token) ? 0.6 : 1 }}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight:'100vh', background:'radial-gradient(120% 70% at 50% -5%,rgba(201,162,39,.08),transparent 48%),linear-gradient(180deg,var(--bg-page),#050608)', color:'var(--text-primary)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:410, position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <AltarisLogoMark size={36} />
            <div style={{ textAlign:'left' }}>
              <div style={{ fontFamily:'var(--font-body)', fontWeight:800, fontSize:15, letterSpacing:'0.14em' }}>ALTARIS</div>
              <div className="eyebrow gold" style={{ marginTop:2 }}>Capital</div>
            </div>
          </div>
          <h1 className="font-display" style={{ fontSize:30, fontWeight:600, letterSpacing:'-0.01em', marginBottom:6 }}>Create new password</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:13 }}>Choose a strong password for your account.</p>
        </div>
        <Suspense fallback={<div style={{ textAlign:'center', color:'var(--text-muted)' }}>Loading…</div>}>
          <ResetForm />
        </Suspense>
        <p style={{ textAlign:'center', marginTop:18, color:'var(--text-secondary)', fontSize:13 }}>
          <Link href="/login" style={{ color:'var(--gold-bright)', textDecoration:'none', fontWeight:600 }}>Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
