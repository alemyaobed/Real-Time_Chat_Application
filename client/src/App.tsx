import { useEffect, useRef, useState } from 'react'
import { ChatClient } from './chat-client'
import { APP_TEXTS, STATUS_TEXTS } from './constants'
import type {
  ConnectionStatus,
  DisplayMessage,
  ServerPayload
} from './protocol'

interface JoinDetails {
  name: string
  room: string
}

export default function App() {
  const [joinDetails, setJoinDetails] = useState<JoinDetails | null>(null)

  if (!joinDetails) {
    return <JoinView onJoin={setJoinDetails} />
  }
  return <ChatView name={joinDetails.name} room={joinDetails.room} />
}

function JoinView({ onJoin }: { onJoin: (details: JoinDetails) => void }) {
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (name.trim() && room.trim()) {
      onJoin({ name: name.trim(), room: room.trim() })
    }
  }

  return (
    <main className="join-screen">
      <h1>{APP_TEXTS.APP_TITLE}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          {APP_TEXTS.NAME_LABEL}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={24}
            autoFocus
          />
        </label>
        <label>
          {APP_TEXTS.ROOM_LABEL}
          <input
            value={room}
            onChange={(event) => setRoom(event.target.value)}
            maxLength={24}
          />
        </label>
        <button type="submit">{APP_TEXTS.JOIN_BUTTON}</button>
      </form>
    </main>
  )
}

function ChatView({ name, room }: { name: string; room: string }) {
  const clientRef = useRef<ChatClient | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [names, setNames] = useState<string[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const client = new ChatClient(name, room, {
      onPayload: (payload: ServerPayload) => {
        if (payload.type === 'history') {
          setMessages((current) => mergeHistory(current, payload.messages))
        }
        if (payload.type === 'message') {
          setMessages((current) => acceptMessage(current, payload.message, name))
        }
        if (payload.type === 'presence') {
          setNames(payload.names)
        }
        if (payload.type === 'error') {
          setNotice(payload.reason)
        }
      },
      onStatusChange: setStatus
    })
    clientRef.current = client
    client.connect()

    return () => {
      client.close()
    }
  }, [name, room])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const body = draft.trim()
    const client = clientRef.current
    if (body && client) {
      const id = client.sendMessage(body)
      setMessages((current) => [
        ...current,
        {
          id,
          room,
          sender: name,
          body,
          sentAt: new Date().toISOString(),
          pending: true
        }
      ])
      setDraft('')
    }
  }

  return (
    <main className="chat-screen">
      <header>
        <div>
          <h1>{room}</h1>
          <p className="presence">
            {APP_TEXTS.IN_ROOM}: {names.join(', ')}
          </p>
        </div>
        <span className={`status status-${status}`}>
          {status === 'online'
            ? STATUS_TEXTS.ONLINE
            : status === 'connecting'
              ? STATUS_TEXTS.CONNECTING
              : STATUS_TEXTS.RECONNECTING}
        </span>
      </header>

      {notice && <p className="notice">{notice}</p>}

      <ul className="messages">
        {messages.map((message) => (
          <li
            key={message.id}
            className={`${message.sender === name ? 'mine' : ''} ${message.pending ? 'pending' : ''}`}
          >
            <span className="sender">{message.sender}</span>
            <span className="body">{message.body}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={APP_TEXTS.MESSAGE_PLACEHOLDER}
        />
        <button type="submit">{APP_TEXTS.SEND_BUTTON}</button>
      </form>
    </main>
  )
}

function mergeHistory(
  current: DisplayMessage[],
  history: DisplayMessage[]
): DisplayMessage[] {
  const byId = new Map<string, DisplayMessage>()
  for (const message of history) {
    byId.set(message.id, message)
  }
  for (const message of current) {
    const known = byId.get(message.id)
    if (!known) {
      byId.set(message.id, message)
    } else if (message.pending && !known.pending) {
      byId.set(message.id, { ...message, pending: false })
    }
  }
  return [...byId.values()].sort((a, b) => a.sentAt.localeCompare(b.sentAt))
}

function acceptMessage(
  current: DisplayMessage[],
  incoming: DisplayMessage,
  ownName: string
): DisplayMessage[] {
  const exists = current.some((message) => message.id === incoming.id)
  if (exists) {
    return current.map((message) =>
      message.id === incoming.id ? incoming : message
    )
  }
  if (incoming.sender === ownName) {
    return current
  }
  return [...current, incoming]
}
