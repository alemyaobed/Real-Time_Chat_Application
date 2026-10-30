export const HTTP_PORT = Number(process.env.PORT ?? 4000)
export const HEARTBEAT_INTERVAL_MS = 15_000
export const CONNECTION_IS_DEAD_AFTER_MS = 10_000
export const HISTORY_LIMIT_DEFAULT = 50
export const MAX_MESSAGE_LENGTH = 2000
export const MAX_NAME_LENGTH = 24
export const DEDUPE_IDS_KEPT_PER_ROOM = 200

export const MESSAGE_TYPES = {
  JOIN: 'join',
  MESSAGE: 'message',
  HISTORY: 'history',
  PRESENCE: 'presence',
  ERROR: 'error'
} as const

export const CLOSE_CODES = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  POLICY_VIOLATION: 1008
} as const

export const ERROR_TEXTS = {
  NAME_TAKEN: 'That name is already in the room',
  MESSAGE_TOO_LONG: 'Message is too long',
  NAME_TOO_LONG: 'Name is too long',
  INVALID_PAYLOAD: 'Invalid payload'
} as const
