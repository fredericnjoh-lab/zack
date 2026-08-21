import type { MediaType } from '../types'

export type InstagramRef = {
  handle?: string
  url?: string
  shortCode?: string
  mediaType?: MediaType
}

/** A resolved destination: the post itself, or the account when the post is unknown. */
export type InstagramTarget = {
  href: string
  kind: 'post' | 'profile'
}

const HANDLE_PATTERN = /^[a-z0-9._]{1,30}$/
const SHORTCODE_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

function isInstagramHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  return host === 'instagram.com' || host.endsWith('.instagram.com')
}

/**
 * Keep only https URLs served by instagram.com. Scraped payloads are untrusted,
 * so anything else (other hosts, javascript:, data:) resolves to nothing.
 */
export function safeInstagramUrl(raw?: string): string | undefined {
  if (!raw) return undefined
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return undefined
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
  if (!isInstagramHost(url.hostname)) return undefined
  url.protocol = 'https:'
  url.username = ''
  url.password = ''
  url.hash = ''
  return url.toString()
}

export function normalizeHandle(raw?: string): string | undefined {
  const handle = (raw || '').trim().replace(/^@+/, '').replace(/\/+$/, '').toLowerCase()
  return HANDLE_PATTERN.test(handle) ? handle : undefined
}

export function instagramProfileUrl(handle?: string): string | undefined {
  const normalized = normalizeHandle(handle)
  return normalized ? `https://www.instagram.com/${normalized}/` : undefined
}

export function instagramPostUrl(ref: InstagramRef): string | undefined {
  const direct = safeInstagramUrl(ref.url)
  if (direct) return direct
  const shortCode = (ref.shortCode || '').trim()
  if (!SHORTCODE_PATTERN.test(shortCode)) return undefined
  return `https://www.instagram.com/${ref.mediaType === 'reel' ? 'reel' : 'p'}/${shortCode}/`
}

export function instagramTarget(ref: InstagramRef): InstagramTarget | undefined {
  const post = instagramPostUrl(ref)
  if (post) return { href: post, kind: 'post' }
  const profile = instagramProfileUrl(ref.handle)
  if (profile) return { href: profile, kind: 'profile' }
  return undefined
}
