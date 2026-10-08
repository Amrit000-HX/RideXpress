import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AppNotification } from '../hooks/useNotifications'

interface NotificationToastProps {
  notifications: AppNotification[]
  onDismiss: (id: number | string) => void
}

const COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  success: { bg: '#0f2e17', border: '#6B9E72', icon: '✅' },
  info:    { bg: '#0d1f30', border: '#3b82f6', icon: 'ℹ️' },
  warning: { bg: '#2a1f0a', border: '#f59e0b', icon: '⚠️' },
  error:   { bg: '#2a0a0a', border: '#ef4444', icon: '❌' },
  ride:    { bg: '#0f2e17', border: '#6B9E72', icon: '🚗' },
}

/**
 * NotificationToast — Phase 4 component
 *
 * Renders the most recent 3 unread notifications as animated toast banners
 * in the bottom-right corner. Auto-dismisses after 6 seconds.
 */
export function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  const visible = notifications.filter((n) => !n.read).slice(0, 3)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {visible.map((n) => (
          <ToastItem key={n.id} notif={n} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ notif, onDismiss }: { notif: AppNotification; onDismiss: (id: number | string) => void }) {
  const colors = COLORS[notif.type] || COLORS.info
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(notif.id), 6000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [notif.id, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        width: '320px',
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderRadius: '14px',
        padding: '14px 16px',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${colors.border}22`,
        pointerEvents: 'all',
        cursor: 'pointer',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
      onClick={() => onDismiss(notif.id)}
    >
      <span style={{ fontSize: '20px', lineHeight: 1 }}>{colors.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#F5F0E8', marginBottom: '3px' }}>
          {notif.title}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.7)', lineHeight: 1.4, wordBreak: 'break-word' }}>
          {notif.body}
        </div>
      </div>
      <button
        style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.4)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: 0 }}
        onClick={(e) => { e.stopPropagation(); onDismiss(notif.id) }}
      >
        ×
      </button>
    </motion.div>
  )
}
