import express from 'express'
import http from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'
import {
  CLOSE_CODES,
  CONNECTION_IS_DEAD_AFTER_MS,
  ERROR_TEXTS,
  HEARTBEAT_INTERVAL_MS,
  HISTORY_LIMIT_DEFAULT,
  HTTP_PORT,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  MESSAGE_TYPES
} from './constants'
import type {
  ChatMessage,
  ClientPayload,
  ServerPayload
} from './protocol'
import { MemoryStorage, type StorageInterface } from './storage'
import { RoomRegistry } from './rooms'

const storage: StorageInterface = new MemoryStorage()
const registry = new RoomRegistry()

const app = express()
app.get('/health', (_request, response) => {
  response.json({ status: 'ok' })
})

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    if ((socket as HeartbeatSocket).isAlive === false) {
      socket.terminate()
      continue
    }
    ;(socket as HeartbeatSocket).isAlive = false
    socket.ping()
  }
}, HEARTBEAT_INTERVAL_MS)

interface HeartbeatSocket extends WebSocket {
  isAlive: boolean
}

const send = (socket: WebSocket, payload: ServerPayload): void => {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload))
  }
}

const messageId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const presenceFor = (room: string): ServerPayload => ({
  type: 'presence',
  room,
  names: registry.namesIn(room)
})

wss.on('connection', (rawSocket: WebSocket) => {
  const socket = rawSocket as HeartbeatSocket
  socket.isAlive = true
  socket.on('pong', () => {
    socket.isAlive = true
  })

  socket.on('message', async (data) => {
    let payload: ClientPayload
    try {
      payload = JSON.parse(String(data))
    } catch {
      send(socket, { type: 'error', reason: ERROR_TEXTS.INVALID_PAYLOAD })
      return
    }

    if (payload.type === MESSAGE_TYPES.JOIN) {
      const name = payload.name?.trim() ?? ''
      const room = payload.room?.trim() ?? ''
      if (!name || name.length > MAX_NAME_LENGTH) {
        send(socket, { type: 'error', reason: ERROR_TEXTS.NAME_TOO_LONG })
        return
      }
      if (registry.namesIn(room).includes(name)) {
        send(socket, { type: 'error', reason: ERROR_TEXTS.NAME_TAKEN })
        return
      }
      registry.join(socket, name, room)
      const messages = await storage.history(room, HISTORY_LIMIT_DEFAULT)
      send(socket, { type: 'history', messages })
      registry.broadcast(room, presenceFor(room))
      return
    }

    if (payload.type === MESSAGE_TYPES.MESSAGE) {
      const session = registry.sessionFor(socket)
      const body = payload.body?.trim() ?? ''
      if (!session) {
        send(socket, { type: 'error', reason: 'Join a room first' })
        return
      }
      if (!body || body.length > MAX_MESSAGE_LENGTH) {
        send(socket, { type: 'error', reason: ERROR_TEXTS.MESSAGE_TOO_LONG })
        return
      }
      const message: ChatMessage = {
        id: messageId(),
        room: session.room,
        sender: session.name,
        body,
        sentAt: new Date().toISOString()
      }
      await storage.append(message)
      registry.broadcast(session.room, { type: 'message', message })
    }
  })

  socket.on('close', () => {
    const session = registry.sessionFor(socket)
    registry.leave(socket)
    if (session) {
      registry.broadcast(session.room, presenceFor(session.room))
    }
  })

  socket.on('error', () => {
    registry.leave(socket)
  })
})

const shutdown = (): void => {
  clearInterval(heartbeat)
  registry.closeAll('Server shutting down')
  wss.close()
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

server.listen(HTTP_PORT, () => {
  console.log(`chat server listening on http://localhost:${HTTP_PORT}`)
})
