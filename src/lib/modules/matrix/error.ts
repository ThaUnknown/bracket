import type { MatrixError } from 'matrix-js-sdk'

// human readable error messages for common Matrix errors
export function readable (error: MatrixError) {
  return error.message.match(/\[\d+\] (.+?) \(/)?.[1] ?? error.message
}
