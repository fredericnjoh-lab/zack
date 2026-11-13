/** Hosts Instagram actually serves media from. Scraped `displayUrl` values are untrusted. */
const ALLOWED_IMAGE_HOSTS = ['cdninstagram.com', 'fbcdn.net'] as const

export const MAX_IMAGE_BYTES = 5_000_000
const MAX_REDIRECTS = 4
const FETCH_TIMEOUT_MS = 10_000

function isTestLoopback(hostname: string): boolean {
  return process.env.NODE_ENV === 'test' && (hostname === '127.0.0.1' || hostname === 'localhost')
}

export function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (isTestLoopback(host)) return true
  return ALLOWED_IMAGE_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

/**
 * Keep only https CDN URLs. Query-string `url=` values and Apify displayUrl
 * fields are untrusted, so javascript:/data:/internal hosts must not fetch.
 */
export function parseAllowedImageUrl(raw?: string): URL | undefined {
  if (!raw) return undefined
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return undefined
  }
  const allowHttp = isTestLoopback(url.hostname)
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) return undefined
  if (!isAllowedImageHost(url.hostname)) return undefined
  url.username = ''
  url.password = ''
  url.hash = ''
  return url
}

function isBlockedContentType(contentType: string): boolean {
  const type = contentType.toLowerCase().split(';')[0]!.trim()
  return (
    type.startsWith('video/') ||
    type.startsWith('audio/') ||
    type === 'text/html' ||
    type === 'application/json' ||
    type === 'text/javascript' ||
    type === 'application/javascript'
  )
}

export type BoundedImage = {
  bytes: Buffer
  contentType: string
}

export type BoundedImageResult = BoundedImage | { status: number }

/**
 * Fetch an already-validated CDN URL. Re-checks the host after every redirect,
 * refuses video/html payloads, and aborts once the body exceeds maxBytes so a
 * public `/api/image?url=` cannot OOM the process.
 */
export async function fetchBoundedImage(
  url: URL,
  opts?: { maxBytes?: number; timeoutMs?: number },
): Promise<BoundedImageResult> {
  const maxBytes = opts?.maxBytes ?? MAX_IMAGE_BYTES
  const timeoutMs = opts?.timeoutMs ?? FETCH_TIMEOUT_MS
  let current = url

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(current, {
      headers: { 'user-agent': 'Mozilla/5.0' },
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    })

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      if (!location) return { status: 502 }
      let next: URL
      try {
        next = new URL(location, current)
      } catch {
        return { status: 400 }
      }
      const allowed = parseAllowedImageUrl(next.toString())
      if (!allowed) return { status: 400 }
      current = allowed
      continue
    }

    if (!response.ok || !response.body) return { status: 502 }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    if (isBlockedContentType(contentType)) return { status: 400 }

    const declared = Number(response.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > maxBytes) return { status: 400 }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done || !value) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        return { status: 400 }
      }
      chunks.push(value)
    }

    return { bytes: Buffer.concat(chunks), contentType }
  }

  return { status: 400 }
}
