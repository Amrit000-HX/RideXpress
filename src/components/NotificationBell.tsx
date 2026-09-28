import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'

const TYPE_COLORS: Record<string, string> = {
  success: '#6B9E72',
  info:    '#3b82f6',
  warning: '#f59e0b',
  error:   '#ef4444',
  ride:    '#6B9E72',
}

/**
 * NotificationBell — Phase 4: Navbar bell icon with unread badge and dropdown panel.
 */
export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, dismiss } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen((o) => !o); if (!open && unreadCount > 0) markAllRead() }}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'currentColor',
          transition: 'background 0.15s',
        }}
        title="Notifications"
      >
        <Bell size={22} strokeWidth={1.8} />
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '16px',
            height: '16px',
            background: '#ef4444',
            borderRadius: '50%',
            fontSize: '9px',
            fontWeight: 800,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #F5F0E8',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9990 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'absolute',
                top: '44px',
                right: 0,
                width: '340px',
                maxHeight: '440px',
                background: '#1A1A1A',
                border: '1.5px solid rgba(255,255,255,0.1)',
                borderRadius: '18px',
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                zIndex: 9991,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#F5F0E8' }}>Notifications</span>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{ background: 'none', border: 'none', color: '#6B9E72', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(245,240,232,0.3)', fontSize: '13px' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔔</div>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '12px 18px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: n.read ? 'transparent' : 'rgba(107,158,114,0.06)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: n.read ? 'transparent' : TYPE_COLORS[n.type] || '#6B9E72',
                        marginTop: '6px',
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#F5F0E8', marginBottom: '2px' }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'rgba(245,240,232,0.6)', lineHeight: 1.4 }}>
                          {n.body}
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(245,240,232,0.3)', marginTop: '4px' }}>
                          {new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button
                        onClick={() => dismiss(n.id)}
                        style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.25)', cursor: 'pointer', fontSize: '14px', flexShrink: 0, padding: '0 0 0 4px' }}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
