export function parse (userId: string) {
  const match = userId.match(/^@([^:]+):(.+)$/)
  if (!match) return null
  return { name: match[1], server: match[2] }
}
