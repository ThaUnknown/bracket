<script lang='ts'>
  import type { RoomMessageLocationEventContent } from 'matrix-js-sdk/lib/types'

  export let content: RoomMessageLocationEventContent

  $: [, coords] = content.geo_uri.split(':') as [string, string]
  $: [lat, lon] = coords.split(',') as [string, string]
  $: googleMapsUrl = `https://maps.google.com/maps?q=${lat},${lon}&t=m&z=15&ie=UTF8&iwloc=&output=embed`
</script>

<iframe class='h-full' src={googleMapsUrl} seamless loading='lazy' referrerpolicy='no-referrer-when-downgrade' credentialless />
