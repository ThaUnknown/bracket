import { createClient, IndexedDBStore, type MatrixClient, type LoginResponse, ClientEvent, type Room, SyncState, EventType, RoomType } from 'matrix-js-sdk'
import { readable } from 'simple-store-svelte'
import { derived } from 'svelte/store'

import { asyncify, constructor } from '../async.ts'
import { once, oncelazy } from '../store.ts'

import { cacheConfig } from './discovery.ts'
import { spaceChildren } from './room.ts'
import { secretStorageKeys } from './secrets.ts'

import type { ISyncStateData } from 'matrix-js-sdk/lib/sync'

export interface RoomsByType {
  dms: Map<string, Room>
  spaces: Map<string, Room>
  channels: Map<string, Room>
  servers: Map<string, Room>
}

export interface GroupedRooms {
  childToServer: Map<string, Room>
  serverToSpace: Map<string, Set<Room>>
  serverToRoom: Map<string, Set<Room>>
  spaceToRoom: Map<string, Set<Room>>
}

// This contains things reliant on state, alongside with state handling

export const MatrixChatClient = asyncify(class MatrixChatClient {
  matrix!: MatrixClient
  store = new IndexedDBStore({
    indexedDB,
    localStorage,
    dbName: 'web-sync-store-v1'
  })

  ctrl = new AbortController()

  async [constructor] (session: LoginResponse, baseUrl: string) {
    this.matrix = createClient({
      baseUrl,
      accessToken: session.access_token,
      userId: session.user_id,
      store: this.store,
      deviceId: session.device_id,
      timelineSupport: true,
      cryptoCallbacks: {
        getSecretStorageKey: async ({ keys }) => {
          const defaultKeyId = await this.matrix.secretStorage.getDefaultKeyId()
          const keyId = secretStorageKeys.has(defaultKeyId!) ? defaultKeyId : Object.keys(keys).find(e => secretStorageKeys.has(e))

          const key = secretStorageKeys.get(keyId!)
          if (key) return [keyId!, key]
          // TODO: panic!!!
          return [] as unknown as [string, Uint8Array<ArrayBuffer>]
        },
        cacheSecretStorageKey (keyId, keyInfo, privateKey) {
          secretStorageKeys.set(keyId, privateKey)
        }
      },
      useE2eForGroupCall: true,
      useLivekitForGroupCalls: true,
      disableVoip: false,
      fallbackICEServerAllowed: true,
      forceTURN: false
    })

    this.matrix.on(ClientEvent.ClientWellKnown, c => {
      if (c['m.homeserver']?.base_url) cacheConfig(c)
    })

    const getPollTimeout = () => ['cellular', 'unknown'].includes(navigator.connection?.type || '') ? 5_000 : 30_000

    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        // @ts-expect-error there's not a way to update the timeout for the sync client once network changes... eh... pathetic
        this.matrix.syncApi!.opts.pollTimeout = getPollTimeout()
      }, this.ctrl)
    }

    await Promise.allSettled([
      this.store.startup(),
      this.matrix.initRustCrypto(),
      this.matrix.getVersions(), // TODO: does this need to block client creation?
      this.matrix.startClient({ lazyLoadMembers: true, threadSupport: true, clientWellKnownPollPeriod: 60 * 60 * 2, initialSyncLimit: 50, pollTimeout: getPollTimeout() }) // TODO: does this need to block client creation?
    ])
    console.log('created')
  }

  destroy () {
    if (!this.matrix.clientRunning) return
    console.log('stopping client')
    this.matrix.stopClient()
    this.matrix.removeAllListeners()
  }

  [Symbol.dispose] () {
    this.destroy()
  }

  // STATE

  // this a true remote sync state which discards any local cache states, and only resolves once fully caught up with the server
  remotestate = readable<SyncState>(SyncState.Reconnecting, set => {
    const update = (state: SyncState, old: SyncState | null, isync?: ISyncStateData) => {
      // isync is actually never null according to the source code
      if (!isync || isync.catchingUp || isync.fromCache) return
      set(state)
    }
    this.matrix.on(ClientEvent.Sync, update)
    return () => this.matrix.off(ClientEvent.Sync, update)
  })

  localstate = readable<SyncState>(SyncState.Reconnecting, set => {
    const update = (state: SyncState) => set(state)
    this.matrix.on(ClientEvent.Sync, update)
    return () => this.matrix.off(ClientEvent.Sync, update)
  })

  prepared = oncelazy(this.remotestate, s => s === SyncState.Prepared)

  restored = oncelazy(this.localstate, s => s === SyncState.Prepared || s === SyncState.Syncing)

  // ROOMS

  rooms = readable<Record<string, Room>>({}, set => {
    // @ts-expect-error private field access
    const update = () => set(this.store.rooms)
    this.matrix.on(ClientEvent.Room, update)
    this.matrix.on(ClientEvent.DeleteRoom, update)

    update()

    return () => {
      this.matrix.off(ClientEvent.Room, update)
      this.matrix.off(ClientEvent.DeleteRoom, update)
    }
  })

  _dmsIds = readable(new Set<string>(), set => {
    const update = () => {
      const directs = this.matrix.getAccountData(EventType.Direct)
      if (!directs) return
      const content: string[][] = Object.values(directs.getContent())
      set(new Set<string>(content.flat()))
    }
    update()
    this.matrix.on(ClientEvent.AccountData, update)

    return () => this.matrix.off(ClientEvent.AccountData, update)
  })

  roomtypes = derived<[typeof this.rooms, typeof this._dmsIds, typeof this.localstate], RoomsByType>([this.rooms, this._dmsIds, this.localstate], ([$rooms, $dmsIDs, $localSyncState], set) => {
    const dms = new Map<string, Room>()
    const servers = new Map<string, Room>()
    const channels = new Map<string, Room>()
    const spaces = new Map<string, Room>()

    // if local data is still being loaded, don't even try to categorize rooms as it causes all sorts of errors
    if (this.matrix.isInitialSyncComplete()) {
      // dms, spaces, rooms
      for (const room of Object.values($rooms)) {
        if ($dmsIDs.has(room.roomId)) dms.set(room.roomId, room)
        else if (room.getType() === RoomType.Space) servers.set(room.roomId, room)
        else channels.set(room.roomId, room)
      }

      // TODO: is spaceChildren recursive? or is it shallow? if it's shallow this code is wrong

      // actually create servers and spaces list.
      for (const server of servers.values()) {
        for (const childId of spaceChildren(server)) {
          // verify that is root server
          if (!servers.has(childId)) continue
          spaces.set(childId, servers.get(childId)!)
          servers.delete(childId)
        }
      }
    }

    set({ dms, spaces, channels, servers })

    return () => {
      dms.clear()
      servers.clear()
      channels.clear()
      spaces.clear()
    }
  })

  groupedrooms = derived<typeof this.roomtypes, GroupedRooms>(this.roomtypes, ($roomtypes, set) => {
    const { spaces, channels, servers } = $roomtypes

    // server -> space/room -> room
    // child ID to server Room
    const childToServer = new Map<string, Room>()
    // space ID to server Room
    const serverToSpace = new Map<string, Set<Room>>()
    // room ID to server Room
    const serverToRoom = new Map<string, Set<Room>>()
    // room ID to space Room
    const spaceToRoom = new Map<string, Set<Room>>()

    const get = (roomId: string, map: Map<string, Set<Room>>) => map.get(roomId) ?? (() => {
      const s = new Set<Room>()
      map.set(roomId, s)
      return s
    })()

    // TODO: is spaceChildren recursive? or is it shallow? if it's shallow this code is wrong
    // TODO: if there is a way to easily determine the parent space/server of a room the complexity of this would plummet

    for (const space of spaces.values()) {
      for (const childId of spaceChildren(space)) {
        if (channels.has(childId)) get(space.roomId, spaceToRoom).add(channels.get(childId)!)
      }
    }

    for (const server of servers.values()) {
      for (const childId of spaceChildren(server)) {
        childToServer.set(childId, server)
        if (channels.has(childId)) {
          get(server.roomId, serverToRoom).add(channels.get(childId)!)
        } else if (spaces.has(childId)) {
          get(server.roomId, serverToSpace).add(spaces.get(childId)!)
        }
      }
    }

    set({ childToServer, serverToSpace, serverToRoom, spaceToRoom })

    return () => {
      childToServer.clear()
      serverToSpace.clear()
      serverToRoom.clear()
      spaceToRoom.clear()
    }
  })

  async room (roomId: string) {
    const room = await Promise.race([
      once(this.rooms, r => r[roomId] !== undefined),
      this.prepared
    ])

    if (typeof room === 'object') return room[roomId]
  }
})
