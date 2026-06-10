'use client'
import { useEffect, useState, useRef } from 'react'
import Pusher from 'pusher-js'

function ChatSkel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      {[{ admin: true, w: '62%' }, { admin: false, w: '48%' }, { admin: true, w: '78%' }, { admin: false, w: '55%' }].map((s, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: s.admin ? 'flex-start' : 'flex-end', gap: 8 }}>
          {s.admin && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-elevated)', flexShrink: 0 }} />}
          <div style={{ height: 38, width: s.w, background: 'var(--bg-elevated)', borderRadius: s.admin ? '4px 14px 14px 14px' : '14px 4px 14px 14px' }} />
        </div>
      ))}
    </div>
  )
}

export default function SupportPage() {
  const [messages,       setMessages]       = useState<any[]>([])
  const [input,          setInput]          = useState('')
  const [sending,        setSending]        = useState(false)
  const [conversationId, setConversationId] = useState<string|null>(null)
  const [sessionEnded,   setSessionEnded]   = useState(false)
  const [loading,        setLoading]        = useState(true)
  const [adminTyping,    setAdminTyping]    = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let pusher: any, channel: any
    async function init() {
      try {
        const pr = await fetch('/api/user/profile')
        const pd = await pr.json().catch(() => null)
        const uid = pd?.user?.id
        if (uid) {
          pusher  = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '' })
          channel = pusher.subscribe(`private-user-${uid}`)
          channel.bind('chat:message', (msg: any) => {
            setMessages(m => [...m, { ...msg, isAdmin: msg.sender === 'admin' }])
            setAdminTyping(false)
          })
          channel.bind('chat:typing', () => {
            setAdminTyping(true)
            if (typingTimer.current) clearTimeout(typingTimer.current)
            typingTimer.current = setTimeout(() => setAdminTyping(false), 3000)
          })
          channel.bind('chat:ended', () => setSessionEnded(true))
        }
      } catch {}

      try {
        const r = await fetch('/api/support')
        const d = await r.json()
        if (d.conversation) {
          setConversationId(d.conversation.id)
          setMessages((d.conversation.messages || []).map((m: any) => ({ ...m, isAdmin: m.sender === 'admin' })))
          setSessionEnded(d.conversation.status === 'ended')
        }
      } catch {}
      setLoading(false)
    }
    init()
    return () => {
      try {
        if (channel) { channel.unbind_all(); pusher.unsubscribe(channel.name) }
        if (pusher) pusher.disconnect()
        if (typingTimer.current) clearTimeout(typingTimer.current)
      } catch {}
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length <= 1 ? 'instant' : 'smooth' } as ScrollIntoViewOptions)
  }, [messages, adminTyping])

  async function send() {
    if (!input.trim() || sending || sessionEnded) return
    const text = input.trim(); setInput(''); setSending(true)
    const optimistic = { id: 'temp', content: text, sender: 'user', isAdmin: false, createdAt: new Date().toISOString() }
    setMessages(m => [...m, optimistic])
    const res  = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text }) })
    const data = await res.json()
    if (res.ok) setMessages(m => [...m.filter(x => x.id !== 'temp'), { ...data.message, isAdmin: data.message?.sender === 'admin' }])
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100svh - 58px - 52px)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-page)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#F2BA0E,#FF9500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: '#000', flexShrink: 0 }}>A</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Altaris Support</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', animation: 'pulseLive 2s infinite' }} />
              <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 600 }}>
                {adminTyping ? 'typing…' : 'Support team online'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Session ended banner */}
      {sessionEnded && (
        <div style={{ padding: '10px 16px', background: 'rgba(246,70,93,0.07)', borderBottom: '1px solid rgba(246,70,93,0.15)', fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          This chat session has ended. Start a new conversation below if you need more help.
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? <ChatSkel /> : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', margin: 'auto 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(242,186,14,0.1)', border: '1px solid rgba(242,186,14,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#F2BA0E" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Start a conversation</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Our team typically responds within minutes during business hours.</div>
          </div>
        ) : (
          messages.map((m: any) => {
            const isAdmin = m.sender === 'admin' || m.isAdmin
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-start' : 'flex-end', gap: 8 }}>
                {isAdmin && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#F2BA0E,#FF9500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#000', flexShrink: 0, alignSelf: 'flex-end' }}>A</div>
                )}
                <div style={{ maxWidth: '72%', padding: '10px 14px', borderRadius: isAdmin ? '4px 16px 16px 16px' : '16px 4px 16px 16px', background: isAdmin ? 'var(--bg-card)' : 'var(--brand-primary)', color: isAdmin ? 'var(--text-primary)' : '#000', fontSize: 14, lineHeight: 1.5, border: isAdmin ? '1px solid var(--border)' : 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  {m.content}
                  <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: 'right' }}>{new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            )
          })
        )}

        {/* Admin typing indicator */}
        {adminTyping && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#F2BA0E,#FF9500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#000', flexShrink: 0 }}>A</div>
            <div style={{ padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', animation: 'typingDot 1.4s infinite', animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, background: 'var(--bg-page)', flexShrink: 0 }}>
        <input
          className="input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !sessionEnded && send()}
          placeholder={sessionEnded ? 'Chat session ended' : 'Type a message…'}
          disabled={sessionEnded}
          style={{ flex: 1, borderRadius: 99, padding: '11px 16px', fontSize: 14, opacity: sessionEnded ? 0.5 : 1 }}
        />
        <button onClick={send} disabled={sending || !input.trim() || sessionEnded}
          style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--brand-primary)', border: 'none', cursor: sessionEnded ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: sending || !input.trim() || sessionEnded ? 0.35 : 1, transition: 'opacity .15s' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#000" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <style>{`@keyframes typingDot { 0%,80%,100%{opacity:.25;transform:scale(1)} 40%{opacity:1;transform:scale(1.3)} }`}</style>
    </div>
  )
}
