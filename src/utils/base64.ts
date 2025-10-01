const globalRef: any = typeof globalThis !== 'undefined'
  ? globalThis
  : typeof window !== 'undefined'
  ? window
  : typeof self !== 'undefined'
  ? self
  : {}

const hasNodeBuffer = typeof globalRef.Buffer !== 'undefined'
const hasBtoa = typeof globalRef.btoa === 'function'
const hasAtob = typeof globalRef.atob === 'function'

/**
 * Convert an ArrayBuffer to a base64 string without relying on Node's Buffer in the browser.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (hasNodeBuffer) {
    return globalRef.Buffer.from(buffer).toString('base64')
  }

  if (hasBtoa) {
    const bytes = new Uint8Array(buffer)
    const chunkSize = 0x8000
    let binary = ''

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize)
      let chunkStr = ''
      for (let j = 0; j < slice.length; j++) {
        chunkStr += String.fromCharCode(slice[j])
      }
      binary += chunkStr
    }

    return globalRef.btoa(binary)
  }

  throw new Error('No base64 encoder available in this environment')
}

/**
 * Convert a base64 string into an ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (hasNodeBuffer) {
    const nodeBuffer: Uint8Array = globalRef.Buffer.from(base64, 'base64')
    const arrayBuffer = nodeBuffer.buffer.slice(
      nodeBuffer.byteOffset,
      nodeBuffer.byteOffset + nodeBuffer.byteLength
    ) as ArrayBuffer
    return arrayBuffer
  }

  if (hasAtob) {
    const binary = globalRef.atob(base64)
    const length = binary.length
    const bytes = new Uint8Array(length)

    for (let i = 0; i < length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    return bytes.buffer
  }

  throw new Error('No base64 decoder available in this environment')
}

/**
 * Convert a Blob into a base64 string.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  return arrayBufferToBase64(arrayBuffer)
}
