// if you're thinking about using global state, think again

import { persisted } from 'svelte-persisted-store'

import type { LoginResponse } from 'matrix-js-sdk'

export const session = persisted<LoginResponse | null>('session', null)
