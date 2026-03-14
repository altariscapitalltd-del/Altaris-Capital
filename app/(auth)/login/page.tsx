'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AltarisLogoMark } from '@/components/AltarisLogo'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [form, setForm] = useState({ email:'', password:'' })

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      // Subscribe to push notifications (if not already subscribed)
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const reg = await navigator.serviceWorker.ready
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          if (vapidKey) {
            let sub = await reg.pushManager.getSubscription()
            if (!sub) {
              sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
              })
            }
            if (sub) {
              await fetch('/api/user/push-subscribe', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(sub) })
            }
          }
        } catch (err) {
          console.warn('Push subscription failed', err)
        }
      }

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(pos => {
          fetch('/api/user/location', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }) })
        })
      }
      if (data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN') router.push('/admin/dashboard')
      else router.push('/home')
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div style={{ minHeight:'100vh', background:'#000', display:'flex', fontFamily:'Inter,sans-serif' }}>
      {/* Left panel — hero (desktop only) */}
      <div style={{ flex:1, background:'linear-gradient(135deg, #0A0A0A 0%, #111 100%)', display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 64px', position:'relative', overflow:'hidden' }} className="hide-mobile">
        {/* Gold glow */}
        <div style={{ position:'absolute', bottom:-100, left:-100, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(242,186,14,0.07),transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ marginBottom:48 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:48 }}>
            <AltarisLogoMark size={44} />
            <div>
              <div style={{ fontWeight:800, fontSize:18, letterSpacing:'0.08em' }}>ALTARIS</div>
              <div style={{ color:'#505050', fontSize:11, letterSpacing:'0.16em' }}>CAPITAL</div>
            </div>
          </div>
          <h2 style={{ fontSize:36, fontWeight:900, lineHeight:1.2, marginBottom:16 }}>
            Your wealth,<br />
            <span style={{ background:'linear-gradient(90deg,#F2BA0E,#FFD23A)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              working harder.
            </span>
          </h2>
          <p style={{ color:'#555', fontSize:15, lineHeight:1.7 }}>
            Join 500,000+ investors growing wealth with AI-powered strategies.
          </p>
        </div>
        {/* Trust stats */}
        {[
          { v:'$2.4B+', l:'Assets Under Management' },
          { v:'500K+',  l:'Active Investors' },
          { v:'99.97%', l:'Platform Uptime' },
        ].map(({ v, l }) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontWeight:800, fontSize:20, color:'#F2BA0E', minWidth:70 }}>{v}</div>
            <div style={{ color:'#555', fontSize:13 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Right panel — form */}
      <div style={{ width:'100%', maxWidth:460, display:'flex', flexDirection:'column', justifyContent:'center', padding:'40px 32px', background:'#080808', borderLeft:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ marginBottom:36 }}>
          {/* Mobile logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }} className="show-mobile-only">
            <AltarisLogoMark size={32} />
            <div style={{ fontWeight:800, fontSize:14, letterSpacing:'0.08em' }}>ALTARIS <span style={{ color:'#505050', fontWeight:400, fontSize:11 }}>CAPITAL</span></div>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, marginBottom:6 }}>Welcome back</h1>
          <p style={{ color:'#555', fontSize:13 }}>
            Don't have an account?{' '}
            <Link href="/signup" style={{ color:'#F2BA0E', textDecoration:'none', fontWeight:600 }}>Create one free</Link>
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ display:'block', color:'#555', fontSize:11, fontWeight:600, marginBottom:7, letterSpacing:'0.06em' }}>EMAIL</label>
            <input value={form.email} onChange={f('email')} type="email" required autoComplete="email" autoFocus
              style={{ width:'100%', background:'#111', color:'#fff', padding:'13px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', fontSize:14, fontFamily:'inherit', outline:'none', transition:'border-color .2s', boxSizing:'border-box' }}
              placeholder="you@example.com"
              onFocus={e => e.target.style.borderColor='#F2BA0E'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
          </div>

          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
              <label style={{ color:'#555', fontSize:11, fontWeight:600, letterSpacing:'0.06em' }}>PASSWORD</label>
              <Link href="/forgot-password" style={{ color:'#F2BA0E', fontSize:11, textDecoration:'none', fontWeight:600 }}>Forgot password?</Link>
            </div>
            <div style={{ position:'relative' }}>
              <input value={form.password} onChange={f('password')} type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                style={{ width:'100%', background:'#111', color:'#fff', padding:'13px 42px 13px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', fontSize:14, fontFamily:'inherit', outline:'none', transition:'border-color .2s', boxSizing:'border-box' }}
                placeholder="••••••••••"
                onFocus={e => e.target.style.borderColor='#F2BA0E'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#555', cursor:'pointer', padding:4 }}>
                {showPw
                  ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>
                  : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background:'rgba(246,70,93,0.08)', border:'1px solid rgba(246,70,93,0.18)', borderRadius:9, padding:'10px 14px', color:'#F6465D', fontSize:13 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ background: loading ? 'rgba(242,186,14,0.4)' : '#F2BA0E', color:'#000', border:'none', borderRadius:10, padding:'14px', fontWeight:800, fontSize:15, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit', transition:'all .15s', marginTop:4 }}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:24, color:'#333', fontSize:11 }}>
          By signing in you agree to our{' '}
          <Link href="/terms" style={{ color:'#555', textDecoration:'none' }}>Terms</Link> &amp;{' '}
          <Link href="/privacy" style={{ color:'#555', textDecoration:'none' }}>Privacy Policy</Link>
        </p>
      </div>

      <style>{`
        @media (max-width: 640px) { .hide-mobile { display: none !important; } }
        @media (min-width: 641px) { .show-mobile-only { display: none !important; } }
      `}</style>
    </div>
  )
}
