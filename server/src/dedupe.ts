import { DEDUPE_IDS_KEPT_PER_ROOM } from './constants'

export class RecentIdsKeeper {
  private idsByRoom = new Map<string, string[]>()

  seen(room: string, id: string): boolean {
    const ids = this.idsByRoom.get(room) ?? []
    if (ids.includes(id)) {
      return true
    }
    ids.push(id)
    if (ids.length > DEDUPE_IDS_KEPT_PER_ROOM) {
      ids.splice(0, ids.length - DEDUPE_IDS_KEPT_PER_ROOM)
    }
    this.idsByRoom.set(room, ids)
    return false
  }
}
