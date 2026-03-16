<script lang='ts' context='module'>
  type JsonPath = string | readonly string[]

  const isJsonObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  const getPathValue = (object: Record<string, unknown>, path: JsonPath) => {
    if (typeof path === 'string') return object[path]

    let value: unknown = object
    for (const key of path) {
      if (!isJsonObject(value)) return undefined
      value = value[key]
    }

    return value
  }

  type JsonExpectedType = 'string' | 'number' | 'boolean'

  interface JsonExpectedTypeMap {
    string: string
    number: number
    boolean: boolean
  }

  export function sanitizeType<TExpected extends JsonExpectedType = 'string'> (
    object: unknown,
    keys: JsonPath[],
    expectedType: TExpected = 'string' as TExpected
  ): JsonExpectedTypeMap[TExpected] | undefined {
    if (!isJsonObject(object)) return undefined

    for (const path of keys) {
      const value = getPathValue(object, path)
      // eslint-disable-next-line valid-typeof
      if (typeof value === expectedType) return value as JsonExpectedTypeMap[TExpected]
    }

    return undefined
  }
</script>

<script lang='ts'>
  import type { User } from 'matrix-js-sdk'

  import { Image } from '$lib/components/image'
  import { mxcToHttp } from '$lib/modules/matrix/attachment/url'
  import { getClient } from '$lib/state'
  import { cn } from '$lib/utils'

  export let user: User

  const client = getClient()

  $: avatar = mxcToHttp(user.avatarUrl)

  $: name = user.displayName || user.userId

  let banner: string | undefined
  let timeZone: string | undefined
  let statusEmoji: string | undefined
  let statusMessage = user.presenceStatusMsg
  let bio: string | undefined
  let color: string | undefined

  function updateProfileInfo (info: Record<string, unknown>) {
    banner = mxcToHttp(sanitizeType(info, ['m.profile_banner', 'm.banner', 'chat.commet.profile_banner']))
    timeZone = sanitizeType(info, ['m.tz', 'us.cloke.msc4175.tz'])
    statusEmoji = sanitizeType(info, [['m.status', 'emoji'], ['org.msc.4426.status', 'emoji']])
    statusMessage = sanitizeType(info, [['m.status', 'text'], ['org.msc.4426.status', 'text'], ['chat.commet.profile_status']])
    bio = sanitizeType(info, ['m.bio', 'moe.sable.app.bio', ['chat.commet.profile_bio', 'formatted_body']])
    color = sanitizeType(info, ['m.color', ['chat.commet.profile_color_scheme', 'color']])
  }

  // can fail if home server blocks cross federation profile requests
  $: client.matrix.getExtendedProfile(user.userId).then(updateProfileInfo).catch(console.debug)

// TODO: show client._unstable_getSharedRooms()
</script>

<div class='p-1 m-3 rounded-md shadow root-bg border-none w-auto' style='--theme-base-color: {color || '#000'}'>
  <div class='w-75 rounded core-bg gap-2 flex flex-col pb-2'>
    <div class={cn('w-full h-22 relative p-3 flex items-end rounded-t', !banner && 'bg-white/10')}>
      {#if banner}
        <Image src={banner} alt='banner' class='absolute top-0 left-0 size-full rounded-t opacity-50 pointer-events-none object-cover' />
      {/if}
      <Image class='size-16 rounded-full relative' src={avatar} alt={name} />
      <div class='min-w-0 flex flex-col pl-3 relative'>
        <div class='text-nowrap font-extrabold pb-0.5 text-xl text-ellipsis overflow-clip pr-0.5'>
          {name}
        </div>
        <div class='details text-neutral-200 flex text-xs'>
          <span class='text-nowrap items-center select-all text-ellipsis overflow-hidden block'>{user.userId}</span>
        </div>
      </div>
      {#if statusMessage || statusEmoji}
        <div class='-left-3 -top-9 absolute text-xs'>
          <div class='px-3 py-1.5 rounded-2xl bg-mix bubbles relative leading-tight'>
            <span class='text-contrast-filter'>
              {statusEmoji ?? ''} {statusMessage ?? ''}
            </span>
          </div>
        </div>
      {/if}
    </div>
    <div class='w-full max-h-50 text-sm py-2 px-4 overflow-y-auto overflow-x-clip whitespace-pre-wrap wrap-break-word'>
      {bio}
    </div>
    <div class='details text-neutral-200 flex text-[11px] px-4'>
      <span class='text-nowrap flex items-center'>{timeZone}</span>
    </div>
  </div>
</div>

<style>
  :global(.root-bg) {
    background: linear-gradient(var(--theme-base-color, #000), rgb(34, 33, 30))
  }
  .core-bg {
    background: color-mix(in oklab, #141414 30%, var(--theme-base-color, #000) 100%);
  }
  .bg-mix {
    background: color-mix(in oklab, #fff 100%, var(--theme-base-color, #000) 50%);
  }
  .bubbles::before {
    top: 31.5px;
    left: 7.5px;
    height: 15px;
    width: 15px;
    background: inherit;
    content: '';
    position: absolute;
    border-radius: 50%;
  }
  .bubbles::after {
    top: 52.5px;
    left: 15px;
    height: 7.5px;
    width: 7.5px;
    background: inherit;
    content: '';
    position: absolute;
    border-radius: 50%;
  }
</style>
