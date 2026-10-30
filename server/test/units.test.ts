import test from 'node:test'
import assert from 'node:assert/strict'
import type { WebSocket } from 'ws'
import { RoomRegistry } from '../src/rooms'
import { MemoryStorage } from '../src/storage'
import { RecentIdsKeeper } from '../src/dedupe'
import type { ChatMessage } from '../src/protocol'

class FakeSocket {
  readyState = 1
  OPEN = 1
  sent: string[] = []
  send(data: string): void {
    this.sent.push(data)
  }
}

const asSocket = (fake: FakeSocket): WebSocket => fake as unknown as WebSocket

test('rooms track members and names per room', () => {
  const registry = new RoomRegistry()
  const a = asSocket(new FakeSocket())
  const b = asSocket(new FakeSocket())
  registry.join(a, 'Alice', 'ghana')
  registry.join(b, 'Bob', 'ghana')
  registry.join(asSocket(new FakeSocket()), 'Carol', 'kenya')
  assert.deepEqual(registry.namesIn('ghana').sort(), ['Alice', 'Bob'])
  assert.deepEqual(registry.namesIn('kenya'), ['Carol'])
})

test('rooms broadcast to everyone except the excluded socket', () => {
  const registry = new RoomRegistry()
  const a = asSocket(new FakeSocket())
  const b = asSocket(new FakeSocket())
  const c = asSocket(new FakeSocket())
  registry.join(a, 'Alice', 'ghana')
  registry.join(b, 'Bob', 'ghana')
  registry.join(c, 'Carol', 'kenya')
  registry.broadcast('ghana', { type: 'presence', room: 'ghana', names: [] }, a)
  assert.equal((a as unknown as FakeSocket).sent.length, 0)
  assert.equal((b as unknown as FakeSocket).sent.length, 1)
  assert.equal((c as unknown as FakeSocket).sent.length, 0)
})

test('leaving a room removes the member and empties the room', () => {
  const registry = new RoomRegistry()
  const a = asSocket(new FakeSocket())
  registry.join(a, 'Alice', 'ghana')
  registry.leave(a)
  assert.deepEqual(registry.namesIn('ghana'), [])
})

const message = (id: string, room: string): ChatMessage => ({
  id,
  room,
  sender: 'Alice',
  body: `body ${id}`,
  sentAt: new Date().toISOString()
})

test('memory storage returns the most recent messages up to the limit', async () => {
  const storage = new MemoryStorage()
  for (let i = 1; i <= 5; i += 1) {
    await storage.append(message(String(i), 'ghana'))
  }
  const history = await storage.history('ghana', 3)
  assert.deepEqual(history.map((entry) => entry.id), ['3', '4', '5'])
  const otherRoom = await storage.history('kenya', 10)
  assert.equal(otherRoom.length, 0)
})

test('recent ids keeper flags repeats and stays bounded', () => {
  const keeper = new RecentIdsKeeper()
  assert.equal(keeper.seen('ghana', 'a'), false)
  assert.equal(keeper.seen('ghana', 'a'), true)
  assert.equal(keeper.seen('kenya', 'a'), false)
  for (let i = 0; i < 300; i += 1) {
    keeper.seen('ghana', `id-${i}`)
  }
  assert.equal(keeper.seen('ghana', 'a'), false)
})
