'use client'
import { useEffect, useState, useRef } from 'react'
import Pusher from 'pusher-js'

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/admin/chat').then((r) => r.json()).then((d) => setConversations(d.conversations || []))
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '' })
    const channel = pusher.subscribe('private-admin')
    channel.bind('chat:message', (msg: any) => {
      fetch('/api/admin/chat').then((r) => r.json()).then((d) => setConversations(d.conversations || []))
      if (selected && msg.userId === selected.user?.id) {
        setMessages((m) => [...m, msg])
      }
    })
    return () => { try { channel.unbind_all(); pusher.unsubscribe('private-admin'); pusher.disconnect() } catch {} }
  }, [selected])

  useEffect(() => {
    if (!selected) return
    fetch(`/api/admin/chat?conversationId=${selected.id}`).then((r) => r.json()).then((d) => setMessages(d.messages || []))
  }, [selected])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function reply() {
    if (!input.trim() || !selected || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    const res = await fetch('/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selected.id, content: text, userId: selected.user?.id }),
    })
    const data = await res.json()
    if (res.ok) setMessages((m) => [...m, data.message])
    setSending(false)
  }

  async function endSession() {
    if (!selected || sending) return
    if (!confirm('End this support session? The user will no longer be able to send messages.')) return
    setSending(true)
    const res = await fetch('/api/admin/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: selected.id, action: 'end_session' }) })
    if (res.ok) {
      setSelected((s: any) => s ? { ...s, status: 'ended' } : null)
      fetch('/api/admin/chat').then((r) => r.json()).then((d) => setConversations(d.conversations || []))
    }
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden', background: '#0B141A' }}>
      <div style={{ width: 320, borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', background: '#111B21' }}>
        <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800 }}>Support Inbox</h2>
          <p style={{ color: '#667781', fontSize: 11 }}>{conversations.length} chats</p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.map((c: any) => (
            <button key={c.id} onClick={() => setSelected(c)} style={{ width: '100%', border: 'none', textAlign: 'left', background: selected?.id === c.id ? 'rgba(42, 57, 66, 0.9)' : 'transparent', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#233138', display: 'grid', placeItems: 'center', color: '#D1D7DB', fontWeight: 700 }}>{c.user?.name?.[0] || '?'}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#E9EDEF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.user?.name || 'Unknown'}</span>
                    <span style={{ fontSize: 10, color: '#8696A0' }}>{new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#8696A0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.messages?.[0]?.content || 'No messages yet'}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#202C33', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2A3942', display: 'grid', placeItems: 'center', fontWeight: 700, color: '#D1D7DB' }}>{selected.user?.name?.[0] || '?'}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{selected.user?.name}</div>
                <div style={{ fontSize: 11, color: '#91A5B1' }}>{selected.user?.email}</div>
              </div>
            </div>
            {selected.status !== 'ended' ? <button onClick={endSession} style={{ borderRadius: 8, padding: '8px 12px', border: '1px solid rgba(246,70,93,0.4)', background: 'rgba(246,70,93,0.12)', color: '#F87171', fontSize: 12 }}>End session</button> : <span style={{ color: '#8696A0', fontSize: 12 }}>Session ended</span>}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'linear-gradient(#0B141A,#0B141A), radial-gradient(rgba(255,255,255,.03) 1px, transparent 1px)', backgroundSize: '100% 100%, 18px 18px', backgroundBlendMode: 'normal', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {messages.map((m: any) => {
              const isAdmin = m.sender === 'admin' || m.isAdmin
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '72%', background: isAdmin ? '#005C4B' : '#202C33', color: '#E9EDEF', borderRadius: 8, padding: '8px 10px', boxShadow: '0 1px 0 rgba(0,0,0,0.35)' }}>
                    <div style={{ fontSize: 13, lineHeight: 1.45 }}>{m.content}</div>
                    <div style={{ fontSize: 10, color: '#B9C6CF', textAlign: 'right', marginTop: 3 }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: 10, borderTop: '1px solid rgba(255,255,255,0.07)', background: '#202C33', display: 'flex', gap: 8 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && selected?.status !== 'ended' && reply()} disabled={selected?.status === 'ended'} placeholder={selected?.status === 'ended' ? 'Session ended' : 'Type a message'} style={{ flex: 1, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: '#2A3942', color: '#E9EDEF', padding: '10px 12px', outline: 'none', fontFamily: 'inherit' }} />
            <button onClick={reply} disabled={sending || !input.trim() || selected?.status === 'ended'} style={{ width: 42, border: 'none', borderRadius: 8, background: '#00A884', color: '#001', opacity: sending || !input.trim() || selected?.status === 'ended' ? 0.5 : 1 }}>➤</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: '#667781' }}>Select a conversation</div>
      )}
    </div>
  )
}
