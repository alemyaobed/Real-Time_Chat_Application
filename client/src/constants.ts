export const SERVER_WS_URL = 'ws://localhost:4000/ws'

export const STATUS_TEXTS = {
  CONNECTING: 'Connecting…',
  ONLINE: 'Connected',
  OFFLINE: 'Disconnected'
} as const

export const APP_TEXTS = {
  APP_TITLE: 'Real-Time Chat',
  NAME_LABEL: 'Your name',
  ROOM_LABEL: 'Room',
  JOIN_BUTTON: 'Join room',
  SEND_BUTTON: 'Send',
  MESSAGE_PLACEHOLDER: 'Type a message',
  IN_ROOM: 'In this room'
} as const
