'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

function TabBtn({ active, onClick, children }: { active:boolean; onClick:()=>void; children:React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding:'10px 18px', borderRadius:99, border:'none', fontFamily:'inherit', cursor:'pointer',
      background: active?'#F2BA0E':'transparent',
      color: active?'#000':'#555', fontWeight: active?700:500, fontSize:13, transition:'all .15s'
    }}>{children}</button>
  )
}

export default function UserDetailPage() {
  const { id } = useParams<{ id:string }>()
  const router  = useRouter()
  const [user, setUser]         = useState<any>(null)
  const [tab, setTab]           = useState<'overview'|'transactions'|'investments'|'chat'>('overview')
  const [balanceAdj, setBalanceAdj] = useState('')
  const [adjNote, setAdjNote]   = useState('')
  const [notifText, setNotifText] = useState('')
  const [loading, setLoading]   = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [msg, setMsg]           = useState<{type:'success'|'error';text:string}|null>(null)

  function load() {
    fetch(`/api/admin/users/${id}`).then(r => {
      if (!r.ok) { router.push('/admin/users'); return null }
      return r.json()
    }).then(d => { if (d) { setUser(d.user); setLoading(false) } })
  }
  useEffect(load, [id])

  async function action(type: string, body: any) {
    setActionLoading(type); setMsg(null)
    const res = await fetch(`/api/admin/users/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:type, ...body }) })
    const data = await res.json()
    if (res.ok) { setMsg({type:'success',text:`Action "${type}" completed`}); load() }
    else setMsg({type:'error',text:data.error||'Error'})
    setActionLoading('')
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
      <div style={{width:32,height:32,border:'3px solid rgba(242,186,14,0.15)',borderTopColor:'#F2BA0E',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
    </div>
  )
  if (!user) return null

  const usdBal = user.balances?.find((b:any)=>b.currency==='USD')?.amount||0
  const activeInv = user.investments?.filter((i:any)=>i.status==='ACTIVE')||[]

  return (
    <div style={{padding:28,maxWidth:900}}>
      {/* Back */}
      <Link href="/admin/users" style={{display:'inline-flex',alignItems:'center',gap:6,color:'#555',textDecoration:'none',fontSize:13,marginBottom:20}}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Users
      </Link>

      {/* Profile header */}
      <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:22,marginBottom:16,display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
        <div style={{width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#F2BA0E,#FF9500)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:22,color:'#000',flexShrink:0}}>
          {user.name?.[0]?.toUpperCase()||'?'}
        </div>
        <div style={{flex:1,minWidth:200}}>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:6}}>
            <h1 style={{fontSize:20,fontWeight:800}}>{user.name||'Unknown'}</h1>
            {user.isFrozen && <span style={{background:'rgba(246,70,93,0.1)',color:'#F6465D',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700}}>FROZEN</span>}
            <span style={{
              padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700,
              background:user.kycStatus==='APPROVED'?'rgba(14,203,129,0.1)':'rgba(242,186,14,0.1)',
              color:user.kycStatus==='APPROVED'?'#0ECB81':'#F2BA0E'
            }}>{user.kycStatus==='APPROVED'?'Check KYC Verified':'KYC '+user.kycStatus}</span>
          </div>
          <div style={{color:'#555',fontSize:13,marginBottom:8}}>{user.email} · {user.phone||'No phone'}</div>
          <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
            {[{l:'USD Balance',v:`$${usdBal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`},{l:'Active Plans',v:activeInv.length},{l:'Member Since',v:new Date(user.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}].map(({l,v})=>(
              <div key={l}>
                <div style={{color:'#444',fontSize:10,marginBottom:2}}>{l}</div>
                <div style={{fontWeight:700,fontSize:15}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',flexShrink:0}}>
          <button onClick={()=>action('toggle_freeze',{})} disabled={actionLoading==='toggle_freeze'}
            style={{padding:'9px 14px',borderRadius:9,border:`1px solid ${user.isFrozen?'rgba(14,203,129,0.25)':'rgba(246,70,93,0.25)'}`,background:user.isFrozen?'rgba(14,203,129,0.07)':'rgba(246,70,93,0.07)',color:user.isFrozen?'#0ECB81':'#F6465D',fontWeight:600,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
            {user.isFrozen?'Unfreeze':' Freeze'}
          </button>
          <button onClick={()=>{if(confirm('Override KYC to APPROVED?'))action('override_kyc',{status:'APPROVED'})}} disabled={actionLoading==='override_kyc'}
            style={{padding:'9px 14px',borderRadius:9,border:'1px solid rgba(242,186,14,0.2)',background:'rgba(242,186,14,0.07)',color:'#F2BA0E',fontWeight:600,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
            Verified Approve KYC
          </button>
        </div>
      </div>

      {msg && <div style={{background:msg.type==='success'?'rgba(14,203,129,0.08)':'rgba(246,70,93,0.08)',border:`1px solid ${msg.type==='success'?'rgba(14,203,129,0.2)':'rgba(246,70,93,0.2)'}`,borderRadius:10,padding:'11px 16px',marginBottom:14,fontSize:13,color:msg.type==='success'?'#0ECB81':'#F6465D'}}>{msg.text}</div>}

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#111',borderRadius:99,padding:4,marginBottom:20,border:'1px solid rgba(255,255,255,0.06)',width:'fit-content'}}>
        {(['overview','transactions','investments','chat'] as const).map(t=>(
          <TabBtn key={t} active={tab===t} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</TabBtn>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab==='overview' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          {/* Balance adjustment */}
          <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:18}}>
            <h3 style={{fontSize:14,fontWeight:700,marginBottom:14}}>Balance Adjustment</h3>
            <div style={{marginBottom:10}}>
              <label style={{display:'block',color:'#444',fontSize:11,fontWeight:600,marginBottom:6,letterSpacing:'0.06em'}}>AMOUNT (USD) — use negative to debit</label>
              <input value={balanceAdj} onChange={e=>setBalanceAdj(e.target.value)} type="number"
                style={{width:'100%',background:'#1A1A1A',color:'#fff',padding:'11px 12px',borderRadius:9,border:'1px solid rgba(255,255,255,0.07)',fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}
                placeholder="e.g. 500 or -200"
                onFocus={e=>e.target.style.borderColor='rgba(242,186,14,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.07)'}/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:'block',color:'#444',fontSize:11,fontWeight:600,marginBottom:6,letterSpacing:'0.06em'}}>NOTE</label>
              <input value={adjNote} onChange={e=>setAdjNote(e.target.value)}
                style={{width:'100%',background:'#1A1A1A',color:'#fff',padding:'11px 12px',borderRadius:9,border:'1px solid rgba(255,255,255,0.07)',fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}
                placeholder="Reason for adjustment"
                onFocus={e=>e.target.style.borderColor='rgba(242,186,14,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.07)'}/>
            </div>
            <button onClick={()=>{if(!balanceAdj)return;action('adjust_balance',{amount:parseFloat(balanceAdj),note:adjNote});setBalanceAdj('');setAdjNote('')}} disabled={!balanceAdj||actionLoading==='adjust_balance'}
              style={{width:'100%',padding:'11px',background:'#F2BA0E',color:'#000',border:'none',borderRadius:9,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',opacity:!balanceAdj?0.4:1}}>
              {actionLoading==='adjust_balance'?'Applying...':'Apply Adjustment'}
            </button>
          </div>

          {/* Send notification */}
          <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:18}}>
            <h3 style={{fontSize:14,fontWeight:700,marginBottom:14}}>Send Notification</h3>
            <textarea value={notifText} onChange={e=>setNotifText(e.target.value)}
              style={{width:'100%',background:'#1A1A1A',color:'#fff',padding:'11px 12px',borderRadius:9,border:'1px solid rgba(255,255,255,0.07)',fontSize:13,fontFamily:'inherit',outline:'none',resize:'vertical',minHeight:88,boxSizing:'border-box'}}
              placeholder="Message to send this user…"/>
            <button onClick={()=>{if(!notifText)return;action('send_notification',{message:notifText});setNotifText('')}} disabled={!notifText||actionLoading==='send_notification'}
              style={{width:'100%',marginTop:10,padding:'11px',background:'rgba(59,130,246,0.1)',color:'#3B82F6',border:'1px solid rgba(59,130,246,0.2)',borderRadius:9,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',opacity:!notifText?0.4:1}}>
              {actionLoading==='send_notification'?'Sending...':'Send Notification'}
            </button>
          </div>

          {/* User info */}
          <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:18,gridColumn:'span 2'}}>
            <h3 style={{fontSize:14,fontWeight:700,marginBottom:14}}>Account Details</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
              {[
                {l:'User ID',v:user.id},
                {l:'Email Verified',v:'Yes'},
                {l:'KYC Status',v:user.kycStatus||'NOT_SUBMITTED'},
                {l:'Bonus Claimed',v:user.bonusClaimed?'Yes':'No'},
                {l:'Country',v:user.country||'—'},
                {l:'Phone',v:user.phone||'—'},
                {l:'IP / Location',v:user.lastIp||'—'},
                {l:'Last Login',v:user.lastLogin?new Date(user.lastLogin).toLocaleString():'—'},
              ].map(({l,v})=>(
                <div key={l} style={{background:'#161616',borderRadius:9,padding:'12px 14px'}}>
                  <div style={{color:'#444',fontSize:10,fontWeight:600,letterSpacing:'0.04em',marginBottom:4}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {tab==='transactions' && (
        <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:500}}>
              <thead>
                <tr style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  {['Type','Amount','Currency','Status','Date'].map(h=>(
                    <th key={h} style={{padding:'12px 16px',textAlign:'left',color:'#444',fontSize:11,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(user.transactions||[]).length===0 ? (
                  <tr><td colSpan={5} style={{padding:32,textAlign:'center',color:'#333',fontSize:13}}>No transactions</td></tr>
                ) : (user.transactions||[]).map((t:any)=>(
                  <tr key={t.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{padding:'3px 9px',borderRadius:99,fontSize:11,fontWeight:700,
                        background:['DEPOSIT','ROI','BONUS'].includes(t.type)?'rgba(14,203,129,0.1)':'rgba(246,70,93,0.1)',
                        color:['DEPOSIT','ROI','BONUS'].includes(t.type)?'#0ECB81':'#F6465D'}}>
                        {t.type}
                      </span>
                    </td>
                    <td style={{padding:'12px 16px',fontWeight:700,fontSize:13}}>{t.amount.toLocaleString()}</td>
                    <td style={{padding:'12px 16px',color:'#666',fontSize:12}}>{t.currency}</td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{color:t.status==='COMPLETED'?'#0ECB81':t.status==='PENDING'?'#F2BA0E':'#F6465D',fontSize:12,fontWeight:600}}>{t.status}</span>
                    </td>
                    <td style={{padding:'12px 16px',color:'#444',fontSize:11,whiteSpace:'nowrap'}}>{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INVESTMENTS TAB */}
      {tab==='investments' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {(user.investments||[]).length===0 ? (
            <div style={{textAlign:'center',padding:40,color:'#333',background:'#111',borderRadius:14,border:'1px solid rgba(255,255,255,0.05)'}}>No investments</div>
          ) : (user.investments||[]).map((inv:any)=>{
            const prog = Math.min(100,((Date.now()-new Date(inv.startDate).getTime())/(new Date(inv.endDate).getTime()-new Date(inv.startDate).getTime()))*100)
            return (
              <div key={inv.id} style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:16,display:'flex',gap:14,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:180}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{inv.planName}</div>
                  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                    {[{l:'Amount',v:`$${inv.amount.toLocaleString()}`},{l:'Daily ROI',v:`${(inv.dailyRoi*100).toFixed(2)}%`},{l:'Progress',v:`${Math.round(prog)}%`}].map(({l,v})=>(
                      <div key={l}><span style={{color:'#444',fontSize:11}}>{l}: </span><span style={{fontWeight:600,fontSize:12}}>{v}</span></div>
                    ))}
                  </div>
                  <div style={{background:'#1A1A1A',borderRadius:3,height:4,overflow:'hidden',marginTop:8}}>
                    <div style={{height:'100%',background:'#F2BA0E',width:`${prog}%`,borderRadius:3}}/>
                  </div>
                </div>
                <span style={{padding:'4px 10px',borderRadius:99,fontSize:11,fontWeight:700,background:inv.status==='ACTIVE'?'rgba(14,203,129,0.1)':'rgba(255,255,255,0.05)',color:inv.status==='ACTIVE'?'#0ECB81':'#555'}}>
                  {inv.status}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
