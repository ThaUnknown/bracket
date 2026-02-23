<script lang='ts'>
  import { createClient } from 'matrix-js-sdk'

  import { goto } from '$app/navigation'
  import { Button } from '$lib/components/ui/button'
  import { registration, sso } from '$lib/modules/matrix/auth'
  import { baseURL } from '$lib/modules/matrix/discovery'
  import { readable } from '$lib/modules/matrix/error'
  import { session } from '$lib/state'

  const discovery = 'https://matrix.org'

  const mode = 'register'

  $: if ($session) goto('/#/auth/verify/', { invalidateAll: true })
</script>

<div>
  {#await baseURL(discovery)}
    Loading...
  {:then baseUrl }
    {@const client = createClient({ baseUrl })}

    {#await client.loginFlows()}
      Loading...
    {:then flows}
      {#each flows.flows as { type }, i (i)}
        {#if type === 'm.login.sso'}
          <Button on:click={() => sso(client)}>SSO</Button>
        {:else if type === 'm.login.password'}
          <Button>Password</Button>
        {/if}
      {/each}
    {:catch error}
      {error.message}
    {/await}

    {#if mode === 'register'}
      {#await registration(client)}
        Loading...
      {:then supportsRegistration}
        {#if supportsRegistration}
          <Button>Register</Button>
        {/if}
      {:catch error}
        {readable(error)}
      {/await}
    {/if}
  {:catch error}
    {readable(error)}
  {/await}
</div>
