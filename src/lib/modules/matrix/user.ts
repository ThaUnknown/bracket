import type { User } from 'matrix-js-sdk'

export function parse (userId: string) {
  const match = userId.match(/^@([^:]+):(.+)$/)
  if (!match) return null
  return { name: match[1], server: match[2] }
}

export function normalizeName (user: User, name = user.displayName) {
  if (name !== user.userId) return name
  const parsed = parse(user.userId)
  return parsed ? parsed.name : user.userId
}
