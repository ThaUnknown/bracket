import { sha256 } from '@noble/hashes/sha2.js'

import type { EncryptedFile } from 'matrix-js-sdk/lib/types'

const name = 'AES-CTR'

const CHUNK_SIZE = 64 * 1024 // 64 KiB — must be a multiple of 16 bytes (AES block size)

export function encryptAttachmentStream (rawStream: ReadableStream<Uint8Array>) {
  const counter = new Uint8Array(16)
  crypto.getRandomValues(counter.subarray(0, 8))
  const counterView = new DataView(counter.buffer, 8, 8)
  const iv = counter.slice().toBase64({ omitPadding: true })

  let cryptoKey: CryptoKey

  const info = Promise.withResolvers<EncryptedFile>()
  // this is highly unfortunate but Web Crypto doesn't support partial hashes
  const hasher = sha256.create()

  const reader = rawStream.getReader()

  let buffer = new Uint8Array(0)

  const stream = new ReadableStream<Uint8Array>({
    async start () {
      cryptoKey = await crypto.subtle.generateKey({ name, length: 256 }, true, ['encrypt', 'decrypt'])
    },
    async pull (controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()

          if (value) {
            // Append incoming bytes to the carry buffer
            const next = new Uint8Array(buffer.byteLength + value.byteLength)
            next.set(buffer)
            next.set(value, buffer.byteLength)
            buffer = next
          }

          // Flush all complete chunks, holding back a partial tail
          while (buffer.byteLength >= (done ? 1 : CHUNK_SIZE)) {
            const sliceEnd = done ? buffer.byteLength : CHUNK_SIZE
            const plainChunk = buffer.subarray(0, sliceEnd)
            buffer = buffer.subarray(sliceEnd)

            const cipherChunk = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CTR', counter, length: 64 }, cryptoKey, plainChunk))
            controller.enqueue(cipherChunk)
            hasher.update(cipherChunk)
            // Advance the counter by the number of AES blocks we just consumed.
            // Each block is 16 bytes; the counter occupies the low 8 bytes (bytes 8–15).
            counterView.setBigUint64(0, counterView.getBigUint64(0, false) + BigInt(plainChunk.byteLength / 16), false)
          }

          if (done) break
        }

        info.resolve({
          url: '',
          v: 'v2',
          key: await crypto.subtle.exportKey('jwk', cryptoKey) as { alg: string, key_ops: string[], kty: string, k: string, ext: boolean },
          iv,
          hashes: {
            sha256: hasher.digest().toBase64({ omitPadding: true })
          }
        })

        controller.close()
      } catch (err) {
        info.reject(err)
        controller.error(err)
      }
    }
  })

  return { stream, info: info.promise }
}

export async function encryptAttachment (raw: ArrayBuffer) {
  // Generate an IV where the first 8 bytes are random and the high 8 bytes
  // are zero. We set the counter low bits to 0 since it makes it unlikely
  // that the 64 bit counter will overflow.
  const counter = new Uint8Array(16)
  crypto.getRandomValues(counter.subarray(0, 8))

  const cryptoKey = await crypto.subtle.generateKey({ name, length: 256 }, true, ['encrypt', 'decrypt'])

  // Use half of the iv as the counter by setting the "length" to 64.
  const data = await crypto.subtle.encrypt({ name, counter, length: 64 }, cryptoKey, raw)

  return {
    data,
    info: {
      url: '',
      v: 'v2',
      key: await crypto.subtle.exportKey('jwk', cryptoKey) as { alg: string, key_ops: string[], kty: string, k: string, ext: boolean },
      iv: counter.toBase64({ omitPadding: true }),
      hashes: {
        sha256: new Uint8Array(await crypto.subtle.digest('SHA-256', data)).toBase64({ omitPadding: true })
      }
    } satisfies EncryptedFile
  }
}

export async function decryptAttachment (ciphertextBuffer: ArrayBuffer, info: EncryptedFile) {
  if (!info.key || !info.iv) throw new Error('Missing key info')
  if (info.v && !info.v.match(/^v[1-2]$/)) throw new Error(`Unsupported version ${info.v}`)

  return await crypto.subtle.decrypt(
    { name, length: !info.v ? 128 : 64, counter: Uint8Array.fromBase64(info.iv) },
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
