'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AltarisLogoMark } from '@/components/AltarisLogo'

function Logo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <AltarisLogoMark size={34} />
      <div style={{ textAlign:'left' }}>
        <div style={{ fontFamily:'var(--font-body)', fontWeight:800, fontSize:14, letterSpacing:'0.14em' }}>ALTARIS</div>
        <div className="eyebrow gold" style={{ marginTop:2 }}>Capital</div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [userId, setUserId] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', confirm:'' })

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setUserId(data.userId)
      setStep('otp')
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'verify', userId, code: otp, purpose:'SIGNUP' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      
      // Push notifications: subscribed via Pusher Beams in app layout after redirect

      // Request location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(pos => {
          fetch('/api/user/location', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }) })
        })
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('altaris_post_signup_install', '1')
      }
      router.push('/home')
    } catch { setError('Verification failed. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'radial-gradient(120% 70% at 50% -5%,rgba(201,162,39,.08),transparent 48%),linear-gradient(180deg,var(--bg-page),#050608)', color:'var(--text-primary)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:430 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-block', marginBottom:20 }}><Logo /></div>
          {step === 'form' ? (
            <>
              <h1 className="font-display" style={{ fontSize:30, fontWeight:600, letterSpacing:'-0.01em', marginBottom:8 }}>Open an account</h1>
              <p style={{ color:'var(--text-secondary)', fontSize:14 }}>A considered home for serious capital.</p>
            </>
          ) : (
            <>
              <h1 className="font-display" style={{ fontSize:30, fontWeight:600, letterSpacing:'-0.01em', marginBottom:8 }}>Verify your email</h1>
              <p style={{ color:'var(--text-secondary)', fontSize:14 }}>We sent a 6-digit code to <strong style={{color:'var(--text-primary)'}}>{form.email}</strong></p>
            </>
          )}
        </div>

        <div className="card" style={{ padding:28 }}>
          {error && (
            <div style={{ background:'var(--danger-bg)', border:'1px solid var(--danger)', borderRadius:10, padding:'10px 14px', marginBottom:18, color:'var(--danger)', fontSize:13 }}>
              {error}
            </div>
          )}

          {step === 'form' ? (
            <form onSubmit={handleSignup} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label className="eyebrow" style={{ display:'block', marginBottom:8 }}>Full name</label>
                <input className="input" placeholder="John Doe" value={form.name} required
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="eyebrow" style={{ display:'block', marginBottom:8 }}>Email address</label>
                <input className="input" type="email" placeholder="you@example.com" value={form.email} required
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="eyebrow" style={{ display:'block', marginBottom:8 }}>Phone <span style={{textTransform:'none',letterSpacing:0,color:'var(--text-muted)'}}>(optional)</span></label>
                <input className="input" type="tel" placeholder="+1 234 567 890" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="eyebrow" style={{ display:'block', marginBottom:8 }}>Password</label>
                <input className="input" type="password" placeholder="Minimum 8 characters" value={form.password} required
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="eyebrow" style={{ display:'block', marginBottom:8 }}>Confirm password</label>
                <input className="input" type="password" placeholder="Repeat password" value={form.confirm} required
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop:6, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ background:'var(--gold-soft)', border:'1px solid var(--border-strong)', borderRadius:10, padding:14, fontSize:12, color:'var(--text-secondary)', textAlign:'center' }} className="eyebrow">
                Code expires in 5 minutes
              </div>
              <div>
                <label className="eyebrow" style={{ display:'block', marginBottom:8 }}>6-digit verification code</label>
                <input className="input num" style={{ fontSize:28, textAlign:'center', letterSpacing:'0.3em', fontWeight:700 }}
                  placeholder="000000" maxLength={6} value={otp} required
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} />
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary" style={{ opacity: (loading || otp.length !== 6) ? 0.6 : 1 }}>
                {loading ? 'Verifying…' : 'Verify & continue'}
              </button>
              <button type="button" className="btn-ghost" onClick={async () => { await fetch('/api/auth/otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send',userId,purpose:'SIGNUP'})}) }}>
                Resend code
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign:'center', marginTop:22, color:'var(--text-secondary)', fontSize:13 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color:'var(--gold-bright)', textDecoration:'none', fontWeight:600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
