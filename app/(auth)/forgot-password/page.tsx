'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AltarisLogoMark } from '@/components/AltarisLogo'

export default function ForgotPasswordPage() {
  const [email,     setEmail]   = useState('')
  const [loading,   setLoading] = useState(false)
  const [sent,      setSent]    = useState(false)
  const [error,     setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res  = await fetch('/api/auth/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (res.ok) { setSent(true) }
    else { const d = await res.json(); setError(d.error || 'Something went wrong') }
  }

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
          <h1 className="font-display" style={{ fontSize:30, fontWeight:600, letterSpacing:'-0.01em', marginBottom:6 }}>Forgot password?</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:13 }}>Enter your email and we'll send a reset link.</p>
        </div>

        {sent ? (
          <div className="card" style={{ padding:30, textAlign:'center' }}>
            <div style={{ width:54, height:54, borderRadius:'50%', background:'var(--success-bg)', border:'1px solid var(--success)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', color:'var(--success)' }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h2 className="font-display" style={{ fontSize:20, fontWeight:600, marginBottom:8, color:'var(--success)' }}>Check your inbox</h2>
            <p style={{ color:'var(--text-secondary)', fontSize:13, lineHeight:1.6 }}>
              We sent a password reset link to <strong style={{ color:'var(--text-primary)' }}>{email}</strong>. The link expires in 1 hour.
            </p>
            <Link href="/login" className="btn-ghost" style={{ display:'block', marginTop:22, textAlign:'center' }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="card" style={{ padding:26 }}>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label className="eyebrow" style={{ display:'block', marginBottom:9 }}>Email address</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" required autoFocus
                  className="input" placeholder="you@example.com" />
              </div>

              {error && (
                <div style={{ background:'var(--danger-bg)', border:'1px solid var(--danger)', borderRadius:10, padding:'10px 14px', color:'var(--danger)', fontSize:13 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop:4, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p style={{ textAlign:'center', marginTop:18, color:'var(--text-secondary)', fontSize:13 }}>
              Remember it?{' '}
              <Link href="/login" style={{ color:'var(--gold-bright)', textDecoration:'none', fontWeight:600 }}>Sign in</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
