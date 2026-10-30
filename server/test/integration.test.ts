import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import WebSocket from 'ws'
import type { ServerPayload } from '../src/protocol'

const PORT = 4788
const URL = `ws://localhost:${PORT}/ws`
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

const waitForHealth = async (): Promise<void> => {
  for (let i = 0; i < 40; i += 1) {
    try {
      const response = await fetch(`http://localhost:${PORT}/health`)
      if (response.ok) {
        return
      }
    } catch {
      await sleep(250)
    }
  }
  throw new Error('server did not come up')
}

interface TestClient {
  socket: WebSocket
  received: ServerPayload[]
  next(): Promise<ServerPayload>
}

const connect = (name: string, room: string): Promise<TestClient> =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(URL)
    const received: ServerPayload[] = []
    let joined = false
    socket.on('message', (data) => {
      received.push(JSON.parse(String(data)) as ServerPayload)
    })
    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'join', name, room }))
      joined = true
    })
    socket.on('error', reject)
    const pollJoin = (): void => {
      if (joined || socket.readyState === WebSocket.CLOSED) {
        resolve({
          socket,
          received,
          next: async () => {
            const deadline = Date.now() + 5000
            while (received.length === 0 && Date.now() < deadline) {
              await sleep(50)
            }
            if (received.length === 0) {
              throw new Error('timed out waiting for a payload')
            }
            return received.shift() as ServerPayload
          }
        })
        return
      }
      setTimeout(pollJoin, 20)
    }
    pollJoin()
  })

test('server handles joins, duplicates, messages, resends and history', async (t) => {
  const child: ChildProcess = spawn(
    path.join(ROOT, 'node_modules', '.bin', 'tsx'),
    ['src/server.ts'],
    {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'ignore'
    }
  )
  t.after(() => {
    child.kill()
  })
  await waitForHealth()

  const alice = await connect('Alice', 'qa')
  const history = await alice.next()
  assert.equal(history.type, 'history')

  const bob = await connect('Bob', 'qa')
  const bobHistory = await bob.next()
  assert.equal(bobHistory.type, 'history')

  const bobPresence = await bob.next()
  if (bobPresence.type === 'presence') {
    assert.deepEqual(bobPresence.names.sort(), ['Alice', 'Bob'])
  }

  const clone = await connect('Alice', 'qa')
  const cloneError = await clone.next()
  assert.equal(cloneError.type, 'error')
  clone.socket.close()

  alice.socket.send(JSON.stringify({ type: 'message', id: 'msg-1', body: 'hello bob' }))
  const atBob = await bob.next()
  let firstDelivery = 0
  if (atBob.type === 'message') {
    assert.equal(atBob.message.id, 'msg-1')
    assert.equal(atBob.message.body, 'hello bob')
    firstDelivery = 1
  } else {
    assert.fail('expected a message payload')
  }

  alice.socket.send(JSON.stringify({ type: 'message', id: 'msg-1', body: 'hello bob' }))
  await sleep(300)
  const redeliveries = bob.received.filter(
    (payload) => payload.type === 'message' && payload.message.id === 'msg-1'
  ).length
  assert.equal(firstDelivery + redeliveries, 1)

  bob.socket.close()
  await sleep(200)
  const rejoined = await connect('Bob', 'qa')
  const replay = await rejoined.next()
  if (replay.type === 'history') {
    assert.ok(replay.messages.some((entry) => entry.id === 'msg-1'))
  } else {
    assert.fail('expected history on rejoin')
  }
  rejoined.socket.close()
  alice.socket.close()
})
