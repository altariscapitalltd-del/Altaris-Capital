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
  const strColors = ['', '#F6465D', '#F2BA0E', '#0ECB81']
  const strLabels = ['', 'Weak', 'Good', 'Strong']

  return (
    <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:28 }}>
      {done ? (
        <div style={{ textAlign:'center', padding:'8px 0' }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(14,203,129,0.1)', border:'1px solid rgba(14,203,129,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:24 }}>Check</div>
          <h2 style={{ fontSize:18, fontWeight:700, marginBottom:8, color:'#0ECB81' }}>Password updated!</h2>
          <p style={{ color:'#555', fontSize:13 }}>Redirecting you to sign in…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {!token && (
            <div style={{ background:'rgba(246,70,93,0.08)', border:'1px solid rgba(246,70,93,0.18)', borderRadius:9, padding:'12px 14px', color:'#F6465D', fontSize:13 }}>
              Invalid or missing reset token. Please request a new link.
            </div>
          )}

          <div>
            <label style={{ display:'block', color:'#555', fontSize:11, fontWeight:600, marginBottom:7, letterSpacing:'0.06em' }}>NEW PASSWORD</label>
            <div style={{ position:'relative' }}>
              <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? 'text' : 'password'} required disabled={!token}
                style={{ width:'100%', background:'#1A1A1A', color:'#fff', padding:'13px 40px 13px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', fontSize:14, fontFamily:'inherit', outline:'none', transition:'border-color .2s', boxSizing:'border-box' }}
                placeholder="At least 8 characters"
                onFocus={e => e.target.style.borderColor='#F2BA0E'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:13 }}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {password.length > 0 && (
              <div style={{ display:'flex', gap:4, marginTop:7, alignItems:'center' }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i <= strength ? strColors[strength] : '#2A2A2A', transition:'background .3s' }}/>
                ))}
                <span style={{ fontSize:11, color:strColors[strength], fontWeight:600, marginLeft:4, minWidth:36 }}>{strLabels[strength]}</span>
              </div>
            )}
          </div>

          <div>
            <label style={{ display:'block', color:'#555', fontSize:11, fontWeight:600, marginBottom:7, letterSpacing:'0.06em' }}>CONFIRM PASSWORD</label>
            <input value={confirm} onChange={e => setConfirm(e.target.value)} type={showPw ? 'text' : 'password'} required disabled={!token}
              style={{ width:'100%', background:'#1A1A1A', color:'#fff', padding:'13px 14px', borderRadius:10, border:`1px solid ${confirm && confirm !== password ? 'rgba(246,70,93,0.4)' : 'rgba(255,255,255,0.08)'}`, fontSize:14, fontFamily:'inherit', outline:'none', transition:'border-color .2s', boxSizing:'border-box' }}
              placeholder="Repeat password"
              onFocus={e => e.target.style.borderColor='#F2BA0E'} onBlur={e => e.target.style.borderColor = confirm && confirm !== password ? 'rgba(246,70,93,0.4)' : 'rgba(255,255,255,0.08)'}/>
          </div>

          {error && (
            <div style={{ background:'rgba(246,70,93,0.08)', border:'1px solid rgba(246,70,93,0.18)', borderRadius:9, padding:'10px 14px', color:'#F6465D', fontSize:13 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !token}
            style={{ background: loading ? 'rgba(242,186,14,0.4)' : '#F2BA0E', color:'#000', border:'none', borderRadius:10, padding:'14px', fontWeight:800, fontSize:15, cursor: loading || !token ? 'not-allowed' : 'pointer', fontFamily:'inherit', transition:'all .15s', marginTop:4 }}>
            {loading ? 'Updating…' : 'Update Password →'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight:'100vh', background:'#000', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Inter,sans-serif' }}>
      <div style={{ position:'fixed', top:'40%', left:'50%', transform:'translate(-50%,-50%)', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(242,186,14,0.05),transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ width:'100%', maxWidth:400, position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <AltarisLogoMark size={36} />
            <div style={{ textAlign:'left' }}>
              <div style={{ fontWeight:800, fontSize:15, letterSpacing:'0.08em' }}>ALTARIS</div>
              <div style={{ color:'#505050', fontSize:10, letterSpacing:'0.16em', marginTop:-1 }}>CAPITAL</div>
            </div>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, marginBottom:6 }}>Create new password</h1>
          <p style={{ color:'#555', fontSize:13 }}>Choose a strong password for your account</p>
        </div>
        <Suspense fallback={<div style={{ textAlign:'center', color:'#444' }}>Loading…</div>}>
          <ResetForm />
        </Suspense>
        <p style={{ textAlign:'center', marginTop:20, color:'#444', fontSize:13 }}>
          <Link href="/login" style={{ color:'#F2BA0E', textDecoration:'none', fontWeight:600 }}>← Back to Sign In</Link>
        </p>
      </div>
    </div>
  )
}
