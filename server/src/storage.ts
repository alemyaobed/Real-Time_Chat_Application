import type { ChatMessage } from './protocol'

export interface StorageInterface {
  append(message: ChatMessage): Promise<void>
  history(room: string, limit: number): Promise<ChatMessage[]>
}

export class MemoryStorage implements StorageInterface {
  private messagesByRoom = new Map<string, ChatMessage[]>()

  async append(message: ChatMessage): Promise<void> {
    const existing = this.messagesByRoom.get(message.room) ?? []
    existing.push(message)
    this.messagesByRoom.set(message.room, existing)
  }

  async history(room: string, limit: number): Promise<ChatMessage[]> {
    const existing = this.messagesByRoom.get(room) ?? []
    return existing.slice(-limit)
  }
}
