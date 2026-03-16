<script lang='ts'>
  import Profile from './profile.svelte'

  import type { User } from 'matrix-js-sdk'

  import { Image } from '$lib/components/image'
  import * as Popover from '$lib/components/ui/nativepopover'
  import { mxcToHttp } from '$lib/modules/matrix/attachment/url'

  export let user: User
  export let overrideName: string | undefined = undefined

  $: src = mxcToHttp(user.avatarUrl)
</script>

<Popover.Root>
  <Popover.Trigger class='flex items-center gap-3 max-w-full no-scale'>
    <Image class='size-8 rounded-full bg-muted' {src} alt={overrideName || user.displayName} />
    <div class='text-nowrap text-ellipsis overflow-hidden font-med'>
      {overrideName || user.displayName}
    </div>
  </Popover.Trigger>
  <Popover.Content class='select-none! w-full'>
    <Profile {user} />
  </Popover.Content>
</Popover.Root>
