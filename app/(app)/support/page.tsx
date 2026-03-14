'use client'
import { useEffect, useState, useRef } from 'react'
import Pusher from 'pusher-js'

export default function SupportPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string|null>(null)
  const [userId, setUserId] = useState<string|null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      if (d?.user?.id) setUserId(d.user.id)
    }).catch(() => {})

    fetch('/api/support').then(r=>r.json()).then(d => {
      if(d.conversation) { setConversationId(d.conversation.id); setMessages(d.conversation.messages||[]) }
    })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages])

  useEffect(() => {
    if (!userId) return
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
      authEndpoint: '/api/pusher/auth',
    })
    const channel = pusher.subscribe(`private-user-${userId}`)

    const handler = (data: any) => {
      if (!data?.conversationId || data.conversationId !== conversationId) return
      const message = data.message || data
      setMessages((m) => {
        if (m.some((x) => x.id === message.id)) return m
        return [...m, message]
      })
    }

    channel.bind('chat:message', handler)

    return () => {
      channel.unbind('chat:message', handler)
      pusher.unsubscribe(`private-user-${userId}`)
      pusher.disconnect()
    }
  }, [userId, conversationId])

  async function send() {
    if(!input.trim()||sending) return
    const text = input.trim(); setInput(''); setSending(true)
    const optimistic = { id:'temp', content:text, isAdmin:false, createdAt:new Date().toISOString() }
    setMessages(m=>[...m, optimistic])
    const res = await fetch('/api/support', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message:text, conversationId }) })
    const data = await res.json()
    if(res.ok) { setConversationId(data.conversationId); setMessages(m=>[...m.filter(x=>x.id!=='temp'), data.message]) }
    setSending(false)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100svh - 58px - 52px)'}}>
      {/* Header */}
      <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        <h1 style={{fontSize:18,fontWeight:800,marginBottom:2}}>Live Support</h1>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:'var(--success)',animation:'pulseLive 2s infinite'}}/>
          <span style={{color:'var(--success)',fontSize:12,fontWeight:600}}>Support team online</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:10}}>
        {messages.length===0&&(
          <div style={{textAlign:'center',padding:'40px 20px'}}>
            <div style={{fontSize:40,marginBottom:12}}>💬</div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>Chat with our team</div>
            <div style={{color:'var(--text-muted)',fontSize:13}}>Usually responds within minutes</div>
          </div>
        )}
        {messages.map((m:any)=>(
          <div key={m.id} style={{display:'flex',justifyContent:m.isAdmin?'flex-start':'flex-end'}}>
            {m.isAdmin&&(
              <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#F2BA0E,#FF9500)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#000',flexShrink:0,marginRight:8,alignSelf:'flex-end'}}>A</div>
            )}
            <div style={{maxWidth:'72%',padding:'10px 14px',borderRadius:m.isAdmin?'4px 14px 14px 14px':'14px 4px 14px 14px',background:m.isAdmin?'var(--bg-card)':'var(--brand-primary)',color:m.isAdmin?'var(--text-primary)':'#000',fontSize:14,lineHeight:1.5,border:m.isAdmin?'1px solid var(--border)':'none'}}>
              {m.content}
              <div style={{fontSize:10,opacity:.6,marginTop:4,textAlign:'right'}}>{new Date(m.createdAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{padding:'10px 16px',borderTop:'1px solid var(--border)',display:'flex',gap:8,background:'var(--bg-page)',flexShrink:0}}>
        <input className="input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type a message..." style={{flex:1,borderRadius:99,padding:'11px 16px',fontSize:14}}/>
        <button onClick={send} disabled={sending||!input.trim()}
          style={{width:44,height:44,borderRadius:'50%',background:'var(--brand-primary)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:sending||!input.trim()?0.4:1,transition:'opacity .15s'}}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#000" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  )
}
