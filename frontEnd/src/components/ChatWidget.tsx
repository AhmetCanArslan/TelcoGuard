import React, { useState, useEffect, useRef, useCallback } from 'react'
import { wsService } from '../services/websocket'
import type { WSMessage } from '../services/websocket'
import { FaTimes, FaImage, FaPaperPlane, FaComments, FaExclamationTriangle } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { getAccessToken } from '../services/auth'

/* ---- Shared chat message shape ---- */
export interface ChatMessage {
  sender_id: number
  sender_name?: string
  receiver_id: number
  type: 'text' | 'image'
  content: string
  timestamp: string
}

export interface ForwardedAlarm {
  sender_id: number
  sender_name?: string
  receiver_id: number
  alarm: {
    id: string
    station_id: string
    station?: { code?: string; name?: string }
    metric_name: string
    severity: string
    message: string
  }
}

/* ---- Notification toast for incoming messages ---- */
interface ToastItem {
  id: number
  type: 'chat' | 'alarm'
  senderName: string
  preview: string
  senderId: number
}

let toastId = 0

interface ChatWidgetProps {
  /** If set, force-open the widget with this target */
  initialTarget?: { id: number; name: string } | null
  onClearInitial?: () => void
}

export default function ChatWidget({ initialTarget, onClearInitial }: ChatWidgetProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [targetUser, setTargetUser] = useState<{ id: number; name: string } | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Handle external target opening
  useEffect(() => {
    if (initialTarget) {
      setTargetUser(initialTarget)
      setMessages([])
      setOpen(true)
      onClearInitial?.()
    }
  }, [initialTarget, onClearInitial])

  // Remove toasts after 5s
  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1))
    }, 5000)
    return () => clearTimeout(timer)
  }, [toasts])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1)
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1)
    
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    
    oscillator.start()
    oscillator.stop(audioCtx.currentTime + 0.1)
  } catch (err) {
    // Ignore errors (e.g. if browser blocks autoplay before user interaction)
  }
}

  // Listen to incoming chat_message
  useEffect(() => {
    if (!user) return

    const unsubChat = wsService.on('chat_message', (msg: WSMessage) => {
      const p = msg.payload as ChatMessage
      if (p.sender_id === user.id) return // ignore own echo

      playNotificationSound()

      // If chat is open with this sender, add inline
      if (open && targetUser?.id === p.sender_id) {
        setMessages(prev => [...prev, p])
      } else {
        // Show toast
        setUnreadCount(c => c + 1)
        const t: ToastItem = {
          id: ++toastId,
          type: 'chat',
          senderName: p.sender_name || `Kullanıcı #${p.sender_id}`,
          preview: p.type === 'image' ? '📷 Resim gönderdi' : p.content.slice(0, 60),
          senderId: p.sender_id
        }
        setToasts(prev => [...prev, t].slice(-3))
      }
    })

    const unsubAlarm = wsService.on('forward_alarm', (msg: WSMessage) => {
      const p = msg.payload as ForwardedAlarm
      if (p.sender_id === user.id) return
      
      playNotificationSound()
      
      setUnreadCount(c => c + 1)
      const t: ToastItem = {
        id: ++toastId,
        type: 'alarm',
        senderName: p.sender_name || `Kullanıcı #${p.sender_id}`,
        preview: `⚠️ Alarm: ${p.alarm.station?.code || p.alarm.station_id} – ${p.alarm.metric_name}`,
        senderId: p.sender_id
      }
      setToasts(prev => [...prev, t].slice(-3))
    })

    return () => { unsubChat(); unsubAlarm() }
  }, [user, open, targetUser])

  const handleOpenToast = useCallback((toast: ToastItem) => {
    setTargetUser({ id: toast.senderId, name: toast.senderName })
    setMessages([])
    setOpen(true)
    setUnreadCount(0)
    setToasts(prev => prev.filter(t => t.id !== toast.id))
  }, [])

  if (!user) return null

  const handleSendText = () => {
    if (!input.trim() || !targetUser) return
    const msg: ChatMessage = {
      sender_id: user.id,
      sender_name: user.name,
      receiver_id: targetUser.id,
      type: 'text',
      content: input,
      timestamp: new Date().toISOString()
    }
    wsService.send({ type: 'chat_message', payload: msg as unknown })
    setMessages(prev => [...prev, msg])
    setInput('')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !targetUser) return
    setUploading(true)
    const formData = new FormData()
    formData.append('image', file)
    try {
      const token = getAccessToken()
      const res = await fetch(`/api/v1/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const msg: ChatMessage = {
        sender_id: user.id,
        sender_name: user.name,
        receiver_id: targetUser.id,
        type: 'image',
        content: data.url,
        timestamp: new Date().toISOString()
      }
      wsService.send({ type: 'chat_message', payload: msg as unknown })
      setMessages(prev => [...prev, msg])
    } catch {
      alert('Resim yüklenemedi.')
    } finally {
      setUploading(false)
      // Clear file input so same file can be re-selected
      e.target.value = ''
    }
  }

  const handleClose = () => {
    setOpen(false)
    setTargetUser(null)
    setMessages([])
  }

  return (
    <>
      {/* ── Notification Toasts ── */}
      <div className="chat-toasts">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`chat-toast ${t.type}`}
            onClick={() => handleOpenToast(t)}
          >
            <div className="chat-toast-icon">
              {t.type === 'chat' ? <FaComments /> : <FaExclamationTriangle />}
            </div>
            <div className="chat-toast-body">
              <strong>{t.senderName}</strong>
              <span>{t.preview}</span>
            </div>
            <button className="chat-toast-close" onClick={e => {
              e.stopPropagation()
              setToasts(prev => prev.filter(x => x.id !== t.id))
            }}>
              <FaTimes />
            </button>
          </div>
        ))}
      </div>

      {/* ── FAB Toggle ── */}
      {!open && (
        <button
          className="chat-fab"
          onClick={() => {
            setOpen(true)
            setUnreadCount(0)
          }}
          title="Mesajlar"
        >
          <FaComments size={22} />
          {unreadCount > 0 && <span className="chat-fab-badge">{unreadCount}</span>}
        </button>
      )}

      {/* ── Chat Panel ── */}
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {targetUser ? (
                <>
                  <div className="live-dot" style={{ width: 8, height: 8 }} />
                  <strong>{targetUser.name}</strong>
                </>
              ) : (
                <strong>Mesajlar</strong>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {targetUser && (
                <button
                  className="chat-panel-action"
                  onClick={() => { setTargetUser(null); setMessages([]) }}
                  title="Geri"
                >
                  ←
                </button>
              )}
              <button className="chat-panel-action" onClick={handleClose}><FaTimes /></button>
            </div>
          </div>

          {!targetUser ? (
            <div className="chat-panel-body" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
              <FaComments size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 13 }}>Mühendisler sayfasından bir mühendis seçerek sohbet başlatabilirsiniz.</p>
            </div>
          ) : (
            <>
              <div className="chat-panel-body">
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontSize: 13 }}>
                    Mesajlaşma başlatıldı
                  </div>
                )}
                {messages.map((m, idx) => {
                  const isMe = m.sender_id === user.id
                  return (
                    <div key={idx} className={`chat-bubble ${isMe ? 'mine' : 'theirs'}`}>
                      {m.type === 'text' ? (
                        <div className="chat-bubble-text">{m.content}</div>
                      ) : (
                        <img
                          src={m.content}
                          alt="Ek"
                          className="chat-bubble-img"
                          onClick={() => window.open(m.content, '_blank')}
                        />
                      )}
                      <div className="chat-bubble-time">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-panel-input">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendText()}
                  placeholder="Mesaj yazın..."
                />
                <label className="chat-input-icon" style={{ opacity: uploading ? 0.4 : 1 }}>
                  <FaImage />
                  <input type="file" accept="image/*" hidden onChange={handleImageUpload} disabled={uploading} />
                </label>
                <button
                  className="chat-input-icon send"
                  onClick={handleSendText}
                  disabled={!input.trim()}
                >
                  <FaPaperPlane />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
