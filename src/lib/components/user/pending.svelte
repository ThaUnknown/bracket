<script lang='ts'>
  import type { RoomMember } from 'matrix-js-sdk'

  import * as Popover from '$lib/components/ui/nativepopover'
  import { getClient } from '$lib/state'

  export let member: RoomMember

  const client = getClient()

  function loadUser () {
    return client.matrix.getUser(member.userId)
  }
</script>

<Popover.Root>
  <Popover.Trigger class='flex items-center gap-3 max-w-full' onclick={loadUser}>
    <div />
    <div class='text-nowrap text-ellipsis overflow-hidden font-med'>
      {member.rawDisplayName}
    </div>
  </Popover.Trigger>
  <Popover.Content class='select-none! w-full'>
    <div class='animate-spin inline-block size-6 border-3 border-primary border-t-transparent rounded-[999px] text-primary' role='status' aria-label='loading'>
      <span class='sr-only'>Loading...</span>
    </div>
  </Popover.Content>
</Popover.Root>
