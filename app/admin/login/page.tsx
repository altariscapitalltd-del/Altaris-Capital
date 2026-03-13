'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const res = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email, password }) })
    if (res.ok) { router.push('/admin/dashboard') }
    else { const d = await res.json(); setError(d.error||'Invalid credentials') }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', padding:20 }}>
      {/* Background glow */}
      <div style={{ position:'fixed', top:'30%', left:'50%', transform:'translateX(-50%)', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(242,186,14,0.04),transparent 70%)', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:380 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:56, height:56, borderRadius:16, background:'rgba(242,186,14,0.08)', border:'1px solid rgba(242,186,14,0.2)', marginBottom:14 }}>
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L36 34H4L20 4Z" stroke="#F2BA0E" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
              <line x1="20" y1="16" x2="20" y2="28" stroke="#F2BA0E" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Altaris Admin</h1>
          <p style={{ color:'#444', fontSize:13 }}>Restricted access — authorized personnel only</p>
        </div>

        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:28 }}>
          <form onSubmit={login} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ display:'block', color:'#666', fontSize:12, fontWeight:600, marginBottom:7, letterSpacing:'0.04em' }}>EMAIL ADDRESS</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required
                style={{ width:'100%', background:'#1A1A1A', color:'#fff', padding:'13px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', fontSize:14, fontFamily:'inherit', outline:'none', transition:'border-color .2s', boxSizing:'border-box' }}
                placeholder="admin@altariscapital.ltd"
                onFocus={e=>e.target.style.borderColor='#F2BA0E'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
            </div>
            <div>
              <label style={{ display:'block', color:'#666', fontSize:12, fontWeight:600, marginBottom:7, letterSpacing:'0.04em' }}>PASSWORD</label>
              <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required
                style={{ width:'100%', background:'#1A1A1A', color:'#fff', padding:'13px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', fontSize:14, fontFamily:'inherit', outline:'none', transition:'border-color .2s', boxSizing:'border-box' }}
                placeholder="••••••••••"
                onFocus={e=>e.target.style.borderColor='#F2BA0E'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
            </div>

            {error && (
              <div style={{ background:'rgba(246,70,93,0.08)', border:'1px solid rgba(246,70,93,0.2)', borderRadius:8, padding:'10px 14px', color:'#F6465D', fontSize:13 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ background: loading?'rgba(242,186,14,0.4)':'#F2BA0E', color:'#000', border:'none', borderRadius:10, padding:'14px', fontWeight:800, fontSize:15, cursor: loading?'not-allowed':'pointer', fontFamily:'inherit', transition:'all .15s', marginTop:4 }}>
              {loading ? 'Authenticating...' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', color:'#333', fontSize:11, marginTop:16 }}>
          Altaris Capital · Admin Panel v2.0
        </p>
      </div>
    </div>
  )
}
