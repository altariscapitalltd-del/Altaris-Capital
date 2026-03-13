'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { io as ioClient } from 'socket.io-client'
import { AltarisLogoMark } from '@/components/AltarisLogo'

const NAV_ITEMS = [
  { href:'/admin/dashboard', label:'Overview', icon:(a:boolean)=>(
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )},
  { href:'/admin/users', label:'Users', icon:(a:boolean)=>(
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8">
      <circle cx="9" cy="7" r="4"/><path d="M2 21c0-4 3.1-6 7-6" strokeLinecap="round"/>
      <circle cx="17" cy="11" r="3"/><path d="M14 21c0-2.8 1.3-4 3-4s3 1.2 3 4" strokeLinecap="round"/>
    </svg>
  )},
  { href:'/admin/deposits', label:'Deposits', icon:(a:boolean)=>(
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8">
      <path d="M12 3v14M7 13l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 19h16" strokeLinecap="round"/>
    </svg>
  )},
  { href:'/admin/kyc', label:'KYC Review', icon:(a:boolean)=>(
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      <circle cx="9" cy="11" r="2.5"/><path d="M5 18c0-2 1.8-3 4-3s4 1 4 3" strokeLinecap="round"/>
      <path d="M16 9h2M16 13h2" strokeLinecap="round"/>
    </svg>
  )},
  { href:'/admin/chat', label:'Support', icon:(a:boolean)=>(
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { href:'/admin/notifications', label:'Broadcast', icon:(a:boolean)=>(
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round"/>
    </svg>
  )},
  { href:'/admin/settings', label:'Settings', icon:(a:boolean)=>(
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round"/>
    </svg>
  )},
]

type Alert = { id:number; msg:string; type:string; time:string }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [alerts, setAlerts]       = useState<Alert[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [pendingCounts, setPendingCounts] = useState({ deposits:0, kyc:0, chat:0 })

  useEffect(() => {
    if (pathname === '/admin/login') return
    fetch('/api/admin/dashboard').then(r => {
      if (r.status === 401) { router.push('/admin/login'); return null }
      return r.json()
    }).then(d => {
      if (d?.stats) setPendingCounts({ deposits: d.stats.pendingDeposits||0, kyc: d.stats.pendingKyc||0, chat: 0 })
    }).catch(() => router.push('/admin/login'))
  }, [pathname])

  useEffect(() => {
    if (pathname === '/admin/login') return
    const s = ioClient({ path:'/socket.io' })
    s.emit('join:admin')
    let counter = 0
    function push(msg: string, type: string) {
      const id = ++counter
      setAlerts(prev => [{ id, msg, type, time: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) }, ...prev.slice(0,4)])
      setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 6000)
    }
    s.on('admin:new_deposit',    d => { push(`New deposit: $${d.amount} ${d.currency}`, 'deposit'); setPendingCounts(c=>({...c,deposits:c.deposits+1})) })
    s.on('admin:new_withdrawal', d => push(`Withdrawal: $${d.amount}`, 'withdrawal'))
    s.on('admin:kyc_submitted',  () => { push('New KYC submission', 'kyc'); setPendingCounts(c=>({...c,kyc:c.kyc+1})) })
    s.on('admin:new_user',       d => push(`New user: ${d.name}`, 'user'))
    return () => s.disconnect()
  }, [pathname])

  if (pathname === '/admin/login') return <>{children}</>

  const BADGE: Record<string,number> = {
    '/admin/deposits': pendingCounts.deposits,
    '/admin/kyc':      pendingCounts.kyc,
    '/admin/chat':     pendingCounts.chat,
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#080808', fontFamily:'Inter,-apple-system,sans-serif', color:'#fff' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 64 : 220, flexShrink:0,
        background:'#0E0E0E', borderRight:'1px solid rgba(255,255,255,0.06)',
        display:'flex', flexDirection:'column',
        position:'sticky', top:0, height:'100vh', overflowY:'auto', overflowX:'hidden',
        transition:'width .2s ease',
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed?'18px 0':'18px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent: collapsed?'center':'space-between', gap:10, flexShrink:0, cursor:'pointer' }}
          onClick={()=>setCollapsed(c=>!c)}>
          {!collapsed && (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:'rgba(242,186,14,0.1)', border:'1px solid rgba(242,186,14,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
                  <path d="M20 4L36 34H4L20 4Z" stroke="#F2BA0E" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
                  <line x1="20" y1="16" x2="20" y2="28" stroke="#F2BA0E" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:13, letterSpacing:'0.05em' }}>ALTARIS</div>
                <div style={{ color:'#444', fontSize:9, letterSpacing:'0.1em', fontWeight:500 }}>ADMIN PANEL</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{ width:32, height:32, borderRadius:9, background:'rgba(242,186,14,0.1)', border:'1px solid rgba(242,186,14,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="14" height="14" viewBox="0 0 40 40" fill="none">
                <path d="M20 4L36 34H4L20 4Z" stroke="#F2BA0E" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
          )}
          {!collapsed && (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#333" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'10px 8px' }}>
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active  = pathname === href || pathname.startsWith(href + '/')
            const badge   = BADGE[href] || 0
            return (
              <Link key={href} href={href} style={{ textDecoration:'none', display:'block', marginBottom:2 }}>
                <div style={{
                  display:'flex', alignItems:'center', gap:11,
                  padding: collapsed ? '11px 0' : '11px 12px',
                  borderRadius:10, cursor:'pointer',
                  background: active ? 'rgba(242,186,14,0.08)' : 'transparent',
                  borderLeft: active ? '2px solid #F2BA0E' : '2px solid transparent',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  transition:'all .15s', position:'relative',
                }}>
                  {icon(active)}
                  {!collapsed && (
                    <span style={{ fontSize:13, fontWeight: active?600:400, color: active?'#F2BA0E':'#666', flex:1, whiteSpace:'nowrap' }}>
                      {label}
                    </span>
                  )}
                  {!collapsed && badge > 0 && (
                    <div style={{ background:'#F6465D', color:'#fff', borderRadius:99, minWidth:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, padding:'0 4px' }}>
                      {badge}
                    </div>
                  )}
                  {collapsed && badge > 0 && (
                    <div style={{ position:'absolute', top:6, right:6, width:8, height:8, background:'#F6465D', borderRadius:'50%', border:'1.5px solid #080808' }}/>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:12 }}>
              <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#F2BA0E,#FF9500)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, color:'#000', flexShrink:0 }}>A</div>
              <div style={{ overflow:'hidden' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#ddd', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>Admin</div>
                <div style={{ fontSize:10, color:'#444' }}>Super Admin</div>
              </div>
            </div>
            <button onClick={async()=>{ await fetch('/api/auth/logout',{method:'POST'}); router.push('/admin/login') }}
              style={{ width:'100%', padding:'9px', background:'rgba(246,70,93,0.06)', color:'#F6465D', border:'1px solid rgba(246,70,93,0.15)', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit' }}>
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* ── Main Content ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
        {/* Top header bar */}
        <header style={{ height:52, background:'#0E0E0E', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', padding:'0 24px', justifyContent:'space-between', flexShrink:0, position:'sticky', top:0, zIndex:30 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#0ECB81', animation:'pulseLive 2s infinite' }}/>
            <span style={{ color:'#0ECB81', fontSize:12, fontWeight:600 }}>System Live</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ color:'#444', fontSize:12 }}>{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>
            <Link href="/" target="_blank" style={{ fontSize:12, color:'#555', textDecoration:'none', display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, border:'1px solid rgba(255,255,255,0.07)' }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              View Site
            </Link>
          </div>
        </header>

        <main style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
          {children}
        </main>
      </div>

      {/* ── Toast Alerts ── */}
      <div style={{ position:'fixed', top:16, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
        {alerts.map(a => {
          const COLOR: Record<string,string> = { deposit:'#0ECB81', withdrawal:'#F6465D', kyc:'#F2BA0E', user:'#3B82F6' }
          const c = COLOR[a.type]||'#F2BA0E'
          return (
            <div key={a.id} style={{ background:'#161616', border:`1px solid ${c}30`, borderLeft:`3px solid ${c}`, borderRadius:10, padding:'12px 16px', fontSize:13, boxShadow:'0 4px 24px rgba(0,0,0,0.7)', animation:'slideInR .3s ease-out', minWidth:260, maxWidth:320, pointerEvents:'all' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:c, flexShrink:0 }}/>
                <span style={{ fontWeight:600, fontSize:13, color:'#eee', flex:1 }}>{a.msg}</span>
                <span style={{ color:'#444', fontSize:10 }}>{a.time}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
