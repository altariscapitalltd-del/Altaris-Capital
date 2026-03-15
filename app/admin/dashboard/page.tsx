'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

function StatCard({ label, value, sub, icon, color, link, alert }:
  { label:string; value:string; sub?:string; icon:string; color:string; link?:string; alert?:boolean }) {
  const inner = (
    <div style={{ background:'#111', border:`1px solid ${alert?color+'30':'rgba(255,255,255,0.06)'}`, borderRadius:14, padding:20, position:'relative', overflow:'hidden', transition:'border-color .2s', cursor: link?'pointer':'default' }}>
      <div style={{ position:'absolute', top:0, right:0, width:80, height:80, background:`radial-gradient(circle at 100% 0%, ${color}12, transparent 70%)`, pointerEvents:'none' }}/>
      {alert && <div style={{ position:'absolute', top:14, right:14, width:8, height:8, borderRadius:'50%', background:'#F6465D', animation:'pulseLive 2s infinite' }}/>}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`, border:`1px solid ${color}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
          {icon}
        </div>
        <span style={{ color:'#555', fontSize:12, fontWeight:500 }}>{label}</span>
      </div>
      <div style={{ fontSize:26, fontWeight:900, letterSpacing:'-0.5px', marginBottom:4 }}>{value}</div>
      {sub && <div style={{ color:'#444', fontSize:11 }}>{sub}</div>}
    </div>
  )
  return link ? <Link href={link} style={{ textDecoration:'none', color:'inherit', display:'block' }}>{inner}</Link> : inner
}

function MiniSparkline({ data, color }:{ data:number[]; color:string }) {
  if(!data.length) return null
  const min=Math.min(...data), max=Math.max(...data), range=max-min||1
  const w=80, h=28
  const pts = data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/range)*(h-4)-2}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

export default function AdminDashboard() {
  const [stats, setStats]   = useState<any>(null)
  const [signups, setSignups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState('')

  useEffect(()=>{
    setNow(new Date().toLocaleTimeString())
    fetch('/api/admin/dashboard').then(r=>r.json()).then(d=>{setStats(d.stats);setSignups(d.recentSignups||[]);setLoading(false)})
    const t = setInterval(()=>{
      fetch('/api/admin/dashboard').then(r=>r.json()).then(d=>{setStats(d.stats);setNow(new Date().toLocaleTimeString())})
    },30000)
    return ()=>clearInterval(t)
  },[])

  if(loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
      <div style={{width:36,height:36,border:'3px solid rgba(242,186,14,0.15)',borderTopColor:'#F2BA0E',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
    </div>
  )

  const STATS = [
    {label:'Total Users',        value:stats?.totalUsers?.toLocaleString()||'0',       icon:'', color:'#3B82F6', sub:`+${stats?.newToday||0} today`},
    {label:'KYC Verified',       value:stats?.verifiedUsers?.toLocaleString()||'0',     icon:'Verified', color:'#0ECB81', sub:`${((stats?.verifiedUsers/Math.max(1,stats?.totalUsers))*100).toFixed(0)}% of users`},
    {label:'Pending Deposits',   value:stats?.pendingDeposits?.toLocaleString()||'0',   icon:'PENDING', color:'#F2BA0E', link:'/admin/deposits', alert:(stats?.pendingDeposits||0)>0},
    {label:'Pending KYC',        value:stats?.pendingKyc?.toLocaleString()||'0',        icon:'', color:'#A78BFA', link:'/admin/kyc', alert:(stats?.pendingKyc||0)>0},
    {label:'Pending Withdrawals',value:stats?.pendingWithdrawals?.toLocaleString()||'0',icon:'', color:'#F6465D', alert:(stats?.pendingWithdrawals||0)>0},
    {label:'Total AUM',          value:`$${((stats?.totalAUM||0)/1000).toFixed(1)}K`,   icon:'', color:'#F2BA0E'},
    {label:'Total Deposited',    value:`$${((stats?.totalDeposited||0)/1000).toFixed(1)}K`, icon:'IN', color:'#0ECB81'},
    {label:'Total Withdrawn',    value:`$${((stats?.totalWithdrawn||0)/1000).toFixed(1)}K`, icon:'OUT', color:'#F6465D'},
  ]

  const SPARK_NEW = [2,5,3,8,6,9,7,11,8,12,10,14,11,15,12,16,13,18,14,20]

  return (
    <div style={{padding:28,maxWidth:1200}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:28}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,marginBottom:4}}>Overview</h1>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#0ECB81',animation:'pulseLive 2s infinite'}}/>
            <span style={{color:'#444',fontSize:12}}>Live · Updated {now}</span>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {[{label:'Export CSV',href:'#'},{label:'+ Add User',href:'/admin/users'}].map(b=>(
            <Link key={b.label} href={b.href} style={{padding:'8px 16px',borderRadius:9,border:'1px solid rgba(255,255,255,0.08)',background:'#161616',color:'#aaa',fontSize:12,fontWeight:600,textDecoration:'none',display:'flex',alignItems:'center',gap:5}}>
              {b.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:12,marginBottom:28}}>
        {STATS.map(s=><StatCard key={s.label} {...s}/>)}
      </div>

      {/* Two-col: signups + activity */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16,alignItems:'start'}}>
        {/* Recent Signups Table */}
        <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h2 style={{fontSize:15,fontWeight:700}}>Recent Sign-ups</h2>
            <Link href="/admin/users" style={{color:'#F2BA0E',fontSize:12,fontWeight:600,textDecoration:'none'}}>View All →</Link>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  {['User','Email','KYC','Balance','Joined'].map(h=>(
                    <th key={h} style={{padding:'10px 16px',textAlign:'left',color:'#444',fontSize:11,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signups.length===0 ? (
                  <tr><td colSpan={5} style={{padding:32,textAlign:'center',color:'#333',fontSize:13}}>No recent sign-ups</td></tr>
                ) : signups.map((u:any)=>(
                  <tr key={u.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',transition:'background .15s',cursor:'pointer'}}
                    onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                    onClick={()=>window.location.href=`/admin/users/${u.id}`}>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:9}}>
                        <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#F2BA0E55,#FF950044)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,color:'#F2BA0E',flexShrink:0}}>
                          {u.name?.[0]?.toUpperCase()||'?'}
                        </div>
                        <span style={{fontSize:13,fontWeight:600,whiteSpace:'nowrap'}}>{u.name||'—'}</span>
                      </div>
                    </td>
                    <td style={{padding:'12px 16px',color:'#666',fontSize:12,whiteSpace:'nowrap'}}>{u.email}</td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{padding:'3px 9px',borderRadius:99,fontSize:11,fontWeight:700,
                        background:u.kycStatus==='APPROVED'?'rgba(14,203,129,0.1)':u.kycStatus==='PENDING_REVIEW'?'rgba(242,186,14,0.1)':'rgba(255,255,255,0.05)',
                        color:u.kycStatus==='APPROVED'?'#0ECB81':u.kycStatus==='PENDING_REVIEW'?'#F2BA0E':'#555'}}>
                        {u.kycStatus==='APPROVED'?'Verified':u.kycStatus==='PENDING_REVIEW'?'Pending':'Unverified'}
                      </span>
                    </td>
                    <td style={{padding:'12px 16px',fontSize:12,fontWeight:600,color:'#ccc',whiteSpace:'nowrap'}}>
                      ${(u.balances?.find((b:any)=>b.currency==='USD')?.amount||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </td>
                    <td style={{padding:'12px 16px',color:'#444',fontSize:11,whiteSpace:'nowrap'}}>
                      {new Date(u.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {/* Growth */}
          <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <span style={{fontWeight:700,fontSize:13}}>New Users (30d)</span>
              <span style={{color:'#0ECB81',fontSize:12,fontWeight:700}}>+{stats?.newToday||0} today</span>
            </div>
            <MiniSparkline data={SPARK_NEW} color="#0ECB81"/>
            <div style={{fontWeight:900,fontSize:24,marginTop:8}}>{stats?.totalUsers||0}</div>
          </div>
          {/* Quick actions */}
          <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:18}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:14}}>Quick Actions</div>
            {[
              {l:'Review Deposits',href:'/admin/deposits',color:'#F2BA0E',count:stats?.pendingDeposits||0},
              {l:'Review KYC',href:'/admin/kyc',color:'#A78BFA',count:stats?.pendingKyc||0},
              {l:'Broadcast Message',href:'/admin/notifications',color:'#3B82F6',count:0},
              {l:'Manage Wallets',href:'/admin/settings',color:'#0ECB81',count:0},
            ].map(q=>(
              <Link key={q.l} href={q.href} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',textDecoration:'none'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:q.color}}/>
                  <span style={{fontSize:13,color:'#bbb'}}>{q.l}</span>
                </div>
                {q.count>0 ? (
                  <span style={{background:'#F6465D',color:'#fff',borderRadius:99,minWidth:20,height:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,padding:'0 5px'}}>{q.count}</span>
                ) : (
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#333" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
