'use client'
import { useEffect, useState, useRef } from 'react'
import Pusher from 'pusher-js'

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [selected, setSelected]           = useState<any>(null)
  const [messages, setMessages]           = useState<any[]>([])
  const [input, setInput]                 = useState('')
  const [sending, setSending]             = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    fetch('/api/admin/chat').then(r=>r.json()).then(d=>setConversations(d.conversations||[]))
    // Subscribe to admin channel for real-time updates
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '' })
    const channel = pusher.subscribe('private-admin')
    channel.bind('chat:message', (msg:any) => {
      // Refresh conversation list and append message if currently selected
      fetch('/api/admin/chat').then(r=>r.json()).then(d=>setConversations(d.conversations||[]))
      if (selected && msg.userId === selected.user?.id) {
        setMessages(m => [...m, msg])
      }
    })
    return () => { try { channel.unbind_all(); pusher.unsubscribe('private-admin'); pusher.disconnect() } catch(e){} }
  },[])

  useEffect(()=>{
    if(!selected)return
    fetch(`/api/admin/chat?conversationId=${selected.id}`).then(r=>r.json()).then(d=>setMessages(d.messages||[]))
  },[selected])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  async function reply() {
    if(!input.trim()||!selected||sending) return
    const text=input.trim(); setInput(''); setSending(true)
    const res = await fetch('/api/admin/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversationId:selected.id,message:text})})
    const data = await res.json()
    if(res.ok) setMessages(m=>[...m,data.message])
    setSending(false)
  }

  return (
    <div style={{display:'flex',height:'calc(100vh - 52px)',overflow:'hidden'}}>
      {/* Conversation list */}
      <div style={{width:280,borderRight:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',background:'#0E0E0E',flexShrink:0}}>
        <div style={{padding:'16px 16px 12px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <h2 style={{fontSize:14,fontWeight:700}}>Support Chats</h2>
          <p style={{color:'#444',fontSize:11,marginTop:2}}>{conversations.length} conversations</p>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {conversations.length===0 ? (
            <div style={{padding:32,textAlign:'center',color:'#333',fontSize:13}}>No conversations yet</div>
          ) : conversations.map((c:any)=>(
            <div key={c.id} onClick={()=>setSelected(c)}
              style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',background:selected?.id===c.id?'rgba(242,186,14,0.06)':'transparent',borderLeft:selected?.id===c.id?'2px solid #F2BA0E':'2px solid transparent',transition:'all .15s'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:5}}>
                <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#F2BA0E40,#FF950030)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,color:'#F2BA0E',flexShrink:0}}>
                  {c.user?.name?.[0]?.toUpperCase()||'?'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.user?.name||'Unknown'}</div>
                  <div style={{color:'#444',fontSize:10}}>{c.user?.email}</div>
                </div>
              </div>
              {c.messages?.[0] && (
                <div style={{color:'#444',fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingLeft:40}}>
                  {c.messages[0].content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat window */}
      {selected ? (
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
          {/* Chat header */}
          <div style={{padding:'12px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:12,background:'#0E0E0E',flexShrink:0}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#F2BA0E,#FF9500)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,color:'#000',flexShrink:0}}>
              {selected.user?.name?.[0]?.toUpperCase()||'?'}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{selected.user?.name}</div>
              <div style={{color:'#444',fontSize:11}}>{selected.user?.email}</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:8}}>
            {messages.map((m:any)=>(
              <div key={m.id} style={{display:'flex',justifyContent:m.isAdmin?'flex-end':'flex-start'}}>
                {!m.isAdmin && (
                  <div style={{width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg,#F2BA0E40,#FF950030)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:11,color:'#F2BA0E',flexShrink:0,marginRight:8,alignSelf:'flex-end'}}>
                    {selected.user?.name?.[0]?.toUpperCase()||'?'}
                  </div>
                )}
                <div style={{maxWidth:'70%',padding:'10px 14px',borderRadius:m.isAdmin?'14px 4px 14px 14px':'4px 14px 14px 14px',background:m.isAdmin?'#F2BA0E':'#1A1A1A',color:m.isAdmin?'#000':'#ddd',fontSize:13,lineHeight:1.5}}>
                  {m.content}
                  <div style={{fontSize:10,opacity:.5,marginTop:4,textAlign:'right'}}>{new Date(m.createdAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{padding:'12px 16px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:8,background:'#0E0E0E',flexShrink:0}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&reply()}
              style={{flex:1,background:'#1A1A1A',color:'#fff',padding:'11px 14px',borderRadius:99,border:'1px solid rgba(255,255,255,0.07)',fontSize:13,fontFamily:'inherit',outline:'none'}}
              placeholder={`Reply to ${selected.user?.name}…`}/>
            <button onClick={reply} disabled={sending||!input.trim()}
              style={{width:42,height:42,borderRadius:'50%',background:'#F2BA0E',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:sending||!input.trim()?0.4:1}}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#000" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      ) : (
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,color:'#2A2A2A'}}>
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round"/></svg>
          <p style={{fontSize:14}}>Select a conversation</p>
        </div>
      )}
    </div>
  )
}
