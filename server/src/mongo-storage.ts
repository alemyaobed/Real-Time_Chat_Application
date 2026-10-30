import { MongoClient } from 'mongodb'
import type { Db, Collection } from 'mongodb'
import type { ChatMessage } from './protocol'
import type { StorageInterface } from './storage'

const DATABASE_NAME = 'chatapp'
const MESSAGES_COLLECTION = 'messages'

interface MessageDocument extends ChatMessage {
  _id: string
}

export class MongoStorage implements StorageInterface {
  private client: MongoClient

  constructor(uri: string) {
    this.client = new MongoClient(uri)
  }

  async start(): Promise<void> {
    await this.client.connect()
  }

  async stop(): Promise<void> {
    await this.client.close()
  }

  async append(message: ChatMessage): Promise<void> {
    await this.messages().insertOne({ ...message, _id: message.id })
  }

  async history(room: string, limit: number): Promise<ChatMessage[]> {
    const documents = await this.messages()
      .find({ room })
      .sort({ sentAt: -1 })
      .limit(limit)
      .toArray()
    return documents.reverse().map(this.toMessage)
  }

  private messages(): Collection<MessageDocument> {
    return this.client.db(DATABASE_NAME).collection<MessageDocument>(MESSAGES_COLLECTION)
  }

  private toMessage(document: MessageDocument): ChatMessage {
    return {
      id: document.id,
      room: document.room,
      sender: document.sender,
      body: document.body,
      sentAt: document.sentAt
    }
  }
}
