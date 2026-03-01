import { clsx, type ClassValue } from 'clsx'
import { readable } from 'simple-store-svelte'
import { twMerge } from 'tailwind-merge'

export function cn (...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null }

export class MapWithDefault<K, V> extends Map<K, V> {
  defaultFactory
  constructor (defaultFactory: (key: K) => V, entries?: ReadonlyArray<readonly [K, V]> | null) {
    super(entries)
    this.defaultFactory = defaultFactory
  }

  get (key: K): V {
    return super.get(key) ?? (() => {
      const v = this.defaultFactory(key)
      this.set(key, v)
      return v
    })()
  }
}

const colorSchemeMatch = (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)')) as MediaQueryList

export const colorScheme = readable(colorSchemeMatch.matches ? 'dark' : 'light', set => {
  const listener = (e: MediaQueryListEvent) => set(e.matches ? 'dark' : 'light')
  colorSchemeMatch.addEventListener('change', listener)
  return () => colorSchemeMatch.removeEventListener('change', listener)
})
