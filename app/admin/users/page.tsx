'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminUsersPage() {
  const [users, setUsers]   = useState<any[]>([])
  const [q, setQ]           = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage]     = useState(1)

  useEffect(()=>{
    fetch('/api/admin/users').then(r=>r.json()).then(d=>{setUsers(d.users||[]);setLoading(false)})
  },[])

  const filtered = users.filter(u=>
    !q || u.name?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase())
  )
  const paged = filtered.slice(0,(page)*25)

  const KYC_STYLE: Record<string,{bg:string;color:string;label:string}> = {
    APPROVED:       {bg:'rgba(14,203,129,0.1)',color:'#0ECB81',label:'✓ Verified'},
    PENDING_REVIEW: {bg:'rgba(242,186,14,0.1)',color:'#F2BA0E',label:'⏳ Pending'},
    REJECTED:       {bg:'rgba(246,70,93,0.1)', color:'#F6465D',label:'✗ Rejected'},
    NOT_SUBMITTED:  {bg:'rgba(255,255,255,0.05)',color:'#555',label:'Unverified'},
  }

  return (
    <div style={{padding:28}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,marginBottom:2}}>Users</h1>
          <span style={{color:'#444',fontSize:12}}>{users.length.toLocaleString()} total users</span>
        </div>
      </div>

      {/* Search */}
      <div style={{position:'relative',marginBottom:16,maxWidth:380}}>
        <svg style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#444" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round"/></svg>
        <input value={q} onChange={e=>{setQ(e.target.value);setPage(1)}}
          style={{width:'100%',background:'#161616',color:'#fff',padding:'11px 14px 11px 36px',borderRadius:10,border:'1px solid rgba(255,255,255,0.07)',fontSize:13,fontFamily:'inherit',outline:'none',transition:'border-color .2s',boxSizing:'border-box'}}
          placeholder="Search by name or email…"
          onFocus={e=>e.target.style.borderColor='rgba(242,186,14,0.5)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.07)'}/>
      </div>

      {/* Table */}
      <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
            <thead>
              <tr style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                {['User','Email','KYC','Balance','Investments','Status','Joined',''].map(h=>(
                  <th key={h} style={{padding:'12px 16px',textAlign:'left',color:'#444',fontSize:11,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{padding:40,textAlign:'center'}}>
                  <div style={{width:28,height:28,border:'3px solid rgba(242,186,14,0.15)',borderTopColor:'#F2BA0E',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto'}}/>
                </td></tr>
              ) : paged.length===0 ? (
                <tr><td colSpan={8} style={{padding:40,textAlign:'center',color:'#333',fontSize:13}}>No users found</td></tr>
              ) : paged.map((u:any)=>{
                const kycStyle = KYC_STYLE[u.kycStatus||'NOT_SUBMITTED']
                const bal = u.balances?.find((b:any)=>b.currency==='USD')?.amount||0
                const activeInv = u.investments?.filter((i:any)=>i.status==='ACTIVE')?.length||0
                return (
                  <tr key={u.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',transition:'background .15s'}}
                    onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                    onClick={()=>window.location.href=`/admin/users/${u.id}`}>
                    <td style={{padding:'13px 16px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:9}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#F2BA0E40,#FF950030)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13,color:'#F2BA0E',flexShrink:0}}>
                          {u.name?.[0]?.toUpperCase()||'?'}
                        </div>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140}}>{u.name||'—'}</div>
                          {u.isFrozen && <span style={{fontSize:9,color:'#F6465D',fontWeight:700}}>FROZEN</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{padding:'13px 16px',color:'#666',fontSize:12,whiteSpace:'nowrap'}}>{u.email}</td>
                    <td style={{padding:'13px 16px'}}>
                      <span style={{padding:'3px 9px',borderRadius:99,fontSize:11,fontWeight:700,background:kycStyle.bg,color:kycStyle.color,whiteSpace:'nowrap'}}>
                        {kycStyle.label}
                      </span>
                    </td>
                    <td style={{padding:'13px 16px',fontWeight:700,fontSize:13,whiteSpace:'nowrap'}}>
                      ${bal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </td>
                    <td style={{padding:'13px 16px',textAlign:'center'}}>
                      {activeInv>0 ? <span style={{background:'rgba(14,203,129,0.1)',color:'#0ECB81',padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:700}}>{activeInv} active</span> : <span style={{color:'#333'}}>—</span>}
                    </td>
                    <td style={{padding:'13px 16px'}}>
                      <span style={{padding:'3px 9px',borderRadius:99,fontSize:11,fontWeight:700,
                        background:u.isFrozen?'rgba(246,70,93,0.1)':'rgba(14,203,129,0.08)',
                        color:u.isFrozen?'#F6465D':'#0ECB81'}}>
                        {u.isFrozen?'Frozen':'Active'}
                      </span>
                    </td>
                    <td style={{padding:'13px 16px',color:'#444',fontSize:11,whiteSpace:'nowrap'}}>
                      {new Date(u.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                    </td>
                    <td style={{padding:'13px 16px'}}>
                      <div style={{background:'rgba(242,186,14,0.08)',border:'1px solid rgba(242,186,14,0.15)',borderRadius:7,padding:'5px 10px',fontSize:11,fontWeight:600,color:'#F2BA0E',whiteSpace:'nowrap'}}>
                        Manage →
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > paged.length && (
          <div style={{padding:16,borderTop:'1px solid rgba(255,255,255,0.05)',textAlign:'center'}}>
            <button onClick={()=>setPage(p=>p+1)}
              style={{padding:'9px 24px',background:'#161616',border:'1px solid rgba(255,255,255,0.08)',borderRadius:9,color:'#888',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              Load More ({filtered.length - paged.length} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
