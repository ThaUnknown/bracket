import type { EncryptedFile } from 'matrix-js-sdk/lib/types'

const name = 'AES-CTR'

export async function encryptAttachment (plaintextBuffer: ArrayBuffer): Promise<{ data: ArrayBuffer, info: Omit<EncryptedFile, 'url'>}> {
  // Generate an IV where the first 8 bytes are random and the high 8 bytes
  // are zero. We set the counter low bits to 0 since it makes it unlikely
  // that the 64 bit counter will overflow.
  const counter = new Uint8Array(16)
  crypto.getRandomValues(counter.subarray(0, 8))

  const cryptoKey = await crypto.subtle.generateKey({ name, length: 256 }, true, ['encrypt'])

  // Use half of the iv as the counter by setting the "length" to 64.
  const data = await crypto.subtle.encrypt({ name, counter, length: 64 }, cryptoKey, plaintextBuffer)

  return {
    data,
    info: {
      v: 'v2',
      key: await crypto.subtle.exportKey('jwk', cryptoKey) as { alg: string, key_ops: string[], kty: string, k: string, ext: boolean },
      iv: counter.toBase64({ omitPadding: true }),
      hashes: {
        sha256: new Uint8Array(await crypto.subtle.digest('SHA-256', data)).toBase64({ omitPadding: true })
      }
    }
  }
}

export async function decryptAttachment (ciphertextBuffer: ArrayBuffer, info: EncryptedFile): Promise<ArrayBuffer> {
  if (!info.key || !info.iv) throw new Error('Missing key info')

  if (info.v && !info.v.match(/^v[1-2]$/)) {
    throw new Error(`Unsupported version ${info.v}`)
  }

  // Version 1 and 2 use a 64 bit counter.
  // Version 0 uses a 128 bit counter.
  const length = !info.v ? 128 : 64

  return await crypto.subtle.decrypt(
    { name, length, counter: Uint8Array.fromBase64(info.iv) },
    await crypto.subtle.importKey('jwk', info.key, { name }, false, ['decrypt']),
    ciphertextBuffer
  )
}

export interface RangeRequest {
  originalStart: number
  originalEnd: number | undefined
  blockStart: number
  blockEnd: number | undefined
}

const AES_BLOCK_SIZE = 16

export function parseRangeHeader (rangeHeader: string | null): RangeRequest | undefined {
  if (!rangeHeader) return

  const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/)
  if (!rangeMatch?.[1]) return

  const originalStart = parseInt(rangeMatch[1], 10)
  const originalEnd = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : undefined

  return {
    originalStart,
    originalEnd,
    // Align to AES block boundaries
    blockStart: Math.floor(originalStart / AES_BLOCK_SIZE) * AES_BLOCK_SIZE,
    blockEnd: originalEnd !== undefined
      ? Math.ceil((originalEnd + 1) / AES_BLOCK_SIZE) * AES_BLOCK_SIZE - 1
      : undefined
  }
}

export function createDecryptionStream (
  info: EncryptedFile,
  byteOffset = 0,
  trimStart = 0,
  maxBytes?: number
) {
  const length = !info.v ? 128 : 64

  let buffer = new Uint8Array(0)
  let decryptedSoFar = 0
  let outputSoFar = 0
  let cryptoKey: CryptoKey

  const counter = Uint8Array.fromBase64(info.iv)
  const counterView = new DataView(counter.buffer, 8, 8)

  const enqueueOutput = (controller: TransformStreamDefaultController<Uint8Array<ArrayBuffer>>, decrypted: Uint8Array<ArrayBuffer>) => {
    const byteLength = decrypted.byteLength
    const outputStart = outputSoFar < trimStart ? Math.min(trimStart - outputSoFar, byteLength) : 0
    let outputEnd = byteLength

    if (maxBytes) {
      const remainingBytes = maxBytes - (outputSoFar + outputStart - trimStart)
      if (remainingBytes < outputEnd - outputStart) {
        outputEnd = outputStart + remainingBytes
      }
    }

    if (outputEnd > outputStart) {
      controller.enqueue(decrypted.subarray(outputStart, outputEnd))
    }

    return outputSoFar + byteLength
  }

  return new TransformStream({
    async start () {
      cryptoKey = await crypto.subtle.importKey('jwk', info.key, { name }, false, ['decrypt'])
    },

    async transform (chunk: Uint8Array<ArrayBuffer>, controller) {
      try {
        const newBuffer = new Uint8Array(buffer.length + chunk.length)
        newBuffer.set(buffer, 0)
        newBuffer.set(chunk, buffer.length)
        buffer = newBuffer

        const completeBlocks = Math.floor(buffer.length / AES_BLOCK_SIZE) * AES_BLOCK_SIZE
        if (!completeBlocks) return

        counterView.setBigUint64(0, BigInt(Math.floor((byteOffset + decryptedSoFar) / AES_BLOCK_SIZE)))

        const decrypted = new Uint8Array(await crypto.subtle.decrypt({ name, length, counter }, cryptoKey, buffer.subarray(0, completeBlocks)))

        decryptedSoFar += decrypted.byteLength
        outputSoFar = enqueueOutput(controller, decrypted)

        if (maxBytes && (outputSoFar - trimStart) >= maxBytes) {
          controller.terminate()
          return
        }

        buffer = buffer.subarray(completeBlocks)
      } catch (error) {
        controller.error(error)
      }
    },

    async flush (controller) {
      try {
        if (!buffer.length) return

        const padded = new Uint8Array(AES_BLOCK_SIZE)
        padded.set(buffer)

        counterView.setBigUint64(0, BigInt(Math.floor((byteOffset + decryptedSoFar) / AES_BLOCK_SIZE)))

        enqueueOutput(controller, new Uint8Array(await crypto.subtle.decrypt({ name, length, counter }, cryptoKey, padded)).subarray(0, buffer.length))
      } catch (error) {
        controller.error(error)
      }
    }
  })
}
