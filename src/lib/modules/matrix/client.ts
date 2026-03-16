import { createClient, IndexedDBStore, type MatrixClient, type LoginResponse, ClientEvent, type Room, SyncState, EventType, type UploadResponse, type Upload, MediaPrefix, Method, MsgType, MatrixError, type User, RoomStateEvent, RelationType, JoinRule } from 'matrix-js-sdk'
import { CryptoEvent } from 'matrix-js-sdk/lib/crypto-api'
import { removeElement } from 'matrix-js-sdk/lib/utils'
import { readable } from 'simple-store-svelte'
import { derived, type Readable } from 'svelte/store'

import { asyncify, constructor } from '../async.ts'
import { once, oncelazy } from '../store.ts'

import { encryptAttachment, encryptAttachmentStream } from './attachment/crypto.ts'
import { currentverified } from './devices.ts'
import { buildSpaceTree, isSpace, isVideo } from './room.ts'
import { secretStorageKeys } from './secrets.ts'

import type { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces'
import type { ISyncStateData } from 'matrix-js-sdk/lib/sync'
import type { EncryptedFile, FileContent, RoomMessageEventContent } from 'matrix-js-sdk/lib/types'

import { wellknown } from '$lib/state'
import { MapWithDefault } from '$lib/utils'

export interface RoomsByType {
  dms: Map<string, Room>
  spaces: Map<string, Room>
  channels: Map<string, Room>
  servers: Map<string, Room>
  children: Map<string, string[]>
}

export interface GroupedRooms {
  childToServer: Map<string, Room>
  serverToSpace: Map<string, Set<Room>>
  serverToRoom: Map<string, Set<Room>>
  spaceToRoom: Map<string, Set<Room>>
}

export type ClientInstance = Awaited<InstanceType<typeof MatrixChatClient>>

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
      fetchFn: (url, init) => {
        if (init?.body instanceof ReadableStream) {
          // @ts-expect-error all good typescript, this feature is ONLY 4 years old!
          init.duplex = 'half'
        }
        if (typeof url !== 'string' && 'body' in url && url.body instanceof ReadableStream) {
          // @ts-expect-error all good typescript, this feature is ONLY 4 years old!
          url.duplex = 'half'
        }
        return fetch(url, init)
      },
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
      if (c['m.homeserver']?.base_url) wellknown.set(c)
    })

    const getPollTimeout = () => ['cellular', 'unknown'].includes(navigator.connection?.type || '') ? 5_000 : 30_000

    navigator.connection?.addEventListener('change', () => {
        // @ts-expect-error there's not a way to update the timeout for the sync client once network changes... eh... pathetic
        this.matrix.syncApi!.opts.pollTimeout = getPollTimeout()
    }, this.ctrl)

    await this.matrix.initRustCrypto()
    await this.store.startup()
    // TODO: does this need to block client creation?
    // TODO: increase initial sync limit, once a custom IDB store is made, as the current one DOES NOT CACHE EVENTS
    await this.matrix.startClient({ lazyLoadMembers: true, threadSupport: true, clientWellKnownPollPeriod: 60 * 60 * 2, initialSyncLimit: 1, pollTimeout: getPollTimeout() })
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

  currentverified = readable(false, set => {
    const update = () => currentverified(this.matrix).then(set)
    update()

    this.matrix.on(CryptoEvent.DevicesUpdated, update)
    return () => this.matrix.off(CryptoEvent.DevicesUpdated, update)
  })

  // ROOMS

  rooms = readable<Record<string, Room>>({}, set => {
    // @ts-expect-error private field access
    const update = () => set(this.store.rooms)
    update()

    this.matrix.on(ClientEvent.Room, update)
    this.matrix.on(ClientEvent.DeleteRoom, update)
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

  roomtypes = derived([this.rooms, this._dmsIds, this.localstate], ([$rooms, $dmsIDs, $localSyncState], set: (value: RoomsByType) => void) => {
    const dms = new Map<string, Room>()
    const servers = new Map<string, Room>()
    const channels = new Map<string, Room>()
    const spaces = new Map<string, Room>()
    let children = new Map<string, string[]>()

    // if local data is still being loaded, don't even try to categorize rooms as it causes all sorts of errors
    if (this.matrix.isInitialSyncComplete() || $localSyncState === SyncState.Syncing || $localSyncState === SyncState.Prepared) {
      // dms, spaces, rooms
      for (const room of Object.values($rooms).sort((a, b) => b.currentState.getLastModifiedTime() - a.currentState.getLastModifiedTime())) {
        if ($dmsIDs.has(room.roomId) || isVideo(room)) dms.set(room.roomId, room)
        else if (isSpace(room)) servers.set(room.roomId, room)
        else {
          channels.set(room.roomId, room)
          if (room.currentState.getJoinRule() === JoinRule.Invite) {
            dms.set(room.roomId, room)
          } else {
            servers.set(room.roomId, room)
          }
        }
      }

      const tree = buildSpaceTree(servers)
      children = tree.children

      for (const space of servers.values()) {
        if (tree.roots.has(space.roomId)) continue
        spaces.set(space.roomId, space)
        servers.delete(space.roomId)
      }
    }

    set({ dms, spaces, channels, servers, children })

    return () => {
      dms.clear()
      servers.clear()
      channels.clear()
      spaces.clear()
      children.clear()
    }
  })

  groupedrooms = derived(this.roomtypes, ($roomtypes, set: (value: GroupedRooms) => void) => {
    const { spaces, channels, servers, children } = $roomtypes

    // server -> space/room -> room
    // child ID to server Room
    const childToServer = new Map<string, Room>()
    // space ID to server Room
    const serverToSpace = new MapWithDefault<string, Set<Room>>(() => new Set())
    // room ID to server Room
    const serverToRoom = new MapWithDefault<string, Set<Room>>(() => new Set())
    // room ID to space Room
    const spaceToRoom = new MapWithDefault<string, Set<Room>>(() => new Set())

    // Assign channels to their direct space parent.

    for (const space of spaces.values()) {
      for (const childId of children.get(space.roomId) ?? []) {
        if (channels.has(childId)) spaceToRoom.get(space.roomId).add(channels.get(childId)!)
      }
    }

    // Traverse each server tree so every descendant can resolve back to its root server.
    // Only channels directly under the server should appear in `serverToRoom`.
    for (const server of servers.values()) {
      const queue = [server]
      const visited = new Set<string>()

      while (queue.length > 0) {
        const currentSpace = queue.shift()!
        if (visited.has(currentSpace.roomId)) continue
        visited.add(currentSpace.roomId)

        for (const childId of children.get(currentSpace.roomId) ?? []) {
          childToServer.set(childId, server)

          if (channels.has(childId)) {
            if (currentSpace.roomId === server.roomId) {
              serverToRoom.get(server.roomId).add(channels.get(childId)!)
            }
          } else if (spaces.has(childId)) {
            serverToSpace.get(server.roomId).add(spaces.get(childId)!)
            queue.push(spaces.get(childId)!)
          }
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

  // TODO: this might not update when members are lazy loaded? that needs to be verified for stuff like read receipts and reactions
  users = readable<Map<string, User>>(new Map(), set => {
    // @ts-expect-error private field access
    const update = () => set(new Map(Object.entries(this.store.users)))
    update()

    // this.matrix.on(RoomStateEvent.Update, update)
    this.matrix.on(RoomStateEvent.Members, update)
    this.matrix.on(RoomStateEvent.NewMember, update)
    return () => {
      this.matrix.off(RoomStateEvent.Members, update)
      this.matrix.off(RoomStateEvent.NewMember, update)
    }
  })

  hierarchy (room: string, limit = 50, maxDepth = 5, includeAllRooms = false): Readable<{ done: boolean, rooms: IHierarchyRoom[] }> {
    return readable<{ done: boolean, rooms: IHierarchyRoom[] }>({ done: false, rooms: [] }, (set, update) => {
      let cancelled = false
      const load = async (next?: string) => {
        try {
          const chunk = await this.matrix.getRoomHierarchy(room, limit, maxDepth, includeAllRooms, next)
          update(prev => ({ done: !chunk.next_batch, rooms: [...prev.rooms, ...chunk.rooms] }))
          if (chunk.next_batch && !cancelled) await load(chunk.next_batch)
        } catch (error) {
          console.error('Failed to load room hierarchy', error)
        }
      }

      load()

      return () => { cancelled = true }
    })
  }

  async loadroom (roomId: string) {
    const room = await Promise.race([
      once(this.rooms, r => r[roomId] !== undefined),
      this.prepared
    ])

    if (typeof room === 'object') return room[roomId]
  }

  // store for a single room which updates on state changes
  room (room: Room) {
    return readable(room, set => {
      const update = () => set(room)

      room.on(RoomStateEvent.Update, update)
      return () => room.off(RoomStateEvent.Update, update)
    })
  }

  members (room: Room) {
    const get = () => room.currentState.members

    return readable(get(), set => {
      const update = () => set(get())
      room.on(RoomStateEvent.Members, update)
      room.on(RoomStateEvent.NewMember, update)
      return () => {
        room.off(RoomStateEvent.Members, update)
        room.off(RoomStateEvent.NewMember, update)
      }
    })
  }

  async event (room: Room, eventId: string) {
    const event = room.findEventById(eventId)
    if (event) return event
    await this.matrix.getEventTimeline(room.getUnfilteredTimelineSet(), eventId)
    return room.findEventById(eventId)
  }

  jump (room: Room, eventId: string) {
    return this.matrix.getEventTimeline(room.getUnfilteredTimelineSet(), eventId)
  }

  async uploadFile (file: File, info: Promise<EncryptedFile> | EncryptedFile, body: BodyInit, abortController: AbortController) {
    const upload: Upload = {
      loaded: 0,
      total: 0,
      abortController,
      promise: this.matrix.http.authedRequest<UploadResponse>(Method.Post, '/upload', { filename: file.name }, body, {
        prefix: MediaPrefix.V3,
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        abortSignal: abortController.signal
      })
    }
    // @ts-expect-error private field access
    this.matrix.http.uploads.push(upload)
    try {
      const { content_uri: mxc } = await upload.promise

      const encryptInfo = await info
      encryptInfo.url = mxc

      return {
        msgtype: MsgType.File,
        body: file.name,
        url: mxc,
        file: encryptInfo
      } satisfies FileContent
    } finally {
      // @ts-expect-error private field access
      removeElement(this.matrix.http.uploads, (elem) => elem === upload)
    }
  }

  async createFile (file: File, ctrl: AbortController) {
    try {
      try {
        // so what if we didn't use a gazzillion megabytes of memory?
        // every matrix client ever: "how about no!"
        const { stream, info } = encryptAttachmentStream(file.stream())
        return await this.uploadFile(file, info, stream, ctrl)
      } catch (error) {
        // but the server will stop you too!
        if (!(error instanceof MatrixError) || error.error !== 'Request must specify a Content-Length') throw error
        const { data, info } = await encryptAttachment(await file.arrayBuffer())
        return await this.uploadFile(file, info, data, ctrl)
      }
    } catch (error) {
      ctrl.abort(error)
      throw error
    }
  }

  // state safe sendMessage wrapper
  async message (roomId: string, content: RoomMessageEventContent, txnId?: string) {
    await this.prepared
    return await this.matrix.sendMessage(roomId, content, txnId)
  }

  async delete (roomId: string, eventId: string) {
    await this.prepared
    return await this.matrix.redactEvent(roomId, eventId)
  }

  async react (roomId: string, eventId: string, key: string) {
    await this.prepared
    return await this.matrix.sendEvent(roomId, EventType.Reaction, {
      'm.relates_to': {
        rel_type: RelationType.Annotation,
        event_id: eventId,
        key
      }
    })
  }

  // this wasn't a good idea
  // https://matrix.to/#/!mUyEUun5Pr1cYeDwbz9A1byEPvRNy5Bzd1f-tp_jrKg/$_-YQaadhkie9flVBEoNQ5iR-cNNsGAwzAYNDZRxktcM?via=matrix.org&via=synzv.com&via=justin.directory
  // async _makeRoomFilter (timeline: IRoomEventFilter) {
  //   await this.restored
  //   const filter = new Filter(this.matrix.getSafeUserId())
  //   filter.setDefinition({
  //     room: { timeline }
  //   })

  //   filter.filterId = await this.matrix.getOrCreateFilter('room-filter-' + this.matrix.credentials.userId, filter)
  //   return filter
  // }

  // messageFilter = this._makeRoomFilter({
  //   types: ['m.room.message', 'm.room.encrypted']
  // })
})
