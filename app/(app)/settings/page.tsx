'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User, Key, UserCheck, Coins, Bell, Mail, TrendingUp, Fingerprint, Shield, Smartphone,
  MessageCircle, HelpCircle, FileText, Lock, Info, LogOut,
} from 'lucide-react'

function SettingRow({ icon, label, value, href, onClick, danger, toggle, toggled, onToggle }:
  { icon: React.ReactNode; label: string; value?: string; href?: string; onClick?: () => void; danger?: boolean; toggle?: boolean; toggled?: boolean; onToggle?: () => void }) {
  const content = (
    <div className="row-item" style={{ background:'transparent', borderBottom:'1px solid var(--border)' }}
      onClick={toggle ? onToggle : onClick}>
      <div style={{ width:34, height:34, borderRadius:10, background: danger?'rgba(246,70,93,0.1)':'var(--bg-elevated)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color: danger ? 'var(--danger)' : 'var(--text-secondary)' }}>
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
  const [notifPush, setNotifPush] = useState(false)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifInvest, setNotifInvest] = useState(true)
  const [biometric, setBiometric] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem('altaris_user_cache')
      if (cached) setUser(JSON.parse(cached))
    } catch {}

    fetch('/api/user/profile').then(r=>r.json()).then(d=>{
      setUser(d.user)
      try { window.localStorage.setItem('altaris_user_cache', JSON.stringify(d.user)) } catch {}
    }).catch(() => {})
    fetch('/api/user/push-subscribe').then(r=>r.json()).then(d=>{
      if (d?.preferences) {
        setNotifPush(Boolean(d.preferences.pushAlerts))
        setNotifEmail(Boolean(d.preferences.emailUpdates))
        setNotifInvest(Boolean(d.preferences.investmentAlerts))
      }
    }).catch(() => {})
    setBiometric(localStorage.getItem('altaris_biometric') === '1')
  }, [])

  async function logout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method:'POST' })
    router.push('/login')
  }

  async function enablePush(enable: boolean) {
    try {
      const win = window as typeof window & { OneSignalDeferred?: Array<(oneSignal: any) => void> }
      win.OneSignalDeferred = win.OneSignalDeferred || []

      if (!enable) {
        win.OneSignalDeferred.push(async (OneSignal: any) => {
          try { await OneSignal.User.PushSubscription.optOut() } catch {}
        })

        await fetch('/api/user/push-subscribe', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pushAlerts: false }),
        })
        setNotifPush(false)
        setMsg({ type: 'success', text: 'Push alerts disabled.' })
        return
      }

      let details: { oneSignalPlayerId?: string | null; oneSignalSubscriptionId?: string | null } = {}
      await new Promise<void>((resolve, reject) => {
        win.OneSignalDeferred?.push(async (OneSignal: any) => {
          try {
            const permission = await OneSignal.Notifications.requestPermission()
            if (!permission) {
              reject(new Error('permission_denied'))
              return
            }
            await OneSignal.User.PushSubscription.optIn()
            details = {
              oneSignalPlayerId: OneSignal?.User?.onesignalId || null,
              oneSignalSubscriptionId: OneSignal?.User?.PushSubscription?.id || null,
            }
            resolve()
          } catch (error) {
            reject(error)
          }
        })
      })

      await fetch('/api/user/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      })

      await fetch('/api/user/push-subscribe', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushAlerts: true, ...details }),
      })
      setNotifPush(true)
      setMsg({ type: 'success', text: 'Push alerts enabled for this device.' })
    } catch {
      setMsg({ type: 'error', text: 'Unable to enable push alerts. Please allow browser notifications.' })
    }
  }


  function toggleEmail(next: boolean) {
    setNotifEmail(next)
    fetch('/api/user/push-subscribe', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailUpdates: next }),
    }).catch(() => {})
    setMsg({ type: 'success', text: next ? 'Email updates enabled.' : 'Email updates disabled.' })
  }

  function toggleInvest(next: boolean) {
    setNotifInvest(next)
    fetch('/api/user/push-subscribe', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ investmentAlerts: next }),
    }).catch(() => {})
  }

  function toggleBiometric(next: boolean) {
    setBiometric(next)
    localStorage.setItem('altaris_biometric', next ? '1' : '0')
  }

  return (
    <div style={{ paddingBottom:24 }}>
      <div style={{ margin:'0 16px 4px' }}>
        <Link href="/profile" style={{ textDecoration:'none' }}>
          <div style={{ background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', padding:16, display:'flex', alignItems:'center', gap:14 }} className="pressable">
            <div style={{ width:54, height:54, borderRadius:'50%', background:'linear-gradient(135deg,#F2BA0E,#FF9500)', border:'2px solid rgba(242,186,14,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:22, color:'#000', flexShrink:0, overflow:'hidden' }}>
              {user?.profilePicture ? <img src={user.profilePicture} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : user?.name?.[0]?.toUpperCase()||'A'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:16 }}>{user?.name || 'User'}</div>
              <div style={{ color:'var(--text-muted)', fontSize:12, marginTop:2 }}>{user?.email}</div>
              <div style={{ marginTop:6 }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background: user?.kycStatus==='APPROVED'?'var(--success-bg)':'var(--warning-bg)', color: user?.kycStatus==='APPROVED'?'var(--success)':'var(--warning)' }}>
                  {user?.kycStatus==='APPROVED' ? 'Check KYC Verified' : 'KYC Pending'}
                </span>
              </div>
            </div>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </Link>
      </div>

      {msg && (
        <div style={{ margin: '12px 16px 0', padding: '10px 12px', borderRadius: 10, background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: 12, fontWeight: 700 }}>
          {msg.text}
        </div>
      )}

      <SectionLabel label="Account" />
      <SectionCard>
        <SettingRow icon={<User size={18} strokeWidth={2} />} label="Edit Profile" value="Name, photo, phone" href="/profile" />
        <SettingRow icon={<Key size={18} strokeWidth={2} />} label="Change Password" href="/forgot-password" />
        <SettingRow icon={<UserCheck size={18} strokeWidth={2} />} label="KYC Verification" value={user?.kycStatus === 'APPROVED' ? 'Verified' : 'Pending'} href="/kyc" />
        <SettingRow icon={<Coins size={18} strokeWidth={2} />} label="Claim $100 Bonus" value={user?.bonusClaimed ? 'Already claimed' : 'Tap to claim!'} href="/home" />
      </SectionCard>

      <SectionLabel label="Notifications" />
      <SectionCard>
        <SettingRow icon={<Bell size={18} strokeWidth={2} />} label="Push Alerts" toggle toggled={notifPush} onToggle={() => enablePush(!notifPush)} />
        <SettingRow icon={<Mail size={18} strokeWidth={2} />} label="Email Updates" toggle toggled={notifEmail} onToggle={() => toggleEmail(!notifEmail)} />
        <SettingRow icon={<TrendingUp size={18} strokeWidth={2} />} label="Investment Alerts" value="ROI credits, plan maturity" toggle toggled={notifInvest} onToggle={() => toggleInvest(!notifInvest)} />
      </SectionCard>

      <SectionLabel label="Security" />
      <SectionCard>
        <SettingRow icon={<Fingerprint size={18} strokeWidth={2} />} label="Biometric Login" toggle toggled={biometric} onToggle={() => toggleBiometric(!biometric)} />
        <SettingRow icon={<Shield size={18} strokeWidth={2} />} label="Two-Factor Auth" value="Use OTP on login" href="/settings" />
        <SettingRow icon={<Smartphone size={18} strokeWidth={2} />} label="Active Sessions" value="Current device" href="/profile" />
      </SectionCard>

      <SectionLabel label="Support & Legal" />
      <SectionCard>
        <SettingRow icon={<MessageCircle size={18} strokeWidth={2} />} label="Live Chat" href="/support" />
        <SettingRow icon={<HelpCircle size={18} strokeWidth={2} />} label="FAQ & Help Center" href="/support" />
        <SettingRow icon={<FileText size={18} strokeWidth={2} />} label="Terms of Service" href="https://altaris-capital.com/terms" />
        <SettingRow icon={<Lock size={18} strokeWidth={2} />} label="Privacy Policy" href="https://altaris-capital.com/privacy" />
        <SettingRow icon={<Info size={18} strokeWidth={2} />} label="About Altaris Capital" value="v1.0.0" href="/support" />
      </SectionCard>

      <div style={{ margin:'24px 16px 0' }}>
        <button onClick={logout} disabled={loggingOut}
          style={{ width:'100%', padding:'15px', borderRadius:14, background:'rgba(246,70,93,0.08)', border:'1px solid rgba(246,70,93,0.2)', color:'#F6465D', fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'inherit', transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {loggingOut ? 'Logging out...' : <><LogOut size={18} strokeWidth={2} /> Log Out</>}
        </button>
      </div>

      <div style={{ height:16 }}/>
    </div>
  )
}
