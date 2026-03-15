'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AltarisLogoMark } from '@/components/AltarisLogo'

function Logo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <AltarisLogoMark size={34} />
      <div>
        <div style={{ fontWeight:800, fontSize:14, letterSpacing:'0.08em' }}>ALTARIS</div>
        <div style={{ color:'#505050', fontSize:9, letterSpacing:'0.16em', lineHeight:1 }}>CAPITAL</div>
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
        localStorage.setItem('altaris_install_pending', '1')
      }
      router.push('/home')
    } catch { setError('Verification failed. Please try again.') }
    finally { setLoading(false) }
  }

  const inputStyle: React.CSSProperties = {
    width:'100%', background:'#1E2329', color:'#fff', padding:'14px 16px',
    borderRadius:8, border:'1px solid #2B3139', fontSize:15, fontFamily:'inherit',
    outline:'none', marginBottom:16,
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0B0E11', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'inline-block', marginBottom:16 }}><Logo /></div>
          {step === 'form' ? (
            <>
              <h1 style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>Create your account</h1>
              <p style={{ color:'#B0B3B8', fontSize:15 }}>Join 500,000+ investors worldwide</p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>Verify your email</h1>
              <p style={{ color:'#B0B3B8', fontSize:15 }}>We sent a 6-digit code to <strong style={{color:'#fff'}}>{form.email}</strong></p>
            </>
          )}
        </div>

        <div className="card" style={{ padding:32 }}>
          {error && (
            <div style={{ background:'rgba(246,70,93,0.1)', border:'1px solid rgba(246,70,93,0.3)', borderRadius:8, padding:'12px 16px', marginBottom:20, color:'#F6465D', fontSize:14 }}>
              {error}
            </div>
          )}

          {step === 'form' ? (
            <form onSubmit={handleSignup}>
              <label style={{ display:'block', color:'#B0B3B8', fontSize:13, marginBottom:6 }}>Full Name</label>
              <input style={inputStyle} placeholder="John Doe" value={form.name} required
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onFocus={e => (e.target.style.borderColor='#F0B90B')}
                onBlur={e => (e.target.style.borderColor='#2B3139')} />

              <label style={{ display:'block', color:'#B0B3B8', fontSize:13, marginBottom:6 }}>Email Address</label>
              <input style={inputStyle} type="email" placeholder="you@example.com" value={form.email} required
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                onFocus={e => (e.target.style.borderColor='#F0B90B')}
                onBlur={e => (e.target.style.borderColor='#2B3139')} />

              <label style={{ display:'block', color:'#B0B3B8', fontSize:13, marginBottom:6 }}>Phone (optional)</label>
              <input style={inputStyle} type="tel" placeholder="+1 234 567 890" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                onFocus={e => (e.target.style.borderColor='#F0B90B')}
                onBlur={e => (e.target.style.borderColor='#2B3139')} />

              <label style={{ display:'block', color:'#B0B3B8', fontSize:13, marginBottom:6 }}>Password</label>
              <input style={inputStyle} type="password" placeholder="Minimum 8 characters" value={form.password} required
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                onFocus={e => (e.target.style.borderColor='#F0B90B')}
                onBlur={e => (e.target.style.borderColor='#2B3139')} />

              <label style={{ display:'block', color:'#B0B3B8', fontSize:13, marginBottom:6 }}>Confirm Password</label>
              <input style={{ ...inputStyle, marginBottom:24 }} type="password" placeholder="Repeat password" value={form.confirm} required
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                onFocus={e => (e.target.style.borderColor='#F0B90B')}
                onBlur={e => (e.target.style.borderColor='#2B3139')} />

              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:'14px', background:'#F0B90B', color:'#0B0E11', border:'none', borderRadius:8, fontWeight:700, fontSize:16, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <div style={{ background:'rgba(240,185,11,0.05)', border:'1px solid rgba(240,185,11,0.15)', borderRadius:8, padding:16, marginBottom:24, fontSize:13, color:'#B0B3B8', textAlign:'center' }}>
                Code expires in 5 minutes
              </div>
              <label style={{ display:'block', color:'#B0B3B8', fontSize:13, marginBottom:6 }}>6-Digit Verification Code</label>
              <input style={{ ...inputStyle, fontSize:28, textAlign:'center', letterSpacing:'0.3em', fontWeight:700 }}
                placeholder="000000" maxLength={6} value={otp} required
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                onFocus={e => (e.target.style.borderColor='#F0B90B')}
                onBlur={e => (e.target.style.borderColor='#2B3139')} />
              <button type="submit" disabled={loading || otp.length !== 6}
                style={{ width:'100%', padding:'14px', background:'#F0B90B', color:'#0B0E11', border:'none', borderRadius:8, fontWeight:700, fontSize:16, cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer', opacity: (loading || otp.length !== 6) ? 0.7 : 1, marginBottom:16 }}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <button type="button" onClick={async () => { await fetch('/api/auth/otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send',userId,purpose:'SIGNUP'})}) }}
                style={{ width:'100%', padding:'12px', background:'transparent', color:'#B0B3B8', border:'1px solid #2B3139', borderRadius:8, cursor:'pointer', fontSize:14 }}>
                Resend Code
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign:'center', marginTop:24, color:'#B0B3B8', fontSize:14 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color:'#F0B90B', textDecoration:'none', fontWeight:600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  )
}
