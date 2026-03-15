'use client'
import { useEffect, useState } from 'react'

export default function AdminNotificationsPage() {
  const [users, setUsers]     = useState<any[]>([])
  const [target, setTarget]   = useState<'all'|'kyc'|'single'>('all')
  const [userId, setUserId]   = useState('')
  const [title, setTitle]     = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState<{type:'success'|'error';text:string}|null>(null)

  useEffect(()=>{ fetch('/api/admin/users').then(r=>r.json()).then(d=>setUsers(d.users||[])) },[])

  async function send() {
    if(!title||!message){setMsg({type:'error',text:'Title and message are required'});return}
    if(target==='single'&&!userId){setMsg({type:'error',text:'Select a user'});return}
    setLoading(true); setMsg(null)
    const res = await fetch('/api/admin/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({target,userId:target==='single'?userId:undefined,title,message})})
    const data = await res.json()
    if(res.ok){setMsg({type:'success',text:`Notification sent to ${data.count} user(s)`});setTitle('');setMessage('')}
    else setMsg({type:'error',text:data.error})
    setLoading(false)
  }

  const TEMPLATES = [
    {t:'KYC Approved ',m:'Your identity verification has been approved! You can now withdraw funds and claim your $100 bonus.'},
    {t:'Deposit Confirmed Verified',m:'Your deposit has been confirmed and credited to your account.'},
    {t:'New Investment Plan ',m:'A new high-yield investment plan is now available. Log in to invest before spots run out!'},
    {t:'Security Alert ',m:'A new login was detected on your account. If this was not you, please contact support immediately.'},
  ]

  return (
    <div style={{padding:28,maxWidth:700}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:800,marginBottom:2}}>Broadcast Notifications</h1>
        <p style={{color:'#444',fontSize:12}}>Send push notifications and in-app alerts to users</p>
      </div>

      {msg && <div style={{background:msg.type==='success'?'rgba(14,203,129,0.08)':'rgba(246,70,93,0.08)',border:`1px solid ${msg.type==='success'?'rgba(14,203,129,0.2)':'rgba(246,70,93,0.2)'}`,borderRadius:10,padding:'11px 16px',marginBottom:16,fontSize:13,color:msg.type==='success'?'#0ECB81':'#F6465D'}}>{msg.text}</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Compose */}
        <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:20}}>
          <h2 style={{fontSize:14,fontWeight:700,marginBottom:16}}>Compose Message</h2>

          {/* Target */}
          <div style={{marginBottom:14}}>
            <label style={{display:'block',color:'#444',fontSize:11,fontWeight:600,marginBottom:8,letterSpacing:'0.06em'}}>SEND TO</label>
            <div style={{display:'flex',gap:6}}>
              {[{id:'all',l:'All Users'},{id:'kyc',l:'KYC Verified'},{id:'single',l:'Single User'}].map(t=>(
                <button key={t.id} onClick={()=>setTarget(t.id as any)}
                  style={{flex:1,padding:'9px 6px',borderRadius:9,border:`1px solid ${target===t.id?'#F2BA0E':'rgba(255,255,255,0.07)'}`,background:target===t.id?'rgba(242,186,14,0.08)':'#1A1A1A',color:target===t.id?'#F2BA0E':'#555',fontWeight:target===t.id?700:500,fontSize:11,cursor:'pointer',fontFamily:'inherit',transition:'all .15s',whiteSpace:'nowrap'}}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {target==='single' && (
            <div style={{marginBottom:14}}>
              <label style={{display:'block',color:'#444',fontSize:11,fontWeight:600,marginBottom:7,letterSpacing:'0.06em'}}>SELECT USER</label>
              <select value={userId} onChange={e=>setUserId(e.target.value)}
                style={{width:'100%',background:'#1A1A1A',color:userId?'#fff':'#555',padding:'11px 12px',borderRadius:9,border:'1px solid rgba(255,255,255,0.07)',fontSize:13,fontFamily:'inherit',outline:'none'}}>
                <option value="">Select user…</option>
                {users.map((u:any)=><option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
              </select>
            </div>
          )}

          <div style={{marginBottom:14}}>
            <label style={{display:'block',color:'#444',fontSize:11,fontWeight:600,marginBottom:7,letterSpacing:'0.06em'}}>TITLE</label>
            <input value={title} onChange={e=>setTitle(e.target.value)}
              style={{width:'100%',background:'#1A1A1A',color:'#fff',padding:'11px 12px',borderRadius:9,border:'1px solid rgba(255,255,255,0.07)',fontSize:13,fontFamily:'inherit',outline:'none',transition:'border-color .2s',boxSizing:'border-box'}}
              placeholder="Notification title"
              onFocus={e=>e.target.style.borderColor='rgba(242,186,14,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.07)'}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',color:'#444',fontSize:11,fontWeight:600,marginBottom:7,letterSpacing:'0.06em'}}>MESSAGE</label>
            <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={5}
              style={{width:'100%',background:'#1A1A1A',color:'#fff',padding:'11px 12px',borderRadius:9,border:'1px solid rgba(255,255,255,0.07)',fontSize:13,fontFamily:'inherit',outline:'none',resize:'vertical',boxSizing:'border-box',transition:'border-color .2s'}}
              placeholder="Notification body…"
              onFocus={e=>e.target.style.borderColor='rgba(242,186,14,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.07)'}/>
          </div>
          <button onClick={send} disabled={loading||!title||!message}
            style={{width:'100%',padding:'13px',background:'#F2BA0E',color:'#000',border:'none',borderRadius:10,fontWeight:800,fontSize:14,cursor:'pointer',fontFamily:'inherit',opacity:loading||!title||!message?0.4:1,transition:'opacity .2s'}}>
            {loading?'Sending…':' Send Notification'}
          </button>
        </div>

        {/* Templates */}
        <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:20}}>
          <h2 style={{fontSize:14,fontWeight:700,marginBottom:16}}>Quick Templates</h2>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {TEMPLATES.map(t=>(
              <button key={t.t} onClick={()=>{setTitle(t.t);setMessage(t.m)}}
                style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:14,textAlign:'left',cursor:'pointer',fontFamily:'inherit',transition:'border-color .15s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(242,186,14,0.2)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}>
                <div style={{fontWeight:600,fontSize:13,marginBottom:4,color:'#ddd'}}>{t.t}</div>
                <div style={{color:'#555',fontSize:11,lineHeight:1.5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{t.m}</div>
              </button>
            ))}
          </div>

          {/* Preview */}
          {title && (
            <div style={{marginTop:16,background:'#0E0E0E',border:'1px solid rgba(242,186,14,0.15)',borderRadius:12,padding:14}}>
              <div style={{color:'#F2BA0E',fontSize:10,fontWeight:700,letterSpacing:'0.08em',marginBottom:8}}>PREVIEW</div>
              <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                <div style={{width:36,height:36,borderRadius:9,background:'rgba(242,186,14,0.1)',border:'1px solid rgba(242,186,14,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}></div>
                <div>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:3}}>{title}</div>
                  <div style={{color:'#555',fontSize:12,lineHeight:1.5}}>{message}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
