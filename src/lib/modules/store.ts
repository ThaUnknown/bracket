import type { Readable } from 'svelte/store'

// node:events once()-like for svelte stores
export function once<T> (store: Readable<T>, predicate: (value: T) => boolean): Promise<T> {
  return new Promise(resolve => {
    const unsubscribe = store.subscribe(currentValue => {
      if (predicate(currentValue)) {
        queueMicrotask(() => unsubscribe())
        resolve(currentValue)
      }
    })
  })
}

// like once, but waits until the current call stack is clear before subscribing, to avoid missing updates that happen immediately after calling oncelazy
export function oncelazy<T> (store: Readable<T>, predicate: (value: T) => boolean): Promise<T> {
  return new Promise(resolve => {
    queueMicrotask(() => {
      const unsubscribe = store.subscribe(currentValue => {
        if (predicate(currentValue)) {
          queueMicrotask(() => unsubscribe())
          resolve(currentValue)
        }
      })
    })
  })
}
