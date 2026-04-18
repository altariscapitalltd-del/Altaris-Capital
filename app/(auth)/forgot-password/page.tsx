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
    <div style={{ minHeight:'100vh', background:'#000', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Inter,sans-serif' }}>
      {/* Background glow */}
      <div style={{ position:'fixed', top:'40%', left:'50%', transform:'translate(-50%,-50%)', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(242,186,14,0.05),transparent 70%)', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:400, position:'relative' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <AltarisLogoMark size={36} />
            <div style={{ textAlign:'left' }}>
              <div style={{ fontWeight:800, fontSize:15, letterSpacing:'0.08em' }}>ALTARIS</div>
              <div style={{ color:'#505050', fontSize:10, letterSpacing:'0.16em', marginTop:-1 }}>CAPITAL</div>
            </div>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, marginBottom:6 }}>Forgot password?</h1>
          <p style={{ color:'#555', fontSize:13 }}>Enter your email and we'll send a reset link</p>
        </div>

        {sent ? (
          <div style={{ background:'#111', border:'1px solid rgba(14,203,129,0.2)', borderRadius:18, padding:32, textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(14,203,129,0.1)', border:'1px solid rgba(14,203,129,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:24 }}>Check</div>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:8, color:'#0ECB81' }}>Check your inbox</h2>
            <p style={{ color:'#666', fontSize:13, lineHeight:1.6 }}>
              We sent a password reset link to <strong style={{ color:'#ddd' }}>{email}</strong>. The link expires in 1 hour.
            </p>
            <Link href="/login" style={{ display:'block', marginTop:24, padding:'12px', background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, color:'#888', textDecoration:'none', fontSize:13, fontWeight:600 }}>
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:28 }}>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', color:'#555', fontSize:11, fontWeight:600, marginBottom:7, letterSpacing:'0.06em' }}>EMAIL ADDRESS</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" required autoFocus
                  style={{ width:'100%', background:'#1A1A1A', color:'#fff', padding:'13px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', fontSize:14, fontFamily:'inherit', outline:'none', transition:'border-color .2s', boxSizing:'border-box' }}
                  placeholder="you@example.com"
                  onFocus={e => e.target.style.borderColor='#F2BA0E'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>

              {error && (
                <div style={{ background:'rgba(246,70,93,0.08)', border:'1px solid rgba(246,70,93,0.18)', borderRadius:9, padding:'10px 14px', color:'#F6465D', fontSize:13 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ background: loading ? 'rgba(242,186,14,0.4)' : '#F2BA0E', color:'#000', border:'none', borderRadius:10, padding:'14px', fontWeight:800, fontSize:15, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit', transition:'all .15s', marginTop:4 }}>
                {loading ? 'Sending…' : 'Send Reset Link →'}
              </button>
            </form>

            <p style={{ textAlign:'center', marginTop:20, color:'#444', fontSize:13 }}>
              Remember it?{' '}
              <Link href="/login" style={{ color:'#F2BA0E', textDecoration:'none', fontWeight:600 }}>Sign in</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
