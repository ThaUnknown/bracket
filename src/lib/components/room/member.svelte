<script lang='ts'>
  import Pending from '../user/pending.svelte'

  import type { RoomMember, User as MatrixUser } from 'matrix-js-sdk'

  import { User } from '$lib/components/user'

  export let member: RoomMember
  export let user: MatrixUser | undefined
</script>

{#if user}
  <User {user} overrideName={member.rawDisplayName} />
{:else}
  <Pending {member} />
{/if}
