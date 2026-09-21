import { useState, useEffect, useCallback, useRef } from 'react'
import { useSocket } from '../contexts/SocketContext'

export interface AppNotification {
  id: number | string
  title: string
  body: string
  type: 'success' | 'info' | 'warning' | 'error' | 'ride'
  timestamp: string
  read: boolean
}

/**
 * useNotifications — Phase 4: Real-time push notification hook
 *
 * Subscribes to `notification:new` socket events and maintains
 * an ordered notification list with unread badge count.
 */
export function useNotifications() {
  const { socket, isConnected } = useSocket()
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const unreadCount = notifications.filter((n) => !n.read).length

  // Subscribe to live notifications
  useEffect(() => {
    if (!socket || !isConnected) return

    const handleNew = (notif: AppNotification) => {
      setNotifications((prev) => [{ ...notif, read: false }, ...prev.slice(0, 49)])
    }

    socket.on('notification:new', handleNew)
    return () => { socket.off('notification:new', handleNew) }
  }, [socket, isConnected])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const markRead = useCallback((id: number | string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }, [])

  const dismiss = useCallback((id: number | string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // Manually push a local notification (e.g. on ride confirmation)
  const pushLocal = useCallback((notif: Omit<AppNotification, 'id' | 'read'>) => {
    setNotifications((prev) => [
      { ...notif, id: Date.now(), read: false },
      ...prev.slice(0, 49),
    ])
  }, [])

  return { notifications, unreadCount, markAllRead, markRead, dismiss, pushLocal }
}
