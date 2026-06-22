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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      // Push notifications: subscribed via Pusher Beams in app layout after redirect

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
    <div className="auth-root">
      {/* Left panel — hero (desktop only) */}
      <div className="auth-hero hide-mobile">
        <div className="auth-hero-glow" />
        <div style={{ marginBottom: 44, position: 'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:56 }}>
            <AltarisLogoMark size={42} />
            <div>
              <div className="auth-wordmark">ALTARIS</div>
              <div className="eyebrow gold" style={{ marginTop: 2 }}>Capital</div>
            </div>
          </div>
          <h2 className="auth-headline">
            Your wealth,<br /><em>working quietly.</em>
          </h2>
          <p className="auth-sub">Considered strategies and disciplined execution for serious capital — held to a private-bank standard.</p>
        </div>
        {/* Trust stats with gold hairlines */}
        <div style={{ position: 'relative' }}>
          {[
            { v:'$2.4B+',  l:'Assets under management' },
            { v:'500,000+', l:'Investors served' },
            { v:'99.97%',  l:'Platform uptime' },
          ].map(({ v, l }) => (
            <div key={l} className="auth-stat">
              <div className="auth-stat-v num font-display">{v}</div>
              <div className="auth-stat-l">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-form-panel">
        <div style={{ marginBottom:34 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:30 }} className="show-mobile-only">
            <AltarisLogoMark size={30} />
            <div className="auth-wordmark" style={{ fontSize: 14 }}>ALTARIS <span className="eyebrow gold">Capital</span></div>
          </div>
          <h1 className="auth-form-title font-display">Welcome back</h1>
          <p className="auth-form-sub">
            New to Altaris?{' '}
            <Link href="/signup" className="auth-link">Open an account</Link>
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label className="eyebrow" style={{ display:'block', marginBottom:9 }}>Email</label>
            <input value={form.email} onChange={f('email')} type="email" required autoComplete="email" autoFocus
              className="input" placeholder="you@example.com" />
          </div>

          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:9 }}>
              <label className="eyebrow">Password</label>
              <Link href="/forgot-password" className="auth-link" style={{ fontSize: 11 }}>Forgot password?</Link>
            </div>
            <div style={{ position:'relative' }}>
              <input value={form.password} onChange={f('password')} type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                className="input" style={{ paddingRight: 44 }} placeholder="••••••••••" />
              <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:4, display:'flex' }}>
                {showPw
                  ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>
                  : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background:'var(--danger-bg)', border:'1px solid var(--danger)', borderRadius:10, padding:'10px 14px', color:'var(--danger)', fontSize:13 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop:4, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:24, color:'var(--text-muted)', fontSize:11 }}>
          By signing in you agree to our{' '}
          <Link href="/terms" className="auth-link" style={{ color:'var(--text-secondary)' }}>Terms</Link> &amp;{' '}
          <Link href="/privacy" className="auth-link" style={{ color:'var(--text-secondary)' }}>Privacy Policy</Link>
        </p>
      </div>

      <style>{`
        .auth-root{min-height:100vh;display:flex;background:var(--bg-page);color:var(--text-primary)}
        .auth-hero{flex:1;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:center;padding:60px 64px;
          background:radial-gradient(120% 80% at 100% 0,rgba(201,162,39,.10),transparent 52%),linear-gradient(160deg,#0C0D11,#08090C)}
        .auth-hero-glow{position:absolute;bottom:-120px;left:-120px;width:520px;height:520px;border-radius:50%;
          background:radial-gradient(circle,rgba(201,162,39,.08),transparent 70%);pointer-events:none}
        .auth-wordmark{font-family:var(--font-body);font-weight:800;font-size:18px;letter-spacing:.14em}
        .auth-headline{font-family:var(--font-display);font-weight:500;font-size:42px;line-height:1.12;letter-spacing:-.02em;margin-bottom:18px}
        .auth-headline em{font-style:italic;color:var(--gold-bright)}
        .auth-sub{color:var(--text-secondary);font-size:15px;line-height:1.7;max-width:440px}
        .auth-stat{display:flex;align-items:center;gap:18px;padding:16px 0;border-top:1px solid var(--hairline)}
        .auth-stat-v{font-weight:600;font-size:22px;color:var(--gold-bright);min-width:120px}
        .auth-stat-l{color:var(--text-secondary);font-size:13px}
        .auth-form-panel{width:100%;max-width:480px;display:flex;flex-direction:column;justify-content:center;padding:40px 36px;
          background:#0A0B0E;border-left:1px solid var(--border)}
        .auth-form-title{font-weight:600;font-size:30px;letter-spacing:-.01em;margin-bottom:6px}
        .auth-form-sub{color:var(--text-secondary);font-size:13px}
        .auth-link{color:var(--gold-bright);text-decoration:none;font-weight:600}
        .auth-link:hover{text-decoration:underline}
        @media (max-width: 640px){.hide-mobile{display:none !important}.auth-form-panel{max-width:none;border-left:none;padding:32px 22px}}
        @media (min-width: 641px){.show-mobile-only{display:none !important}}
      `}</style>
    </div>
  )
}
