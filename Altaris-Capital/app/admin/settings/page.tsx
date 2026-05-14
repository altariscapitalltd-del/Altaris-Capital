'use client'
import { useEffect, useState } from 'react'

const COINS = ['BTC','ETH','USDT','USD']
const COIN_META: Record<string,{icon:string;color:string;name:string}> = {
  BTC:  {icon:'₿', color:'#F7931A', name:'Bitcoin'},
  ETH:  {icon:'Ξ', color:'#627EEA', name:'Ethereum'},
  USDT: {icon:'₮', color:'#26A17B', name:'Tether'},
  USD:  {icon:'$', color:'#3B82F6', name:'US Dollar'},
}

export default function AdminSettingsPage() {
  const [addresses, setAddresses] = useState<Record<string,string>>({})
  const [editing, setEditing]     = useState<string|null>(null)
  const [draft, setDraft]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState<{type:'success'|'error';text:string}|null>(null)

  useEffect(()=>{
    fetch('/api/admin/settings').then(r=>r.json()).then(d=>{
      const map:Record<string,string>={}
      d.wallets?.forEach((w:any)=>{ map[w.currency]=w.address })
      setAddresses(map)
    })
  },[])

  async function save(coin:string) {
    setSaving(true); setMsg(null)
    const res = await fetch('/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currency:coin,address:draft})})
    const data = await res.json()
    if(res.ok){setAddresses(a=>({...a,[coin]:draft}));setEditing(null);setMsg({type:'success',text:`${coin} wallet address updated`})}
    else setMsg({type:'error',text:data.error})
    setSaving(false)
  }

  return (
    <div style={{padding:28,maxWidth:680}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:800,marginBottom:2}}>Platform Settings</h1>
        <p style={{color:'#444',fontSize:12}}>Manage deposit wallet addresses</p>
      </div>

      {msg && <div style={{background:msg.type==='success'?'rgba(14,203,129,0.08)':'rgba(246,70,93,0.08)',border:`1px solid ${msg.type==='success'?'rgba(14,203,129,0.2)':'rgba(246,70,93,0.2)'}`,borderRadius:10,padding:'11px 16px',marginBottom:16,fontSize:13,color:msg.type==='success'?'#0ECB81':'#F6465D'}}>{msg.text}</div>}

      <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,overflow:'hidden',marginBottom:20}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <h2 style={{fontSize:14,fontWeight:700}}>Deposit Wallet Addresses</h2>
          <p style={{color:'#444',fontSize:12,marginTop:3}}>Users send funds to these addresses</p>
        </div>
        {COINS.map(coin=>{
          const meta = COIN_META[coin]
          const addr = addresses[coin]
          const isEditing = editing===coin
          return (
            <div key={coin} style={{padding:20,borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <div style={{width:38,height:38,borderRadius:11,background:meta.color+'20',border:`1px solid ${meta.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:meta.color,flexShrink:0}}>
                  {meta.icon}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{coin}</div>
                  <div style={{color:'#444',fontSize:11}}>{meta.name}</div>
                </div>
              </div>
              {isEditing ? (
                <div>
                  <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={3}
                    style={{width:'100%',background:'#1A1A1A',color:'#fff',padding:12,borderRadius:9,border:'1px solid rgba(242,186,14,0.3)',fontSize:12,fontFamily:'monospace',outline:'none',resize:'none',boxSizing:'border-box',marginBottom:10}}
                    placeholder={`Enter ${coin} wallet address…`}/>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>setEditing(null)} style={{padding:'9px 16px',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#555',fontWeight:600,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
                    <button onClick={()=>save(coin)} disabled={saving||!draft.trim()} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'#F2BA0E',color:'#000',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'inherit',opacity:!draft.trim()?0.4:1}}>
                      {saving?'Saving…':'Save Address'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <code style={{flex:1,background:'#1A1A1A',borderRadius:9,padding:'11px 14px',fontSize:11,fontFamily:'monospace',color:addr?'#888':'#333',border:'1px solid rgba(255,255,255,0.05)',wordBreak:'break-all',lineHeight:1.6}}>
                    {addr||'No address set'}
                  </code>
                  <button onClick={()=>{setEditing(coin);setDraft(addr||'')}} style={{flexShrink:0,padding:'9px 16px',borderRadius:9,border:'1px solid rgba(242,186,14,0.2)',background:'rgba(242,186,14,0.07)',color:'#F2BA0E',fontWeight:600,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
                    {addr?'Edit':'+ Set'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Admin info */}
      <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:20}}>
        <h2 style={{fontSize:14,fontWeight:700,marginBottom:14}}>System Info</h2>
        {[
          {l:'Admin Email',v:'admin@altariscapital.ltd'},
          {l:'Platform',v:'Altaris Capital v2.0'},
          {l:'Environment',v:process.env.NODE_ENV||'production'},
          {l:'Database',v:'PostgreSQL'},
        ].map(({l,v})=>(
          <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
            <span style={{color:'#444',fontSize:13}}>{l}</span>
            <span style={{fontSize:13,fontWeight:600,color:'#888'}}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
