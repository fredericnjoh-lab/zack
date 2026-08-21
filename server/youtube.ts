import type { RepostPrivacy, YoutubeChannel } from './types.ts'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos'
const API_URL = 'https://www.googleapis.com/youtube/v3'
/** upload = publier, readonly = lire la chaîne pour confirmer la cible. */
export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
]

export function clientId(): string {
  return process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || ''
}

export function clientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || ''
}

export function hasOAuthApp(): boolean {
  return Boolean(clientId() && clientSecret())
}

/** Le refresh token vient de l'env (Render) ou du store (écran OAuth). */
export function envRefreshToken(): string {
  return process.env.GOOGLE_REFRESH_TOKEN || process.env.YOUTUBE_REFRESH_TOKEN || ''
}

export function authUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES.join(' '),
    // consent + offline sinon Google ne renvoie pas de refresh_token au 2e passage
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  })
  if (state) params.set('state', state)
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const data = (await res.json()) as { refresh_token?: string; error_description?: string; error?: string }
  if (!res.ok || !data.refresh_token) {
    throw new Error(
      data.error_description || data.error || 'Google n’a pas renvoyé de refresh_token',
    )
  }
  return data.refresh_token
}

let cached: { token: string; expiresAt: number; key: string } | null = null

export async function accessToken(refreshToken: string): Promise<string> {
  if (!hasOAuthApp()) throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants')
  if (!refreshToken) throw new Error('Chaîne YouTube non connectée')
  const key = refreshToken.slice(-12)
  if (cached && cached.key === key && cached.expiresAt > Date.now() + 30_000) return cached.token

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId(),
      client_secret: clientSecret(),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = (await res.json()) as {
    access_token?: string
    expires_in?: number
    error_description?: string
    error?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Refresh token refusé (${res.status})`)
  }
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    key,
  }
  return data.access_token
}

export async function fetchChannel(refreshToken: string): Promise<YoutubeChannel> {
  const token = await accessToken(refreshToken)
  const res = await fetch(`${API_URL}/channels?part=snippet&mine=true`, {
    headers: { authorization: `Bearer ${token}` },
  })
  const data = (await res.json()) as {
    items?: { id: string; snippet?: { title?: string; customUrl?: string } }[]
    error?: { message?: string }
  }
  if (!res.ok) throw new Error(data.error?.message || `YouTube channels ${res.status}`)
  const item = data.items?.[0]
  if (!item) throw new Error('Aucune chaîne YouTube sur ce compte Google')
  return {
    id: item.id,
    title: item.snippet?.title || 'YouTube',
    customUrl: item.snippet?.customUrl,
  }
}

export type UploadInput = {
  refreshToken: string
  video: Buffer
  title: string
  description: string
  tags: string[]
  privacyStatus: RepostPrivacy
  /** ISO — programme la sortie (impose privacyStatus private côté Google) */
  publishAt?: string
  /** 22 = People & Blogs, 26 = Howto & Style (mode) */
  categoryId?: string
}

export type UploadResult = { videoId: string; url: string }

/**
 * Upload resumable : Google veut d'abord les métadonnées, puis les octets sur
 * l'URL de session. On envoie le fichier en un seul PUT (les Reels tiennent en
 * mémoire) mais on garde le protocole resumable pour les gros fichiers.
 */
export async function uploadVideo(input: UploadInput): Promise<UploadResult> {
  const token = await accessToken(input.refreshToken)
  const metadata = {
    snippet: {
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 4900),
      tags: input.tags.slice(0, 30),
      categoryId: input.categoryId || process.env.YOUTUBE_CATEGORY_ID || '22',
    },
    status: {
      privacyStatus: input.publishAt ? 'private' : input.privacyStatus,
      publishAt: input.publishAt,
      selfDeclaredMadeForKids: false,
    },
  }

  const initRes = await fetch(
    `${UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-type': 'video/mp4',
        'x-upload-content-length': String(input.video.length),
      },
      body: JSON.stringify(metadata),
    },
  )
  if (!initRes.ok) {
    const body = await initRes.text()
    throw new Error(`YouTube init upload ${initRes.status}: ${body.slice(0, 400)}`)
  }
  const sessionUrl = initRes.headers.get('location')
  if (!sessionUrl) throw new Error('YouTube: URL de session absente')

  const putRes = await fetch(sessionUrl, {
    method: 'PUT',
    headers: {
      'content-type': 'video/mp4',
      'content-length': String(input.video.length),
    },
    body: new Uint8Array(input.video),
  })
  const data = (await putRes.json().catch(() => ({}))) as {
    id?: string
    error?: { message?: string }
  }
  if (!putRes.ok || !data.id) {
    throw new Error(data.error?.message || `YouTube upload ${putRes.status}`)
  }
  return { videoId: data.id, url: `https://www.youtube.com/watch?v=${data.id}` }
}
