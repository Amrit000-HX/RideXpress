import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../contexts/SocketContext'
import api from '../services/api'

export interface ChatMsg {
  id: string
  senderId: string
  senderName: string
  senderRole: 'customer' | 'driver'
  message: string
  createdAt: string
}

interface ChatBoxProps {
  rideId: string
  currentUserId: string
  currentUserName: string
  currentUserRole: 'customer' | 'driver'
  partnerName: string
  onClose: () => void
}

/**
 * ChatBox — Phase 5: In-app real-time messaging between customer and driver.
 *
 * Uses Socket.IO `chat:send` / `chat:message` for real-time delivery.
 * Falls back to REST API for message history on open.
 */
export default function ChatBox({
  rideId,
  currentUserId,
  currentUserName,
  currentUserRole,
  partnerName,
  onClose,
}: ChatBoxProps) {
  const { socket, isConnected } = useSocket()
  const [messages, setMessages]   = useState<ChatMsg[]>([])
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Auto-scroll to latest message
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load history on open
  useEffect(() => {
    if (!rideId) return
    setLoading(true)
    api.get(`/chat/${rideId}`)
      .then((res) => {
        if (res.data.messages) setMessages(res.data.messages)
      })
      .catch(() => {}) // Silently fail — fresh chat
      .finally(() => setLoading(false))
  }, [rideId])

  // Join ride room & subscribe to new messages
  useEffect(() => {
    if (!socket || !isConnected || !rideId) return

    socket.emit('ride:join_room', { rideId })

    const handleMessage = (msg: ChatMsg) => {
      setMessages((prev) => {
        // Deduplicate if server echoes our own message
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    }

    socket.on('chat:message', handleMessage)

    return () => {
      socket.off('chat:message', handleMessage)
      socket.emit('ride:leave_room', { rideId })
    }
  }, [socket, isConnected, rideId])

  // Scroll on new messages
  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || !socket || !isConnected) return

    setSending(true)
    setInput('')

    // Optimistic UI — add immediately
    const optimistic: ChatMsg = {
      id: `opt-${Date.now()}`,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      message: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    socket.emit('chat:send', {
      rideId,
      message: text,
      senderName: currentUserName,
    })

    setSending(false)
    inputRef.current?.focus()
  }, [input, sending, socket, isConnected, rideId, currentUserId, currentUserName, currentUserRole])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '360px',
        height: '520px',
        zIndex: 9998,
        background: '#141414',
        border: '1.5px solid rgba(107, 158, 114, 0.4)',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '16px 18px',
        background: '#1A1A1A',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(107,158,114,0.2)', border: '1.5px solid #6B9E72',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 800, color: '#6B9E72',
        }}>
          {partnerName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#F5F0E8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {partnerName}
          </div>
          <div style={{ fontSize: '11px', color: '#6B9E72', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6B9E72', display: 'inline-block' }} />
            {isConnected ? 'Connected · Live Chat' : 'Reconnecting…'}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#F5F0E8', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}
        >
          ×
        </button>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 14px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        scrollbarWidth: 'thin',
      }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'rgba(245,240,232,0.35)', fontSize: '12px', paddingTop: '40px' }}>
            Loading messages…
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', flex: 1, gap: '10px',
            color: 'rgba(245,240,232,0.3)', fontSize: '13px', textAlign: 'center',
          }}>
            <span style={{ fontSize: '32px' }}>💬</span>
            <span>No messages yet.<br />Say hello to {partnerName}!</span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUserId || msg.senderRole === currentUserRole
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Sender label */}
                <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.35)', marginBottom: '3px', paddingLeft: '4px', paddingRight: '4px' }}>
                  {isMe ? 'You' : msg.senderName}
                </span>
                {/* Bubble */}
                <div style={{
                  maxWidth: '78%',
                  padding: '10px 14px',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isMe ? '#6B9E72' : 'rgba(255,255,255,0.07)',
                  color: isMe ? '#ffffff' : '#F5F0E8',
                  fontSize: '13px',
                  lineHeight: 1.45,
                  wordBreak: 'break-word',
                  border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}>
                  {msg.message}
                </div>
                {/* Timestamp */}
                <span style={{ fontSize: '9.5px', color: 'rgba(245,240,232,0.25)', marginTop: '3px', paddingLeft: '4px', paddingRight: '4px' }}>
                  {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* ── Input Bar ── */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexShrink: 0,
        background: '#1A1A1A',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          maxLength={500}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '10px 14px',
            color: '#F5F0E8',
            fontSize: '13px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending || !isConnected}
          style={{
            width: '40px', height: '40px',
            borderRadius: '12px',
            background: input.trim() && isConnected ? '#6B9E72' : 'rgba(255,255,255,0.07)',
            border: 'none',
            color: '#ffffff',
            fontSize: '18px',
            cursor: input.trim() && isConnected ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          ➤
        </button>
      </div>
    </motion.div>
  )
}
