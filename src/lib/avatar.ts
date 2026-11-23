import { authConfig, type FerdaSession } from './ferdaAuth'

export function avatarUrl(path: string | null | undefined): string | null {
  if (!path || !/^[0-9a-f-]{36}\/avatar\.(jpg|png|webp)$/.test(path)) return null
  const { base } = authConfig()
  return `${base}/storage/v1/object/public/ferda-avatars/${path}`
}

export async function uploadAvatar(file: File, session: FerdaSession, userId: string): Promise<string> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP photo.')
  if (file.size > 2 * 1024 * 1024) throw new Error('Choose a photo under 2 MB.')
  if (!/^[0-9a-f-]{36}$/.test(userId)) throw new Error('Account verification required before uploading.')
  const { base, key } = authConfig()
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
  const path = `${userId}/avatar.${extension}`
  const response = await fetch(`${base}/storage/v1/object/ferda-avatars/${path}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': file.type, 'x-upsert': 'true' },
    body: file,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string; error?: string }
    throw new Error(error.message || error.error || 'Could not upload profile picture')
  }
  return path
}
