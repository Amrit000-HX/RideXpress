import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useSocket } from './SocketContext'

export interface AppNotification {
  id: number | string
  title: string
  body: string
  type: 'success' | 'info' | 'warning' | 'error' | 'ride'
  timestamp: string
  read: boolean
}

interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  markAllRead: () => void
  markRead: (id: number | string) => void
  dismiss: (id: number | string) => void
  pushLocal: (notif: Omit<AppNotification, 'id' | 'read'>) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const STORAGE_KEY = 'rx_notifications'

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { socket, isConnected } = useSocket()
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)))
    } catch {}
  }, [notifications])

  // Listen for socket events
  useEffect(() => {
    if (!socket || !isConnected) return

    const handleNew = (notif: AppNotification) => {
      setNotifications((prev) => {
        // Prevent duplicate IDs
        if (prev.some((n) => n.id === notif.id)) return prev
        return [{ ...notif, read: false }, ...prev.slice(0, 49)]
      })
    }

    socket.on('notification:new', handleNew)
    return () => {
      socket.off('notification:new', handleNew)
    }
  }, [socket, isConnected])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const markRead = useCallback((id: number | string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const dismiss = useCallback((id: number | string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const pushLocal = useCallback((notif: Omit<AppNotification, 'id' | 'read'>) => {
    setNotifications((prev) => [
      { ...notif, id: Date.now(), read: false },
      ...prev.slice(0, 49),
    ])
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllRead,
        markRead,
        dismiss,
        pushLocal,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return ctx
}
