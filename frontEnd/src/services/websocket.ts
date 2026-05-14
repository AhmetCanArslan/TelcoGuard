/* ======================================================
   TelcoGuard – WebSocket Client
   Auto-reconnecting WS with typed message handling
   ====================================================== */

export type WSMessageType =
  | 'metric_update'
  | 'station_status'
  | 'new_alarm'
  | 'alarm_update'
  | 'dashboard_snapshot'
  | 'user_status'

export interface WSMessage {
  type: WSMessageType
  topic?: string
  payload: unknown
}

type Listener = (msg: WSMessage) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private listeners: Map<WSMessageType, Set<Listener>> = new Map()
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 2000
  private maxReconnectDelay = 30000
  private url: string

  constructor() {
    this.url = '' // Will be built in connect()
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const token = localStorage.getItem('telcoguard_access_token')
    this.url = `${protocol}//${window.location.host}/ws${token ? `?token=${token}` : ''}`

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('[WS] Connected')
        this.reconnectDelay = 2000
      }

      this.ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data)
          this.dispatch(msg)
        } catch (err) {
          console.warn('[WS] Invalid message:', err)
        }
      }

      this.ws.onclose = () => {
        console.log('[WS] Disconnected, reconnecting...')
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        this.ws?.close()
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.ws?.close()
    this.ws = null
  }

  on(type: WSMessageType, listener: Listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)
    return () => this.off(type, listener)
  }

  off(type: WSMessageType, listener: Listener) {
    this.listeners.get(type)?.delete(listener)
  }

  private dispatch(msg: WSMessage) {
    this.listeners.get(msg.type)?.forEach(fn => fn(msg))
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      this.connect()
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay)
  }
}

export const wsService = new WebSocketService()
