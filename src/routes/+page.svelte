<script lang='ts'>
  import { goto } from '$app/navigation'

  export let data

  goto(!data.verified ? '/#/auth/verify/' : '/#/app/')
</script>
