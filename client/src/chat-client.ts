import type { ServerPayload } from './protocol'
import { RECONNECT_BACKOFF_STEPS_MS, SERVER_WS_URL } from './constants'

export type ClientStatus = 'connecting' | 'online' | 'reconnecting'

interface QueuedMessage {
  id: string
  body: string
}

interface ChatClientHandlers {
  onPayload: (payload: ServerPayload) => void
  onStatusChange: (status: ClientStatus) => void
}

export class ChatClient {
  private socket: WebSocket | null = null
  private handlers: ChatClientHandlers
  private queue: QueuedMessage[] = []
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private joined = false
  private closedByUser = false
  private name: string
  private room: string

  constructor(name: string, room: string, handlers: ChatClientHandlers) {
    this.name = name
    this.room = room
    this.handlers = handlers
  }

  connect(): void {
    this.closedByUser = false
    this.handlers.onStatusChange(this.reconnectAttempts === 0 ? 'connecting' : 'reconnecting')
    const socket = new WebSocket(SERVER_WS_URL)
    this.socket = socket

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'join', name: this.name, room: this.room }))
    }
    socket.onmessage = (event) => {
      let payload: ServerPayload
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }
      if (payload.type === 'history') {
        this.joined = true
        this.reconnectAttempts = 0
        this.handlers.onStatusChange('online')
        this.flushQueue()
      }
      this.handlers.onPayload(payload)
    }
    socket.onclose = () => {
      this.joined = false
      if (this.closedByUser) {
        return
      }
      this.scheduleReconnect()
    }
    socket.onerror = () => {
      socket.close()
    }
  }

  sendMessage(body: string): string {
    const id = this.nextMessageId()
    if (this.socket?.readyState === WebSocket.OPEN && this.joined) {
      this.socket.send(JSON.stringify({ type: 'message', id, body }))
    } else {
      this.queue.push({ id, body })
    }
    return id
  }

  close(): void {
    this.closedByUser = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    this.socket?.close()
    this.socket = null
  }

  private flushQueue(): void {
    while (this.queue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const queued = this.queue.shift()
      if (queued) {
        this.socket.send(
          JSON.stringify({ type: 'message', id: queued.id, body: queued.body })
        )
      }
    }
  }

  private scheduleReconnect(): void {
    const delay =
      RECONNECT_BACKOFF_STEPS_MS[
        Math.min(this.reconnectAttempts, RECONNECT_BACKOFF_STEPS_MS.length - 1)
      ]
    this.reconnectAttempts += 1
    this.handlers.onStatusChange('reconnecting')
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private nextMessageId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  }
}
