'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Pusher from 'pusher-js'
import { ArrowLeft, CheckCheck, MessageCircle, Paperclip, Search, Send, ShieldCheck, X } from 'lucide-react'

type Conversation = any
type ChatMessage = any

function initials(name?: string) {
  return (name || 'Unknown')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?'
}

function formatTime(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const refreshConversations = () => {
    fetch('/api/admin/chat')
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations || []))
      .catch(() => setConversations([]))
  }

  useEffect(() => {
    refreshConversations()
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '' })
    const channel = pusher.subscribe('private-admin')
    channel.bind('chat:message', (msg: ChatMessage) => {
      refreshConversations()
      setMessages((current) => {
        if (!selected || msg.userId !== selected.user?.id) return current
        if (current.some((m) => m.id === msg.id)) return current
        return [...current, msg]
      })
    })
    return () => {
      try {
        channel.unbind_all()
        pusher.unsubscribe('private-admin')
        pusher.disconnect()
      } catch {}
    }
  }, [selected?.id, selected?.user?.id])

  useEffect(() => {
    if (!selected) return
    fetch(`/api/admin/chat?conversationId=${selected.id}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .catch(() => setMessages([]))
  }, [selected])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const filteredConversations = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return conversations
    return conversations.filter((c) => {
      const haystack = `${c.user?.name || ''} ${c.user?.email || ''} ${c.messages?.[0]?.content || ''}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [conversations, query])

  const groupedMessages = useMemo(() => {
    const groups: { day: string; messages: ChatMessage[] }[] = []
    for (const message of messages) {
      const day = formatDay(message.createdAt)
      const last = groups[groups.length - 1]
      if (last?.day === day) last.messages.push(message)
      else groups.push({ day, messages: [message] })
    }
    return groups
  }, [messages])

  function openConversation(conversation: Conversation) {
    setSelected(conversation)
    setListOpen(false)
  }

  async function reply() {
    if (!input.trim() || !selected || sending || selected.status === 'ended') return
    const text = input.trim()
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selected.id, content: text, userId: selected.user?.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.message) setMessages((current) => [...current, data.message])
      refreshConversations()
    } finally {
      setSending(false)
    }
  }

  async function endSession() {
    if (!selected || sending) return
    if (!confirm('End this support session? The user will no longer be able to send messages.')) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selected.id, action: 'end_session' }),
      })
      if (res.ok) {
        setSelected((current: Conversation | null) => (current ? { ...current, status: 'ended' } : null))
        refreshConversations()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="admin-messenger-shell">
      <aside className={`admin-chat-list ${listOpen ? 'open' : ''}`}>
        <div className="admin-chat-list-head">
          <div>
            <p>Inbox</p>
            <h1>Support chats</h1>
          </div>
          <span>{conversations.length}</span>
        </div>

        <label className="admin-chat-search">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, message…" />
          {query ? <button type="button" onClick={() => setQuery('')}><X size={14} /></button> : null}
        </label>

        <div className="admin-chat-conversations">
          {filteredConversations.length === 0 ? (
            <div className="admin-chat-empty-list">
              <MessageCircle size={28} />
              <strong>No conversations</strong>
              <span>New support messages will appear here.</span>
            </div>
          ) : filteredConversations.map((conversation) => {
            const active = selected?.id === conversation.id
            const lastMessage = conversation.messages?.[0]
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => openConversation(conversation)}
                className={`admin-chat-thread ${active ? 'active' : ''}`}
              >
                <span className="admin-chat-avatar">{initials(conversation.user?.name)}</span>
                <span className="admin-chat-thread-copy">
                  <span className="admin-chat-thread-top">
                    <strong>{conversation.user?.name || 'Unknown user'}</strong>
                    <em>{formatTime(lastMessage?.createdAt)}</em>
                  </span>
                  <span className="admin-chat-thread-meta">{conversation.user?.email || 'No email'}</span>
                  <span className="admin-chat-thread-preview">{lastMessage?.content || 'No messages yet'}</span>
                </span>
                {conversation.status === 'ended' ? <span className="admin-chat-ended-dot">Ended</span> : null}
              </button>
            )
          })}
        </div>
      </aside>

      <section className={`admin-chat-room ${selected ? 'has-selected' : ''}`}>
        {selected ? (
          <>
            <header className="admin-chat-room-head">
              <button type="button" className="admin-chat-mobile-back" onClick={() => setListOpen(true)} aria-label="Back to conversations">
                <ArrowLeft size={20} />
              </button>
              <span className="admin-chat-avatar large">{initials(selected.user?.name)}</span>
              <div className="admin-chat-room-person">
                <strong>{selected.user?.name || 'Unknown user'}</strong>
                <span>{selected.user?.email || 'No email'} · {selected.status === 'ended' ? 'Session ended' : 'Active now'}</span>
              </div>
              {selected.status !== 'ended' ? (
                <button type="button" onClick={endSession} disabled={sending} className="admin-chat-end-button">End session</button>
              ) : (
                <span className="admin-chat-ended-pill">Session ended</span>
              )}
            </header>

            <div className="admin-chat-messages" aria-live="polite">
              {groupedMessages.length === 0 ? (
                <div className="admin-chat-empty-room">
                  <MessageCircle size={38} />
                  <strong>No messages yet</strong>
                  <span>Start the conversation when this user needs help.</span>
                </div>
              ) : groupedMessages.map((group) => (
                <div key={group.day} className="admin-chat-day-group">
                  <div className="admin-chat-day-divider"><span>{group.day}</span></div>
                  {group.messages.map((message) => (
                    <div key={message.id} className={`admin-chat-message-row ${message.isAdmin ? 'admin' : 'user'}`}>
                      {!message.isAdmin ? <span className="admin-chat-avatar tiny">{initials(selected.user?.name)}</span> : null}
                      <div className="admin-chat-bubble">
                        <p>{message.content}</p>
                        <span>{formatTime(message.createdAt)} {message.isAdmin ? <CheckCheck size={13} /> : null}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <footer className="admin-chat-composer">
              <button type="button" className="admin-chat-attach" aria-label="Attach file" disabled>
                <Paperclip size={18} />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    reply()
                  }
                }}
                rows={1}
                disabled={selected.status === 'ended'}
                placeholder={selected.status === 'ended' ? 'Session ended' : `Message ${selected.user?.name || 'user'}…`}
              />
              <button type="button" onClick={reply} disabled={sending || !input.trim() || selected.status === 'ended'} className="admin-chat-send">
                <Send size={18} />
              </button>
            </footer>
          </>
        ) : (
          <div className="admin-chat-empty-room desktop-empty">
            <ShieldCheck size={46} />
            <strong>Select a conversation</strong>
            <span>Pick a user from the inbox to start replying like a real messenger.</span>
          </div>
        )}
      </section>
    </div>
  )
}
