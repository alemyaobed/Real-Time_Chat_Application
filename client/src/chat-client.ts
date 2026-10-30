import type { ServerPayload } from './protocol'

interface ChatClientHandlers {
  onPayload: (payload: ServerPayload) => void
  onStatusChange: (status: 'online' | 'offline') => void
}

export class ChatClient {
  private socket: WebSocket | null = null

  connect(name: string, room: string, handlers: ChatClientHandlers): void {
    const socket = new WebSocket('ws://localhost:4000/ws')
    this.socket = socket

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'join', name, room }))
      handlers.onStatusChange('online')
    }
    socket.onmessage = (event) => {
      try {
        handlers.onPayload(JSON.parse(event.data))
      } catch {
        return
      }
    }
    socket.onclose = () => {
      handlers.onStatusChange('offline')
    }
    socket.onerror = () => {
      handlers.onStatusChange('offline')
    }
  }

  sendMessage(body: string): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return false
    }
    this.socket.send(JSON.stringify({ type: 'message', body }))
    return true
  }

  close(): void {
    this.socket?.close()
    this.socket = null
  }
}
