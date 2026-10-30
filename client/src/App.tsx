import { useEffect, useRef, useState } from 'react'
import { ChatClient } from './chat-client'
import { APP_TEXTS, STATUS_TEXTS } from './constants'
import type { ChatMessage, ConnectionStatus, ServerPayload } from './protocol'

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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [names, setNames] = useState<string[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const client = new ChatClient()
    clientRef.current = client

    client.connect(name, room, {
      onPayload: (payload: ServerPayload) => {
        if (payload.type === 'history') {
          setMessages(payload.messages)
        }
        if (payload.type === 'message') {
          setMessages((current) => [...current, payload.message])
        }
        if (payload.type === 'presence') {
          setNames(payload.names)
        }
        if (payload.type === 'error') {
          setNotice(payload.reason)
        }
      },
      onStatusChange: (next) => {
        setStatus(next)
      }
    })

    return () => {
      client.close()
    }
  }, [name, room])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const body = draft.trim()
    if (body && clientRef.current?.sendMessage(body)) {
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
              : STATUS_TEXTS.OFFLINE}
        </span>
      </header>

      {notice && <p className="notice">{notice}</p>}

      <ul className="messages">
        {messages.map((message) => (
          <li key={message.id} className={message.sender === name ? 'mine' : ''}>
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
