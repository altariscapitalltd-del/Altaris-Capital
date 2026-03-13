'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function SettingRow({ icon, label, value, href, onClick, danger, toggle, toggled, onToggle }:
  { icon:string, label:string, value?:string, href?:string, onClick?:()=>void, danger?:boolean, toggle?:boolean, toggled?:boolean, onToggle?:()=>void }) {
  const content = (
    <div className="row-item" style={{ background:'transparent', borderBottom:'1px solid var(--border)' }}
      onClick={toggle ? onToggle : onClick}>
      <div style={{ width:34, height:34, borderRadius:10, background: danger?'rgba(246,70,93,0.1)':'var(--bg-elevated)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:600, fontSize:14, color: danger?'var(--danger)':'var(--text-primary)' }}>{label}</div>
        {value && <div style={{ color:'var(--text-muted)', fontSize:12, marginTop:1 }}>{value}</div>}
      </div>
      {toggle ? (
        <div onClick={onToggle} style={{ width:44, height:26, borderRadius:99, background: toggled?'var(--brand-primary)':'var(--bg-elevated)', position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0 }}>
          <div style={{ position:'absolute', top:3, left: toggled?22:3, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }}/>
        </div>
      ) : (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
      )}
    </div>
  )
  if (href) return <Link href={href} style={{ textDecoration:'none' }}>{content}</Link>
  return content
}

function SectionLabel({ label }: { label:string }) {
  return <div style={{ padding:'18px 20px 8px', color:'var(--text-muted)', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>{label}</div>
}

function SectionCard({ children }: { children:React.ReactNode }) {
  return (
    <div style={{ margin:'0 16px', background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden' }}>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [theme, setTheme] = useState('dark')
  const [notifPush, setNotifPush] = useState(true)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifInvest, setNotifInvest] = useState(true)
  const [biometric, setBiometric] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(d=>setUser(d.user))
    const saved = document.documentElement.getAttribute('data-theme') || 'dark'
    setTheme(saved)
  }, [])

  function setThemeMode(t: string) {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('theme', t)
  }

  async function logout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method:'POST' })
    router.push('/login')
  }

  const THEMES = [
    { id:'dark',  icon:'🌙', label:'Dark' },
    { id:'light', icon:'☀️', label:'Light' },
    { id:'system',icon:'💻', label:'System' },
  ]

  return (
    <div style={{ paddingBottom:24 }}>
      {/* Header */}
      <div style={{ padding:'12px 20px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:800 }}>Settings</h1>
      </div>

      {/* Profile card */}
      <div style={{ margin:'0 16px 4px' }}>
        <Link href="/profile" style={{ textDecoration:'none' }}>
          <div style={{ background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', padding:16, display:'flex', alignItems:'center', gap:14 }} className="pressable">
            <div style={{ width:54, height:54, borderRadius:'50%', background:'linear-gradient(135deg,#F2BA0E,#FF9500)', border:'2px solid rgba(242,186,14,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:22, color:'#000', flexShrink:0, overflow:'hidden' }}>
              {user?.profilePicture ? <img src={user.profilePicture} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : user?.name?.[0]?.toUpperCase()||'A'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:16 }}>{user?.name || 'Loading...'}</div>
              <div style={{ color:'var(--text-muted)', fontSize:12, marginTop:2 }}>{user?.email}</div>
              <div style={{ marginTop:6 }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background: user?.kycStatus==='APPROVED'?'var(--success-bg)':'var(--warning-bg)', color: user?.kycStatus==='APPROVED'?'var(--success)':'var(--warning)' }}>
                  {user?.kycStatus==='APPROVED' ? '✓ KYC Verified' : 'KYC Pending'}
                </span>
              </div>
            </div>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </Link>
      </div>

      {/* Account */}
      <SectionLabel label="Account" />
      <SectionCard>
        <SettingRow icon="👤" label="Edit Profile" value="Name, photo, phone" href="/profile" />
        <SettingRow icon="🔑" label="Change Password" href="/profile" />
        <SettingRow icon="🪪" label="KYC Verification" value={user?.kycStatus === 'APPROVED' ? 'Verified ✓' : 'Pending'} href="/kyc" />
        <SettingRow icon="💰" label="Claim $100 Bonus" value={user?.bonusClaimed ? 'Already claimed' : 'Tap to claim!'} href="/home" />
      </SectionCard>

      {/* Appearance */}
      <SectionLabel label="Appearance" />
      <div style={{ margin:'0 16px' }}>
        <div style={{ background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', padding:16 }}>
          <div style={{ color:'var(--text-secondary)', fontSize:12, marginBottom:12, fontWeight:500 }}>Theme</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {THEMES.map(t => (
              <button key={t.id} onClick={()=>setThemeMode(t.id)}
                style={{ padding:'12px 8px', borderRadius:12, border:`2px solid ${theme===t.id?'var(--brand-primary)':'var(--border)'}`, background: theme===t.id?'rgba(242,186,14,0.08)':'var(--bg-elevated)', cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
                <div style={{ fontSize:22, marginBottom:5 }}>{t.icon}</div>
                <div style={{ fontSize:12, fontWeight:theme===t.id?700:500, color:theme===t.id?'var(--brand-primary)':'var(--text-secondary)' }}>{t.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <SectionLabel label="Notifications" />
      <SectionCard>
        <SettingRow icon="🔔" label="Push Alerts" toggle toggled={notifPush} onToggle={()=>setNotifPush(v=>!v)} />
        <SettingRow icon="📧" label="Email Updates" toggle toggled={notifEmail} onToggle={()=>setNotifEmail(v=>!v)} />
        <SettingRow icon="📈" label="Investment Alerts" value="ROI credits, plan maturity" toggle toggled={notifInvest} onToggle={()=>setNotifInvest(v=>!v)} />
      </SectionCard>

      {/* Security */}
      <SectionLabel label="Security" />
      <SectionCard>
        <SettingRow icon="👆" label="Biometric Login" toggle toggled={biometric} onToggle={()=>setBiometric(v=>!v)} />
        <SettingRow icon="🛡️" label="Two-Factor Auth" value="Recommended" href="/profile" />
        <SettingRow icon="📱" label="Active Sessions" href="/profile" />
      </SectionCard>

      {/* Support */}
      <SectionLabel label="Support & Legal" />
      <SectionCard>
        <SettingRow icon="💬" label="Live Chat" href="/support" />
        <SettingRow icon="❓" label="FAQ & Help Center" href="/support" />
        <SettingRow icon="📄" label="Terms of Service" href="/support" />
        <SettingRow icon="🔒" label="Privacy Policy" href="/support" />
        <SettingRow icon="ℹ️" label="About Altaris Capital" value="v1.0.0" href="/support" />
      </SectionCard>

      {/* Logout */}
      <div style={{ margin:'24px 16px 0' }}>
        <button onClick={logout} disabled={loggingOut}
          style={{ width:'100%', padding:'15px', borderRadius:14, background:'rgba(246,70,93,0.08)', border:'1px solid rgba(246,70,93,0.2)', color:'#F6465D', fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
          {loggingOut ? 'Logging out...' : '↩ Log Out'}
        </button>
      </div>

      <div style={{ height:16 }}/>
    </div>
  )
}
