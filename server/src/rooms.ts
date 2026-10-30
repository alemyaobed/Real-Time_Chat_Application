import type { WebSocket } from 'ws'
import type { ServerPayload } from './protocol'
import { CLOSE_CODES } from './constants'

interface Session {
  name: string
  room: string
}

export class RoomRegistry {
  private sessions = new Map<WebSocket, Session>()
  private membersByRoom = new Map<string, Set<WebSocket>>()

  join(socket: WebSocket, name: string, room: string): void {
    this.sessions.set(socket, { name, room })
    const members = this.membersByRoom.get(room) ?? new Set<WebSocket>()
    members.add(socket)
    this.membersByRoom.set(room, members)
  }

  sessionFor(socket: WebSocket): Session | undefined {
    return this.sessions.get(socket)
  }

  namesIn(room: string): string[] {
    const members = this.membersByRoom.get(room)
    if (!members) {
      return []
    }
    return [...members]
      .map((member) => this.sessions.get(member)?.name)
      .filter((name): name is string => Boolean(name))
  }

  broadcast(room: string, payload: ServerPayload, exclude?: WebSocket): void {
    const members = this.membersByRoom.get(room)
    if (!members) {
      return
    }
    const data = JSON.stringify(payload)
    for (const member of members) {
      if (member !== exclude && member.readyState === member.OPEN) {
        member.send(data)
      }
    }
  }

  leave(socket: WebSocket): void {
    const session = this.sessions.get(socket)
    if (!session) {
      return
    }
    const members = this.membersByRoom.get(session.room)
    if (members) {
      members.delete(socket)
      if (members.size === 0) {
        this.membersByRoom.delete(session.room)
      }
    }
    this.sessions.delete(socket)
  }

  closeAll(reason: string): void {
    for (const [socket] of this.sessions) {
      socket.close(CLOSE_CODES.GOING_AWAY, reason)
    }
  }
}
