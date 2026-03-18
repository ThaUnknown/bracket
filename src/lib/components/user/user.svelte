<script lang='ts'>
  import Profile from './profile.svelte'

  import type { User } from 'matrix-js-sdk'

  import { Image } from '$lib/components/image'
  import * as Popover from '$lib/components/ui/nativepopover'
  import { mxcToHttp } from '$lib/modules/matrix/attachment/url'
  import { normalizeName } from '$lib/modules/matrix/user'

  export let user: User
  export let overrideName: string | undefined = undefined

  $: src = mxcToHttp(user.avatarUrl)

  $: name = normalizeName(user, overrideName)
</script>

<Popover.Root>
  <Popover.Trigger class='flex items-center gap-2.5 max-w-full no-scale hover:bg-foreground hover:text-foreground dark:hover:bg-foreground/10 w-full rounded-[6px] px-1.5 py-1 cursor-pointer'>
    <Image class='size-6 rounded-full bg-muted text-xs' {src} alt={name} />
    <div class='text-nowrap text-ellipsis overflow-hidden font-medium text-xs'>
      {name}
    </div>
  </Popover.Trigger>
  <Popover.Content>
    <Profile {user} />
  </Popover.Content>
</Popover.Root>
