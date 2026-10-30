export interface ClientJoinPayload {
  type: 'join'
  name: string
  room: string
}

export interface ClientMessagePayload {
  type: 'message'
  id: string
  body: string
}

export type ClientPayload = ClientJoinPayload | ClientMessagePayload

export interface ChatMessage {
  id: string
  room: string
  sender: string
  body: string
  sentAt: string
}

export interface ServerHistoryPayload {
  type: 'history'
  messages: ChatMessage[]
}

export interface ServerMessagePayload {
  type: 'message'
  message: ChatMessage
}

export interface ServerPresencePayload {
  type: 'presence'
  room: string
  names: string[]
}

export interface ServerErrorPayload {
  type: 'error'
  reason: string
}

export type ServerPayload =
  | ServerHistoryPayload
  | ServerMessagePayload
  | ServerPresencePayload
  | ServerErrorPayload
