'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error';text:string}|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(d => {
      setUser(d.user); setName(d.user?.name||''); setPhone(d.user?.phone||'')
    })
  }, [])

  async function save() {
    setSaving(true); setMsg(null)
    const res = await fetch('/api/user/profile', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name, phone }) })
    const data = await res.json()
    if (res.ok) { setUser(data.user); setMsg({type:'success',text:'Profile updated!'}) }
    else setMsg({type:'error',text:data.error})
    setSaving(false)
  }

  if (!user) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ width:32, height:32, border:'3px solid rgba(242,186,14,0.2)', borderTopColor:'#F2BA0E', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ padding:'0 16px 32px' }}>
      <div style={{ padding:'12px 0 20px', display:'flex', alignItems:'center', gap:12 }}>
        <Link href="/settings" style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', color:'var(--text-secondary)' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <h1 style={{ fontSize:20, fontWeight:800 }}>Edit Profile</h1>
      </div>

      {/* Avatar */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:28 }}>
        <div style={{ position:'relative', cursor:'pointer' }} onClick={()=>fileRef.current?.click()}>
          <div style={{ width:84, height:84, borderRadius:'50%', background:'linear-gradient(135deg,#F2BA0E,#FF9500)', border:'3px solid rgba(242,186,14,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:32, color:'#000', overflow:'hidden' }}>
            {user.profilePicture ? <img src={user.profilePicture} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : user.name?.[0]?.toUpperCase()||'A'}
          </div>
          <div style={{ position:'absolute', bottom:0, right:0, width:26, height:26, borderRadius:'50%', background:'var(--brand-primary)', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--bg-page)' }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#000" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round"/></svg>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}/>
        <p style={{ color:'var(--text-muted)', fontSize:12, marginTop:8 }}>Tap to change photo</p>
      </div>

      {/* Form */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <label style={{ display:'block', color:'var(--text-muted)', fontSize:12, fontWeight:600, marginBottom:7 }}>Full Name</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/>
        </div>
        <div>
          <label style={{ display:'block', color:'var(--text-muted)', fontSize:12, fontWeight:600, marginBottom:7 }}>Email</label>
          <input className="input" value={user.email} disabled style={{ opacity:0.5 }}/>
        </div>
        <div>
          <label style={{ display:'block', color:'var(--text-muted)', fontSize:12, fontWeight:600, marginBottom:7 }}>Phone Number</label>
          <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 (555) 000-0000"/>
        </div>
      </div>

      {msg && (
        <div style={{ marginTop:14, padding:'11px 14px', borderRadius:10, background:msg.type==='success'?'var(--success-bg)':'var(--danger-bg)', color:msg.type==='success'?'var(--success)':'var(--danger)', fontSize:13, fontWeight:600 }}>
          {msg.text}
        </div>
      )}

      <button onClick={save} disabled={saving} className="btn-primary" style={{ width:'100%', marginTop:20 }}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>

      {/* Account info */}
      <div style={{ marginTop:28, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        {[
          { icon:'📅', label:'Member Since', value: new Date(user.createdAt||Date.now()).toLocaleDateString('en-US',{month:'long',year:'numeric'}) },
          { icon:'🪪', label:'KYC Status', value: user.kycStatus==='APPROVED'?'✓ Verified':'Not verified' },
          { icon:'🆔', label:'User ID', value: user.id?.slice(0,12)+'...' },
        ].map(({icon,label,value}) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:18 }}>{icon}</span>
            <span style={{ color:'var(--text-muted)', fontSize:13, flex:1 }}>{label}</span>
            <span style={{ fontWeight:600, fontSize:13 }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
